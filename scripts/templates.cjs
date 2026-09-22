// Shared build-time templates. No framework or browser-side catalogue required.
const SITE = 'https://penfrieddoodles.com';
const escape = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const url = slug => `/designs/${slug}/`;

function createTemplates(illustrations, images) {
  function image(item, { priority = false, className = '', sizes = '(max-width: 700px) 46vw, 50vw' } = {}) {
    const variants = images[item.slug].variants;
    const largest = variants.at(-1);
    const defaultImage = variants.find(variant => variant.width >= 960) || largest;
    return `<img class="${escape(className)}" src="/${escape(defaultImage.src)}"
      srcset="${variants.map(variant => `/${escape(variant.src)} ${variant.width}w`).join(', ')}" sizes="${escape(sizes)}"
      width="${largest.width}" height="${largest.height}" alt="${escape(item.name)} illustration"
      ${priority ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async" data-artwork>`;
  }

  function card(item, featured = false) {
    return `<a class="design-card${featured ? ' feature' : ''}" href="${url(item.slug)}">
      <div class="art-frame" style="--card-color:${item.color}">${image(item)}</div>
      <div class="card-info"><span class="card-title">${escape(item.name.toUpperCase())}</span><span class="meta">${escape(item.category)}</span></div>
    </a>`;
  }

  function home() {
    const hero = illustrations[0];
    const fresh = illustrations.filter(item => item.isNew);
    return `<div class="page">
      <section class="hero">
        <div class="hero-copy"><div><span class="eyebrow">Illustrations and little oddballs</span><h1>SMALL<br>DOODLES.<br>BIG<br>PERSONALITY.</h1></div><a class="button-link" href="/designs/">SEE ALL DOODLES &rarr;</a></div>
        <div class="hero-art">${image(hero, { priority: true, className: 'hero-design-art', sizes: '(max-width: 700px) 84vw, 560px' })}</div>
      </section>
      ${fresh.length ? `<section class="new-members" aria-labelledby="new-members-title">
        <div class="new-members-head"><div><span class="eyebrow">Fresh from the sketchbook</span><h2 id="new-members-title">NEW<br>MEMBERS!</h2></div>
          <div class="new-member-controls" hidden><button class="slider-button" type="button" data-slider-direction="previous" aria-label="Show previous new doodle">&larr;</button><button class="slider-button" type="button" data-slider-direction="next" aria-label="Show next new doodle">&rarr;</button></div>
        </div>
        <div class="new-member-viewport" id="new-member-slider" role="region" tabindex="0" aria-label="New doodles"><div class="new-member-track">
          ${fresh.map(item => `<a class="new-member-card" href="${url(item.slug)}"><div class="new-member-art" style="--card-color:${item.color}"><span class="new-badge">NEW</span>${image(item, { sizes: '(max-width: 700px) 78vw, (max-width: 1316px) 38vw, 500px' })}</div><span class="new-member-name">${escape(item.name.toUpperCase())}</span></a>`).join('\n')}
        </div></div>
      </section>` : ''}
      <section class="section"><div class="section-head"><h2>FEATURED<br>WORK</h2><a class="arrow-link" href="/designs/">View all doodles &rarr;</a></div><div class="design-grid">${illustrations.filter(item => item.featured).slice(0, 3).map((item, i) => card(item, i === 0)).join('\n')}</div></section>
    </div>`;
  }

  function gallery() {
    return `<div class="page gallery-page"><section class="page-header"><span class="eyebrow">Pen-Fried Doodles / Illustration archive</span><h1 class="page-title">DOODLES</h1><p>Every little thing we've drawn.</p></section><section class="design-grid" aria-label="All designs">${illustrations.map(item => card(item)).join('\n')}</section></div>`;
  }

  function detail(item, index) {
    const previous = illustrations[(index - 1 + illustrations.length) % illustrations.length];
    const next = illustrations[(index + 1) % illustrations.length];
    return `<div class="page detail"><section class="detail-art" style="--detail-color:${item.color}">${image(item, { priority: true, sizes: '(max-width: 700px) 86vw, 50vw' })}</section>
      <section class="detail-copy"><span class="eyebrow">Doodle ${String(item.id).padStart(2, '0')} / ${escape(item.category)}</span><h1>${escape(item.name.toUpperCase())}</h1><p>${escape(item.description)}</p>
        <div class="detail-meta"><span class="meta">CATEGORY / ${escape(item.category)}</span><span class="meta">TAGS / ${escape(item.tags.join(', ').toUpperCase())}</span><span class="meta">SHOP RELEASE / COMING SOON</span></div>
        <nav class="detail-nav" aria-label="Other doodles"><a href="${url(previous.slug)}">&larr; PREVIOUS</a><a href="${url(next.slug)}">NEXT &rarr;</a></nav>
      </section></div>`;
  }

  function document({ title, description, route, body, section = '', artwork = illustrations[0], homePage = false, noindex = false, redirect, legacy = false }) {
    const fullTitle = title ? `${title} | Pen-Fried Doodles` : 'Pen-Fried Doodles';
    const canonical = SITE + route;
    const preview = SITE + '/' + images[artwork.slug].social;
    const structured = {
      '@context': 'https://schema.org', '@type': route.startsWith('/designs/') && route !== '/designs/' ? 'CreativeWork' : 'WebPage',
      name: fullTitle, description, url: canonical, image: preview
    };
    return `<!doctype html>
<!-- Generated by scripts/build.cjs. Edit data/illustrations.json or scripts/templates.cjs. -->
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escape(fullTitle)}</title>
  <meta name="description" content="${escape(description)}">
  <link rel="canonical" href="${escape(canonical)}">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="Pen-Fried Doodles">
  <meta property="og:title" content="${escape(fullTitle)}">
  <meta property="og:description" content="${escape(description)}">
  <meta property="og:url" content="${escape(canonical)}">
  <meta property="og:image" content="${escape(preview)}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="${escape(artwork.name)} illustration">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escape(fullTitle)}">
  <meta name="twitter:description" content="${escape(description)}">
  <meta name="twitter:image" content="${escape(preview)}">
  ${noindex ? '<meta name="robots" content="noindex, follow">' : ''}
  ${redirect ? `<meta http-equiv="refresh" content="0; url=${escape(redirect)}">` : ''}
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&amp;family=Space+Grotesk:wght@400;500;600;700&amp;display=swap">
  <link rel="stylesheet" href="/styles.css">
  <script type="application/ld+json">${JSON.stringify(structured).replace(/</g, '\\u003c')}</script>
  ${homePage || legacy ? '<script src="/scripts/legacy.js" defer></script>' : ''}
  ${homePage ? '<script src="/scripts/carousel.js" defer></script>' : ''}
  <script src="/scripts/site.js" defer></script>
</head>
<body>
  <a class="skip-link" href="#main">Skip to content</a>
  <header class="site-header">
    <a class="brand" href="/" aria-label="Pen-Fried Doodles home"><span>PEN-FRIED</span><span>DOODLES</span></a>
    <button class="menu-button" id="menu-button" type="button" aria-label="Open menu" aria-expanded="false" aria-controls="nav" hidden>+</button>
    <nav class="nav" id="nav" aria-label="Primary navigation">${[['designs', 'DOODLES'], ['about', 'ABOUT'], ['shop', 'SHOP'], ['contact', 'CONTACT']].map(([slug, label]) => `<a href="/${slug}/"${section === slug ? ` class="active" aria-current="${route === `/${slug}/` ? 'page' : 'location'}"` : ''}>${label}</a>`).join('')}</nav>
  </header>
  <main id="main" tabindex="-1">${body}</main>
  <footer><span>PEN-FRIED DOODLES / 2026</span><span>Illustrations for your good side. Made with love from Iceland &#127470;&#127480;.</span></footer>
</body>
</html>
`.replace(/[ \t]+$/gm, '');
  }
  return { document, home, gallery, detail };
}

module.exports = { createTemplates, escape, SITE, url };
