const { app, BrowserWindow } = require('electron')
const path = require('path')
const isDev = require('electron-is-dev')
const { spawn } = require('child_process')

let mainWindow
let serverProcess

function startServer() {
  return new Promise((resolve, reject) => {
    if (isDev) {
      // In development, server is already running via npm run dev
      resolve()
      return
    }

    // In production, start the Next.js server
    const serverPath = path.join(__dirname, '../node_modules/.bin/next')
    serverProcess = spawn(serverPath, ['start', '-p', '3000'], {
      cwd: path.join(__dirname, '..'),
      shell: true
    })

    serverProcess.stdout.on('data', (data) => {
      console.log(`Server stdout: ${data}`)
      if (data.toString().includes('ready')) {
        resolve()
      }
    })

    serverProcess.stderr.on('data', (data) => {
      console.error(`Server stderr: ${data}`)
    })

    serverProcess.on('close', (code) => {
      console.log(`Server process exited with code ${code}`)
      if (code !== 0) {
        reject(new Error(`Server process exited with code ${code}`))
      }
    })

    // Wait a bit for server to start
    setTimeout(resolve, 3000)
  })
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 768,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: false
    },
    icon: path.join(__dirname, '../public/icon.png'),
    title: 'Galaxy Garden Hotel Admin'
  })

  // Load the app
  if (isDev) {
    mainWindow.loadURL('http://localhost:3000')
    // Open DevTools in development
    mainWindow.webContents.openDevTools()
  } else {
    // In production, wait for server then load
    startServer().then(() => {
      mainWindow.loadURL('http://localhost:3000')
    }).catch((err) => {
      console.error('Failed to start server:', err)
      app.quit()
    })
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

app.on('ready', createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    if (serverProcess) {
      serverProcess.kill()
    }
    app.quit()
  }
})

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow()
  }
})

app.on('before-quit', () => {
  if (serverProcess) {
    serverProcess.kill()
  }
})
