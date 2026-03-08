# OpenClaw Desktop

Cross-platform desktop app for OpenClaw (Windows + Linux). Wraps the OpenClaw gateway and web UI in an Electron shell.

## How it works

1. Starts the OpenClaw gateway as a child process on port 18789
2. Loads the web UI (`/ui/`) in an Electron BrowserWindow
3. Runs in the system tray — closing the window minimizes to tray
4. If the gateway is already running (e.g. from CLI), connects to it instead

## Development

From the repo root:

```bash
# Build OpenClaw first
pnpm build
pnpm ui:build

# Install Electron deps
cd apps/electron
npm install

# Run in dev mode
npm run dev
```

## Building installers

```bash
cd apps/electron

# Linux (.AppImage + .deb)
npm run build:linux

# Windows (.exe via NSIS)
npm run build:win

# Both
npm run build:all
```

Outputs go to `apps/electron/release/`.

## Architecture

```
apps/electron/
  src/
    main.mjs      # Electron main process — gateway lifecycle + window
    preload.mjs   # Context bridge for renderer
  assets/
    icons/        # App icons (tray, window, installer)
  package.json    # Electron deps + electron-builder config
```

The Electron app does NOT embed its own copy of the OpenClaw source. It either:
- **Dev mode:** Runs `openclaw.mjs` from the repo root via `ELECTRON_RUN_AS_NODE`
- **Packaged:** Bundles `dist/`, `ui/dist/`, and `openclaw.mjs` as extraResources
