const soap = require('soap')
const request = require('request')
const appConfig = require('application-config')('Obair')
const requestHandler = require('./request')
const xml2js = require('xml2js')
const builder = new xml2js.Builder()
const parser = new xml2js.Parser({
  explicitArray: false
})
const _args = {}
let url
appConfig.read((err, config) => {
  url = config.conaktiv.url
  _args.User = config.conaktiv.user
  _args.Password = config.conaktiv.password
  _args.Mandant_ID = config.conaktiv.mandantId
  _args.Version = config.conaktiv.version
  _args.Connection_ID = config.conaktiv.connectionId
  _args.Application = 'W1'
  getGroups((err, groups) => {
      groups.forEach(function(group) {
        if (group.isDefaultGroup) _args.Group_ID = group.ID
      })

      getUser((err, user) => {

        _args.user_short = user.UserData.Benutzer.PWB_Benutzer_KZ
        _args.user_id = user.UserData.Benutzer.PWB_Mitarbeiter_ID

        getProjects((err, data) => {
          getProjectPositions(data[0].id, (err, data) => {
            console.log(data['ConAktiv_XML_Export_Version_1.1'].tables.PRP_table.data.list.definition
              .cols.col)
          })
        })
      })
    })
    //
    // getTasks(console.log)
})

function parseResponse(res, cb) {

  let response = Buffer.from(res.OutputData.$value, 'base64').toString('utf-8')

  if (response.indexOf('<') !== 0) {
    response = response.substring(response.indexOf('<'), response.length)
  }

  return parser.parseString(response, cb)
}

function sendRequest(func, data, cb) {
  let xmlData = {}

  if (typeof data === 'function') {
    cb = data
    data = {}
  }

  if (func.indexOf('Export') !== -1) {
    xmlData['ConAktiv_XML_Export_Version_1.1'] = data
  } else if (func.indexOf('Import') !== -1) {
    xmlData['ConAktiv_XML_Import_Version_1.2'] = data
  }
  let xml = builder.buildObject(xmlData);

  soap.createClient(url, {
    httpClient: new requestHandler()
  }, (err, client) => {
    if (err) return cb(err)
    const argOverride = {
      Function: func,
      InputData: xml
    }

    args = Object.assign(argOverride, _args)

    client.WS_Start_Service(args, (err, result) => {
      if (err) return cb(err)
      parseResponse(result, (err, data) => {
        return cb(err, data)
      })
    })
  })
}

function getGroups(cb) {
  sendRequest('Groups_Get', (err, data) => {
    console.log(data)
    return cb(err, data.Clients.Client.Groups.Group)
  })
}

function getUser(cb) {
  sendRequest('Login_GetUserData_W1', {
    Group_ID: _args.Group_ID
  }, cb)
}

function getFoo(cb) {
  sendRequest('ConAktivExport', {
    tables: {
      VI_table: {
        query: {
          fields: {
            VI_Mitarbeiter_Kuerzel: _args.user_short,
            VI_Vorlagedatum: {
              $: {
                operator: '&amp;lt;=' + new Date().getFullYear() + '-' + (new Date().getMonth() + 1) + '-' +
                  new Date()
                  .getDate()
              }
            },
            VI_Erledigt: false,
          },
          start: 1,
          logical_operator: 'AND'
        },
        data: {
          list: {
            mainmodul: 'VI',
            type: 'BR_TASK'
          }
        }
      }
    }
  }, cb)
}

function getTasks(cb) {
  sendRequest('ConAktivExport', {
    tables: {
      IF_table: {
        query: {
          fields: {
            IF_Mandant_ID: 1
          },
          start: 1,
          logical_operator: 'AND'
        },
        data: {
          list: {
            mainmodul: 'IF',
            type: 'BR_TASK'
          }
        }
      }
    }
  }, cb)
}

function getProjects(cb) {
  /*
  standalone="yes"?&gt;
  &lt;ConAktiv_XML_Export_Version_1.1&gt;
  &lt;tables&gt;
  &lt;PR_table&gt;
  &lt;query&gt;
  &lt;special&gt;
  &lt;PR_AllowedProjectsForTimesheet&gt;
  &lt;KA_Mitarbeiter_ID&gt;48&lt;/KA_Mitarbeiter_ID&gt;
  &lt;KA_Endetag&gt;2017-10-16&lt;/KA_Endetag&gt;
  &lt;Zeitraum_Von&gt;2017-10-01&lt;/Zeitraum_Von&gt;
  &lt;/PR_AllowedProjectsForTimesheet&gt;
  &lt;/special&gt;
  &lt;start&gt;1&lt;/start&gt;
  &lt;logical_operator&gt;AND&lt;/logical_operator&gt;
  &lt;/query&gt;
  &lt;data&gt;
  &lt;list&gt;
  &lt;mainmodul&gt;KA001&lt;/mainmodul&gt;
  &lt;type&gt;KA001List&lt;/type&gt;
  &lt;/list&gt;
  &lt;/data&gt;
  &lt;/PR_table&gt;
  &lt;/tables&gt;
  &lt;/ConAktiv_XML_Export_Version_1.1&gt;
   */
  sendRequest('ConAktivExport', {
    tables: {
      PR_table: {
        query: {
          special: {
            PR_AllowedProjectsForTimesheet: {
              KA_Mitarbeiter_ID: _args.user_id,
              KA_Endetag: new Date().getFullYear() + '-' + (new Date().getMonth() + 1) + '-' + new Date()
                .getDate(),
              Zeitraum_Von: new Date().getFullYear() + '-' + (new Date().getMonth() + 1) + '-01'
            }
          },
          start: 1,
          logical_operator: 'AND'
        },
        data: {
          list: {
            mainmodul: 'KA001',
            type: 'KA001List'
          }
        }
      }
    }
  }, (err, data) => {

    if (err) {
      return cb(err);
    }

    let projectCount = parseInt(data['ConAktiv_XML_Export_Version_1.1'].tables.PR_table.data.list.definition
      .MaximalRows)
    let projects = new Array(projectCount)
    for (var i = 0; i < projects.length; i++) {
      let project = {}
      data['ConAktiv_XML_Export_Version_1.1'].tables.PR_table.data.list.definition.cols.col.forEach(
        (col) => {
          let title;
          let conaktivTitle = (col.title.length) ? col.title : col.fieldname
          switch (conaktivTitle) {
            case 'Projekt-Nr.':
              title = 'project_id'
              break
            case 'Projekt':
              title = 'title'
              break
            case 'Kunde':
              title = 'customer'
              break
            case 'Anfang':
              title = 'start'
              break
            case 'Ende':
              title = 'end'
              break
            case 'Rest-Tage':
              title = 'days_left'
              break
            case 'PR_Kunden_ID':
              title = 'customer_id'
              break
            default:
              title = 'unknown'
          }

          project.id = data['ConAktiv_XML_Export_Version_1.1'].tables.PR_table.data.list.definition.ids.id[i]
          project[title] = col.values.v[i]
        })
      projects[i] = project
    }

    return cb(err, projects)
  })
}

function getProjectPositions(project_id, cb) {
  /*

  &lt;ConAktiv_XML_Export_Version_1.1&gt;
  &lt;tables&gt;
  &lt;PRP_table&gt;
  &lt;query&gt;
  &lt;special&gt;
  &lt;PRP_AllowedProjectpositionsForTimesheet&gt;
  &lt;KA_Mitarbeiter_ID&gt;48&lt;/KA_Mitarbeiter_ID&gt;
  &lt;KA_Endetag&gt;2017-10-16&lt;/KA_Endetag&gt;
  &lt;KA_Projekte_ID&gt;579&lt;/KA_Projekte_ID&gt;
  &lt;/PRP_AllowedProjectpositionsForTimesheet&gt;
  &lt;/special&gt;
  &lt;start&gt;1&lt;/start&gt;
  &lt;logical_operator&gt;AND&lt;/logical_operator&gt;
  &lt;/query&gt;
  &lt;data&gt;
  &lt;list&gt;
  &lt;mainmodul&gt;KA001&lt;/mainmodul&gt;
  &lt;type&gt;KA001_KA&lt;/type&gt;
  &lt;/list&gt;
  &lt;/data&gt;
  &lt;/PRP_table&gt;
  &lt;/tables&gt;
  &lt;/ConAktiv_XML_Export_Version_1.1&gt;

   */
  sendRequest('ConAktivExport', {
    tables: {
      PRP_table: {
        query: {
          special: {
            PRP_AllowedProjectpositionsForTimesheet: {
              KA_Mitarbeiter_ID: _args.user_id,
              KA_Endetag: new Date().getFullYear() + '-' + (new Date().getMonth() + 1) + '-' + new Date()
                .getDate(),
              KA_Projekte_ID: project_id
            }
          },
          start: 1,
          logical_operator: 'AND'
        },
        data: {
          list: {
            mainmodul: 'KA001',
            type: 'KA001_KA'
          }
        }
      }
    }
  }, cb)
}
