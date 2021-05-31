const csv = require('csv-parse');
const fs = require('fs');
const readFile = require('util').promisify(fs.readFile);

const colorMap = [
  [['1', '2', '3'], '#EE352E'],
  [['4', '5', '6'], '#00933C'],
  [['7'], '#B933AD'],
  [['A', 'C', 'E', 'H'], '#0039A6'],
  [['B', 'D', 'F', 'M'], '#FF6319'],
  [['FS', 'GS'], '#808183'],
  [['G'], '#6CBE45'],
  [['J', 'Z'], '#996633'],
  [['L'], '#A7A9AC'],
  [['N', 'Q', 'R', 'W'], '#FCCC0A'],
  [['SI'], '#0039A6']
];

readFile('mtadownload/google_transit/shapes.txt')
.then((shapepoints) => {
  return new Promise((resolve, reject) => {
    csv(shapepoints, (err, parsed) => {
      if (err) {
        reject(err);
      }

      parsed.shift();

      resolve(parsed);
    });
  });
})
.then((shapepoints) => {
  return new Promise((resolve, reject) => {
    var pointsByRoute = shapepoints.reduce((collection, point) => {
      var shapeId = point[0];

      if (!collection[shapeId]) {
        var color;
        for(var option of colorMap) {
          var shapeIdForColor = shapeId.substring(0, 2).replace('.', '');
          if (option[0].some((o) => { return shapeIdForColor.includes(o); })) {
            color = option[1];
          }
        }

        collection[shapeId] = { color: color, points: [] };
      }

      collection[shapeId].points.push([point[1], point[2]]);
      return collection;
    }, {});

    resolve(pointsByRoute);
  });
})
.then((pointsByRoute) => {
  fs.writeFile('shapes.json', JSON.stringify(pointsByRoute), () => {
    console.log('wrote shapes.json');
  });
});
