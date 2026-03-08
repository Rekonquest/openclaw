import { contextBridge, ipcRenderer } from "electron";

// Expose a minimal API to the renderer (web UI)
// The web UI doesn't need it now, but this is the hook for future native features
contextBridge.exposeInMainWorld("openclawDesktop", {
  platform: process.platform,
  isElectron: true,
});
