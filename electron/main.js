const { app, BrowserWindow } = require('electron')
const path = require('path')
const fs = require('fs')

let mainWindow
let splashWindow

// Load environment variables from .env file
function loadEnv() {
  try {
    const envPath = path.join(__dirname, '../.env')
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf-8')
      envContent.split('\n').forEach(line => {
        const match = line.match(/^([^=]+)=(.*)$/)
        if (match) {
          const [, key, value] = match
          if (!process.env[key]) {
            process.env[key] = value.trim()
          }
        }
      })
      console.log('Environment variables loaded from .env')
    }
  } catch (error) {
    console.error('Error loading .env file:', error)
  }
}

function createSplashWindow() {
  splashWindow = new BrowserWindow({
    width: 500,
    height: 600,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    resizable: false,
    skipTaskbar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  })

  splashWindow.loadFile(path.join(__dirname, 'splash.html'))
}

function createWindow() {
  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged

  // Set icon based on platform
  let iconPath
  if (process.platform === 'win32') {
    iconPath = path.join(__dirname, '../public/app-icon.ico')
  } else if (process.platform === 'darwin') {
    iconPath = path.join(__dirname, '../public/icon.png')
  } else {
    iconPath = path.join(__dirname, '../public/logo.png')
  }

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 768,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: true,
      sandbox: false,
      allowRunningInsecureContent: false
    },
    icon: iconPath,
    title: 'Dhole Patil Khanawal',
    show: false
  })

  mainWindow.once('ready-to-show', () => {
    if (splashWindow) {
      splashWindow.close()
      splashWindow = null
    }
    mainWindow.show()
  })

  // Load from localhost in development
  if (isDev) {
    mainWindow.loadURL('http://localhost:3000')
    mainWindow.webContents.openDevTools()
  } else {
    // In production, use custom protocol to serve .next files
    const protocol = require('electron').protocol

    protocol.registerFileProtocol('app', (request, callback) => {
      const filePath = path.join(__dirname, '..', request.url.slice(6))

      // Handle root path
      if (request.url === 'app:///' || request.url === 'app:/') {
        callback({ path: path.join(__dirname, '../.next/server/app/index.html') })
        return
      }

      // Handle static assets
      if (request.url.startsWith('app://_next/static/')) {
        const relativePath = request.url.replace('app://_next/static/', '')
        const staticPath = path.join(__dirname, '../.next/static', relativePath)
        if (fs.existsSync(staticPath)) {
          callback({ path: staticPath })
          return
        }
      }

      // Handle other .next files
      if (fs.existsSync(filePath)) {
        callback({ path: filePath })
      } else {
        callback({ error: -2 }) // FILE_NOT_FOUND
      }
    })

    mainWindow.loadURL('app:///')
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

app.on('ready', () => {
  loadEnv()
  try {
    require('./ipc-handler')
  } catch (err) {
    console.error('Error loading ipc-handler:', err)
  }
  createSplashWindow()
  createWindow()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow()
  }
})
