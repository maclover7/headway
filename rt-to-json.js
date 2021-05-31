const fs = require('fs');
const readdir = require('util').promisify(fs.readdir);
const { loadProtobufAssets, processProtobuf } = require('nyc-gtfs-utils');

const { jsonRouteGroups } = require('./config.json');
const dates = [
  '2018-02-01', '2018-02-02',
  '2018-02-05', '2018-02-06', '2018-02-07', '2018-02-08', '2018-02-09',
  '2018-02-12', '2018-02-13', '2018-02-14', '2018-02-15', '2018-02-16',
  '2018-02-19', '2018-02-20', '2018-02-21', '2018-02-22', '2018-02-23',
  '2018-02-26', '2018-02-27', '2018-02-28'
];
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
    [''].forEach((line) => {
      trainDb = {};

      var promises = files
      .filter((file) => {
        var keyword = line ? `${line}-` : '';
        return !(file.includes('lirr') || file.includes('mnr')) &&
          file.startsWith(`gtfs-${keyword}2018`);
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
