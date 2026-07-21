import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("agent", {
  getRecentLogs: () => ipcRenderer.invoke("logs:recent"),
  onLog: (callback: (entry: unknown) => void) => {
    ipcRenderer.on("logs:entry", (_event, entry) => callback(entry));
  },
  getStatus: () => ipcRenderer.invoke("status:get"),
  runSync: () => ipcRenderer.invoke("sync:run"),
  getConfig: () => ipcRenderer.invoke("config:get"),
  saveConfig: (config: unknown) => ipcRenderer.invoke("config:save", config),
  restartAgent: () => ipcRenderer.invoke("agent:restart"),
  onUpdateEvent: (callback: (event: unknown) => void) => {
    ipcRenderer.on("update:event", (_event, payload) => callback(payload));
  },
  installUpdate: () => ipcRenderer.invoke("update:install"),
});
