# GitHub Copilot Instructions — Blitz's Shop Simulator

Follow all conventions and rules defined in `AGENTS.md` in the repository root. This document summarizes the core requirements for modifying **Blitz's Shop Simulator**.

## Project Context
- **Application:** Static web companion app for drawing Merchant wares in Blitz Mode (Standard and Cursed cards) for *Slay the Spire: the Board Game*.
- **Stack & Structure:** Vanilla HTML/CSS/ES Modules (`index.html`, `./styles.css`, `./src/main.js`, `./manifest.webmanifest`, `./assets/`). Deployed statically to GitHub Pages upon pushes to `main`.

## Mandatory Rules for Copilot
1. **Strict Scope & Minimal Diffs:** Modify only files directly relevant to the requested task. Do not refactor unrelated code, alter build/deploy workflows, or introduce heavy dependencies unless explicitly asked or required to deploy the requested change.
2. **Rules & Logic Separation:** Treat `docs/regole_estrazione_mercante.txt` as the source of truth for card pools, draw mechanics, player counts, and purchase/reset rules. Keep card definitions in `src/cards.js`, game logic in `src/engine.js`, and DOM manipulation in `src/main.js`.
3. **Always Update `README.md`:** Whenever changes affect rules, features, UI controls, project structure, or setup instructions, update `README.md` in the same task to keep the repository home page aligned with the code.
4. **No Automatic PRs or Pushes:** Never create Pull Requests (`gh pr create` or GitHub API), open branches, or run `git push` automatically unless explicitly instructed by the user in the current prompt. Leave changes in the local working tree for review.
5. **Preserve DOM Contracts:** Keep existing element IDs and classes (`#player-selector`, `#draw-btn`, `#reset-choices-btn`, `#active-player`, `#active-hint`, `#ware-board`, `#app-version`, `.site-footer`, `.card-grid`) intact or update every reference consistently across HTML, CSS, and JS.
6. **Relative Paths & Case Sensitivity:** Use relative paths (`./...`) for all assets and module imports so the app works both locally and under a GitHub Pages subpath. Respect exact file casing for Linux compatibility.
7. **Language & Links:** Keep all UI copy, metadata, and footer attributions in English (unless instructed otherwise) and retain `target="_blank" rel="noopener noreferrer"` on external links.
8. **Responsive Mobile UI:** Ensure any layout or styling update works cleanly on both mobile touchscreens and desktop browsers without horizontal scrolling.
9. **Keep the GitHub Pages artifact complete:** Whenever adding a static page or another required root-level file, update `.github/workflows/deploy.yml` so the `Prepare site` step copies it into `_site`. Verify the deployed path is included; files omitted from `_site` return 404 on GitHub Pages.

## Pre-Completion Check
- Verify `README.md` reflects any behavioral, rule, or structural changes.
- Verify no Pull Request or remote git mutation was triggered.
- Verify relative paths, asset casing, and state transitions (`Draw`, `Reset`, player switching, card selection) work without errors.
- Confirm every new static page or required root-level file is copied into `_site` by `.github/workflows/deploy.yml`.