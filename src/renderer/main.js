console.time('init')

const crashReporter = require('../crash-reporter')
crashReporter.init()

const {
  ipcRenderer
} = require('electron')

// Listen to events from the main and webtorrent processes
function setupIpc() {
  ipcRenderer.on('ob-error', (e, ...args) => handleError(...args))

  ipcRenderer.send('ipcReady')

  angular.bootstrap(document, ['obair']);
}

setupIpc()

// Some state changes can't be reflected in the DOM, instead we have to
// tell the main process to update the window or OS integrations
function updateElectron() {
  if (state.window.title !== state.prev.title) {
    state.prev.title = state.window.title
    ipcRenderer.send('setTitle', state.window.title)
  }
  if (state.dock.progress.toFixed(2) !== state.prev.progress.toFixed(2)) {
    state.prev.progress = state.dock.progress
    ipcRenderer.send('setProgress', state.dock.progress)
  }
  if (state.dock.badge !== state.prev.badge) {
    state.prev.badge = state.dock.badge
    ipcRenderer.send('setBadge', state.dock.badge || 0)
  }
}

function handleError(e, error) {
  console.log(e, error)
}
