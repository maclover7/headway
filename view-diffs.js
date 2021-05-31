var { RT, SC } = require(`./outdiffs/od-2018-02-20-Q-S.json`);

for(var stopPair in RT) {
  console.log(`${stopPair}: ${SC[stopPair] - RT[stopPair]}`);
}
