<!--
Sync Impact Report:
- Version change: [UNVERSIONED] → 1.0.0
- Initial constitution creation for ECHO-rebuild project
- Principles defined: 5 core principles tailored to robotics simulation learning project
- Templates requiring updates: ⚠ pending review of plan/spec/tasks templates
- Follow-up: Validate template alignment in next workflow execution
-->

# ECHO-rebuild Constitution

## Core Principles

### I. Modular Core Architecture

All functionality MUST be organized into independent, single-responsibility modules in `src/core/`.
Each module must:
- Export a clear, minimal public API
- Have no circular dependencies
- Be independently testable
- Document its purpose and data flow

**Rationale**: The project integrates complex systems (MuJoCo physics, ONNX inference, Three.js rendering). Modularity prevents coupling and makes each subsystem understandable in isolation, critical for a learning-focused codebase.

### II. Critical Configuration Preservation (NON-NEGOTIABLE)

WASM-required HTTP headers in `vite.config.ts` MUST NEVER be removed or modified:
```
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```

**Rationale**: MuJoCo WASM requires `SharedArrayBuffer`, which browsers only enable with these headers. Removing them breaks the entire physics simulation with cryptic runtime errors.

**How to apply**: Any Vite configuration changes must preserve these headers. Code reviews must verify header presence.

### III. Documentation-Driven Learning

Every non-trivial implementation MUST have corresponding documentation in `docs/` explaining:
- What the code does (high-level purpose)
- Why it's structured that way (architectural decisions)
- How it integrates with other modules (data flow)

**Rationale**: This is a learning project for understanding robot motion control. Code alone is insufficient—learners need context, rationale, and system-level understanding.

**How to apply**: New features require a docs/ markdown file before PR approval. Updates to core modules require docs updates.

### IV. Minimal Dependencies

New dependencies require explicit justification demonstrating:
- No reasonable implementation without the dependency
- Active maintenance and WASM/browser compatibility
- Alignment with existing stack (Vue3, TypeScript, Vite)

**Rationale**: The project already integrates specialized dependencies (@mujoco/mujoco, onnxruntime-web, three). Additional dependencies increase bundle size, complexity, and maintenance burden in a learning context.

### V. Type Safety & Error Handling

All core modules MUST:
- Use strict TypeScript with no `any` types (except unavoidable external APIs)
- Validate external data (motion JSON, ONNX models, mesh files)
- Provide clear error messages indicating what failed and why

**Rationale**: Runtime errors in physics simulation or neural network inference are hard to debug. Strong typing and validation catch issues early. Clear errors help learners understand failure modes.

## Technical Constraints

### Browser Compatibility
- Target modern browsers with WASM and SharedArrayBuffer support
- No polyfills for missing WASM features
- Test in Chrome/Edge (primary) and Firefox (secondary)

### Performance Standards
- Physics simulation must maintain 60 FPS for real-time playback
- ONNX inference must complete within frame budget (16ms)
- Three.js rendering must not block simulation loop

### Asset Management
- Robot models, meshes, and motion data live in `public/examples/`
- No hardcoded paths—use configuration or discovery
- Asset loading must handle missing files gracefully

## Development Workflow

### Code Changes
1. Read existing code and documentation before modifying
2. Preserve module boundaries—don't introduce cross-cutting changes
3. Update docs/ if changing core module behavior
4. Test in browser (npm run dev) before committing

### Quality Gates
- TypeScript compilation must succeed (npm run build)
- No console errors in browser during normal operation
- Documentation must be updated for API changes

## Governance

This constitution supersedes informal practices. All code changes must comply with core principles.

**Amendment Process**:
- Propose changes via discussion (issue or PR comment)
- Document rationale for amendment
- Update constitution version following semantic versioning
- Propagate changes to dependent templates

**Versioning Policy**:
- MAJOR: Remove or redefine core principles
- MINOR: Add new principles or sections
- PATCH: Clarify wording, fix typos

**Compliance**:
- Code reviews must verify principle adherence
- Violations require explicit justification or refactoring
- Use CLAUDE.md for AI assistant guidance aligned with this constitution

**Version**: 1.0.0 | **Ratified**: 2026-04-01 | **Last Amended**: 2026-04-01
