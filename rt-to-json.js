const ProtoBuf = require('protobufjs');
const moment = require('moment');
const fs = require('fs');

const { dates, jsonRouteGroups } = require('./config.json');

trainDb = {};

const loadTrainDataCollectorAssets = () => {
  return ProtoBuf
    .load("nyct-subway.proto")
    .then((root) => {
      return new Promise((resolve, reject) => {
        resolve([
          root.lookupType("FeedMessage"),
          root.lookupType("NyctTripDescriptor").nested.Direction.valuesById
        ]);
      });
    })
    .catch((err) => {
      console.error(err);
    });
};

const processFeed = (feedMessage, directionMap, body) => {
  var msg;

  try {
    msg = feedMessage.decode(body);
  } catch (e) {
    console.error(e);
    return;
  }

  msg.entity.forEach((entity) => {
   if (!entity.tripUpdate) return;
   var nyctDescriptor = entity.tripUpdate.trip['.nyctTripDescriptor'];
   var trainId = nyctDescriptor.trainId;

   if (!trainDb[trainId]) {
     trainDb[trainId] = {
       updates: {},
       direction: directionMap[nyctDescriptor.direction]
     };
   }

   entity.tripUpdate.stopTimeUpdate.map((stopTimeUpdate) => {
     var stopId = stopTimeUpdate.stopId.slice(0, -1);
     var time;

     if (stopTimeUpdate.arrival && stopTimeUpdate.arrival.time) {
       time = stopTimeUpdate.arrival.time.low;
     } else if (stopTimeUpdate.departure && stopTimeUpdate.departure.time) {
       time = stopTimeUpdate.departure.time.low;
     } else {
       time = '';
     }

     trainDb[trainId].updates[stopId] = moment.unix(time);
   });
 });
};

const runTrainDataCollector = (feedMessage, directionMap, date) => {
  var dir = `mtadownload/gtfs-${date}/`;
  fs.readdir(dir, (err, files) => {
    if (err) throw err;

    jsonRouteGroups.forEach((line) => {
      trainDb = {};

      var lineFiles = files.filter((file) => {
        return !(file.includes('lirr') || file.includes('mnr')) && file.startsWith(`gtfs-${line}`);
      });

      for(var i = 0; i < lineFiles.length; i++) {
        processFeed(
          feedMessage,
          directionMap,
          fs.readFileSync(`${dir}/${lineFiles[i]}`)
        );

        if ((i + 1) === lineFiles.length) {
          if (line === '') {
            line = '123456S';
          }

          var filename = `outjson/rt-${date}-${line}.json`;
          fs.writeFile(filename, JSON.stringify(trainDb), () => {
            console.log(`Wrote ${filename}`);
          });
        }
      }
    });
  });
};

loadTrainDataCollectorAssets()
.then((args) => {
  dates.forEach((date) => {
    runTrainDataCollector(args[0], args[1], date);
  });
});
