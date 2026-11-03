// Electron SQLite Database Service
// This service provides a bridge between the React app and Electron's SQLite database

declare global {
  interface Window {
    electronAPI?: {
      db: {
        query: (sql: string, params?: any[]) => Promise<{ success: boolean; data?: any; error?: string }>
        initialize: () => Promise<{ success: boolean; path?: string; error?: string }>
        backup: (backupPath?: string) => Promise<{ success: boolean; path?: string; error?: string; cancelled?: boolean }>
        restore: (restorePath?: string) => Promise<{ success: boolean; path?: string; error?: string; cancelled?: boolean }>
        syncToSupabase: () => Promise<{ success: boolean; synced?: number; failed?: number; message?: string }>
        getSyncStatus: () => Promise<{ success: boolean; pending?: number; isSyncing?: boolean; error?: string }>
      }
      fs: {
        selectBackupPath: () => Promise<string | null>
        selectRestorePath: () => Promise<string | null>
        getAppDataPath: () => Promise<string>
      }
      network: {
        isOnline: () => Promise<boolean>
      }
      app: {
        getVersion: () => Promise<string>
        getPlatform: () => Promise<string>
      }
    }
  }
}

export interface DBResult {
  success: boolean
  data?: any
  error?: string
  pending?: number
  isSyncing?: boolean
  synced?: number
  failed?: number
  message?: string
  path?: string
  cancelled?: boolean
}

export class ElectronDB {
  private isElectron(): boolean {
    return typeof window !== 'undefined' && window.electronAPI !== undefined
  }

  async query(sql: string, params?: any[]): Promise<DBResult> {
    if (!this.isElectron()) {
      // Fallback to localStorage if not in Electron
      return this.fallbackQuery(sql, params)
    }
    return await window.electronAPI!.db.query(sql, params)
  }

  async initialize(): Promise<DBResult> {
    if (!this.isElectron()) {
      return { success: true, error: 'Not in Electron mode' }
    }
    return await window.electronAPI!.db.initialize()
  }

  async backup(backupPath?: string): Promise<DBResult> {
    if (!this.isElectron()) {
      // Fallback to localStorage backup
      return this.fallbackBackup()
    }
    return await window.electronAPI!.db.backup(backupPath)
  }

  async restore(restorePath?: string): Promise<DBResult> {
    if (!this.isElectron()) {
      // Fallback to localStorage restore
      return this.fallbackRestore()
    }
    return await window.electronAPI!.db.restore(restorePath)
  }

  async syncToSupabase(): Promise<DBResult> {
    if (!this.isElectron()) {
      return { success: false, error: 'Not in Electron mode' }
    }
    return await window.electronAPI!.db.syncToSupabase()
  }

  async getSyncStatus(): Promise<DBResult> {
    if (!this.isElectron()) {
      return { success: true, pending: 0, isSyncing: false }
    }
    return await window.electronAPI!.db.getSyncStatus()
  }

  async selectBackupPath(): Promise<string | null> {
    if (!this.isElectron()) return null
    return await window.electronAPI!.fs.selectBackupPath()
  }

  async selectRestorePath(): Promise<string | null> {
    if (!this.isElectron()) return null
    return await window.electronAPI!.fs.selectRestorePath()
  }

  async getAppDataPath(): Promise<string> {
    if (!this.isElectron()) return ''
    return await window.electronAPI!.fs.getAppDataPath()
  }

  async isOnline(): Promise<boolean> {
    if (!this.isElectron()) return navigator.onLine
    return await window.electronAPI!.network.isOnline()
  }

  async getAppVersion(): Promise<string> {
    if (!this.isElectron()) return '1.0.0'
    return await window.electronAPI!.app.getVersion()
  }

  async getPlatform(): Promise<string> {
    if (!this.isElectron()) return 'web'
    return await window.electronAPI!.app.getPlatform()
  }

  // Fallback methods for web (localStorage)
  private fallbackQuery(sql: string, params?: any[]): DBResult {
    console.log('Fallback query:', sql, params)
    // Implement localStorage-based query logic if needed
    return { success: true, data: [] }
  }

  private fallbackBackup(): DBResult {
    // Export localStorage to JSON
    const backup: any = {}
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key) {
        backup[key] = localStorage.getItem(key)
      }
    }
    
    const blob = new Blob([JSON.stringify(backup)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `hotel-backup-${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
    
    return { success: true }
  }

  private fallbackRestore(): DBResult {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (file) {
        const text = await file.text()
        const backup = JSON.parse(text)
        Object.keys(backup).forEach(key => {
          localStorage.setItem(key, backup[key])
        })
        alert('Backup restored successfully!')
        window.location.reload()
      }
    }
    input.click()
    return { success: true }
  }
}

export const electronDB = new ElectronDB()
