angular.module('obair', [
  'angularMoment',
  'ngDialog',
  'siyfion.sfTypeahead',
  'ui.router',
  'ngAnimate',

  'obair.config',
  'obair.ipc'
]);

// instantiate the bloodhound suggestion engine
var customers = new Bloodhound({
  datumTokenizer: (d) => {
    return Bloodhound.tokenizers.whitespace(d.name);
  },
  queryTokenizer: Bloodhound.tokenizers.whitespace,
  local: []
})

angular.module('obair').config(['$stateProvider', '$urlRouterProvider', ($stateProvider, $urlRouterProvider) => {
    $urlRouterProvider.otherwise('/projects')

    $stateProvider.state({
      name: 'projects',
      url: '/projects',
      templateUrl: 'file://' + __dirname + '/templates/projects.html',
      controller: 'main'
    }).state({
      name: 'timesheets',
      url: '/timesheets',
      templateUrl: 'file://' + __dirname + '/templates/timesheets.html',
      // controller: 'main'
    }).state({
      name: 'settings',
      url: '/settings',
      templateUrl: 'file://' + __dirname + '/templates/settings.html',
      controller: 'settings'
    });
  }]).run([
    '$timeout',
    '$rootScope',
    '$config',
    '$ipc',
    '$state', ($timeout, $rootScope, $config, $ipc, $state) => {
      $timeout(() => {
        angular.element('.loading img').addClass('pulse')
      }, 1200);

      //keep it hidden until loading is done
      $timeout(() => {
        angular.element('main').hide()
      })

      $config.load().then((config) => {
        $rootScope.config = config;

        $rootScope.$broadcast('loading:done')
      });

      $ipc.on('app:quitting', () => {
        $timeout(() => {
          $config.save($rootScope.config).then(() => {
            $ipc.send('state:saved')
          }, (err) => {
            console.log('error', err)
          })
        })
      })

      $rootScope.left = true;
      $rootScope.goTo = (state) => {
        if ($state.current.name === 'projects' && state !== 'settings') {
          $rootScope.left = true;
        } else if ($state.current.name === 'timesheets' && state === 'settings') {
          $rootScope.left = true;
        } else if ($state.current.name === 'settings' && state === 'projects') {
          $rootScope.left = true;
        } else if ($state.current.name === 'projects' && state === 'settings') {
          $rootScope.left = false;
        } else {
          $rootScope.left = false;
        }
        $timeout(() => {
          $state.go(state)
        })
      }

      //Loading is done, show the main window
      $rootScope.$on('loading:done', () => {
        angular.element('.loading').fadeOut(1000, () => {
          angular.element('.loading').detach()
          angular.element('main, header, footer').fadeIn(1000)
        });
      })
    }
  ])
  .controller('settings', [
    '$scope',
    '$rootScope',
    '$config', ($scope, $rootScope, $config) => {

      $scope.config = $rootScope.config;

      $rootScope.$watch(() => {
        if ($rootScope.config) {
          return $rootScope.config;
        }
      }, () => {
        $scope.config = $rootScope.config;
        console.log($scope.config)
      }, true)

    }
  ])
  .controller('main', [
    '$scope',
    '$rootScope',
    '$interval',
    'moment',
    '$config',
    'ngDialog', ($scope, $rootScope, $interval, moment, $config, ngDialog) => {
      $scope.projects = []

      $scope.init = () => {
        if ($rootScope.loaded) {
          // initialize the bloodhound suggestion engine
          customers.initialize();
          let c = $rootScope.config.customers
          let projects = []
          c.forEach((customer) => {
            let _project
            if (customer && customer.projects) {
              customer.projects.forEach((p) => {
                _project = p
                if (customer && customer.name) {
                  _project.customer = customer.name
                }
                projects.push(_project)
              })
            }

            customers.add(customer)
          })

          $scope.projects = projects;
        }
      }

      let _first = true
      $rootScope.$watch(() => {
        if ($rootScope.config && $rootScope.config.customers) {
          return $rootScope.config.customers;
        }
      }, () => {
        if (!_first) {
          $scope.init()
        } else {
          _first = false
        }
      }, true)

      $scope.toggleTiming = (project) => {
        $scope.projects.forEach((p) => {
          if (p.timer && p.title !== project.title) {
            stopTimer(p)
          }
        })

        if (!project.timer) {
          project.lastTiming = {
            start: new Date().getTime()
          }
          project.timer = true;

          project.interval = $interval(() => {
            project.time++
          }, 1000)
        } else if (project.timer) {
          stopTimer(project)
        }

        function stopTimer(p) {
          p.lastTiming.end = new Date().getTime()
          if (p.lastTiming.start && p.lastTiming.end) {
            p.times.push(project.lastTiming)
          }
          p.timer = false;
          $interval.cancel(p.interval)
          p.interval = undefined
          delete p.interval
          p.lastTiming = undefined
          delete p.lastTiming
        }
      }

      $scope.getTimes = (times) => {
        return times.slice(Math.max(times.length - 3, 1))
      }

      $scope.elapsedTime = (time) => {
        let duration = moment.duration(time, 'seconds')
        let hours = (duration.hours() < 10) ? '0' + duration.hours() : duration.hours()
        let mins = (duration.minutes() < 10) ? '0' + duration.minutes() : duration.minutes()
        let secs = (duration.seconds() < 10) ? '0' + duration.seconds() : duration.seconds()
        return hours + ":" + mins + ":" + secs
      }

      $scope.parseTimes = (times) => {
        let start = moment(times.start)
        let end = moment(times.end)
        let date = start.format('MM/DD/YYYY')
        end = end.format('MM/DD/YYYY HH:mm').replace(date + ' ', '')
        return `${start.format('MM/DD/YYYY HH:mm')} - ${end}`
      }

      $scope.addProject = (project) => {
        ngDialog.open({
          template: 'addProject.html',
          className: 'ngdialog-theme-default',
          scope: $scope,
          controller: ['$scope', '$config', ($scope, $config) => {
            $scope.selectedCustomer = null;

            $scope.customerDataset = {
              displayKey: 'name',
              source: customers.ttAdapter(),
              templates: {
                empty: [
                  '<div class="tt-suggestion tt-empty-message">',
                  'No Customer found ...',
                  '</div>'
                ].join('\n'),
              }
            };

            $scope.add = () => {
              let _template = {
                title: null,
                time: 0,
                timer: false,
                times: []
              }
              let _added = false

              $rootScope.config.customers.forEach((c, i) => {
                if (c.name === $scope.selectedCustomer.name) {
                  _template.title = $scope.projectName
                  $rootScope.config.customers[i].projects.push(_template)
                  _added = true
                }
              })

              if (!_added) {
                _template.title = $scope.projectName
                let _new = {
                  name: $scope.selectedCustomer,
                  projects: [_template]
                }
                $rootScope.config.customers.push(_new)
              }

              $config.save($rootScope.config).then(() => {
                $scope.closeThisDialog()
              })
            }
          }]
        });
      }

      $rootScope.$on('loading:done', () => {
        $rootScope.loaded = true;
        $scope.init()
      })
    }
  ]).animation('.swipe-left', () => {
    return {
      enter: (element, done) => {
        angular.element(element).removeAttr('style').css({
          left: '100%'
        })
        angular.element(element).show()
        angular.element(element).animate({
          left: '0'
        }, 500, 'easeInOutQuad', () => {
          done()
        })
      },
      leave: (element, done) => {
        angular.element(element).removeAttr('style').css({
          left: 0
        })
        angular.element(element).show()
        angular.element(element).animate({
          left: '-100%'
        }, 500, 'easeInOutQuad', () => {
          done()
        })
      },
      move: (element, done) => {
        return done();
      }
    }
  }).animation('.swipe-right', () => {
    return {
      enter: (element, done) => {
        angular.element(element).removeAttr('style').css({
          right: '100%'
        })
        angular.element(element).show()
        angular.element(element).animate({
          right: 0
        }, 500, 'easeInOutQuad', () => {
          done()
        });
      },
      leave: (element, done) => {
        angular.element(element).removeAttr('style').css({
          right: 0
        })
        angular.element(element).show()
        angular.element(element).animate({
          right: '-100%'
        }, 500, 'easeInOutQuad', () => {
          done()
        });
      },
      move: (element, done) => {
        return done();
      }
    }
  })
