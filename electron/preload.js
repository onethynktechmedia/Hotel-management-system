const { contextBridge, ipcRenderer } = require('electron')

// Expose secure APIs to renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  // Database operations
  db: {
    query: (sql, params) => ipcRenderer.invoke('db-query', sql, params),
    initialize: () => ipcRenderer.invoke('db-initialize'),
    backup: (backupPath) => ipcRenderer.invoke('db-backup', backupPath),
    restore: (backupPath) => ipcRenderer.invoke('db-restore', backupPath),
    syncToSupabase: () => ipcRenderer.invoke('db-sync-to-supabase'),
    getSyncStatus: () => ipcRenderer.invoke('db-get-sync-status')
  },
  
  // File system operations
  fs: {
    selectBackupPath: () => ipcRenderer.invoke('fs-select-backup-path'),
    selectRestorePath: () => ipcRenderer.invoke('fs-select-restore-path'),
    getAppDataPath: () => ipcRenderer.invoke('fs-get-app-data-path')
  },
  
  // Network status
  network: {
    isOnline: () => ipcRenderer.invoke('network-is-online')
  },
  
  // App info
  app: {
    getVersion: () => ipcRenderer.invoke('app-get-version'),
    getPlatform: () => ipcRenderer.invoke('app-get-platform')
  },

  // Printing
  print: {
    silent: (content) => ipcRenderer.invoke('print-silent', content)
  }
})
