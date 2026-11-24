# AGENTS.md — Guidelines for Modifying Blitz's Shop Simulator

## Project Overview
Static web companion app (**Blitz's Shop Simulator**) for drawing Merchant wares in Blitz Mode (Standard and Cursed cards) for *Slay the Spire: the Board Game*.
- **Environment:** Developed in WSL (Linux) on Windows 10 Pro using OpenCode and GitHub Copilot, deployed as a static site to **GitHub Pages** on pushes to `main`.
- **Entry point:** `index.html` with `<script type="module" src="./src/main.js"></script>`, `./styles.css`, `./manifest.webmanifest`, and `./assets/`.

## Core Behavioral Rules for Agents
1. **Stay strictly within scope:** Only modify files directly relevant to the requested feature, rule change, or bug fix. Do not refactor unrelated modules, rename existing IDs/classes unless requested, or touch workflow/deploy files without explicit need.
2. **Respect the rules document as source of truth:** Whenever modifying card pools, draw logic, player counts, purchase/reset behavior, or probabilities, verify against `regole_estrazione_mercante.txt`. Keep card definitions in `src/cards.js`, game logic in `src/engine.js`, and DOM rendering in `src/main.js`.
3. **Keep `README.md` aligned with changes:** Whenever a change affects game rules, features, UI controls, project structure, or setup/usage instructions, update `README.md` accordingly so the repository home page stays accurate and in sync with the codebase.
4. **Do NOT create Pull Requests or push automatically:** Never open, create, or submit a Pull Request (e.g., via `gh pr create` or GitHub API/tools), create branches, or run `git push` automatically unless explicitly instructed by the user in the current prompt. Leave changes in the local working tree for user review.
5. **Preserve existing DOM contracts:** `index.html` relies on specific IDs and classes (`#player-selector`, `#draw-btn`, `#reset-choices-btn`, `#active-player`, `#active-hint`, `#ware-board`, `#app-version`, `.site-footer`, `.card-grid`). Keep existing IDs intact or update all references consistently across HTML, CSS, and JS.
6. **Use relative paths & Linux-safe casing:** Always use relative paths (`./...`) so assets and module imports work both locally and on GitHub Pages under a repo subpath. Match exact file extensions and uppercase/lowercase characters (Linux/GitHub Pages filesystems are case-sensitive).
7. **Keep UI & metadata copy in English:** Maintain English UI labels, meta tags, and footer attributions unless the user explicitly asks for another language. Preserve external link attributes (`target="_blank" rel="noopener noreferrer"`).
8. **Check mobile & responsive layout:** Changes to `.card-grid`, controls, or `.site-footer` must remain usable on small phone screens as well as desktop, with clear touch targets and no horizontal overflow.
9. **Minimal, clean diffs:** Avoid adding heavy external dependencies or build steps unless necessary. Keep comments concise and explain *why* for non-obvious rule or state logic.

## Verification Checklist Before Finishing
- Confirm `README.md` has been updated if rules, features, controls, or structure changed.
- Confirm no automatic Pull Request or remote git push was executed.
- Confirm no broken relative paths (`./...`) in `index.html`, `manifest.webmanifest`, CSS, or JS modules.
- Confirm state transitions (`Draw`, `Reset`, player count changes, active player selection, and purchasing/selecting cards) behave consistently without leftover stale DOM nodes or event listeners.
- Summarize clearly which files were modified, what changed, and how to test locally in WSL before committing to `main`.