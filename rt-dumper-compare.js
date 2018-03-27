const moment = require('moment');

const ctx = {
  dates: [
    // "control" group (the way things used to be)
    '2018-02-20',
    '2018-03-12',
    '2018-03-13',
    '2018-03-14',

    // "experimental" group (the way things are now)
    '2018-03-15'
  ],

  // 33 St on the 6 train
  fromSta: '632',

  // 42 St on the 6 train
  toSta: '631',
  direction: 'NORTH',
  routeGroup: '123456S'
};

var diffs = {};

for(var date of ctx.dates) {
  diffs[date] = {
    'sub120': 0,
    '120': 0,
    'over120': 0
  };
}

for(var date of ctx.dates) {
  var fileName = `./outjson/rt-${date}-${ctx.routeGroup}.json`;
  var allTrains = require(fileName);

  Object.keys(allTrains).forEach((key, index) => {
    var train = allTrains[key];
    var trainStops = Object.keys(train.updates);

    var validTrain = (train.direction === ctx.direction) &&
      (trainStops.includes(ctx.fromSta) && trainStops.includes(ctx.toSta));

    if (!validTrain) {
      delete allTrains[key];
    } else {
      var diff = moment(train.updates[ctx.toSta])
        .diff(moment(train.updates[ctx.fromSta]), 'seconds');

      if (diff > 120) {
        diffs[date]['sub120'] += 1;
      } else if (diff === 120) {
        diffs[date]['120'] += 1;
      } else {
        diffs[date]['over120'] += 1;
      }
    }
  });

  console.log(`${date}: ${Object.keys(allTrains).length} trains`);
}

console.log(diffs);
