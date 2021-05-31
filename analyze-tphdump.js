const data = require('./out/analysis-g-02.json');

Object.keys(data).forEach((stationCode) => {
  Object.keys(data[stationCode]).forEach((lineCode) => {
    Object.keys(data[stationCode][lineCode].output).forEach((direction) => {
      var directionData = data[stationCode][lineCode].output[direction];

      if (directionData.hasOwnProperty('maxWait')) {
        Object.keys(directionData['maxWait']).forEach((hour) => {
          if (hour < 11 && directionData['maxWait'][hour].pct > 200 && stationCode != 'F05') {
            console.log(`${directionData['maxWait'][hour].actual} vs ${directionData['maxWait'][hour].scheduled} at ${stationCode} on ${lineCode} during ${hour}`);
          }
        });
      }
    });
  });
});
