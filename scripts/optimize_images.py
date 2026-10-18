"""Optimize public raster images. Originals remain outside the deployed directory.
Run with: python3 scripts/optimize_images.py (requires Pillow with WebP support).
"""
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from PIL import Image, ImageOps
import json
import shutil

ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / 'public'
BACKUP = ROOT / 'assets-original'
legacy = PUBLIC / 'images_original'
if legacy.exists():
    destination = BACKUP / 'images_original'
    if destination.exists():
        raise RuntimeError('Backup destination already exists; inspect before moving originals.')
    destination.parent.mkdir(parents=True, exist_ok=True)
    shutil.move(str(legacy), str(destination))

sources = sorted(p for p in PUBLIC.rglob('*') if p.suffix.lower() in {'.jpg', '.jpeg', '.png'})

def optimize(source):
    relative = source.relative_to(PUBLIC)
    backup = BACKUP / 'public' / relative
    backup.parent.mkdir(parents=True, exist_ok=True)
    if backup.exists():
        if backup.read_bytes() != source.read_bytes():
            raise RuntimeError(f'Original backup differs: {relative}')
    else:
        shutil.copy2(source, backup)
    output = source.with_suffix('.webp')
    thumb = source.with_name(source.stem + '-640.webp')
    if output.exists() or thumb.exists():
        raise RuntimeError(f'Output already exists: {relative}')
    with Image.open(source) as opened:
        image = ImageOps.exif_transpose(opened)
        image = image.convert('RGBA' if 'A' in image.getbands() else 'RGB')
        large = image.copy()
        large.thumbnail((2400, 2400), Image.Resampling.LANCZOS)
        is_logo = source.stem == 'kaja_logo'
        large.save(output, 'WEBP', quality=87, method=6, lossless=is_logo)
        small = image.copy()
        small.thumbnail((640, 640), Image.Resampling.LANCZOS)
        small.save(thumb, 'WEBP', quality=82, method=6, lossless=is_logo)
    with Image.open(output) as check:
        check.verify()
    before = source.stat().st_size
    after = output.stat().st_size + thumb.stat().st_size
    source.unlink()
    return {'source': '/' + relative.as_posix(), 'image': '/' + output.relative_to(PUBLIC).as_posix(), 'thumbnail': '/' + thumb.relative_to(PUBLIC).as_posix(), 'before': before, 'after': after}

with ThreadPoolExecutor(max_workers=3) as pool:
    results = list(pool.map(optimize, sources))
if results:
    manifest = ROOT / 'scripts' / 'image-optimization.json'
    previous = json.loads(manifest.read_text()) if manifest.exists() else []
    manifest.write_text(json.dumps(previous + results, ensure_ascii=False, indent=2) + '\n')
print(json.dumps({'count': len(results), 'before': sum(r['before'] for r in results), 'after': sum(r['after'] for r in results)}))

# Export actual widths for accurate srcset descriptors (also for portrait images).
variants = {}
for image_path in sorted(PUBLIC.rglob('*.webp')):
    if image_path.stem.endswith('-640'):
        continue
    thumbnail_path = image_path.with_name(image_path.stem + '-640.webp')
    if not thumbnail_path.exists():
        continue
    options = []
    for candidate in [thumbnail_path, image_path]:
        with Image.open(candidate) as image:
            width = image.width
        if not any(option['width'] == width for option in options):
            options.append({'src': '/' + candidate.relative_to(PUBLIC).as_posix(), 'width': width})
    variants['/' + image_path.relative_to(PUBLIC).as_posix()] = options
(ROOT / 'src/data/imageVariants.json').write_text(json.dumps(variants, ensure_ascii=False, indent=2) + '\n')
