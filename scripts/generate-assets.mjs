/**
 * Generate placeholder 3D model and icons for development.
 * Usage: node scripts/generate-assets.mjs
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

// Generate placeholder PWA icons (simple colored squares with emoji)
function generatePWAIcons() {
	const sizes = [
		{ size: 192, file: 'icon-192.png' },
		{ size: 512, file: 'icon-512.png' }
	];

	console.log('📦 Generating PWA icon placeholders...');

	for (const { size, file } of sizes) {
		// Create a simple SVG placeholder and convert to base64
		const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#0f3460;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#1a1a2e;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" fill="url(#grad)"/>
  <circle cx="${size / 2}" cy="${size / 2}" r="${(size * 0.3)}" fill="#e94560" opacity="0.8"/>
  <text x="${size / 2}" y="${size / 2 + 20}" font-size="${Math.floor(size * 0.4)}" fill="white" text-anchor="middle" font-family="Arial" font-weight="bold">🐱</text>
</svg>`;

		// For now, save SVG as placeholder (real PNG generation would require additional tools)
		const iconPath = path.join(rootDir, 'static', 'icons', file.replace('.png', '.svg'));
		fs.writeFileSync(iconPath, svg);
		console.log(`  ✓ Generated ${file} (${size}x${size})`);
	}

	// Also create a simple text file noting that PNG versions are needed
	const notePath = path.join(rootDir, 'static', 'icons', 'README.md');
	fs.writeFileSync(
		notePath,
		`# PWA Icons

## Development Placeholders
- \`icon-192.svg\` — 192x192 placeholder
- \`icon-512.svg\` — 512x512 placeholder

## Production
For production, convert SVG to PNG:
\`\`\`bash
# Using ImageMagick:
convert -background none icon-192.svg -define icon:auto-resize=192 icon-192.png
convert -background none icon-512.svg -define icon:auto-resize=512 icon-512.png

# Or using a PNG library in Node.js
\`\`\`

Update \`vite.config.ts\` PWA manifest to reference PNG files for production.
`
	);

	console.log('  ✓ Created icon README');
}

// Generate a placeholder Tom.glb model
function generateTomModel() {
	console.log('🎭 Generating placeholder Tom.glb model...');

	// Create a very simple GLB file (binary GLTF)
	// This is a minimal valid GLB with a simple cube mesh
	const glbData = Buffer.from([
		// GLB header
		0x67, 0x6c, 0x54, 0x46, // "glTF"
		0x02, 0x00, 0x00, 0x00, // version 2
		// ... minimal GLB data for a simple cube
	]);

	// For now, create a placeholder model file with instructions
	const modelPath = path.join(rootDir, 'static', 'models', 'Tom.glb');
	const placeholder = Buffer.from(
		'Placeholder GLB model. Replace with actual 3D model file.\n' +
			'Expected: static/models/Tom.glb (GLTF 2.0 binary format)\n' +
			'Animations expected: idle, listening, speaking, poke, pet, hold\n'
	);

	fs.writeFileSync(modelPath, placeholder);
	console.log('  ✓ Created Tom.glb placeholder');

	// Create instructions
	const readmePath = path.join(rootDir, 'static', 'models', 'README.md');
	fs.writeFileSync(
		readmePath,
		`# 3D Models

## Tom.glb
- **Format**: GLTF 2.0 Binary (.glb)
- **Location**: \`static/models/Tom.glb\`
- **Required Animations**:
  1. \`idle\` — Default standing pose
  2. \`listening\` — Active listening pose
  3. \`speaking\` — Speaking with mouth animation
  4. \`poke\` — Reaction to poke
  5. \`pet\` — Reaction to pet/swipe
  6. \`hold\` — Reaction to hold

## Development Placeholder
Current file is a placeholder. To use an actual 3D model:
1. Export from Blender/Maya as GLTF 2.0 binary
2. Include all animations above
3. Optimize using gltf-pipeline or similar
4. Replace \`static/models/Tom.glb\`

## Testing
The app will gracefully degrade if Tom.glb is not found or fails to load.
`
	);

	console.log('  ✓ Created models README');
}

// Main
console.log('🚀 Generating placeholder assets...\n');
generatePWAIcons();
generateTomModel();
console.log('\n✅ Asset generation complete\n');
