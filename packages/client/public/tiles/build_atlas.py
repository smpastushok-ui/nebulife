"""
build_atlas.py — Compose tiles_temperate.png (2048×2048, 8×8 = 64 frames of 256×256)

Atlas layout v4 (habitable planet — grass + trees + resource sprites):
  Frame  0 : o1.png                  ← water / ocean (1 variant)
  Frames 1–9 : резерв                ← майбутні варіанти води
  Frame 10 : habitable/grass-1.png   ← ground A (трава, 70%, buildable)
  Frame 11 : habitable/grass-2.png   ← ground B (трава variant)
  Frame 12 : habitable/grass-3.png   ← ground C (трава variant)
  Frame 13 : habitable/tree-big1.png ← tree A (дерево, 30% blob, +1 ізотоп)
  Frame 14 : habitable/tree-big2.png ← tree B
  Frame 15 : habitable/tree-big3.png ← tree C
  Frame 16 : habitable/f6-stump.png  ← пень (після видобутку)
  Frame 17 : habitable/tree-small.png← молоде дерево (регенерація ч. 2)

  --- Спрайти ресурсів для землеподібних (habitable/temperate) планет ---
  Frame 18 : habitable/ore-1.png     ← ore A (кам'янисті виходи, mineral deposit)
  Frame 19 : habitable/ore-2.png     ← ore B
  Frame 20 : habitable/ore-3.png     ← ore C
  Frame 21 : habitable/vent-1.png    ← vent A (газові/водні виходи, volatile source)
  Frame 22 : habitable/vent-2.png    ← vent B
  Frame 23 : habitable/vent-3.png    ← vent C
  Frame 24 : habitable/ore-depleted.png ← вироблена руда
  Frame 25 : habitable/ore-small.png    ← регенерація руди
  Frame 26 : habitable/vent-dry.png     ← висохле джерело
  Frame 27 : habitable/vent-small.png   ← регенерація джерела
  --- Інші біоми (barren, ice, volcanic) матимуть свої набори спрайтів ---

  Frames 28–63: резерв               ← hills, peaks, ice, lava, тощо

Drop PNG files into this directory and re-run to rebuild the atlas.
Missing files → frame stays transparent (renderer falls back to colored diamond).
"""

from PIL import Image
import os

FRAME = 256
COLS  = 8
SIZE  = FRAME * COLS  # 2048

atlas = Image.new('RGBA', (SIZE, SIZE), (0, 0, 0, 0))

DIR = os.path.dirname(os.path.abspath(__file__))

def paste(frame_idx: int, filename: str) -> None:
    path = os.path.join(DIR, filename)
    if not os.path.exists(path):
        print(f'  [skip] {filename} not found → frame {frame_idx} stays transparent')
        return
    img = Image.open(path).convert('RGBA')
    if img.size != (FRAME, FRAME):
        img = img.resize((FRAME, FRAME), Image.LANCZOS)
        print(f'  [resize] {filename} → {FRAME}×{FRAME}')
    cx = (frame_idx % COLS) * FRAME
    cy = (frame_idx // COLS) * FRAME
    atlas.paste(img, (cx, cy))
    print(f'  [ok] {filename} → frame {frame_idx}  (atlas col={frame_idx%COLS}, row={frame_idx//COLS})')

print('── Water (frame 0) ──')
paste(0, 'o1.png')

print('── Plain ground / grass (frames 10–12) ──')
paste(10, 'habitable/grass-1.png')
paste(11, 'habitable/grass-2.png')
paste(12, 'habitable/grass-3.png')

print('── Forest trees (frames 13–15) ──')
paste(13, 'habitable/tree-big1.png')
paste(14, 'habitable/tree-big2.png')
paste(15, 'habitable/tree-big3.png')

print('── Harvest states (frames 16–17) ──')
paste(16, 'habitable/f6-stump.png')
paste(17, 'habitable/tree-small.png')

print('── Ore deposits (frames 18–20) ──')
paste(18, 'habitable/ore-1.png')
paste(19, 'habitable/ore-2.png')
paste(20, 'habitable/ore-3.png')

print('── Vent sources (frames 21–23) ──')
paste(21, 'habitable/vent-1.png')
paste(22, 'habitable/vent-2.png')
paste(23, 'habitable/vent-3.png')

print('── Depleted / regrowth states (frames 24–27) ──')
paste(24, 'habitable/ore-depleted.png')
paste(25, 'habitable/ore-small.png')
paste(26, 'habitable/vent-dry.png')
paste(27, 'habitable/vent-small.png')

out = os.path.join(DIR, 'tiles_temperate.png')
atlas.save(out, optimize=False)
print(f'\nSaved → {out} ({SIZE}×{SIZE} RGBA)')
