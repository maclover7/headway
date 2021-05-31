// get all of the trains that ran (via rt-to-json)
// make sure they are of same line and route
// verify all scheduled stops are made (the GTFS ID is a key in `train.updates`)
// check if terminal difference from schedule is less than or equal to 5 minutes
// divide the `.length` of what's left by the total number of eligible trains

const moment = require('moment');

var pct = [];

const dates = [
  '2018-02-01', '2018-02-02',
  '2018-02-05', '2018-02-06', '2018-02-07', '2018-02-08', '2018-02-09',
  '2018-02-12', '2018-02-13', '2018-02-14', '2018-02-15', '2018-02-16',
  '2018-02-19', '2018-02-20', '2018-02-21', '2018-02-22', '2018-02-23',
  '2018-02-26', '2018-02-27', '2018-02-28'
];

const routesToStops = {
  //'CHU/BDN': [
    //'F27', 'F26', 'F25', 'F24', 'F23', 'F22', 'F21', 'F20', 'A42', 'G36', 'G35', 'G34','G33'
  //],
  //'BDN/CHU': [
    //'G33', 'G34', 'G35', 'G36', 'A42', 'F20', 'F21', 'F22', 'F23', 'F24', 'F25', 'F26', 'F27'
  //],

  'CHU/CRS': [
    'F27', 'F26', 'F25', 'F24', 'F23', 'F22', 'F21', 'F20', 'A42', 'G36', 'G35', 'G34','G33',
    'G32', 'G31', 'G30', 'G29', 'G28', 'G26', 'G24', 'G22'
  ],
  'CRS/CHU': [
    'G22', 'G24', 'G26', 'G28', 'G29', 'G30', 'G31', 'G32',
    'G33', 'G34', 'G35', 'G36', 'A42', 'F20', 'F21', 'F22', 'F23', 'F24', 'F25', 'F26', 'F27'
  ]
};

const stationToStopId = {
  'BDN': 'G33',
  'CHU': 'F27',
  'CRS': 'G22'
};

for(var date of dates) {
  var allTrains = require(`./outjson/rt-${date}-g.json`);

  var onTimeTrains = Object.keys(allTrains)
  .filter((trainId) => {
    return trainId.includes('CHU/CRS') || trainId.includes('CRS/CHU');
  })
  .filter((trainId) => {
    var code = trainId.match(/(\w{3})\/(\w{3})/);
    allTrains[trainId].origin = origin = code[1];
    allTrains[trainId].destination = destination = code[2];

    var stopsShouldTake = routesToStops[`${origin}/${destination}`];

    var stopsBeenTaken = Object.keys(allTrains[trainId].updates)
    .sort((a, b) => {
      return moment(allTrains[trainId].updates[a]).diff(moment(allTrains[trainId].updates[b]));
    });

    return JSON.stringify(stopsBeenTaken) == JSON.stringify(stopsShouldTake);
  })
  .filter((trainId) => {
    var destTime = allTrains[trainId].updates[stationToStopId[allTrains[trainId].destination]];
    var originTime = allTrains[trainId].updates[stationToStopId[allTrains[trainId].origin]];
    var timeTaken = moment(destTime).diff(moment(originTime), 'minutes');

    var hourMapNorthCourtToChurch = {
      1: 31.25,
      2: 31,
      3: 31,
      4: 41,
      5: 32,
      6: 32.714285714285715,
      7: 34.666666666666664,
      8: 36.42857142857143,
      9: 36.142857142857146,
      10: 34.666666666666664,
      11: 34.333333333333336,
      12: 34,
      13: 34.333333333333336,
      14: 34.57142857142857,
      15: 35,
      16: 35.42857142857143,
      17: 36.166666666666664,
      18: 36,
      19: 35,
      20: 33.25,
      21: 33.666666666666664,
      22: 33,
      23: 33,
      0: 32.666666666666664,
    };

    var hourMapSouth = {
      1: 31
    };

    var timeShouldTake = hourMapNorthCourtToChurch[moment(originTime).get('hour')] + 5;
    //if (moment(originTime).get('hour') === 1) {
      //timeShouldTake = 31;
    //} else if (moment(originTime).get('hour') <= 6) {
      //timeShouldTake = 32;
    //} else if ([7, 8].includes(moment(originTime).get('hour'))) {
      //timeShouldTake = 37;
    //} else if ([9, 10, 12, 13, 14, 15, 16, 17, 18, 19].includes(moment(originTime).get('hour'))) {
      //timeShouldTake = 35;
    //} else if ([11, 20].includes(moment(originTime).get('hour'))) {
      //timeShouldTake = 34;
    //} else if ([21, 22, 23].includes(moment(originTime).get('hour'))) {
      //timeShouldTake = 33;
    //} else {
      //console.log(moment(originTime).get('hour'));
    //}

    return timeTaken <= timeShouldTake;
  });

  var datePct = onTimeTrains.length / Object.keys(allTrains).length;
  pct.push(datePct);

  console.log('--------');
  console.log(date);
  console.log(`--> ${datePct}`);
};

console.log('--------');
console.log(`Overall`);
var overall = pct.reduce((a, b) => { return a + b; }, 0) / pct.length;;
console.log(`--> ${overall}`);
