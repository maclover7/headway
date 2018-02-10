const request = require('request-promise');
const csv = require('csv-parse');
const fs = require('fs');

request(`http://web.mta.info/developers/data/nyct/subway/Stations.csv`)
.then((stations) => {
  return new Promise((resolve, reject) => {
    csv(stations, (err, parsed) => {
      if (err) {
        reject(err);
      }

      resolve(parsed);
    });
  });
})
.then((stations) => {
  // Remove headings
  stations.shift();

  return stations.map((station) => {
    return new Promise((resolve, reject) => {
      resolve({
        name: station[5],
        gtfsCode: station[2],
        lines: station[7].split(" ")
      });
    });
  });
})
.then((stations) => {
  return Promise.all(stations);
})
.then((stations) => {
  fs.writeFile('stations.json', JSON.stringify(stations), () => {
    console.log('wrote stations.json');
  });
});
