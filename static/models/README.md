# 3D Models

## Tom.glb
- **Format**: GLTF 2.0 Binary (.glb)
- **Location**: `static/models/Tom.glb`
- **Required Animations**:
  1. `idle` — Default standing pose
  2. `listening` — Active listening pose
  3. `speaking` — Speaking with mouth animation
  4. `poke` — Reaction to poke
  5. `pet` — Reaction to pet/swipe
  6. `hold` — Reaction to hold

## Development Placeholder
Current file is a placeholder. To use an actual 3D model:
1. Export from Blender/Maya as GLTF 2.0 binary
2. Include all animations above
3. Optimize using gltf-pipeline or similar
4. Replace `static/models/Tom.glb`

## Testing
The app will gracefully degrade if Tom.glb is not found or fails to load.
