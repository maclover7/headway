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

  msg.entity.forEach((entity) => {
   if (!entity.tripUpdate) return;

   if (!trainDb[trainId]) {
     trainDb[trainId] = {
       updates: {},
       direction: directionMap[entity.tripUpdate.trip['.nyctTripDescriptor'].direction]
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

    ['', '7', 'ace', 'bdfm', 'g', 'jz', 'l', 'nqrw', 'si'].forEach((line) => {
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
  [
    '2018-01-02',
    //'2018-01-02', '2018-01-03', '2018-01-04', '2018-01-05',
    //'2018-01-08', '2018-01-09', '2018-01-10', '2018-01-11', '2018-01-12',
    //'2018-01-15', '2018-01-16', '2018-01-17', '2018-01-18', '2018-01-19',
    //'2018-01-22', '2018-01-23', '2018-01-24', '2018-01-25', '2018-01-26',
    //'2018-01-29', '2018-01-30', '2018-01-31'
  ].forEach((day) => {
    runTrainDataCollector(args[0], args[1], day);
  });
});
