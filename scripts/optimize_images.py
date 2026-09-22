"""Generate web assets without changing originals. Requires Pillow (see README)."""
import json
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / '.tools'))
from PIL import Image, ImageOps


def optimize():
    catalogue = json.loads((ROOT / 'data/illustrations.json').read_text(encoding='utf-8'))
    output = ROOT / 'designs/optimized'
    output.mkdir(exist_ok=True)
    manifest = {}
    for item in catalogue:
        with Image.open(ROOT / item['source']) as source:
            source = ImageOps.exif_transpose(source).convert('RGBA')
            variants = []
            for width in sorted({min(size, source.width) for size in (480, 960, 1600)}):
                height = round(source.height * width / source.width)
                resized = source.resize((width, height), Image.Resampling.LANCZOS)
                filename = f"{item['slug']}-{width}.webp"
                resized.save(output / filename, 'WEBP', quality=88, method=6)
                variants.append({'src': f'designs/optimized/{filename}', 'width': width, 'height': height})
            # JPEG gives social previews an opaque background and broad support.
            preview = Image.new('RGB', (1200, 630), item['color'])
            artwork = ImageOps.contain(source, (1100, 590), Image.Resampling.LANCZOS)
            preview.paste(artwork, ((1200-artwork.width)//2, (630-artwork.height)//2), artwork)
            social = f"designs/optimized/{item['slug']}-social.jpg"
            preview.save(ROOT / social, 'JPEG', quality=88, optimize=True)
            manifest[item['slug']] = {'variants': variants, 'social': social}
    (ROOT / 'data/images.json').write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf-8')
    print(f'Generated responsive images and sharing previews for {len(manifest)} artworks.')


if __name__ == '__main__':
    optimize()
