# SystemDesign.md
<!-- Last updated: 2026-02-08 | Updated by: claude | Reason: Initial creation from full codebase analysis -->

## Architecture Overview
A single-page, client-only web application that serves as an interactive character sheet for the Blades in the Dark TTRPG. All state lives in the browser's `localStorage`; there is no server, no database, and no build step. The three source files (`index.html`, `styles.css`, `app.js`) are served as static assets, with Matter.js and GSAP loaded from CDN.

## Component Map
| Component | Location | Role | Runtime | Talks To |
|-----------|----------|------|---------|----------|
| HTML Shell | `index.html` | DOM structure for all 3 tabs, toolbar, dice overlay, settings panel | Browser | Styled by CSS, driven by JS |
| Stylesheet | `styles.css` | All layout, theming (CSS vars), responsive breakpoints, print styles | Browser | Read by HTML Shell |
| State Manager | `app.js:1-164` | `defaultState()`, `loadState()`, `saveState()`, `updateTitle()` | Browser/JS | localStorage, Renderer |
| Renderer | `app.js:183-514` | `renderAll()` and 17 render functions that sync state → DOM | Browser/JS | State Manager, DOM |
| Event System | `app.js:527-940` | Delegated `input`, `click`, `change` handlers on `.sheet` | Browser/JS | State Manager, Renderer |
| Import/Export/Reset | `app.js:942-980` | JSON file export/import via File API, reset to defaults | Browser/JS | State Manager, Renderer |
| Print | `app.js:983-1038` | Opens cloned sheet in new tab with print-friendly styles | Browser/JS | DOM |
| DiceEngine | `app.js:1049-1663` | IIFE module: Matter.js physics, 3D CSS cube rendering, selection, fan-out throw | Browser/JS | Matter.js, GSAP, DOM |
| Dice Settings | `app.js:1668-1775` | Slider panel for friction/bounce/weight with presets, persisted to `bladesDS` | Browser/JS | DiceEngine, localStorage |
| GSAP Animations | `app.js:1780-1872` | Page entrance, tab transitions, section collapse/expand animations | Browser/JS | GSAP, DOM |

## Data Flow

### Character State Flow
```
User Interaction (click/type)
  → Event handler (delegated on .sheet)
    → Mutate `state` object directly
      → saveState() → localStorage.setItem('blades-character-sheet', JSON.stringify(state))
      → Appropriate render function (renderDots, renderFriends, etc.) → DOM update
```

### Page Load Flow
```
DOMContentLoaded
  → init()
    → loadState() → localStorage.getItem → JSON.parse → Object.assign(defaultState(), saved)
    → renderAll() → all 17 render functions sync state to DOM
    → bindEvents() → attach delegated handlers
    → updateTitle() → set document.title from state.name + state.playbook
    → DiceEngine.init() → Matter.js engine, walls, mouse constraint, render loop
    → initDiceSettings() → load bladesDS from localStorage, bind sliders
    → initAnimations() → GSAP entrance timeline
```

### Import Flow
```
User clicks Import → file picker opens
  → FileReader.readAsText(file)
    → JSON.parse(result) → Object.assign(defaultState(), imported)
      → saveState() → renderAll()
```

### Export Flow
```
User clicks Export
  → JSON.stringify(state) → Blob → URL.createObjectURL → invisible <a> click → download
```

### Dice Flow
```
User clicks "+ d6"
  → DiceEngine.addDie()
    → Matter.Bodies.rectangle() added to physics world
    → DOM element (.die with .die-cube, 6 faces, shadow, result label) appended to #dice-container
    → GSAP spawn animation

render loop (requestAnimationFrame):
  → For each die: syncDie()
    → Read body.position & body.velocity from Matter.js
    → Update DOM position (left/top)
    → Compute 3D rotation from velocity (rotX/rotY/rotZ with rotational friction)
    → Apply CSS transform (translateY for lift, scale, rotateX/Y/Z)
    → Update shadow (width, blur, opacity based on "height")
    → Settle detection: if speed < 0.3 && rotSpeed < 0.4 for 10+ frames
      → Snap to nearest 90° → getTopFace() → show result label with GSAP

User grabs die → MouseConstraint startdrag
  → Tilt toward movement direction
User releases die → MouseConstraint enddrag
  → Velocity transferred to rotational tumble
  → If die is selected and part of group → fanOutThrow() spreads others
```

## Key Contracts & Interfaces

### State Shape (`defaultState()`, app.js:41-136)
The canonical state object. Every field must have a default. `loadState()` merges saved data with defaults via `Object.assign(defaultState(), saved)`, so new fields are automatically filled on old saves.

Key fields:
- `name`, `alias`, `crew`, `playbook`, `look`, `heritage`, `background` — strings
- `vice`, `vicePurveyor` — strings
- `specialAbilities` — string array (variable length)
- `coin` (max 4), `stash` (max 40) — integers
- 12 action ratings: `hunt`, `study`, `survey`, `tinker`, `finesse`, `prowl`, `skirmish`, `wreck`, `attune`, `command`, `consort`, `sway` — integers 0-4
- `playbookXp` (max 8), `insightXp`/`prowessXp`/`resolveXp` (max 6) — integers
- `stress` (max 9), `trauma` (max 4), `traumaConditions` — int, int, string array
- `harm3`, `harm2a`, `harm2b`, `harm1a`, `harm1b` — strings
- `healingClock` (max 4) — integer
- `armor`, `heavyArmor`, `specialArmor` — booleans
- `friends` — array of `{ name: string, status: 'neutral'|'close'|'rival' }`
- `items` — array of `{ name: string, load: number, carried: boolean }`
- `loadLevel` — `''|'light'|'normal'|'heavy'`
- Crew fields: `rep` (max 12), `heat` (max 9), `crewTier` (max 4), `wantedLevel` (max 4), `crewXp` (max 8), `hold` — `'weak'|'strong'`
- `huntingGround` — string
- `claim_*` — 15 boolean keys for the Shadows claims map (`claim_lair` always true)
- `upgrade_*` — 5 boolean keys for crew upgrades
- `crewAbility_*` — 7 boolean keys for crew special abilities
- `lairName`, `lairLocation`, `lairNotes` — strings
- `crewContacts` — array of `{ name: string, status: 'neutral'|'close'|'rival' }`
- `factions` — array of `{ name: string, tier: number, status: string, notes: string, clocks: [{ name: string, segments: 4|6|8|12, filled: number }] }`

### DOM Data Attribute Contracts
| Attribute | Used By | Purpose |
|-----------|---------|---------|
| `data-field` | Text inputs, textareas, checkboxes, option groups | Binds element to a top-level state key |
| `data-track` | `.box-track`, `.xp-track` | Binds to an integer state key for click-to-fill tracks |
| `data-max` | Tracks, dots | Maximum value for the track |
| `data-action` | `.action-row` | Maps to one of the 12 action rating state keys |
| `data-value` | `.option` | The value to write to state when this option is clicked |
| `data-claim` | `.claim` | Maps to a `claim_*` boolean state key |
| `data-tab` | `.tab`, `.tab-panel` | Tab identifier for switching |
| `data-collapsible` | `.section` | Marks a section as collapsible |
| `data-add` | `.add-btn` | Type of item to add: `'ability'`, `'friend'`, `'crewContact'`, `'item'`, `'faction'` |
| `data-*-index` | Various | Array index for list items (friends, items, abilities, etc.) |

### DiceEngine Public API (IIFE return, app.js:1656-1662)
```
DiceEngine.init()                    — Set up physics world, walls, mouse, render loop
DiceEngine.addDie()                  — Spawn a new die (max 10)
DiceEngine.removeLastDie()           — Remove most recently added die
DiceEngine.applySettings(settings)   — Update physics: { restitution, frictionAir, density, friction }
DiceEngine.getSettings()             — Returns current physics settings object
```

### localStorage Keys
| Key | Format | Used By |
|-----|--------|---------|
| `blades-character-sheet` | JSON (full state object) | State Manager |
| `bladesDS` | JSON `{ friction, bounce, weight, preset }` | Dice Settings |

### PLAYBOOK_DATA (app.js:9-38)
```
{ [playbookName]: { actions: { [actionName]: dotCount }, xpTrigger: string } }
```
Used by: playbook selection handler (auto-fills XP trigger), `renderPlaybookIndicators()` (shows +N badges)

## State Management
- **All state is in-memory** in the global `state` object (app.js:139)
- **Persistence:** Every mutation calls `saveState()` which writes the full state to `localStorage`
- **Load:** `loadState()` reads from `localStorage` and merges with `defaultState()` to handle schema evolution
- **No undo/redo** — state changes are immediate and final
- **Dice settings** are stored separately in `bladesDS` localStorage key
- **Session state** (which tab is active, which sections are collapsed) is NOT persisted — ephemeral

## Authentication & Authorization Flow
None. This is a fully client-side app with no user accounts, no server, and no network requests (beyond CDN script loads). All data is local to the browser.

## Critical Constraints
- **No build tools:** Must remain deployable as raw static files. No bundler, no transpiler, no npm. — *Adding a build step would break the deployment model and developer workflow.*
- **No ES modules:** `app.js` runs as a single script tag. All functions are global or inside the DiceEngine IIFE. — *Modules require a bundler or `type="module"` which changes script loading behavior.*
- **State merging:** New state fields MUST be added to `defaultState()` with sensible defaults. `loadState()` uses `Object.assign(defaultState(), saved)` which is a shallow merge — *nested objects in saved state will overwrite defaults entirely, so arrays and objects must have complete defaults.*
- **claim_lair is always true:** The lair claim cannot be toggled off (hardcoded guard in click handler, app.js:784). — *It represents the crew's starting position in the game rules.*
- **CDN dependencies:** Matter.js and GSAP are loaded from jsdelivr CDN. If CDN is unavailable, dice are disabled and animations are skipped (graceful fallback checks exist). — *No local fallback copies exist.*
- **Max 10 dice:** `maxDice` is hardcoded to 10 in DiceEngine (app.js:1057). — *Performance constraint for the physics simulation.*

## Module Dependency Graph
```
index.html
  ├── styles.css (link)
  ├── matter.min.js (CDN script, loaded before app.js)
  ├── gsap.min.js (CDN script, loaded before app.js)
  └── app.js (script)
        ├── State Manager (global functions: defaultState, loadState, saveState, updateTitle)
        ├── Renderer (global functions: renderAll, renderTextFields, renderOptionGroups, ...)
        │     └── depends on: State Manager (reads `state`), DOM (writes innerHTML/classList)
        │     └── depends on: clockSVG() for dynamic faction clock generation
        │     └── depends on: escHtml() for XSS-safe string interpolation
        ├── Event System (bindEvents: delegated handlers on .sheet)
        │     └── depends on: State Manager (mutates `state`), Renderer (calls render*), saveState()
        │     └── depends on: switchTabAnimated (GSAP Animations)
        │     └── depends on: toggleCollapseAnimated (GSAP Animations)
        ├── Import/Export/Reset (exportCharacter, importCharacter, resetCharacter)
        │     └── depends on: State Manager, Renderer
        ├── Print (printSheet)
        │     └── depends on: DOM (clones .sheet), escHtml()
        ├── DiceEngine (IIFE, fully self-contained)
        │     └── depends on: Matter.js (global `Matter`), GSAP (global `gsap`, optional)
        │     └── depends on: DOM (#dice-container, #selection-box)
        ├── Dice Settings (initDiceSettings)
        │     └── depends on: DiceEngine.applySettings(), localStorage
        └── GSAP Animations (initAnimations, switchTabAnimated, toggleCollapseAnimated)
              └── depends on: GSAP (global `gsap`, optional — all functions check availability)
              └── depends on: switchTab() as non-animated fallback
```

## Configuration & Environment
- **No environment variables** — everything is hardcoded or stored in localStorage
- **CDN URLs** (index.html:729-730):
  - `https://cdn.jsdelivr.net/npm/matter-js@0.20.0/build/matter.min.js`
  - `https://cdn.jsdelivr.net/npm/gsap@3.12.7/dist/gsap.min.js`
- **CSS custom properties** (styles.css:11-33): All theme colors and fonts defined in `:root`
- **Dice physics presets** (app.js:1669-1673): Realistic, Light, Heavy — slider value tuples
- **Playbook data** (app.js:9-38): Starting action dots and XP triggers per playbook

## Known Pitfalls
<!-- ADD TO THIS SECTION EVERY TIME A MISTAKE IS MADE AND CAUGHT -->
| Don't Do This | Do This Instead | Why |
|---------------|-----------------|-----|
| Add a new state field without updating `defaultState()` | Always add new fields with defaults in `defaultState()` | `loadState()` merges via `Object.assign(defaultState(), saved)` — missing defaults cause undefined values |
| Use ES module syntax (`import`/`export`) | Keep everything as global functions or inside the DiceEngine IIFE | No bundler exists; `app.js` is loaded as a plain `<script>` tag |
| Hardcode colors in CSS | Use CSS custom properties from `:root` | Breaks theming consistency and makes future dark mode harder |
| Use `innerHTML` with unsanitized user input | Always pass through `escHtml()` (app.js:1041-1043) | XSS risk from character names, faction names, etc. stored in state |
| Modify `claim_lair` toggle behavior | Keep `claim_lair` always true (guard at app.js:784) | The Lair is the crew's starting claim per game rules |
| Add deeply nested objects to state without thought | Remember `Object.assign` is a shallow merge | Nested objects from saved state overwrite defaults entirely — arrays/objects need complete defaults |
| Tweak dice physics constants without testing all scenarios | Test grab, light toss, hard throw, wall bounce, multi-die fan-out, and settle detection after any change | Dice physics has been the hardest thing to get right — small changes cascade unpredictably |

## Planned / In-Progress Architecture Changes

### Near-term
- **Dark mode** — CSS custom properties already in place; needs a toggle and alternate `:root` values
- **Delete character** — Currently only "New Character" (reset). Need explicit delete for multi-character support
- **Copy character** — Duplicate an existing character sheet

### Medium-term
- **Switchable characters** — Support multiple characters per browser (death is a big part of the game). Will need a character list/selector and per-character storage keys
- **Character images** — Image URL field and/or Giphy search integration for player character portraits
- **Crew member profiles** — Display other crew members with pictures/Giphy alongside the player's character
- **Mobile-friendly version** — Responsive improvements or dedicated mobile layout

### Long-term
- **Modular architecture** — As features grow, the single `app.js` will need to be broken into modules (while still avoiding a build step if possible)
- **Discord bot** — Dice rolling and other game utilities via Discord (separate project, not part of this codebase yet)

### Privacy Constraint
- **Local-only, no logins, no player data collection.** All data stays in the browser. Import/export JSON files are the sharing mechanism. This is a firm requirement.
