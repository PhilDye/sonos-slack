var SlackBot = require('slackbots');
var Sonos = require('sonos');
var _ = require('underscore');
var config = require('config');
var deviceInfo = require ('./deviceInfo.js');


var devices = [];

// create a bot 
var bot = new SlackBot({
    token: config.get('SlackBot.token'), // Add a bot https://my.slack.com/services/new/bot and put the token  
    name: config.get('SlackBot.name')
});

var channel = config.get('SlackBot.channel');

// find Sonos players on the local network
console.log('Searching for Sonos devices...')
var search = Sonos.search();

search.on('DeviceAvailable', function (device, model) {

  var data = {ip: device.host, port: device.port, model: model}

  device.getZoneAttrs(function (err, attrs) {
    if (!err) {
      _.extend(data, attrs)
    }
    device.getZoneInfo(function (err, info) {
      if (!err) {
        _.extend(data, info)
      }
      device.getTopology(function (err, info) {
        if (!err) {
          info.zones.forEach(function (group) {
            if (group.location === 'http://' + data.ip + ':' + data.port + '/xml/device_description.xml') {
              _.extend(data, group)
            }
          })
        }
        devices.push(data)

        console.log("Found device: ", data); 
      })
    })
  })
})

// go!
bot.on('start', function() {

    // more information about additional params https://api.slack.com/methods/chat.postMessage 
    //var params = {
    //    icon_emoji: ':cat:'
    //};
    bot.postMessage(channel, '_SonosBot started_'); 

});

function findCoordinator(coordinator, zone) {
    return coordinator.name == zone;
}


bot.on('message', function(data) {
    // all ingoing events https://api.slack.com/rtm 

    if (data.text == null) {
        // console.log(data);
        return
    }

    if (data.text.toLowerCase() == "help") {
        var result = "I can help quickly control Sonos players without needing the Sonos app\n\n";
        result = result + "Commands I understand;\n";
        result = result + "*nowplaying*: List what's currently playing in each zone\n";
        result = result + "*skip {zonename}*: Skip the current track in the named zone\n";
        result = result + "*pause*: Pause playback in all zones\n";
        result = result + "*play*: Resume playback in all zones\n";
        result = result + "*devices*: Debugging info about the current players\n";

        bot.postMessage(channel, result); 
    }


    if (data.text.toLowerCase() == "devices") {
        deviceInfo.dumpInfo(devices, function(result) {
            bot.postMessage(channel, result); 
        })
    }

    if (data.text.toLowerCase() == "pause") {
        devices.forEach(function(device) {
            var player = new Sonos.Sonos(device.ip);
            player.pause(function (err, paused) {
                if (!err && paused) {
                    bot.postMessage(channel, '_' + device.name + ' paused_'); 
                }
            });
        })
    }

    if (data.text.toLowerCase() == "play") {
        devices.forEach(function(device) {
            var player = new Sonos.Sonos(device.ip);
            player.play(function (err, playing) {
            if (!err && playing) {
                    bot.postMessage(channel, '_' + device.name + ' playing_'); 
                }            
            });
        })
    }

    if (data.text.toLowerCase().startsWith('skip')) {
        if (devices.length != 1 && data.text.toLowerCase() == 'skip')
        {
            bot.postMessage(channel, 'Tell me which zone to skip, eg `skip zonename` - use `nowplaying` to get zone names');
            return;
        }

        var zoneName = data.text.toLowerCase().replace('skip ','');

        var zone = devices.find(function (device) {
            return device.name.toLowerCase() == zoneName;
        });

        if (zone.ip != null) {
            var player = new Sonos.Sonos(zone.ip);
            player.next(function (err, skipped) {
                if (!err && skipped) {
                    bot.postMessage(channel, '_' + zone.name + ' skipped_'); 
                }
            });
        }
    };

    if (data.text.toLowerCase() == 'nowplaying') {
        deviceInfo.nowPlaying(devices, function(result) {
            if (result.track != null) {
                var song = result.track.artist + ' - ' + result.track.title;
                var data = '(' + result.zone + ') ' + '*' + song + '*';

                bot.postMessage(channel, data); 

                // get the album art and make it publically accessible
                // download(result.track.albumArtURL, "./" + song + ".png", function(){
                //     imgur.uploadFile("./" + song + ".png")
                //     .then(function (imgurData) {
                //         var data = {
                //             attachments: [
                //               {
                //                 fallback: song,
                //                 fields: [
                //                   {
                //                     title: song,
                //                     value: result.zone,
                //                     short: true
                //                   }
                //                 ],
                //                 image_url: imgurData.data.link
                //               }
                //             ]
                //         };

                //         bot.postMessageToUser(settings.channel, '', data); 
                //     })
                // });
            }
        })
    }

});


var lastArtist = null;
var lastTitle = null;
var isBroke = false;

