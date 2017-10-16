console.time('init')

const {
  app, ipcMain
} = require('electron')

const config = require('../config')
const crashReporter = require('../crash-reporter')
const tray = require('./tray')

const mainWindow = require('./windows/main')

let shouldQuit = false

// Start the app without showing the main window when auto launching on login
// (On Windows and Linux, we get a flag. On MacOS, we get special API.)
const hidden = (process.platform === 'darwin' && app.getLoginItemSettings().wasOpenedAsHidden)

if (process.platform === 'win32') {
  const squirrelWin32 = require('./squirrel-win32')
  shouldQuit = squirrelWin32.handleEvent(argv[0])
  argv = argv.filter((arg) => !arg.includes('--squirrel'))
}

if (!shouldQuit) {
  // Prevent multiple instances of app from running at same time. New instances
  // signal this instance and quit. Note: This feature creates a lock file in
  // %APPDATA%\Roaming\obair so we do not do it for the Portable App since
  // we want to be "silent" as well as "portable".
  shouldQuit = app.makeSingleInstance((args, cwd) => {
    if (myWindow) {
      if (mainWindow.win.isMinimized()) mainWindow.win.restore()
      mainWindow.win.focus()
    }
  });
  if (shouldQuit) {
    console.log('quit')
    app.quit()
  }
}

if (!shouldQuit) {
  init()
}

function init() {
  let isReady = false // app ready, windows can be created
  app.ipcReady = false // main window has finished loading and IPC is ready
  app.isQuitting = false

  app.on('ready', () => onReady())

  function onReady(err) {
    if (err) throw err

    isReady = true

    mainWindow.init()
    tray.init()
      //
      // // windows.obair.init()
      // // menu.init()
      // // To keep app startup fast, some code is delayed.
      // setTimeout(delayedInit, 3000)

    // Report uncaught exceptions
    process.on('uncaughtException', (err) => {
      console.error(err)
      const error = {
          message: err.message,
          stack: err.stack
        }
        // windows.main.dispatch('uncaughtError', 'main', error)
    })
  }

  app.once('will-finish-launching', function() {
    crashReporter.init()
  })

  app.on('before-quit', function(e) {
    if (app.isQuitting) return

    e.preventDefault()
    app.isQuitting = true

    mainWindow.win.webContents.send('app:quitting')

    ipcMain.on('state:saved', () => {
      console.log('state saved')
      app.quit()
    })
    setTimeout(() => {
      console.log('Save took too long. Quitting now')
      app.quit()
    }, 4000)
  })

  app.on('activate', function() {
    if (isReady) mainWindow.win.show()
  })
}

function delayedInit() {
  if (app.isQuitting) return
  const dock = require('./dock')
  dock.init()
}
