import { app, BrowserWindow, Tray, Menu, nativeImage, shell, dialog } from "electron";
import { spawn } from "node:child_process";
import { once } from "node:events";
import path from "node:path";
import { fileURLToPath } from "node:url";
import net from "node:net";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const GATEWAY_PORT = 18789;
const GATEWAY_URL = `http://127.0.0.1:${GATEWAY_PORT}`;
const UI_URL = `${GATEWAY_URL}/ui/`;

let mainWindow = null;
let tray = null;
let gatewayProcess = null;
let isQuitting = false;

// ---------------------------------------------------------------------------
// Gateway lifecycle
// ---------------------------------------------------------------------------

function resolveOpenClawEntry() {
  // In packaged app: extraResources contains the built dist + openclaw.mjs
  if (app.isPackaged) {
    return path.join(process.resourcesPath, "openclaw.mjs");
  }
  // In dev: use the repo root
  return path.resolve(__dirname, "..", "..", "..", "openclaw.mjs");
}

function isPortInUse(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once("error", (err) => {
      resolve(err.code === "EADDRINUSE");
    });
    server.once("listening", () => {
      server.close();
      resolve(false);
    });
    server.listen(port, "127.0.0.1");
  });
}

async function waitForGateway(timeoutMs = 30_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const response = await fetch(`${GATEWAY_URL}/ui/`, { signal: AbortSignal.timeout(2000) });
      if (response.ok) return true;
    } catch {
      // Not ready yet
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
}

async function startGateway() {
  // Check if gateway is already running (e.g. from CLI)
  const alreadyRunning = await isPortInUse(GATEWAY_PORT);
  if (alreadyRunning) {
    console.log(`Gateway already running on port ${GATEWAY_PORT}`);
    return;
  }

  const entryPath = resolveOpenClawEntry();
  console.log(`Starting gateway: node ${entryPath} gateway run`);

  gatewayProcess = spawn(
    process.execPath, // Use the same Node.js that Electron bundles
    [entryPath, "gateway", "run", "--bind", "loopback", "--port", String(GATEWAY_PORT), "--force"],
    {
      cwd: app.isPackaged ? process.resourcesPath : path.resolve(__dirname, "..", "..", ".."),
      stdio: ["ignore", "pipe", "pipe"],
      env: {
        ...process.env,
        OPENCLAW_GATEWAY_PORT: String(GATEWAY_PORT),
        ELECTRON_RUN_AS_NODE: "1", // Tell Electron's node to act as plain Node.js
      },
    },
  );

  gatewayProcess.stdout.on("data", (data) => {
    process.stdout.write(`[gateway] ${data}`);
  });

  gatewayProcess.stderr.on("data", (data) => {
    process.stderr.write(`[gateway] ${data}`);
  });

  gatewayProcess.on("exit", (code, signal) => {
    console.log(`Gateway exited: code=${code} signal=${signal}`);
    gatewayProcess = null;
    if (!isQuitting) {
      // Gateway crashed — show error to user
      dialog.showErrorBox(
        "OpenClaw Gateway Error",
        `The gateway process exited unexpectedly (code ${code}).\nThe app will continue but may not function correctly.`,
      );
    }
  });

  // Wait for it to be ready
  const ready = await waitForGateway();
  if (!ready) {
    console.error("Gateway did not start within 30 seconds");
    dialog.showErrorBox(
      "OpenClaw Startup Error",
      "The gateway did not start in time. Please check your configuration and try again.",
    );
  }
}

function stopGateway() {
  if (!gatewayProcess) return;
  console.log("Stopping gateway...");
  gatewayProcess.kill("SIGTERM");
  // Force kill after 5 seconds if it doesn't stop
  setTimeout(() => {
    if (gatewayProcess) {
      gatewayProcess.kill("SIGKILL");
      gatewayProcess = null;
    }
  }, 5000);
}

// ---------------------------------------------------------------------------
// Window
// ---------------------------------------------------------------------------

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 480,
    minHeight: 400,
    title: "OpenClaw",
    icon: getTrayIcon(),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "preload.mjs"),
    },
  });

  mainWindow.loadURL(UI_URL);

  // Open external links in the default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("http")) shell.openExternal(url);
    return { action: "deny" };
  });

  // Minimize to tray instead of closing
  mainWindow.on("close", (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

// ---------------------------------------------------------------------------
// Tray
// ---------------------------------------------------------------------------

function getTrayIcon() {
  // Use a simple template icon; can be replaced with proper assets later
  const iconPath = path.join(__dirname, "..", "assets", "icons", "tray-icon.png");
  try {
    return nativeImage.createFromPath(iconPath);
  } catch {
    // Fallback: create a simple 16x16 icon
    return nativeImage.createEmpty();
  }
}

function createTray() {
  const icon = getTrayIcon();
  tray = new Tray(icon);
  tray.setToolTip("OpenClaw");

  const contextMenu = Menu.buildFromTemplate([
    {
      label: "Show OpenClaw",
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        } else {
          createWindow();
        }
      },
    },
    { type: "separator" },
    {
      label: "Open in Browser",
      click: () => shell.openExternal(UI_URL),
    },
    { type: "separator" },
    {
      label: "Restart Gateway",
      click: async () => {
        stopGateway();
        await new Promise((r) => setTimeout(r, 1000));
        await startGateway();
        if (mainWindow) mainWindow.reload();
      },
    },
    { type: "separator" },
    {
      label: "Quit",
      click: () => {
        isQuitting = true;
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(contextMenu);

  tray.on("click", () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.focus();
      } else {
        mainWindow.show();
      }
    } else {
      createWindow();
    }
  });
}

// ---------------------------------------------------------------------------
// App lifecycle
// ---------------------------------------------------------------------------

// Single instance lock
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });

  app.on("ready", async () => {
    createTray();
    await startGateway();
    createWindow();
  });

  app.on("before-quit", () => {
    isQuitting = true;
    stopGateway();
  });

  app.on("window-all-closed", () => {
    // Keep running in tray on all platforms
  });

  app.on("activate", () => {
    // macOS dock click
    if (mainWindow) {
      mainWindow.show();
    } else {
      createWindow();
    }
  });
}
