const moment = require('moment');

const date = '2018-04-18';

var file = require('fs').readFileSync('mtadownload/google_transit/stop_times.txt');
var trainDb = {};

file.toString().split("\n")
.filter((trip) => {
  return trip.includes('WKD_') && trip.includes('_G..')// && trip.includes('97R,');
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

var tripLengths = Object.keys(trainDb)
.filter((trainId) => {
  return trainDb[trainId].direction === 'NORTH' && (moment(trainDb[trainId].updates['G22']).get('hour') ===0);
})
.map((trainId) => {
  var diff = moment(trainDb[trainId].updates['G22'])
  .diff(moment(trainDb[trainId].updates['F27']), 'minutes');

  if (moment(trainDb[trainId].updates['G22']).get('hour') === 1) {
    //console.log([ Math.abs(diff), moment(trainDb[trainId].updates['G22']) ]);
  }

  return [ Math.abs(diff), moment(trainDb[trainId].updates['G22']) ];
})
.sort((a, b) => {
  return a[0] - b[0];
  //return a[1].diff(b[1]);
})

console.log(tripLengths.reduce((a, b) => { return a + b[0]; }, 0) / tripLengths.length);

//console.log(require('util').inspect(tripLengths));

//console.log(Math.min(...tripLengths));
//console.log(Math.max(...tripLengths));
//console.log(tripLengths.reduce((a, b) => { return a + b; }, 0) / tripLengths.length);
