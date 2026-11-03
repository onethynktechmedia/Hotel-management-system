const { ipcMain, dialog, app } = require('electron')
const path = require('path')
const fs = require('fs').promises
const { createClient } = require('@supabase/supabase-js')

// Try to load better-sqlite3, but handle if it's not available
let Database = null
try {
  Database = require('better-sqlite3')
} catch (error) {
  console.warn('better-sqlite3 not available. Electron will use localStorage-only mode.')
}

// Supabase configuration - loaded from environment variables (secure)
// In production, these should be set in the build environment or installed via installer
const supabaseUrl = process.env.SUPABASE_URL
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY

let db = null
let syncQueue = []
let isSyncing = false

// Initialize SQLite database
function initializeDatabase() {
  if (!Database) {
    console.warn('SQLite not available - using localStorage-only mode')
    return null
  }

  const appDataPath = app.getPath('userData')
  const dbPath = path.join(appDataPath, 'hotel-billing.db')

  db = new Database(dbPath)
  db.pragma('journal_mode = WAL')

  // Create tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      table_id TEXT,
      customer_name TEXT,
      total_amount REAL,
      status TEXT,
      is_printed INTEGER DEFAULT 0,
      created_at TEXT,
      updated_at TEXT,
      synced INTEGER DEFAULT 0,
      supabase_id TEXT
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id TEXT PRIMARY KEY,
      order_id TEXT,
      dish_id TEXT,
      quantity INTEGER,
      price REAL,
      dish_type TEXT,
      synced INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS dishes (
      id TEXT PRIMARY KEY,
      name TEXT,
      price REAL,
      category TEXT,
      is_available INTEGER DEFAULT 1,
      image_url TEXT,
      food_type TEXT,
      synced INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS tables (
      id TEXT PRIMARY KEY,
      table_number INTEGER,
      capacity INTEGER,
      is_available INTEGER DEFAULT 1,
      synced INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT,
      email TEXT,
      role TEXT,
      synced INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS sync_queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      table_name TEXT,
      record_id TEXT,
      action TEXT,
      data TEXT,
      created_at TEXT
    );
  `)

  return dbPath
}

// Database query handler
ipcMain.handle('db-query', async (event, sql, params) => {
  try {
    if (!Database) {
      return { success: false, error: 'SQLite not available. Using localStorage mode.' }
    }

    if (!db) {
      initializeDatabase()
    }

    const stmt = db.prepare(sql)
    const result = stmt.run(...(params || []))

    if (result.changes > 0) {
      // If it's an insert/update/delete, add to sync queue
      const actionMatch = sql.match(/^(INSERT|UPDATE|DELETE)/i)
      const tableMatch = sql.match(/(?:INSERT|UPDATE|DELETE)\s+(?:INTO\s+)?(\w+)/i)

      if (actionMatch && tableMatch) {
        const action = actionMatch[1]
        const tableName = tableMatch[1]

        // Try to extract record ID from params or lastInsertRowId
        let recordId = params?.[0]
        if (!recordId && action === 'INSERT') {
          recordId = result.lastInsertRowid?.toString()
        }

        if (recordId) {
          addToSyncQueue(tableName, recordId, action, { sql, params })
        }
      }
    }

    return { success: true, data: result }
  } catch (error) {
    console.error('Database query error:', error)
    return { success: false, error: error.message }
  }
})

// Initialize database
ipcMain.handle('db-initialize', async () => {
  try {
    if (!Database) {
      return { success: false, error: 'SQLite not available. Using localStorage mode.' }
    }

    const dbPath = initializeDatabase()
    return { success: true, path: dbPath }
  } catch (error) {
    console.error('Database initialization error:', error)
    return { success: false, error: error.message }
  }
})

// Backup database
ipcMain.handle('db-backup', async (event, backupPath) => {
  try {
    if (!Database) {
      return { success: false, error: 'SQLite not available. Use localStorage export instead.' }
    }

    if (!db) {
      initializeDatabase()
    }

    const appDataPath = app.getPath('userData')
    const dbPath = path.join(appDataPath, 'hotel-billing.db')

    if (!backupPath) {
      const result = await dialog.showSaveDialog({
        defaultPath: path.join(app.getPath('downloads'), `hotel-backup-${new Date().toISOString().split('T')[0]}.db`),
        filters: [{ name: 'Database Files', extensions: ['db'] }]
      })

      if (!result.filePath) {
        return { success: false, cancelled: true }
      }
      backupPath = result.filePath
    }

    await fs.copyFile(dbPath, backupPath)
    return { success: true, path: backupPath }
  } catch (error) {
    console.error('Backup error:', error)
    return { success: false, error: error.message }
  }
})

// Restore database
ipcMain.handle('db-restore', async (event, restorePath) => {
  try {
    if (!Database) {
      return { success: false, error: 'SQLite not available. Use localStorage import instead.' }
    }

    if (!restorePath) {
      const result = await dialog.showOpenDialog({
        filters: [{ name: 'Database Files', extensions: ['db'] }]
      })

      if (!result.filePaths || result.filePaths.length === 0) {
        return { success: false, cancelled: true }
      }
      restorePath = result.filePaths[0]
    }

    const appDataPath = app.getPath('userData')
    const dbPath = path.join(appDataPath, 'hotel-billing.db')

    // Close existing connection
    if (db) {
      db.close()
    }

    // Copy backup to database location
    await fs.copyFile(restorePath, dbPath)

    // Reinitialize
    initializeDatabase()

    return { success: true, path: dbPath }
  } catch (error) {
    console.error('Restore error:', error)
    return { success: false, error: error.message }
  }
})

// Add to sync queue
function addToSyncQueue(tableName, recordId, action, data) {
  if (!db) return

  const stmt = db.prepare('INSERT INTO sync_queue (table_name, record_id, action, data, created_at) VALUES (?, ?, ?, ?, ?)')
  stmt.run(
    tableName,
    recordId,
    action,
    JSON.stringify(data),
    new Date().toISOString()
  )
}

// Sync to Supabase
ipcMain.handle('db-sync-to-supabase', async () => {
  if (isSyncing) {
    return { success: false, message: 'Sync already in progress' }
  }

  // Check if Supabase credentials are configured
  if (!supabaseUrl || !supabaseAnonKey) {
    return { success: false, error: 'Supabase credentials not configured. Please set SUPABASE_URL and SUPABASE_ANON_KEY environment variables.' }
  }

  if (!Database || !db) {
    return { success: false, error: 'SQLite not available. Cannot sync.' }
  }

  isSyncing = true

  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey)

    // Get pending sync items, sorted by creation time (oldest first)
    const syncItems = db.prepare('SELECT * FROM sync_queue ORDER BY created_at ASC').all()

    let synced = 0
    let failed = 0
    let skipped = 0

    for (const item of syncItems) {
      try {
        const data = JSON.parse(item.data)
        const retryCount = data.retryCount || 0

        // Skip items that have failed too many times (configurable)
        if (retryCount >= 5) {
          console.log(`Skipping ${item.table_name} item ${item.record_id} - too many retries (${retryCount})`)
          skipped++
          continue
        }

        console.log(`Syncing ${item.table_name} - ${item.action} (attempt ${retryCount + 1})`)

        // Check for duplicates before syncing
        const existingRecord = db.prepare(`SELECT supabase_id FROM ${item.table_name} WHERE id = ?`).get(item.record_id)

        if (existingRecord && existingRecord.supabase_id && item.action === 'INSERT') {
          // Already synced, skip
          db.prepare('DELETE FROM sync_queue WHERE id = ?').run(item.id)
          synced++
          continue
        }

        // Sync based on action type
        let supabaseId = null

        if (item.action === 'INSERT') {
          // Extract record data
          const record = db.prepare(`SELECT * FROM ${item.table_name} WHERE id = ?`).get(item.record_id)
          if (record) {
            // Remove local fields before sending to Supabase
            const { synced, supabase_id, ...recordData } = record

            // Check if already exists in Supabase (conflict detection)
            const { data: existing } = await supabase
              .from(item.table_name)
              .select('id')
              .eq('id', record.id)
              .maybeSingle()

            if (existing) {
              // Conflict: record already exists in Supabase
              console.log(`Conflict detected for ${item.table_name} ${item.record_id} - using existing Supabase record`)
              supabaseId = existing.id
              db.prepare(`UPDATE ${item.table_name} SET supabase_id = ?, synced = 1 WHERE id = ?`)
                .run(supabaseId, item.record_id)
            } else {
              // Insert into Supabase
              const { data: inserted, error } = await supabase
                .from(item.table_name)
                .insert(recordData)
                .select()
                .single()

              if (error) throw error
              supabaseId = inserted.id

              // Update local record with Supabase ID
              db.prepare(`UPDATE ${item.table_name} SET supabase_id = ?, synced = 1 WHERE id = ?`)
                .run(supabaseId, item.record_id)
            }
          }
        } else if (item.action === 'UPDATE') {
          const record = db.prepare(`SELECT * FROM ${item.table_name} WHERE id = ?`).get(item.record_id)
          if (record && record.supabase_id) {
            const { synced, supabase_id, ...recordData } = record

            const { error } = await supabase
              .from(item.table_name)
              .update(recordData)
              .eq('id', record.supabase_id)

            if (error) throw error

            db.prepare(`UPDATE ${item.table_name} SET synced = 1 WHERE id = ?`)
              .run(item.record_id)
          }
        } else if (item.action === 'DELETE') {
          const record = db.prepare(`SELECT supabase_id FROM ${item.table_name} WHERE id = ?`).get(item.record_id)
          if (record && record.supabase_id) {
            const { error } = await supabase
              .from(item.table_name)
              .delete()
              .eq('id', record.supabase_id)

            if (error) throw error
          }
        }

        // Remove from queue after successful sync
        db.prepare('DELETE FROM sync_queue WHERE id = ?').run(item.id)
        synced++
      } catch (error) {
        console.error('Sync item error:', error)
        failed++
        // Update retry count
        const currentData = JSON.parse(item.data)
        db.prepare('UPDATE sync_queue SET data = ? WHERE id = ?')
          .run(JSON.stringify({
            ...currentData,
            lastError: error.message,
            retryCount: (currentData.retryCount || 0) + 1,
            lastRetryAt: new Date().toISOString()
          }), item.id)
      }
    }

    return { success: true, synced, failed, skipped }
  } catch (error) {
    console.error('Sync error:', error)
    return { success: false, error: error.message }
  } finally {
    isSyncing = false
  }
})

// Get sync status
ipcMain.handle('db-get-sync-status', async () => {
  try {
    if (!Database || !db) {
      return { success: true, pending: 0, isSyncing: false }
    }

    const pending = db.prepare('SELECT COUNT(*) as count FROM sync_queue').get()
    return { success: true, pending: pending.count, isSyncing }
  } catch (error) {
    console.error('Get sync status error:', error)
    return { success: false, error: error.message }
  }
})

// File system handlers
ipcMain.handle('fs-select-backup-path', async () => {
  const result = await dialog.showSaveDialog({
    defaultPath: path.join(app.getPath('downloads'), `hotel-backup-${new Date().toISOString().split('T')[0]}.db`),
    filters: [{ name: 'Database Files', extensions: ['db'] }]
  })
  return result.filePath || null
})

ipcMain.handle('fs-select-restore-path', async () => {
  const result = await dialog.showOpenDialog({
    filters: [{ name: 'Database Files', extensions: ['db'] }]
  })
  return result.filePaths?.[0] || null
})

ipcMain.handle('fs-get-app-data-path', async () => {
  return app.getPath('userData')
})

// Network status
ipcMain.handle('network-is-online', async () => {
  // Simple check - you might want to implement more sophisticated detection
  const { default: fetch } = await import('node-fetch')
  try {
    await fetch('https://www.google.com', { method: 'HEAD', timeout: 5000 })
    return true
  } catch {
    return false
  }
})

// App info
ipcMain.handle('app-get-version', async () => {
  return app.getVersion()
})

ipcMain.handle('app-get-platform', async () => {
  return process.platform
})

// Silent printing
ipcMain.handle('print-silent', async (event, content) => {
  const { BrowserWindow } = require('electron')

  try {
    // Get the main window (the one that sent the request)
    const focusedWindow = BrowserWindow.getFocusedWindow()

    if (!focusedWindow) {
      throw new Error('No focused window found')
    }

    // Create a hidden window for printing
    const printWindow = new BrowserWindow({
      show: false,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
        sandbox: false
      },
      width: 800,
      height: 1200
    })

    // Load HTML content
    await printWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(content)}`)

    // Wait for content to load
    await new Promise((resolve) => {
      if (printWindow.webContents.isLoading()) {
        printWindow.webContents.on('did-finish-load', resolve)
      } else {
        resolve()
      }
    })

    // Print silently - use the focused window's print to default printer
    return new Promise((resolve) => {
      printWindow.webContents.print({
        silent: true,
        printBackground: true,
        deviceName: '' // Empty string uses default printer
      }, (success, errorType) => {
        printWindow.close()
        if (success) {
          console.log('Print successful')
          resolve({ success: true })
        } else {
          console.error('Print failed:', errorType)
          resolve({ success: false, error: errorType || 'Printing failed' })
        }
      })
    })
  } catch (error) {
    console.error('Silent print error:', error)
    return { success: false, error: error.message }
  }
})
