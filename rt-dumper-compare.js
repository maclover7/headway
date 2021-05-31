const moment = require('moment');
var fs = require('fs');
const readFile = require('util').promisify(fs.readFile);

var out = { 'RT': {}, 'SC': {} };

const ctx = {
  dates: [
    // "control" group (the way things used to be)
    //'2017-11-01',
    //'2018-01-05',
    '2018-02-20',
    //'2018-04-17',
    //'2018-04-18'

    // "experimental" group (the way things are now)
    //'2018-03-15'
  ],

  // 33 St on the 6 train
  //fromSta: '101',

  // 42 St on the 6 train
  //toSta: '103',
  direction: 'SOUTH',
  routeGroup: 'nqrw'
};

currrentstops = require('./linestops.js').lineqstops;
lastStop = 'D43';
subwayRoute = 'Q';

const processTrains = ({ source, trains, date, fromSta, toSta }) => {
  return new Promise((resolve, reject) => {
    var diffs = [];
    Object.keys(trains).forEach((key) => {
      var train = trains[key];
      var trainStops = Object.keys(train.updates);

      var validTrain = (train.direction === ctx.direction) &&
        (trainStops.includes(fromSta) && trainStops.includes(toSta));

      if (!validTrain) {
        delete trains[key];
      } else {
        var diff = moment(train.updates[toSta])
          .diff(moment(train.updates[fromSta]), 'minutes');
        diffs.push(Math.abs(diff));
      }
    });

    resolve({ date, diffs, source, trainsCount: Object.keys(trains).length, fromSta, toSta });
  });
};

const getScheduled = ({ date, fromSta, toSta }) => {
  return readFile(`mtadownload/google_transit/stop_times.txt`)
  .then((file) => {
    return new Promise((resolve, reject) => {
      var lines = file.toString().split("\n")
      .filter((trip) => {
        return trip.includes('WKD_') && trip.includes(`_${subwayRoute}..`);
      })
      .forEach((trip) => {
        var split = trip.split('..');
        var tripId = split[0];

        if (!trainDb[tripId]) {
          trainDb[tripId] = { direction: '', updates: [] };
          trainDb[tripId].direction = split[1][0] === 'N' ? 'NORTH' : 'SOUTH';
        }

        var stop = split[1].split(',');
        var stationId = stop[3].slice(0, -1);
        var time = stop[1];

        var hour = Number(stop[1].substring(0, 2));
        if (hour >= 24) {
          var time = `0${hour - 24}${stop[1].slice(2)}`;
        }

        trainDb[tripId].updates[stationId] = moment(`${date}T${time}`);

        if (hour >= 24) {
          trainDb[tripId].updates[stationId].add(1, 'days');
        }
      });

      resolve({ source: 'SC', trains: trainDb, date, fromSta, toSta });
    });
  });
};

for(var date of ctx.dates) {
  for(var i = 1; i < currrentstops.length; i++) {
    fromSta = currrentstops[i-1];
    toSta = currrentstops[i];
    var trainDb = {};

    Promise.all([
      getScheduled({ fromSta, toSta, date }).then(processTrains),
      Promise.resolve({ fromSta, toSta, source: 'RT', trains: require(`./outjson/rt-${date}-${ctx.routeGroup}.json`), date }).then(processTrains)
    ])
    .then((values) => {
      console.log('--');
      values.forEach(({ source, date, fromSta, toSta, diffs, trainsCount }) => {
        if (!out[source][`${fromSta}-${toSta}`]) {
          out[source][`${fromSta}-${toSta}`] = [];
        }

        var avg = diffs.reduce((a, b) => { return a + b; }, 0) / trainsCount;
        out[source][`${fromSta}-${toSta}`].push(Math.round(100 * avg) / 100);
        console.log(out);

        if (toSta === lastStop) {
          fs.writeFileSync(`./outdiffs/od-${date}-${subwayRoute}-${ctx.direction.substring(0, 1)}.json`, JSON.stringify(out));
        }
        //console.log(`${source} ${date}: ${trainsCount} trains`);
        //console.log(`${source}: ` + diffs.reduce((a, b) => { return a + b; }, 0) / trainsCount);
      });
    })
    .catch((e) => {
      console.error(e);
    });
  }
}
