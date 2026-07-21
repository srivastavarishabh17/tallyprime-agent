import { app, BrowserWindow, Tray, Menu, nativeImage, ipcMain, dialog } from "electron";
import * as fs from "fs";
import * as path from "path";

// Must be set before any src/ module resolves its file paths.
process.env["AGENT_DATA_DIR"] = app.getPath("userData");

import { autoUpdater } from "electron-updater";
import { captureConsole, setErrorHandler, startShipping, stopShipping, recentLogs, subscribe } from "../src/logger";
import { reportError } from "../src/mailer";
import { startScheduler, SchedulerHandle } from "../src/sync/scheduler";
import { tryLoadConfig, saveConfig, AgentConfig } from "../src/config";
import { configPath } from "../src/paths";
import { syncStatus } from "../src/sync/status";

const UPDATE_CHECK_INTERVAL_MS = 60 * 60 * 1000; // hourly

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let scheduler: SchedulerHandle | null = null;
let quitting = false;

// 16x16 blue circle PNG for the tray (generated, embedded to avoid asset files)
const TRAY_ICON_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAn0lEQVR4nKWTwQ3DIAxFH1EG6BadKCN0i47QETpCN8oIGaEjkAM+IAsw0C9Zwtb3s2wZ+FEJyMBbLAM3TfBFB7ISJRC7whgVWjpDllwGnkrsvQi2v8AZ8FByaz2capYA6qLXvYaHTiZgO5m9WwCPnFwXwLYA3rXWCsC3ANYVQNMCCND0KwCFy9bWJRB6vwG68zAFQGyBQI0BLPmhpvUDkhKZ7cIsQwUAAAAASUVORK5CYII=";

function ensureConfigFile(): void {
  const target = configPath();
  if (fs.existsSync(target)) return;

  const bundled = app.isPackaged
    ? path.join(process.resourcesPath, "agent.config.example.json")
    : path.join(app.getAppPath(), "agent.config.example.json");

  try {
    fs.copyFileSync(bundled, target);
    console.log(`Created default config at ${target} — edit it in Settings.`);
  } catch (err) {
    console.error("Failed to create default config:", err);
  }
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1080,
    height: 720,
    title: "Satyakiran Agent",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadFile(path.join(app.getAppPath(), "renderer", "index.html"));
  mainWindow.setMenuBarVisibility(false);

  // Closing the window hides it; the agent keeps syncing from the tray.
  mainWindow.on("close", (e) => {
    if (!quitting) {
      e.preventDefault();
      mainWindow?.hide();
    }
  });
}

function createTray(): void {
  const icon = nativeImage.createFromDataURL(`data:image/png;base64,${TRAY_ICON_BASE64}`);
  tray = new Tray(icon);
  tray.setToolTip("Satyakiran Agent");
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: "Open Dashboard", click: () => mainWindow?.show() },
      { label: "Sync Now", click: () => void scheduler?.runNow() },
      { type: "separator" },
      {
        label: "Quit",
        click: () => {
          quitting = true;
          app.quit();
        },
      },
    ])
  );
  tray.on("double-click", () => mainWindow?.show());
}

function startAgent(): void {
  try {
    scheduler = startScheduler();
  } catch (err) {
    scheduler = null;
    console.error(
      "Agent not started:",
      err instanceof Error ? err.message : err,
      "— fix the configuration in Settings and press Restart Agent."
    );
  }
}

function restartAgent(): void {
  scheduler?.stop();
  scheduler = null;
  startAgent();
}

function sendToWindow(channel: string, payload: unknown): void {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(channel, payload);
  }
}

function setupIpc(): void {
  ipcMain.handle("logs:recent", () => recentLogs());
  ipcMain.handle("status:get", () => ({
    ...syncStatus,
    schedulerActive: scheduler !== null,
    version: app.getVersion(),
    configPath: configPath(),
  }));
  ipcMain.handle("sync:run", async () => {
    if (!scheduler) throw new Error("Agent is not running — check the configuration.");
    await scheduler.runNow();
  });
  ipcMain.handle("config:get", () => tryLoadConfig());
  ipcMain.handle("config:save", (_event, config: AgentConfig) => {
    saveConfig(config);
    console.log("Configuration saved — restarting agent.");
    restartAgent();
  });
  ipcMain.handle("agent:restart", () => restartAgent());
  ipcMain.handle("update:install", () => {
    quitting = true;
    autoUpdater.quitAndInstall();
  });

  subscribe((entry) => sendToWindow("logs:entry", entry));
}

function setupAutoUpdater(): void {
  if (!app.isPackaged) return;

  autoUpdater.on("update-available", (info) => {
    console.log(`Update available: v${info.version} — downloading in background.`);
    sendToWindow("update:event", { state: "available", version: info.version });
  });
  autoUpdater.on("update-downloaded", (info) => {
    console.log(`Update v${info.version} downloaded — it will install on restart.`);
    sendToWindow("update:event", { state: "downloaded", version: info.version });
  });
  autoUpdater.on("error", (err) => {
    console.warn("Auto-update check failed:", err.message);
    sendToWindow("update:event", { state: "error", message: err.message });
  });

  void autoUpdater.checkForUpdates().catch(() => undefined);
  setInterval(() => void autoUpdater.checkForUpdates().catch(() => undefined), UPDATE_CHECK_INTERVAL_MS);
}

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    mainWindow?.show();
    mainWindow?.focus();
  });

  app.whenReady().then(() => {
    captureConsole();
    setErrorHandler(reportError);
    startShipping();

    ensureConfigFile();
    setupIpc();
    createWindow();
    createTray();
    setupAutoUpdater();

    console.log("================================");
    console.log(`  Satyakiran Agent v${app.getVersion()}`);
    console.log("================================");

    startAgent();
  });

  app.on("before-quit", () => {
    quitting = true;
    scheduler?.stop();
    void stopShipping();
  });

  // keep running in the tray when all windows are closed
  app.on("window-all-closed", () => undefined);
}
