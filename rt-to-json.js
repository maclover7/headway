const moment = require('moment');
const fs = require('fs');
const { loadProtobufAssets, processProtobuf } = require('nyc-gtfs-utils');

const { dates, jsonRouteGroups } = require('./config.json');

const processFile = (feedMessage, directionMap, body) => {
  var trainDb = {};

  return processProtobuf(
    feedMessage, directionMap, body,
    (nyctDescriptor) => {
      if (!trainDb[nyctDescriptor.trainId]) {
        trainDb[nyctDescriptor.trainId] = {
          updates: {},
          direction: directionMap[nyctDescriptor.direction]
        };
      }
    },
    ({ trainId, stopId, time }) => {
      trainDb[trainId].updates[stopId] = time;
    }
  ).then(() => {
    return new Promise((resolve, reject) => {
      resolve(trainDb);
    });
  });
};

const runTrainDataCollector = (feedMessage, directionMap, date) => {
  var dir = `mtadownload/gtfs-${date}/`;
  fs.readdir(dir, (err, files) => {
    if (err) throw err;

    jsonRouteGroups.forEach((line) => {
      var processedFiles = files.filter((file) => {
        return !(file.includes('lirr') || file.includes('mnr')) && file.startsWith(`gtfs-${line}`);
      })
      .map((lineFile) => {
        return processFile(
          feedMessage,
          directionMap,
          fs.readFileSync(`${dir}/${lineFile}`)
        );
      });

      Promise.all(processedFiles)
      .then((trainDb) => {
        if (line === '') {
          line = '123456S';
        }

        var filename = `outjson/rt-${date}-${line}.json`;
        fs.writeFile(filename, JSON.stringify(Object.assign({}, ...trainDb)), () => {
          console.log(`Wrote ${filename}`);
        });
      });
    });
  });
};

loadProtobufAssets()
.then((args) => {
  dates.forEach((date) => {
    runTrainDataCollector(args[0], args[1], date);
  });
});
