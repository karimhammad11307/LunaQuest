# LunaQuest

## Current handoff

The user rejected the initial Figma direction and authorized a playable game rebuild. Mars Commander is now implemented locally with React + TypeScript and an original interactive SVG colony. Run `npm install` then `npm run dev`; see [README.md](README.md) and [game architecture](design/GAME_ARCHITECTURE.md). Five selectable buildings, upgrades, four supply systems, storms/failures/radiation/delays, save/resume and 30-day win/loss are functional. Six simulation tests and full Chromium mission tests passed; screenshots are in `artifacts/`. No live NASA data is connected. The earlier Figma design is retained as rejected exploration, not the implementation source of truth.

The separate Codex skill setup remains incomplete: `frontend-design` is installed locally, while `develop-web-game`, `ui-ux-pro-max`, and live skill discovery retain the limitations recorded in [PROJECT_HISTORY.md](PROJECT_HISTORY.md). Preserve those setup notes when continuing.
