module.exports = {
  init
}

const {
  app, Menu, Tray
} = require('electron')
const config = require('../config')
const mainWindow = require('../main/windows/main')
const platform = require('os').platform()

let tray = null

function init() {
  tray = new Tray(`${config.APP_ICON}/trayTemplate.png`)

  if (platform == "darwin") {
    tray.setPressedImage(`${config.APP_ICON}/trayHighlight.png`)
    tray.setHighlightMode('never')
  }

  const contextMenu = Menu.buildFromTemplate([{
    label: 'Toggle Obair',
    click: () => {
      if (mainWindow.win.isVisible()) {
        mainWindow.win.hide()
        app.dock.hide()
      } else {
        mainWindow.win.show()
        app.dock.show()
      }
    }
  }, {
    label: `Obair v${config.APP_VERSION}`,
    enabled: false
  }, {
    type: 'separator'
  }, {
    label: 'Check for Updates...',
    click: () => true
  }, {
    type: 'separator'
  }, {
    label: 'Quit',
    click: () => app.quit()
  }])

  // Call this again for Linux because we modified the context menu
  tray.setContextMenu(contextMenu)
  tray.setToolTip('This is my application.')
}
