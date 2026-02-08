# CLAUDE.md

## Project Identity
An interactive web-based character sheet for the "Blades in the Dark" tabletop RPG. It lets players create and manage characters, track crew mechanics (Shadows archetype), manage faction relationships, and roll dice with physics-based 3D animation — all persisted locally in the browser via localStorage.

## Tech Stack & Environment
- **HTML5** — Single `index.html` with semantic markup, no templating
- **CSS3** — `styles.css` with CSS custom properties, Grid, Flexbox, print styles
- **Vanilla JavaScript (ES6)** — `app.js`, no modules, no transpiler, no build step
- **Matter.js v0.20.0** (CDN) — 2D rigid-body physics for dice engine
- **GSAP v3.12.7** (CDN) — Animations for tab transitions, dice effects, page load
- **Deployment:** Static files — any web server, no server-side runtime
- **Persistence:** `localStorage` keys `blades-character-sheet` (state) and `bladesDS` (dice settings)
- **Version:** v0.7

## Before You Write Any Code
1. Read `SystemDesign.md` to understand full system architecture
2. Read `Task.md` to understand what you're currently working on
3. Check "Known Pitfalls" in SystemDesign.md — these are mistakes you've made before
4. Check "Critical Constraints" — these are rules that cannot be broken
5. If the task touches an interface between components, review "Key Contracts" in SystemDesign.md
6. If you're unsure how something works, READ THE RELEVANT SOURCE FILES before guessing

## Coding Standards
- **No frameworks, no build tools.** This is vanilla HTML/CSS/JS — keep it that way.
- **No ES modules.** Everything runs in a single `app.js` script in the global scope.
- **State shape matters.** The `defaultState()` function (app.js) defines the canonical state shape. Any new fields must be added there with sensible defaults. The `loadState()` function merges saved state with defaults so new fields are handled gracefully on existing saves.
- **DOM data attributes drive binding.** Use `data-field`, `data-action`, `data-value` attributes in HTML. JS event handlers read these — don't couple logic to CSS class names.
- **CSS custom properties for theming.** All colors and fonts use `:root` variables defined at the top of `styles.css`. Don't use hardcoded color values.
- **Section separators.** Use `// ── Section Name ──` comment style in JS and `/* ═══ Section ═══ */` in CSS to maintain readability.
- **GSAP for complex animations, CSS transitions for simple ones.** Don't mix approaches within the same interaction.
- **DiceEngine is a module pattern** (IIFE-style object in `app.js`). Keep dice logic encapsulated within it.

## File & Folder Conventions
```
/
├── index.html          — All markup (733 lines). Structured by tab: Character, Crew, Factions
├── styles.css          — All styles (1,711 lines). Organized by section with comment headers
├── app.js              — All logic (1,872 lines). Organized top-to-bottom:
│                         1. Constants & playbook data (1-38)
│                         2. State management (40-164)
│                         3. Rendering functions (173-514)
│                         4. Tab switching (516-524)
│                         5. Event binding (527-940)
│                         6. Import/Export/Reset (942-980)
│                         7. Print functionality (983-1038)
│                         8. DiceEngine module (1049-1663)
│                         9. Dice settings panel (1668-1775)
│                         10. GSAP animations (1780-1869)
├── blades_sheets_v8_2_Blank_Character_Sheet.pdf — Reference sheet (do not modify)
├── LICENSE             — MIT
├── .gitignore
├── CLAUDE.md           — This file
├── SystemDesign.md     — Architecture reference
├── Task.md             — Current task
└── OlderTasks.md       — Completed task archive
```

## Testing & Validation
There is no automated test suite. Validation is manual:
1. Open `index.html` in a browser (just double-click or use a local server)
2. Verify the changed feature works correctly across all three tabs (Character, Crew, Factions)
3. Check localStorage persistence: make changes, reload the page, confirm state survived
4. Test import/export: export JSON, reset, re-import, verify round-trip
5. Test dice roller if dice-related changes were made: spawn dice, drag, throw, check results
6. Check print layout if styles changed: use the Print button, verify the printable output
7. Check responsive layout: resize browser below 750px, confirm single-column layout
8. Open browser console — there should be zero errors

## Task Lifecycle Workflow
When a task is completed, tested, and confirmed by the user:
1. Ask: "Task complete! What would you like to work on next?"
2. When the user answers:
   a. Move the current Task.md contents to `OlderTasks.md` (append at the top with a timestamp and completion status)
   b. Rewrite `Task.md` with the new task details
   c. If the completed task changed any component interfaces, data flows, or architectural decisions, update `SystemDesign.md`
   d. Begin the new task by following the "Before You Write Any Code" steps above

## When You're Stuck
- If you're about to guess how something works: STOP. Read the source file.
- If you're about to modify a pattern you don't fully understand: STOP. Ask the user.
- If a fix requires changing more than 3 files: STOP. Describe your plan first and get approval.
- If you're hitting the same error repeatedly: STOP. Re-read SystemDesign.md and Known Pitfalls.
