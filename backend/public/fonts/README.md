# Self-Hosted Larken Font Files

Larken (by Ellen Luff) is a commercial/Adobe Fonts typeface not hosted on Google Fonts.

To render the exact **Larken** font across the entire COGNIX '26 website, place your licensed font files in this folder (`backend/public/fonts/`) using any of these formats (`.woff2` recommended):

- `Larken-Regular.woff2` (or `.woff`, `.ttf`, `.otf`)
- `Larken-Medium.woff2` (or `.woff`, `.ttf`, `.otf`)
- `Larken-Bold.woff2` (or `.woff`, `.ttf`, `.otf`)

Until those files are added, the stylesheet automatically falls back to **Marcellus** + **Cormorant Garamond** (the closest free flared-serif matches to Larken on Google Fonts) while keeping `'Larken'` first in the font stack.
