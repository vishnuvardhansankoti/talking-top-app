# PWA Icons

## Development Placeholders
- `icon-192.svg` — 192x192 placeholder
- `icon-512.svg` — 512x512 placeholder

## Production
For production, convert SVG to PNG:
```bash
# Using ImageMagick:
convert -background none icon-192.svg -define icon:auto-resize=192 icon-192.png
convert -background none icon-512.svg -define icon:auto-resize=512 icon-512.png

# Or using a PNG library in Node.js
```

Update `vite.config.ts` PWA manifest to reference PNG files for production.
