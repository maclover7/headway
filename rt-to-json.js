const fs = require('fs');
const readdir = require('util').promisify(fs.readdir);
const { loadProtobufAssets, processProtobuf } = require('nyc-gtfs-utils');

const { dates, jsonRouteGroups } = require('./config.json');
trainDb = {};

const onEntity = ({ trainId, direction }) => {
  if (!trainDb[trainId]) {
    trainDb[trainId] = { updates: {}, direction };
  }
  return Promise.resolve();
};

const onStopTimeUpdate = ({ trainId, stopId, time }) => {
  trainDb[trainId].updates[stopId] = time;
  return Promise.resolve();
};

const runTrainDataCollector = (feedMessage, directionMap, date) => {
  var dir = `mtadownload/gtfs-${date}/`;
  readdir(dir).then((files) => {
    jsonRouteGroups.forEach((line) => {
      trainDb = {};

      var promises = files
      .filter((file) => {
        return !(file.includes('lirr') || file.includes('mnr')) &&
          file.startsWith(`gtfs-${line ?  '-' : '' }2018`);
      })
      .map((file) => {
        return processProtobuf(
          feedMessage, directionMap, fs.readFileSync(`${dir}/${file}`),
          onEntity, onStopTimeUpdate
        );
      });

      Promise.all(promises)
      .then(() => {
         if (line === '') {
           line = '123456S';
         }

         var filename = `outjson/rt-${date}-${line}.json`;
         fs.writeFile(filename, JSON.stringify(trainDb), () => {
           console.log(`Wrote ${filename}`);
         });
      });
    });
  });
};

loadProtobufAssets()
.then((args) => {
  dates.forEach((date) => {
    runTrainDataCollector(args[0], args[1], date)
  });
});
