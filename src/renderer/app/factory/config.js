const appConfig = require('application-config')('Obair')
const pkg = require('../package.json')

angular.module('obair.config', [])

angular.module('obair.config')
  .factory('$config', ['$q', ($q) => {
    let _config;

    return {
      load: () => {
        let deferred = $q.defer()

        if (angular.isDefined(_config)) {
          deferred.resolve(_config)
        }

        appConfig.read((err, config) => {
          if (err) {
            deferred.reject(err)
          } else {
            _config = config

            if (!_config.version) {
              _config = {
                version: pkg.version,
                startup: false,
                customers: [],
                conaktiv: {
                  enable: false,
                  url: 'http://10.0.20.42:10282/4DWSDL',
                  mandantId: -1,
                  version: '13.1',
                  connectionId: -1
                }
              }
            }

            deferred.resolve(_config)
          }
        });

        return deferred.promise
      },

      save: (config) => {
        let deferred = $q.defer()

        _config = Object.assign(_config, config)

        appConfig.write(_config, (err) => {
          if (err) {
            deferred.reject(err)
          } else {
            deferred.resolve(_config)
          }
        })

        return deferred.promise
      },

      remove: () => {
        let deferred = $q.defer()

        appConfig.trash((err) => {
          if (err) {
            deferred.reject(err)
          } else {
            _config = undefined
            deferred.resolve(_config)
          }
        })

        return deferred.promise
      },
    }
  }])
