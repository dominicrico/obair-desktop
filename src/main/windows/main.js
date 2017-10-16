const main = module.exports = {
  init,
  win: null
}

const config = require('../../config')
const {
  BrowserWindow
} = require('electron')

function init() {
  if (main.win) {
    main.win.show()
  }

  const win = main.win = new BrowserWindow({
    backgroundColor: '#F8F8F8',
    backgroundThrottling: false, // do not throttle animations/timers when page is background
    height: 650,
    icon: getIconPath(), // Window icon (Windows, Linux)
    minHeight: 650,
    minWidth: 350,
    show: true,
    title: config.APP_WINDOW_TITLE,
    titleBarStyle: 'hidden-inset', // Hide title bar (Mac)
    useContentSize: true, // Specify web page size without OS chrome
    width: 350
  })

  win.loadURL(config.WINDOW_MAIN)

  win.once('ready-to-show', () => {
    console.log('ready')
    win.show()
  })

  win.webContents.openDevTools()

  // if (win.setSheetOffset) {
  //   win.setSheetOffset(config.UI_HEADER_HEIGHT)
  // }

  win.webContents.on('will-navigate', (e, url) => {
    // Prevent drag-and-drop from navigating the Electron window, which can happen
    // before our drag-and-drop handlers have been initialized.
    e.preventDefault()
  })

  win.on('closed', () => {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    main.win = null
  })
}

function getIconPath() {
  return process.platform === 'win32' ? config.APP_ICON + '.ico' : config.APP_ICON + 'trayHighlight.png'
}
