const fs = require('fs');
const glob = require('util').promisify(require('glob'));
const moment = require('moment');

const {
  attrMap, dates, dayCode, monthYearPrefixGtfs, monthYearPrefixOutFilename,
  monthYearString, routeGroups, validDirectionsMap
} = require('./config.json');

const getStopTimesSched = (ctx, validDirections) => {
  console.log(`STATUS: ${ctx.stop.gtfsCode} getStopTimesSched`);
  var suffix = validDirections[0].substring(0, 1);

  return ctx.stopTimes
    .filter((stopTime) => {
      var split = stopTime.split(",");

      return (!stopTime.includes('trip_id')) &&
        stopTime.includes(dayCode) &&
        (split[3] === `${ctx.stop.gtfsCode}${suffix}`) &&
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

const getStopTimesRT = (ctx, validDirections) => {
  return Object.keys(ctx.rt).reduce((obj, date) => {
    var trainTimesForDate = Object.keys(ctx.rt[date])
      .filter((trainId) => {
        var train = ctx.rt[date][trainId];
        return Object.keys(train.updates).includes(ctx.stop.gtfsCode) &&
          ctx.trainLineCodes.some((code) => { return trainId.startsWith(code); }) &&
          validDirections.includes(train.direction);
      })
      .map((trainId) => {
        return moment(ctx.rt[date][trainId].updates[ctx.stop.gtfsCode]);
      });

      obj[date] = trainTimesForDate;
      return obj;
  }, {});
};

const calculateStatsForStopTimes = (ctx, stopTimes) => {
  var statsByDay = ctx.dates.reduce((prev, date) => {
    var timesByHour = {};
    prev[date] = {};

    var currentStopTimes = [];
    if (!Array.isArray(stopTimes)) {
      currentStopTimes = stopTimes[date];
    } else {
      currentStopTimes = stopTimes;
    }

    if (!currentStopTimes) {
      throw new Error(ctx.stop.gtfsCode);
    }

    var timesByHour = currentStopTimes.reduce((prev, time) => {
      var hour = time.get('hour');

      if (!prev[hour] && !Number.isNaN(hour)) {
        prev[hour] = [];
      }

      if (time.format('YYYY-MM-DD') === date) {
        prev[hour].push(time);
      }

      return prev;
    }, {});

    for(var hour in timesByHour) {
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

      var avgWaitTime;
      if (sortedTimes.length > 0) {
        var totalWaitTime = waitTimes.reduce((a, b) => { return a + b; })
        avgWaitTime = (totalWaitTime / sortedTimes.length);
      } else {
        avgWaitTime = 0;
      }

      prev[date][hour] = {
        count: sortedTimes.length,
        avgWait: Math.round(avgWaitTime),
        maxWait: Math.max(...waitTimes)
      };
    };

    return prev;
  }, {});

  var bigStats = Object.keys(statsByDay).reduce((prev, date) => {
    for(var hour in statsByDay[date]) {
      for(var hourStat in statsByDay[date][hour]) {
        if (!prev[hour]) {
          prev[hour] = {};
        }

        if (!prev[hour][hourStat]) {
          prev[hour][hourStat] = 0;
        }

        prev[hour][hourStat] += statsByDay[date][hour][hourStat];
      };
    };

    return prev;
  }, {});

  return Object.keys(bigStats).reduce((prev, hour) => {
    for(var hourStat in bigStats[hour]) {
      if (!prev[hour]) {
        prev[hour] = {};
      }

      prev[hour][hourStat] = Math.round(bigStats[hour][hourStat] / (Object.keys(statsByDay).length));
    };

    return prev;
  }, {});
};

const getResults = (ctx) => {
  return new Promise((resolve, reject) => {
    var results = Object.keys(validDirectionsMap).reduce((obj, validDirection) => {
      obj[validDirection] = {
        ['Scheduled']: calculateStatsForStopTimes(ctx, getStopTimesSched(ctx, validDirectionsMap[validDirection])),
        ['Actual']: calculateStatsForStopTimes(ctx, getStopTimesRT(ctx, validDirectionsMap[validDirection])),
      };
      return obj;
    }, {});

    resolve({ ctx, results });
  });
};

const getRT = (routeGroup) => {
  return glob(`outjson/rt-${monthYearPrefixGtfs}*-${routeGroup}.json`)
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

const printOutput = ({ ctx, results }) => {
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
        <h3>${ctx.trainLine} train at ${ctx.stop.name}</h3>
        <h3>${ctx.monthYearString}</h3>
      </div>
      <br>
      <div class="row">
    `;

  for(var result in results) {
    for(var resultType in results[result]) {
      output += `<div class="col-md-3"><h3>${result}: ${resultType}</h3>`;

      // Fix issue (namely with #5 line) where trains seem to be incorrectly coded.
      // There are numerous RT trains appearing, while none are scheduled
      // (Consult late night service map for more information!)
      for(var hour in results[result]['Actual']) {
        if (!Object.keys(results[result]['Scheduled']).includes(hour)) {
          delete results[result]['Actual'][hour];
        }
      };

      for(var hour in results[result][resultType]) {
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

        output += `<b>${hourText}:</b><ul>`;

        for(var key in attrMap) {
          output += `<li>${key}: ${results[result][resultType][hour][attrMap[key]]}`;
        }

        output += '</ul><hr>';
      };
      output += '</div>';
    };
  };

  output += '</div></body>';

  var filename = `${ctx.stop.gtfsCode}-${ctx.trainLine}-${ctx.monthYearPrefixOutFilename}.html`;
  fs.writeFile(`out/${filename}`, output, (err) => {
    if (err) console.log(err);
    console.log(`completed ${filename}`);
  });
};

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
      `0${trainLine}`, `1${trainLine}`,
      `/${trainLine}`, `E${trainLine}`
    ];

    if (trainLine === 'S' && ['901', '902'].includes(stop.gtfsCode)) {
      trainLine = 'GS';
    }

    getRT(routeGroup)
    .then((rt) => {
      return getSchedule()
        .then((stopTimes) => {
          return new Promise((resolve, reject) => {
            resolve({ rt, stopTimes });
          });
        });
    })
    .then(({ rt, stopTimes }) => {
      return getResults({
        dates,
        monthYearPrefixGtfs, monthYearPrefixOutFilename, monthYearString,
        rt, stop, stopTimes, trainLine, trainLineCodes
      });
    })
    .then(printOutput)
    .catch((e) => { debugger; });
  });
};

require('./stations.json').filter((stop) => {
  return stop.gtfsCode === '123';
}).slice(0, 1).forEach(processStop);
