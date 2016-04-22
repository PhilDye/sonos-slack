var Sonos = require('sonos');
var _ = require('underscore');

// Functions to process device information

function getBridges (deviceList) {
  var bridges = []
  deviceList.forEach(function (device) {
    if (device.CurrentZoneName === 'BRIDGE' && bridges.indexOf(device.ip + ':' + device.port) === -1) {
      bridges.push(device.ip + ':' + device.port)
    }
  })
  return bridges
}

function getBridgeDevices (deviceList) {
  var bridgeDevices = []
  deviceList.forEach(function (device) {
    if (device.CurrentZoneName === 'BRIDGE') {
      bridgeDevices.push(device)
    }
  })
  return bridgeDevices
}

function getZones (deviceList) {
  var zones = []
  deviceList.forEach(function (device) {
    if (zones.indexOf(device.CurrentZoneName) === -1 && device.CurrentZoneName !== 'BRIDGE') {
      zones.push(device.CurrentZoneName)
    }
  })
  return zones
}

function getZoneDevices (zone, deviceList) {
  var zoneDevices = []
  deviceList.forEach(function (device) {
    if (device.CurrentZoneName === zone) {
      zoneDevices.push(device)
    }
  })
  return zoneDevices
}

function getZoneCoordinator (zone, deviceList) {
  var coordinator
  deviceList.forEach(function (device) {
    if (device.CurrentZoneName === zone && device.coordinator === 'true') {
      coordinator = device
    }
  })
  return coordinator
}



// Display device information in structured form
module.exports = {
  dumpInfo: function (devices, callback) {
    var result = '';
    result += '\nBridges:\n--------\n';
    getBridges(devices).forEach(function (bridge) {
      result += bridge;
      getBridgeDevices(devices).forEach(function (device) {
        result += '\t' + JSON.stringify(device);
      })
    })
    result += '\nZones (coordinator):\n--------------------\n';
    getZones(devices).forEach(function (zone) {
      var coordinator = getZoneCoordinator(zone, devices);
      if (coordinator !== undefined) {
        result += '\n' + zone + ' (' + coordinator.ip + ':' + coordinator.port + ')\n';
      }
      getZoneDevices(zone, devices).forEach(function (device) {
        result +=  JSON.stringify(device) + '\n';
      })
    })

    return callback(result);
  },

  nowPlaying: function(devices, callback) {
    getZones(devices).forEach(function (zone, track) {
        var coordinator = getZoneCoordinator(zone, devices);
        if (coordinator !== undefined) {
          console.log('Getting info from ', coordinator);
          var player = new Sonos.Sonos(coordinator.ip);
          player.currentTrack(function (err, track) {
              //if (err) throw err;

              console.log(zone, track || 'Nothing Playing');
              var result = {};
              result.zone = zone;
              result.track = track;
              return callback(result);
          })
        }
    })
  },

  findZone: function(devices, callback) {

  }
}
