// Progressive enhancement only: content and links work without JavaScript.
(() => {
  const menu = document.getElementById('menu-button');
  const nav = document.getElementById('nav');

  function setMenuOpen(open) {
    nav.classList.toggle('open', open);
    menu.setAttribute('aria-expanded', String(open));
    menu.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    menu.textContent = open ? '\u2212' : '+';
  }

  if (menu && nav) {
    nav.classList.add('enhanced');
    menu.hidden = false;
    menu.addEventListener('click', () => setMenuOpen(menu.getAttribute('aria-expanded') !== 'true'));
    nav.addEventListener('click', event => {
      if (event.target.closest('a')) setMenuOpen(false);
    });
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && menu.getAttribute('aria-expanded') === 'true') {
        setMenuOpen(false);
        menu.focus();
      }
    });
    matchMedia('(max-width: 700px)').addEventListener('change', () => setMenuOpen(false));
  }

  function showImageFallback(image) {
    if (image.dataset.failed) return;
    image.dataset.failed = 'true';
    const fallback = document.createElement('span');
    fallback.className = 'image-fallback';
    fallback.setAttribute('role', 'img');
    fallback.setAttribute('aria-label', `${image.alt} — preview unavailable`);
    fallback.textContent = 'Preview unavailable';
    image.hidden = true;
    image.after(fallback);
  }
  document.querySelectorAll('img[data-artwork]').forEach(image => {
    image.addEventListener('error', () => showImageFallback(image), { once: true });
    // Cached failures can happen before deferred scripts execute.
    if (image.complete && image.naturalWidth === 0) showImageFallback(image);
  });

  let cleanupCarousel = () => {};
  function startCarousel() {
    cleanupCarousel();
    if (typeof setupNewMemberSlider === 'function') cleanupCarousel = setupNewMemberSlider();
  }
  startCarousel();
  window.addEventListener('pagehide', () => cleanupCarousel());
  window.addEventListener('pageshow', event => { if (event.persisted) startCarousel(); });
})();
