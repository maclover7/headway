const request = require('request-promise');
const ProtoBuf = require('protobufjs');
const moment = require('moment');
const fs = require('fs');

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

   msg.entity.map((entity) => {
    if (!entity.tripUpdate) {
      return new Promise((resolve, reject) => { resolve(); });
    }

    var trip = entity.tripUpdate.trip;
    var trainId = trip['.nyctTripDescriptor'].trainId;

    if(!trainDb[trainId]) {
      trainDb[trainId] = {
        updates: {},
        direction: directionMap[trip['.nyctTripDescriptor'].direction]
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
  fs.readdir(`mtadownload/gtfs-${date}/`, (err, files) => {
    if (err) throw err;

    var subwayFiles = files.filter((file) => {
      return !file.includes('lirr') && !file.includes('mnr')
    });

    ['', '7', 'ace', 'bdfm', 'g', 'jz', 'l', 'nqrw', 'si'].forEach((line) => {
      trainDb = {};

      var lineFiles = subwayFiles.filter((file) => {
        return file.startsWith(`gtfs-${line}`);
      });

      for(var i = 0; i < lineFiles.length; i++) {
        var contents = fs.readFileSync(`${dir}${lineFiles[i]}`);
        processFeed(feedMessage, directionMap, contents);

        if ((i+1) === lineFiles.length) {
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
  [
    '02', '03', '04', '05',
    '08', '09', '10', '11', '12',
    '15', '16', '17', '18', '19',
    '22', '23', '24', '25', '26',
    '29', '30', '31'
  ].forEach((day) => {
    runTrainDataCollector(args[0], args[1], `2018-01-${day}`);
  });
});
