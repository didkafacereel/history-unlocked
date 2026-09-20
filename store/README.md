# Play Console assets

Generated from the supplied 512×512 logo. The in-app icons live in
`assets/images/` and are wired through `app.json`; these two are uploaded by
hand in the Play Console listing.

| File | Spec | Status |
| --- | --- | --- |
| `HistoryUnlocked_icon_512.png` | 512×512 PNG, ≤1024 KB | 343 KB, fully opaque |
| `HistoryUnlocked_feature_1024x500.png` | 1024×500, no alpha | 246 KB, RGB |

The feature graphic keeps an 86 px margin on both sides and leaves its middle
empty, because Play crops the edges on some surfaces and can lay a play button
over the centre.

## Still needed before the listing can go live

- **Screenshots** — at least two, English. These can only be taken from a real
  build on a device; nothing here can produce them.
- **Short and long description.**

Done: the contact address is `support@gridconvertpro.com`, in
`docs/privacy.html` and in the Play Console listing's own contact field.

## Regenerating

The geometry is measured, not guessed: the brass ring is 433 px across inside
the 512 px source and its centre sits at (257, 249), above the middle of the
frame. Anything rebuilt from a new logo has to re-measure those three numbers,
or the Android adaptive icon will have its rim cropped by the launcher — which
only ever shows the middle 72 of 108 dp.
