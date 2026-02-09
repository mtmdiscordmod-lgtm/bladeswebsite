# Task.md
<!-- This file describes the CURRENT task only. Completed tasks are archived in OlderTasks.md -->

## Current Task
**Status:** In Progress
**Started:** 2026-02-09
**Description:** Replace the CSS 3D / Matter.js dice engine with real 3D physics using Three.js + Cannon-ES. Add customizable dice skins (colors/themes).

## Goal
Dice should feel like real dice — proper 3D tumbling with actual angular momentum, realistic collision and settle behavior. Users should be able to customize dice appearance (color, style). All existing UX preserved: grab-and-throw, Ctrl+click selection, fan-out throw, physics settings, result display.

## Affected Components
| Component | What Changes | Risk Level |
|-----------|-------------|------------|
| DiceEngine (app.js:1049-1663) | Replaced entirely — moved to `dice-engine.js` as ES module | HIGH |
| Dice Settings (app.js:1668-1775) | Updated to work with new engine + skin picker added | MED |
| index.html (scripts, dice markup) | Import map for Three.js/Cannon-ES, new module script tag, skin picker HTML | MED |
| styles.css (dice section) | Replace CSS 3D cube styles with Three.js canvas styles, add skin picker styles | MED |
| app.js (init, GSAP) | Remove old DiceEngine IIFE, call new engine from init | LOW |

## Implementation Plan
1. Create `dice-engine.js` as ES module with Three.js + Cannon-ES
   - Three.js scene with transparent background overlaying the page
   - Cannon-ES world with top-down-ish perspective (angled camera)
   - Dice as BoxGeometry meshes with pip textures + Cannon-ES rigid bodies
   - Mouse interaction: grab and throw via raycasting + Cannon-ES constraints
   - Settle detection via velocity/angularVelocity thresholds
   - Face detection via face normal dot product with up vector
   - Selection box and fan-out throw preserved
   - Expose DiceEngine API to window for app.js compatibility
2. Add dice skin system
   - Color picker for dice body and pip color
   - Material presets (matte, glossy, metallic)
   - Persist skin settings to localStorage (bladesDS key)
3. Update index.html
   - Add import map for Three.js + Cannon-ES CDN
   - Replace Matter.js script tag with module script for dice-engine.js
   - Add skin picker UI to settings panel
4. Update styles.css
   - Remove old CSS 3D cube styles (.die-cube, .die-face, etc.)
   - Add Three.js canvas overlay styles
   - Add skin picker styles
5. Update app.js
   - Remove old DiceEngine IIFE (lines 1049-1663)
   - Remove old dice settings that are now in dice-engine.js
   - Keep GSAP result animations (call from new engine)

## Acceptance Criteria
- [ ] Dice tumble with real 3D angular momentum
- [ ] Dice settle naturally and show correct face result
- [ ] Grab-and-throw works (click and drag a die, release to throw)
- [ ] Ctrl+click selection box works, fan-out throw works
- [ ] Physics settings (friction, bounce, weight) still adjustable
- [ ] Dice skin color is customizable and persisted
- [ ] No build step required — CDN import map only
- [ ] Existing character sheet functionality unaffected
- [ ] Browser console has zero errors
- [ ] SystemDesign.md updated with new architecture
- [ ] No Known Pitfalls violated

## Open Questions
- Camera angle: true top-down or slight angle for depth perception?
- Should dice cast shadows on a visible "table" surface or stay transparent-background?

## Notes / Decisions Made During Task
- Chose Three.js + Cannon-ES over @3d-dice/dice-box to preserve existing grab-and-throw UX
- Three.js r182 + Cannon-ES 0.20.0 via jsdelivr CDN with import maps
- dice-engine.js will be a separate ES module file (new file, not in app.js) to use import syntax
- DiceEngine exposed on window object so app.js (non-module) can still call it
