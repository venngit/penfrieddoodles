const fs = require('node:fs');
const path = require('node:path');
const { createTemplates, escape, SITE, url } = require('./templates.cjs');
const root = path.join(__dirname, '..');

function validateCatalogue(items, images) {
  if (!Array.isArray(items) || !items.length) throw new Error('The catalogue must contain at least one artwork.');
  const slugs = new Set();
  const ids = new Set();
  for (const item of items) {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(item.slug) || slugs.has(item.slug)) throw new Error(`Invalid or duplicate slug: ${item.slug}`);
    if (!Number.isInteger(item.id) || item.id < 1 || ids.has(item.id)) throw new Error(`Invalid or duplicate artwork ID: ${item.id}`);
    if (!/^#[0-9a-f]{6}$/i.test(item.color)) throw new Error(`Invalid colour for ${item.slug}`);
    for (const key of ['name', 'description', 'category']) {
      if (typeof item[key] !== 'string' || !item[key].trim()) throw new Error(`Missing ${key} for ${item.slug}`);
    }
    if (!Array.isArray(item.tags) || !item.tags.every(tag => typeof tag === 'string')) throw new Error(`Invalid tags for ${item.slug}`);
    if (!images[item.slug]?.variants?.length) throw new Error(`Run image optimization for ${item.slug}`);
    const asset = images[item.slug];
    for (const file of [item.source, asset.social, ...asset.variants.map(variant => variant.src)]) {
      if (typeof file !== 'string' || !file.startsWith('designs/') || file.includes('..') || file.includes('\\') || !fs.existsSync(path.join(root, file))) throw new Error(`Missing or invalid artwork asset: ${file}`);
    }
    let previousWidth = 0;
    for (const variant of asset.variants) {
      if (!Number.isInteger(variant.width) || variant.width <= previousWidth || !Number.isInteger(variant.height) || variant.height <= 0) throw new Error(`Invalid image dimensions for ${item.slug}`);
      previousWidth = variant.width;
    }
    slugs.add(item.slug);
    ids.add(item.id);
  }
}

function generate() {
  const items = JSON.parse(fs.readFileSync(path.join(root, 'data/illustrations.json'), 'utf8'));
  const images = JSON.parse(fs.readFileSync(path.join(root, 'data/images.json'), 'utf8'));
  validateCatalogue(items, images);
  const templates = createTemplates(items, images);
  const outputs = new Map();
  const indexed = [];
  function page(file, options) {
    outputs.set(file, templates.document(options));
    if (!options.noindex && !options.redirect) indexed.push(options.route);
  }
  page('index.html', { title: '', description: 'Pen-Fried Doodles: colourful little characters and strange ideas. Original illustrations made in Iceland.', route: '/', body: templates.home(), homePage: true });
  page('designs/index.html', { title: 'Doodles', description: 'Explore the Pen-Fried Doodles illustration portfolio: penguins, puffins, dogs, arctic foxes, and other little oddballs.', route: '/designs/', section: 'designs', body: templates.gallery() });
  items.forEach((item, index) => page(`designs/${item.slug}/index.html`, { title: item.name, description: item.description, route: url(item.slug), section: 'designs', artwork: item, body: templates.detail(item, index) }));
  for (const [section, title] of [['about', 'About'], ['contact', 'Contact']]) {
    page(`${section}/index.html`, { title, description: `${title} information for Pen-Fried Doodles is coming soon.`, route: `/${section}/`, section, noindex: true, body: '<div class="page"><section class="about-intro"><h1>COMING<br>SOON.</h1></section></div>' });
  }
  page('shop/index.html', { title: 'Shop', description: 'The Pen-Fried Doodles stationery shop is getting ready. Stickers will be the first thing on the shelves.', route: '/shop/', section: 'shop', noindex: true, body: '<div class="page shop-page"><section class="shop-copy"><span class="eyebrow">The future stationery shop</span><h1>THE<br>SHOP IS<br>GETTING<br>READY.</h1><p>A stationery shop is on its way. Stickers will be the first thing on the shelves.</p></section><section class="shop-side" aria-hidden="true"></section></div>' });
  page('404.html', { title: 'Page not found', description: 'This page could not be found. Explore the Pen-Fried Doodles portfolio.', route: '/404.html', noindex: true, body: '<div class="page"><section class="page-header"><h1 class="page-title">PAGE NOT<br>FOUND.</h1><p>This doodle may have moved.</p><a class="button-link" href="/designs/">SEE ALL DOODLES &rarr;</a></section></div>' });
  page('all_doodles.html', { title: 'Doodles', description: 'Explore the Pen-Fried Doodles portfolio.', route: '/designs/', redirect: '/designs/', body: '<section class="page-header"><h1 class="page-title">DOODLES</h1><p><a href="/designs/">Continue to the illustration portfolio.</a></p></section>' });
  page('doodle.html', { title: 'Find a doodle', description: 'Find an illustration in the Pen-Fried Doodles portfolio.', route: '/designs/', noindex: true, legacy: true, body: `<section class="page-header"><h1 class="page-title">FIND A<br>DOODLE.</h1><p>Choose an illustration if you are not redirected automatically.</p><ul>${items.map(item => `<li><a href="${url(item.slug)}">${escape(item.name)}</a></li>`).join('')}</ul></section>` });
  const routes = Object.fromEntries(items.map(item => [item.slug, url(item.slug)]));
  outputs.set('scripts/legacy.js', `// Generated compatibility redirects. Edit the catalogue, then rebuild.\n(() => {\n  const routes = ${JSON.stringify(routes, null, 2)};\n  const lookup = slug => Object.hasOwn(routes, slug) ? routes[slug] : null;\n  function redirect() {\n    let target;\n    if (location.pathname.endsWith('/doodle.html')) {\n      const slug = new URLSearchParams(location.search).get('design');\n      target = slug ? lookup(slug) || '/designs/' : ${JSON.stringify(url(items[0].slug))};\n    } else if (location.hash.startsWith('#/')) {\n      const route = location.hash.slice(1);\n      if (route === '/') target = '/';\n      else if (['/designs', '/about', '/shop', '/contact'].includes(route)) target = route + '/';\n      else if (route.startsWith('/designs/')) target = lookup(route.slice('/designs/'.length)) || '/404.html';\n      else target = '/404.html';\n    }\n    if (target) location.replace(target);\n  }\n  window.addEventListener('hashchange', redirect);\n  redirect();\n})();\n`);
  outputs.set('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${indexed.map(route => `  <url><loc>${SITE}${route}</loc></url>`).join('\n')}\n</urlset>\n`);
  outputs.set('robots.txt', `User-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n`);
  return outputs;
}

function build(check = false) {
  const outputs = generate();
  for (const [file, content] of outputs) {
    const destination = path.join(root, file);
    if (check) {
      if (!fs.existsSync(destination) || fs.readFileSync(destination, 'utf8').replace(/\r\n/g, '\n') !== content) throw new Error(`Generated file is out of date: ${file}`);
    } else {
      fs.mkdirSync(path.dirname(destination), { recursive: true });
      fs.writeFileSync(destination, content);
    }
  }
  return `${check ? 'Verified' : 'Generated'} ${outputs.size} static files.`;
}
module.exports = { build, generate, validateCatalogue };
if (require.main === module) console.log(build(process.argv.includes('--check')));
