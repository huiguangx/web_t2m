# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ECHO-rebuild is a reverse-engineered implementation of the ECHO project for learning robot motion control. It combines MuJoCo physics simulation, ONNX neural network inference, and Three.js 3D rendering in a Vue3 web application.

## Development Commands

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

Development server runs at http://localhost:5173

## Critical Configuration

**MuJoCo WASM Requirements**: The project uses `SharedArrayBuffer` which requires specific HTTP headers. These are already configured in `vite.config.ts`:

```ts
headers: {
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Embedder-Policy': 'require-corp',
}
```

Do not remove these headers or MuJoCo will fail to initialize.

## Architecture

### Core Modules (`src/core/`)

The application is built around several independent core modules:

- **types.ts** - TypeScript interfaces for motion data and policy configuration
- **mujoco.ts** - MuJoCo WASM loader and physics simulation
- **motion.ts** - Motion data parser (loads JSON motion files)
- **policy.ts** - ONNX runtime inference engine
- **renderer.ts** - Three.js scene setup and rendering
- **robot-renderer.ts** - Robot mesh rendering with Three.js
- **simulator.ts** - Simulation loop coordinator
- **meshes.ts** - Mesh loading utilities

### Data Flow

1. MuJoCo loads robot model from `public/examples/scenes/g1/g1.xml`
2. Motion data loaded from `public/examples/checkpoints/g1/motions/*.json`
3. ONNX policy model loaded from `public/examples/checkpoints/g1/policy_amass.onnx`
4. Simulator coordinates physics updates and neural network inference
5. Three.js renders the robot state in 3D

### Key Dependencies

- `@mujoco/mujoco` - Physics simulation (requires SharedArrayBuffer)
- `onnxruntime-web` - Neural network inference
- `three` - 3D rendering
- `vue` - UI framework

## Resource Files

Robot assets are in `public/examples/`:
- `checkpoints/g1/` - ONNX models, policy configs, motion data
- `scenes/g1/` - MuJoCo XML scene and STL meshes

## Documentation

Learning docs in `docs/`:
- `01-project-setup.md` - Project configuration details
- `02-mujoco-loader.md` - MuJoCo model loading
- `03-motion-data.md` - Motion data format specification
- `04-onnx-inference.md` - ONNX inference implementation
