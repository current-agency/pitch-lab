# Web fonts: Aeonik & Aeonik Fono

Copy your font files here so the site can use them.

## Setup

1. **Aeonik (sans-serif)**  
   Copy the contents of **Aeonik Essentials Website** from your desktop into:
   ```
   apps/site/public/fonts/aeonik/
   ```
   The CSS expects these filenames (rename your files to match if needed):
   - `Aeonik-Regular.woff2`
   - `Aeonik-Medium.woff2`
   - `Aeonik-Bold.woff2`

2. **Aeonik Fono (monospace)**  
   Copy the contents of **Aeonik Fono Essentials Website** from your desktop into:
   ```
   apps/site/public/fonts/aeonik-fono/
   ```
   The CSS expects these filenames (rename your files to match if needed):
   - `AeonikFono-Regular.woff2`
   - `AeonikFono-Medium.woff2`
   - `AeonikFono-Bold.woff2`

If your files use different names, either rename them or update the `@font-face` rules in `app/globals.css` to match your filenames.
