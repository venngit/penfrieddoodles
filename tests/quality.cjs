// Run with: node tests/quality.cjs (Node.js 18+; no dependencies).
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const script = file => fs.readFileSync(path.join(root, file), 'utf8');
const indexScript = script('scripts/carousel.js');
new vm.Script(indexScript);
new vm.Script(script('scripts/site.js'));
new vm.Script(script('scripts/legacy.js'));

class Element extends EventTarget {
  constructor() { super(); this.attributes = {}; this.dataset = {}; }
  setAttribute(name, value) { this.attributes[name] = value; }
  remove() {}
  getAttribute(name) { return this.attributes[name]; }
}

function carousel(reduced = false, count = 3) {
  const section = new Element();
  const viewport = new Element();
  const previous = new Element();
  const next = new Element();
  previous.dataset.sliderDirection = 'previous';
  next.dataset.sliderDirection = 'next';
  const controls = [previous, next];
  const track = { children: Array.from({ length: count }, () => ({ getBoundingClientRect: () => ({ width: 200 }) })) };
  const motion = new Element();
  motion.matches = reduced;
  const document = new Element();
  document.activeElement = null;
  document.hidden = false;
  document.getElementById = () => viewport;
  document.createElement = () => new Element();
  section.matches = () => false;
  section.contains = element => controls.includes(element) || element === section.pause;
  section.querySelectorAll = () => controls;
  section.querySelector = () => ({ prepend: button => { section.pause = button; } });
  viewport.closest = () => section;
  viewport.querySelector = () => track;
  viewport.scrollWidth = count * 220;
  viewport.clientWidth = 300;
  viewport.scrollLeft = 0;
  viewport.scrollTo = ({ left, behavior }) => { viewport.scrollLeft = left; viewport.behavior = behavior; };
  const timers = new Map();
  let timerId = 0;
  const context = vm.createContext({ document, matchMedia: () => motion, AbortController, queueMicrotask,
    getComputedStyle: () => ({ gap: '20px' }), window: {
      setInterval: callback => { timers.set(++timerId, callback); return timerId; },
      clearInterval: id => timers.delete(id)
    }
  });
  vm.runInContext(indexScript, context);
  const setup = () => vm.runInContext('setupNewMemberSlider()', context);
  return { section, viewport, controls, motion, document, timers, setup };
}
const emit = (target, type) => target.dispatchEvent(new Event(type));

async function run() {
  const c = carousel();
  let cleanup = c.setup();
  assert.equal(c.timers.size, 1);
  emit(c.section, 'mouseleave');
  emit(c.section, 'mouseleave');
  assert.equal(c.timers.size, 1, 'Repeated resume events must not accumulate timers');
  emit(c.section, 'mouseenter');
  assert.equal(c.timers.size, 0);
  c.document.activeElement = c.controls[1];
  emit(c.section, 'mouseleave');
  assert.equal(c.timers.size, 0, 'Leaving with the pointer must not override keyboard focus');
  c.document.activeElement = null;
  emit(c.section, 'focusout');
  await Promise.resolve();
  assert.equal(c.timers.size, 1);
  c.document.hidden = true;
  emit(c.document, 'visibilitychange');
  assert.equal(c.timers.size, 0);
  c.document.hidden = false;
  emit(c.document, 'visibilitychange');
  assert.equal(c.timers.size, 1);
  emit(c.section.pause, 'click');
  assert.equal(c.timers.size, 0);
  emit(c.section, 'mouseleave');
  assert.equal(c.timers.size, 0, 'Explicit pause must persist');
  emit(c.section.pause, 'click');
  assert.equal(c.timers.size, 1);
  c.motion.matches = true;
  emit(c.motion, 'change');
  assert.equal(c.timers.size, 0);
  emit(c.controls[1], 'click');
  assert.equal(c.viewport.scrollLeft, 220);
  assert.equal(c.viewport.behavior, 'instant');
  cleanup();
  c.motion.matches = false;
  emit(c.motion, 'change');
  assert.equal(c.timers.size, 0, 'Disposed listeners must not restart rotation');
  for (let i = 0; i < 10; i++) {
    cleanup = c.setup();
    assert.equal(c.timers.size, 1);
    // Simulate leaving the page with a queued focusout callback.
    emit(c.section, 'focusout');
    cleanup();
    await Promise.resolve();
    assert.equal(c.timers.size, 0);
  }
  const reduced = carousel(true);
  const disposeReduced = reduced.setup();
  assert.equal(reduced.timers.size, 0);
  assert.equal(reduced.section.pause.hidden, true);
  emit(reduced.controls[1], 'click');
  assert.equal(reduced.viewport.scrollLeft, 220);
  emit(reduced.controls[1], 'click');
  assert.equal(reduced.viewport.scrollLeft, 360);
  emit(reduced.controls[1], 'click');
  assert.equal(reduced.viewport.scrollLeft, 0, 'Next wraps at the end');
  emit(reduced.controls[0], 'click');
  assert.equal(reduced.viewport.scrollLeft, 360, 'Previous wraps at the beginning');
  disposeReduced();
  for (const count of [0, 1]) {
    const empty = carousel(false, count);
    const dispose = empty.setup();
    emit(empty.controls[1], 'click');
    assert.equal(empty.timers.size, 0);
    assert.equal(empty.viewport.scrollLeft, 0);
    dispose();
  }
  const { build, generate, validateCatalogue } = require('../scripts/build.cjs');
  const { createTemplates, escape } = require('../scripts/templates.cjs');
  const items = JSON.parse(script('data/illustrations.json'));
  const images = JSON.parse(script('data/images.json'));
  assert.match(build(true), /Verified/);
  assert.throws(() => validateCatalogue([items[0], items[0]], images), /duplicate/);
  assert.throws(() => validateCatalogue([{ ...items[0], color: 'red; background:url(x)' }], images), /colour/);
  assert.throws(() => validateCatalogue([{ ...items[0], source: '../secret' }], images), /asset/);
  const hostile = { ...items[0], name: '<script>alert("x")</script>', description: '" onload="alert(1)' };
  const hostileTemplates = createTemplates([hostile], images);
  assert.ok(hostileTemplates.detail(hostile, 0).includes('&lt;SCRIPT&gt;'));
  assert.ok(!hostileTemplates.detail(hostile, 0).includes('<script>'));
  const outputs = generate();
  for (const [file, html] of outputs) {
    if (!file.endsWith('.html')) continue;
    assert.equal((html.match(/<h1\b/g) || []).length, 1, `${file}: one primary heading`);
    assert.equal((html.match(/rel="canonical"/g) || []).length, 1);
    assert.ok(html.includes('property="og:image"'));
    assert.ok(html.includes('name="description"'));
    const schema = JSON.parse(html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)[1]);
    assert.ok(schema.url.startsWith('https://penfrieddoodles.com/'));
    assert.ok(!html.includes('onerror='));
    assert.ok(!html.includes('href="#/'));
    for (const match of html.matchAll(/(?:href|src)="(\/[^"#]*)"/g)) {
      const relative = match[1].slice(1);
      const destination = relative.endsWith('/') || !relative ? relative + 'index.html' : relative;
      assert.ok(fs.existsSync(path.join(root, destination)), `${file}: missing ${destination}`);
    }
    for (const match of html.matchAll(/srcset="([^"]+)"/g)) {
      for (const variant of match[1].split(', ')) {
        assert.ok(fs.existsSync(path.join(root, variant.split(' ')[0].slice(1))));
      }
    }
  }
  for (let index = 0; index < items.length; index++) {
    const item = items[index];
    const html = outputs.get(`designs/${item.slug}/index.html`);
    assert.ok(html.includes(`<title>${escape(item.name)} | Pen-Fried Doodles</title>`));
    const previous = items[(index - 1 + items.length) % items.length];
    const next = items[(index + 1) % items.length];
    assert.ok(html.includes(`href="/designs/${previous.slug}/">&larr; PREVIOUS`));
    assert.ok(html.includes(`href="/designs/${next.slug}/">NEXT`));
  }
  assert.equal((outputs.get('sitemap.xml').match(/<url>/g) || []).length, items.length + 2);
  assert.ok(!outputs.get('sitemap.xml').includes('/shop/'));
  // Old URLs resolve only to known internal routes, including hostile input.
  for (const [pathname, search, hash, expected] of [
    ['/doodle.html', '', '', '/designs/hooray-penguin/'],
    ['/doodle.html', '?design=cute-puffin', '', '/designs/cute-puffin/'],
    ['/doodle.html', '?design=unknown', '', '/designs/'],
    ['/doodle.html', '?design=__proto__', '', '/designs/'],
    ['/', '', '#/designs/cute-puffin', '/designs/cute-puffin/'],
    ['/index.html', '', '#/shop', '/shop/'],
    ['/', '', '#/https://example.com', '/404.html'],
    ['/', '', '#main', undefined]
  ]) {
    let result;
    vm.runInNewContext(script('scripts/legacy.js'), { URLSearchParams, window: new EventTarget(), location: { pathname, search, hash, replace: target => { result = target; } } });
    assert.equal(result, expected);
  }
  const menu = new Element();
  menu.setAttribute('aria-expanded', 'false');
  const nav = new Element();
  nav.classList = { values: new Set(), add(value) { this.values.add(value); }, toggle(value, on) { on ? this.values.add(value) : this.values.delete(value); } };
  const document = new Element();
  menu.focus = () => { document.activeElement = menu; };
  const failedImage = new Element();
  failedImage.dataset = {};
  failedImage.alt = 'Cute Puffin illustration';
  failedImage.complete = true;
  failedImage.naturalWidth = 0;
  const fallbacks = [];
  failedImage.after = element => fallbacks.push(element);
  document.getElementById = id => ({ 'menu-button': menu, nav }[id]);
  document.querySelectorAll = () => [failedImage];
  document.createElement = () => new Element();
  const window = new Element();
  const media = new Element();
  let starts = 0, disposals = 0;
  vm.runInNewContext(script('scripts/site.js'), { document, window, matchMedia: () => media, setupNewMemberSlider: () => { starts++; return () => { disposals++; }; } });
  assert.equal(failedImage.hidden, true);
  assert.equal(fallbacks.length, 1);
  assert.equal(fallbacks[0].textContent, 'Preview unavailable');
  assert.ok(fallbacks[0].attributes['aria-label'].includes('Cute Puffin'));
  emit(failedImage, 'error');
  assert.equal(fallbacks.length, 1, 'A cached error and an error event must not duplicate the fallback');
  emit(menu, 'click');
  assert.equal(menu.attributes['aria-expanded'], 'true');
  const escapeEvent = new Event('keydown');
  escapeEvent.key = 'Escape';
  document.dispatchEvent(escapeEvent);
  assert.equal(menu.attributes['aria-expanded'], 'false');
  assert.equal(document.activeElement, menu);
  emit(menu, 'click');
  emit(media, 'change');
  assert.equal(menu.attributes['aria-expanded'], 'false');
  emit(window, 'pagehide');
  assert.equal(disposals, 1);
  const restore = new Event('pageshow');
  restore.persisted = true;
  window.dispatchEvent(restore);
  assert.equal(starts, 2, 'Restoring from browser history initializes one carousel');
  return 'PASS: carousel lifecycle/accessibility; catalogue validation/escaping; generated pages, metadata, links and assets; old URL redirects; menu, image failures and browser-history lifecycle.';
}

module.exports = run;
if (require.main === module) run().then(console.log).catch(error => { console.error(error); process.exitCode = 1; });
