const fs = require('fs');
const glob = require('util').promisify(require('glob'));
const moment = require('moment');

const dates = [
  '2018-01-02'
  //'2018-01-02', '2018-01-03', '2018-01-04', '2018-01-05',
  //'2018-01-08', '2018-01-09', '2018-01-10', '2018-01-11', '2018-01-12',
  //'2018-01-15', '2018-01-16', '2018-01-17', '2018-01-18', '2018-01-19',
  //'2018-01-22', '2018-01-23', '2018-01-24', '2018-01-25', '2018-01-26',
  //'2018-01-29', '2018-01-30', '2018-01-31'
];
const monthYearPrefix = '2018-01';
const monthYearPrefix2 = '2018-01-02';
const monthYearString = 'January 2, 2018';
const routeGroups = [
  '123456S',
  '7',
  'ace',
  'bdfm',
  'g',
  'jz',
  'l',
  'nqrw',
  'si'
];
const validDirectionsMap = {
  'North': ['NORTH', 'WEST'],
  'South': ['SOUTH', 'EAST']
};

/*
 * getStopTimesSched
*/
const getStopTimesSched = (ctx, validDirections) => {
  var suffix = validDirections[0].substring(0, 1);
  var formattedStopId = `${ctx.stopId}${suffix}`;

  console.log(`STATUS: ${ctx.stopId} getStopTimesSched`);

  return ctx.stopTimes
    .filter((stopTime) => {
      var split = stopTime.split(",");
      var stop = split[3];

      return (!stopTime.includes('trip_id')) &&
        stopTime.includes('WKD_') &&
        (stop === formattedStopId) &&
        (
          stopTime.includes(`${ctx.trainLine}.${suffix}`) ||
            (stopTime.includes(`${ctx.trainLine}..${suffix}`))
        ) &&
        (parseInt(split[1].substring(0, 2)) <= 24);
    })
    .map((wkdTripStop) => {
      return wkdTripStop.split(",")[1].replace(/^24:/, '00:');
    }).reduce((arr, wkdTripStopTime) => {
      ctx.dates.forEach((date) => {
        arr.push(
          moment(`${date}T${wkdTripStopTime}`)
        );
      });

      return arr;
    }, []);
};

/*
 * getStopTimesRT
*/
const getStopTimesRT = (ctx, validDirections) => {
  var allTrainTimes = Object.keys(ctx.rt).map((date) => {
    var trainTimesForDate = Object.keys(ctx.rt[date])
      .filter((trainId) => {
        var train = ctx.rt[date][trainId];
        return Object.keys(train.updates).includes(ctx.stopId) &&
        ctx.trainLineCodes.some((code) => { return trainId.startsWith(code); }) &&
        validDirections.includes(train.direction);
      })
      .map((trainId) => {
        return moment(ctx.rt[date][trainId].updates[ctx.stopId]);
      });

      return {
        [date]: trainTimesForDate
      };
  });

  return Object.assign({}, ...allTrainTimes);
};

/*
 * calculateStatsForStopTimes
*/
const calculateStatsForStopTimes = (ctx, stopTimes) => {
  var stats = {};

  ctx.dates.forEach((date) => {
    var timesByHour = {};
    stats[date] = {};

    var currentStopTimes = [];
    if (!Array.isArray(stopTimes)) {
      currentStopTimes = stopTimes[date];
    } else {
      currentStopTimes = stopTimes;
    }

    if (!currentStopTimes) {
      throw new Error(ctx.stopId);
    }

    currentStopTimes.forEach((time) => {
      var hour = time.get('hour');

      if (!timesByHour[hour] && !Number.isNaN(hour)) {
        timesByHour[hour] = [];
      }

      if (time.format('YYYY-MM-DD') === date) {
        timesByHour[hour].push(time);
      }
    });

    Object.keys(timesByHour).forEach((hour) => {
      var sortedTimes = timesByHour[hour].sort();

      var waitTimes = [];
      if (sortedTimes.length === 0) {
        waitTimes = [0];
      } else if (sortedTimes.length === 1) {
        waitTimes = [
          sortedTimes[0].minutes()
        ];
      } else {
        for(var i = 1; i < sortedTimes.length; i++) {
          var diff = sortedTimes[i].diff(sortedTimes[i-1], 'minutes')
          waitTimes.push(Math.abs(diff));
        }
      }

      var totalWaitTime = waitTimes.reduce((a, b) => { return a + b; });

      var avgWaitTime;
      if (sortedTimes.length > 0) {
        avgWaitTime = (totalWaitTime / sortedTimes.length);
      } else {
        avgWaitTime = 0;
      }

      stats[date][hour] = {
        count: sortedTimes.length,
        avgWait: Math.round(avgWaitTime),
        maxWait: Math.max(...waitTimes)
      };
    });
  });

  var bigStats = {};
  Object.keys(stats).forEach((date) => {
    Object.keys(stats[date]).forEach((hour) => {
      Object.keys(stats[date][hour]).forEach((hourStat) => {
        if (!bigStats[hour]) {
          bigStats[hour] = {};
        }

        if (!bigStats[hour][hourStat]) {
          bigStats[hour][hourStat] = 0;
        }

        bigStats[hour][hourStat] += stats[date][hour][hourStat];
      });
    });
  });

  var bigStatsAvg = {};
  Object.keys(bigStats).forEach((hour) => {
    Object.keys(bigStats[hour]).forEach((hourStat) => {
      if (!bigStatsAvg[hour]) {
        bigStatsAvg[hour] = {};
      }

      bigStatsAvg[hour][hourStat] = Math.round(bigStats[hour][hourStat] / (Object.keys(stats).length));
    });
  });

  return bigStatsAvg;
};

/*
 * getResults
*/
const getResults = (ctx) => {
  return new Promise((resolve, reject) => {
    var retVal = Object.keys(validDirectionsMap).reduce((obj, validDirection) => {
      var validDirections = validDirectionsMap[validDirection];

      obj[validDirection] = {
        ['Scheduled']: calculateStatsForStopTimes(ctx, getStopTimesSched(ctx, validDirections)),
        ['Actual']: calculateStatsForStopTimes(ctx, getStopTimesRT(ctx, validDirections)),
      };

      return obj;
    }, {});

    resolve([ctx, retVal]);
  });
};

const getRT = (routeGroup) => {
  return glob(`outjson/rt-${monthYearPrefix}-*-${routeGroup}.json`)
  .then((matchingFiles) => {
    return Promise.all(matchingFiles.map((filename) => {
      return new Promise((resolve, reject) => {
        fs.readFile(filename, (err, file) => {
          if (err) reject(err);
          resolve({
            [filename.substring(11, 21)]: JSON.parse(file.toString())
          });
        });
      });
    }));
  })
  .then((rtSegments) => {
    return new Promise((resolve, reject) => {
      resolve(...rtSegments);
    });
  });
};

const getSchedule = () => {
  return new Promise((resolve, reject) => {
    fs.readFile('mtadownload/google_transit/stop_times.txt', (err, file) => {
      if (err) reject(err);
      resolve(file.toString().split("\n"));
    });
  });
};

/*
 * printOutput
*/
const printOutput = (args) => {
  var ctx = args[0];
  var results = args[1];

  var output = `
    <head>
      <link href="https://maxcdn.bootstrapcdn.com/bootstrap/4.0.0/css/bootstrap.min.css" rel="stylesheet" integrity="sha384-Gn5384xqQ1aoWXA+058RXPxPg6fy4IWvTNh0E263XmFcJlSAwiGgFAW/dAiS6JXm" crossorigin="anonymous">

      <!-- Global site tag (gtag.js) - Google Analytics -->
      <script async src="https://www.googletagmanager.com/gtag/js?id=UA-58452343-8"></script>
      <script>
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());

        gtag('config', 'UA-58452343-8');
      </script>

      <style>
        .center {
          text-align: center;
        }
      </style>
      <meta name="viewport" content="width=device-width, initial-scale=1">
    </head>

    <body>
      <nav class="navbar navbar-expand-lg navbar-light bg-light">
        <a class="navbar-brand" href="index.html">Headway Report</a>
        <button class="navbar-toggler" type="button" data-toggle="collapse" data-target="#navbarSupportedContent" aria-controls="navbarSupportedContent" aria-expanded="false" aria-label="Toggle navigation">
          <span class="navbar-toggler-icon"></span>
        </button>

        <div class="collapse navbar-collapse" id="navbarSupportedContent">
          <ul class="navbar-nav mr-auto">
            <li class="nav-item">
              <a class="nav-link" href="https://bigboard.blog">Back to The Big Board</a>
            </li>

            <li class="nav-item">
              <a class="nav-link" href="info.html">More Info</a>
            </li>
          </ul>
        </div>
      </nav>

      <div class="center">
        <h1>Weekday Headway Report</h1>
        <h3>${ctx.trainLine} train at ${ctx.stopName}</h3>
        <h3>${ctx.monthYearString}</h3>
      </div>
      <br>
      <div class="row">
    `;

  Object.keys(results).forEach((result) => {
    Object.keys(results[result]).forEach((resultType) => {
      output += `<div class="col-md-3"><h3>${result}: ${resultType}</h3>`;

      // Fix issue (namely with #5 line) where trains seem to be incorrectly coded.
      // There are numerous RT trains appearing, while none are scheduled
      // (Consult late night service map for more information!)
      Object.keys(results[result]['Actual']).forEach((hour) => {
        if (!Object.keys(results[result]['Scheduled']).includes(hour)) {
          delete results[result]['Actual'][hour];
        }
      });

      Object.keys(results[result][resultType]).forEach((hour) => {
        var hourText = '';
        var hourInt = parseInt(hour);

        if (hourInt === 0) {
          hourText = '12 a.m.';
        } else if (hourInt === 12) {
          hourText = '12 p.m.';
        } else if (hourInt > 12) {
          hourText = `${hour-12} p.m.`;
        } else {
          hourText = `${hour} a.m.`;
        }

        output += `<b>${hourText}:</b>`;
        output += '<ul>';

        var attrMap = {
          'Number of Trains': 'count',
          'Average Wait Time': 'avgWait',
          'Max Wait Time': 'maxWait'
        };
        for(var key in attrMap) {
          output += `<li>${key}: ${results[result][resultType][hour][attrMap[key]]}`;
        }

        output += '</ul>';
        output += '<hr>';
      });
      output += '</div>';
    });
  });

  output += '</div></body>';

  var filename = `${ctx.stopId}-${ctx.trainLine}-${ctx.monthYearPrefix2}.html`;
  fs.writeFile(`out/${filename}`, output, (err) => {
    if (err) console.log(err);
    console.log(`completed ${filename}`);
  });
};

/*
 * processStop
*/
const processStop = (stop) => {
  stop.lines.forEach((trainLine) => {
    if (trainLine === 'W' || (trainLine === 'S' && stop.gtfsCode.startsWith('H'))) {
      return;
    } else if (trainLine === 'SIR' && stop.gtfsCode.startsWith('S')) {
      trainLine = 'SI';
    }

    var routeGroup;
    for(var lineGroup of routeGroups) {
      if (lineGroup.includes(trainLine.toLowerCase())) {
        routeGroup = lineGroup;
      }
    }

    if (!routeGroup) {
      routeGroup = '123456S';
    }

    var trainLineCodes = [
      `0${trainLine}`,
      `1${trainLine}`,
      `/${trainLine}`,
      `E${trainLine}`
    ];

    if (trainLine === 'S' && ['901', '902'].includes(stop.gtfsCode)) {
      trainLine = 'GS';
    }

    Promise.all([getRT(routeGroup), getSchedule()])
    .then((files) => {
      return getResults({
        dates,
        monthYearPrefix, monthYearPrefix2, monthYearString,
        rt: files[0],
        stopId: stop.gtfsCode,
        stopName: stop.name,
        stopTimes: files[1],
        trainLine, trainLineCodes
      });
    })
    .then(printOutput)
    .catch((e) => { debugger; });
  });
};

//const stops = require('./stations.json').filter((stop) => {
  //return stop.lines.includes('R')// &&
    //stop.gtfsCode.startsWith('S');
  //return ['636', 'G22', 'R42'].includes(stop.gtfsCode);
  //return stop.lines.includes('6');
//});

// headway.bigboard.blog generated:
// **DONE
// FIRST: `stop.lines.length === 1;` (count = 264)
// 8, 20
// 20, 40
// 40, 60
// 60, 80
// 80, 100
// 100, 120
// 120, 140
// 140, 145
// 154, 158
// 158, 162
// 162, 166
// 166, 170
// 170, 174
// 174, 182
// 178, 182
// 182, 186
// 186, 190
// 190, 194
// 194, 198
// 198, 202
// 202, 206
// 206, 210
// 210, 214
// 214, 218
// 218, 222
// 222, 226
// 226, 230
// 230, 234
// 234, 238
// 238, 242
// 242, 246
// 246, 250
// 250, 254
// 254, 258
// 258, 262
// 262, 265

// SECOND: `stop.lines.length === 2;` (count = 159)
// 0, 5
// 5, 15
// 15, 25
// 25, 35
// 35, 45
// 45, 55
// 55, 65
// 65, 75
// 75, 85
// 85, 95
// 95, 105
// 105, 109
// 109, 113
// 113, 115
// 115, 117
// 117, 119
// 119, 121
// 121, 123
// 123, 125
// 125, 127
// 127, 129
// 129, 131
// 131, 133
// 133, 135
// 135, 137
// 137, 139
// 139, 141
// 141, 143
// 143, 145
// 145, 147
// 147, 149
// 149, 151
// 151, 153
// 153, 155
// 155, 157
// 157, 160

// THIRD: `stop.lines.length >= 3;`
// 0, 3
// 3, 6
// 6, 9
// 9, 12
// 12, 15
// 15, 18
// 18, 21
// 21, 24
// 24, 27
// 27, 30
// 30, 33
// 33, 35
// 35, 36
// 36, 37
// 37, 38
// 38, 39
// 39, 40
// 40, 41
// 41, 42
// 42, 43
// 43, 44
// 44, 45
// 45, 46
// 46, 47
// 47, 49

// FOURTH: `stop.lines.includes('SIR');`
// 0, 5
// 5, 10
// 10, 15
// 15, 22

// FIFTH:
stops = require('./stations.json').filter((stop) => {
  return stop.gtfsCode === 'R01';
});
  //return stop.lines.includes('7') &&
    //stop.lines.length > 1;
  ////return ['636', 'G22', 'R42'].includes(stop.gtfsCode);
  ////return stop.lines.includes('6');
//})
//.map((stop) => {
  //stop.lines.splice(
    //stop.lines.indexOf('7'),
    //1
  //);

  //return stop;
//});
// 0, 1

stops.slice(0, 1).forEach(processStop);
