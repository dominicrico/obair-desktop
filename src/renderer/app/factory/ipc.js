const {
  ipcRenderer
} = require('electron')

angular.module('obair.ipc', [])

angular.module('obair.ipc')
  .factory('$ipc', [() => {
    return {
      on: (channel, cb) => {
        ipcRenderer.on(channel, (e, ...args) => {
          return cb(e, ...args)
        })
      },

      once: (channel, cb) => {
        ipcRenderer.once(channel, (e, ...args) => {
          return cb(e, ...args)
        })
      },

      send: (channel, ...args) => {
        ipcRenderer.send(channel, ...args)
      },

      remove: (channel, listener) => {
        ipcRenderer.removeListener(channel, listener)
      }
    }
  }])
