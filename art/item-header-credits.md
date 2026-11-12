# Item header artwork

The `item-header-*` images are Path of Exile interface artwork by Grinding Gear Games,
retrieved from PoE2DB's public image CDN on 2026-11-12.
They are game artwork, not original SSE artwork, and remain the property
of their respective rights holders.

Sources (replace `{part}` with `left`, `middle`, or `right`):

- Normal: https://cdn.poe2db.tw/image/item/popup2/header-normal-{part}.webp
- Magic: https://cdn.poe2db.tw/image/item/popup2/header-magic-{part}.webp
- Rare: https://cdn.poe2db.tw/image/item/popup2/header-double-rare-{part}.webp
- Unique: https://cdn.poe2db.tw/image/item/popup2/header-double-unique-{part}.webp
- Runeforged Unique: https://cdn.poe2db.tw/image/item/popup2/header-double-runic-unique-{part}.webp
- Runeforged Normal: https://cdn.poe2db.tw/image/Art/2DArt/UIImages/InGame/RunicItemsHeaderWhite{Part}.webp
- Runeforged Magic: https://cdn.poe2db.tw/image/Art/2DArt/UIImages/InGame/RunicItemsHeaderMagic{Part}.webp
- Runeforged Rare: https://cdn.poe2db.tw/image/Art/2DArt/UIImages/InGame/RunicItemsHeaderRare{Part}.webp
- Foil: https://cdn.poe2db.tw/image/Art/2DArt/UIImages/InGame/ItemsHeaderFoil{Part}.webp
- Desecrated symbol: https://cdn.poe2db.tw/image/item/popup2/desecrated-symbol.webp
- Vaal symbol: https://cdn.poe2db.tw/image/item/popup/vaal-symbol.webp

The earlier foil WebP set and small symbol WebPs are retained locally but are
not referenced by the current UI. The current end symbols use lossless 44×44
PNG originals from PoE2 Wiki:

- https://www.poe2wiki.net/wiki/File:Vaal_unique_icon.png
- https://www.poe2wiki.net/wiki/File:Desecrated_item_influence_icon.png

The current `item-header-foil-poe2-{left,middle,right}.png` pieces are unchanged
pixel crops from the user's PoE 2 foil-header screenshot supplied on 2026-11-12.
Source size: 918×127; crop rectangles `(x, y, width, height)`:
left `(14, 19, 62, 79)`, middle `(110, 19, 72, 79)`, right `(847, 19, 62, 79)`.
These crops contain only frame artwork, without the fixed item name or the
surrounding game UI. No generated repainting or upscaling was applied.

The active Rare and Magic PNG frame strips likewise preserve unchanged pixels
from the user's in-game references supplied on 2026-11-12, to match the trim and
background colors rather than recoloring the title alone:

- Rare source: 760×108; left `(9,14,71,78)`, middle `(100,14,71,78)`, right `(688,14,71,78)`.
- Magic source: 875×889; left `(16,1,47,49)`, middle `(85,1,47,49)`, right `(626,1,47,49)`.
- The older Rare/Magic WebP pieces remain locally; the standard frames now use PNG.
- Normal, Magic, and Rare equipment headers show only the clickable base type/category. Unique headers retain the unique name and base type. Original item identities remain stored for trade and logging.

The active Unique PNG frame strips preserve unchanged pixels from the user's
Astramentis in-game reference, supplied on 2026-11-12 (884×648):
left `(9,5,71,77)`, middle `(100,5,71,77)`, right `(668,5,71,77)`.
This matches the game's copper trim and background without changing the rarity
or special-header detection. The original small Unique WebP pieces remain local.

`{Part}` uses `Left`, `Middle`, or `Right` with an initial capital letter.
The symbols are layered over the item frame, including Runeforged + Desecrated.

Reference: https://www.poe2wiki.net/wiki/Category:Template_images

The Vaal unique identity fallback in `app.js` comes from the Cultivated Uniques
section of https://poe2db.tw/us/Unique_item (2026-11-12). Explicit copied-item
Vaal labels are also recognized, including items absent from that snapshot.

SSE packages the images locally; opening an item does not download them.
No Exiled Exchange 2 reference files are used as shipped assets or dependencies.
