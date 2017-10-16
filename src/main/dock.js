module.exports = {
  init,
  setBadge
}

const {
  app, Menu
} = require('electron')
const log = console.log
  /**
   * Add a right-click menu to the dock icon. (Mac)
   */
function init() {
  if (!app.dock) return
  const menu = Menu.buildFromTemplate(getMenuTemplate())
  app.dock.setMenu(menu)
}

/**
 * Display a counter badge for the app. (Mac, Linux)
 */
function setBadge(count) {
  if (process.platform === 'darwin' ||
    (process.platform === 'linux' && app.isUnityRunning())) {
    log(`setBadge: ${count}`)
    app.setBadgeCount(Number(count))
  }
}

function getMenuTemplate() {
  return [getTimingStatus()]
}

function getTimingStatus() {
  let timing = false
  if (timing) {
    return {
      label: 'Stop Timing',
      accelerator: 'CmdOrCtrl+S',
      click: () => {
        return true
      }
    }
  } else {
    return {
      label: 'Start Timing',
      accelerator: 'CmdOrCtrl+S',
      click: () => {
        return true
      }
    }
  }
}
