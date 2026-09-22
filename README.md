# Pen-Fried Doodles

A small static illustration portfolio. No Shopify, CMS, database, or payment integration is required. The checked-in HTML and image assets can be hosted directly on GitHub Pages or another static host at the domain root.

## Edit content

- `data/illustrations.json` is the single artwork catalogue. Edit names, descriptions, tags, colours, and `featured` / `isNew` flags here. Keep IDs and slugs unique; slugs form public URLs.
- `scripts/templates.cjs` contains shared page layouts and markup.
- `scripts/build.cjs` defines pages and generates HTML, compatibility redirects, sitemap, and robots.txt.
- `styles.css` controls appearance.
- `scripts/site.js` handles the menu, image failures, and page lifecycle; `scripts/carousel.js` handles rotation.
- `index.html`, other page HTML, `scripts/legacy.js`, `sitemap.xml`, and `robots.txt` are generated. Do not edit those files directly.

Use Node.js 18 or newer to rebuild and check (no npm dependencies):

```sh
node scripts/build.cjs
node scripts/build.cjs --check
node tests/quality.cjs
```

Commit the generated files alongside the source changes. No server-side build is necessary for deployment. If an artwork slug changes or an artwork is removed, review its old generated folder and redirect it to a suitable remaining page before publishing; the builder intentionally does not delete old files.

## Artwork images

Original PNGs remain in `designs/doodles/`. The `source` field points to an original. Browser images live in `designs/optimized/`; `data/images.json` records their actual dimensions. Small, medium, and large WebP variants retain transparency. JPEG previews are generated for social sharing.

Only when adding/changing an original image or its sharing-preview colour, install Pillow locally and regenerate:

```sh
python -m pip install --target .tools Pillow==12.3.0
python scripts/optimize_images.py
node scripts/build.cjs
node tests/quality.cjs
```

`.tools` is ignored by Git. Inspect the new images before publishing. The normal HTML build does not require Python or Pillow.

## Preview and verify

```sh
python -m http.server 8765 --bind 127.0.0.1
```

Open `http://127.0.0.1:8765/`. Use a local HTTP server rather than double-clicking the HTML: links and assets are relative to the domain root.

The dependency-free tests cover carousel timers and reduced motion, menu behavior, broken images, catalogue validation, template escaping, generated file freshness, artwork navigation, metadata, local asset links, and old URL redirects. They simulate browser APIs; they are not a visual browser test. Also inspect narrow/mobile layouts, keyboard focus, reduced motion, and the site with JavaScript disabled before release.

## URLs and metadata

Each artwork is pre-rendered at `/designs/<slug>/`, with its own title, description, canonical URL, Open Graph/Twitter preview and CreativeWork structured data. The gallery and home page render without JavaScript. Normal browser navigation replaces the old client-side router.

Old `#/...` bookmarks and `doodle.html?design=...` URLs have JavaScript compatibility redirects. `all_doodles.html` has a static refresh and fallback link. These are not HTTP 301 redirects; configure permanent redirects at the host if it supports them. The legacy detail page includes usable links when JavaScript is unavailable.

The sitemap contains the home page, gallery, and artworks. About, Contact, and Shop remain placeholders and are marked `noindex` until useful content is ready. `404.html` is supplied for static hosts supporting custom error pages. Update the site origin in `scripts/templates.cjs` if the production domain changes.
