const pkg = require('../package.json')
const path = require('path')
const appConfig = require('application-config')('Obair')

module.exports = {
  APP_NAME: 'Obair',
  APP_TEAM: 'Obair Team',
  APP_VERSION: pkg.version,
  APP_COPYRIGHT: 'Copyright © 2017 ' + this.APP_TEAM,
  APP_FILE_ICON: path.join(__dirname, '..', 'static', 'WebTorrentFile'),
  APP_ICON: path.join(__dirname, '..', 'static', 'icons'),
  APP_WINDOW_TITLE: this.APP_NAME,

  CRASH_REPORT_URL: 'http://obair.io/report',

  WINDOW_MAIN: 'file://' + path.join(__dirname, '..', 'static', 'main.html'),

  UI_HEADER_HEIGHT: 38
}
