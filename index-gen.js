const fs = require('fs');
const stops = require('./stations.json');

var lines = new Set([]);
stops.forEach((stop) => {
  stop.lines.forEach((line) => {
    lines.add(line);
  });
});

var linesSelect = Array.from(lines)
  .sort()
  .filter((line) => {
    return line != '7'
  })
  .map((line) => {
    return `<option value=${line}>${line} Train</option>`;
  });
linesSelect = '<option value></option>' + linesSelect;

var stopTmpl = '`<option value=${stop.gtfsCode}>${stop.name}</option>`';

var output = `
<head>
  <link href="https://maxcdn.bootstrapcdn.com/bootstrap/4.0.0/css/bootstrap.min.css" rel="stylesheet" integrity="sha384-Gn5384xqQ1aoWXA+058RXPxPg6fy4IWvTNh0E263XmFcJlSAwiGgFAW/dAiS6JXm" crossorigin="anonymous">
  <script src="http://code.jquery.com/jquery-3.3.1.min.js"></script>

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
  <div class="container">
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
      <h3>Select train line and station below!</h3>

      <br>

      <b>Line:</b>
      <select id="lines-select" class="select">
        ${linesSelect}
      </select>

      <br><br>

      <b>Stop Name:</b>
      <select id="stops-select" class="select">
      </select>

      <br><br>

      <button href="#" type="button" class="btn btn-primary" id="submit">Go</button>

      <hr>

      <p>
        Read the investigative story:
        <a href="https://bigboard.blog/2018/02/15/out-in-the-cold-irregular-subway-ops-leads-to-longer-wait-times/">
          "Out in the cold: Irregular subway ops leads to longer wait times"</a>.
      </p>
    </div>
  </div>

  <script>
    $(document).ready(() => {
      var currentLine = $("#lines-select").val();
      var currentStopGtfsCode = '';
      var stops = ${JSON.stringify(stops)};

      const renderStops = () => {
        $('#stops-select').find('option').remove();
        $('#stops-select').append('<option value></option>');

        if (currentLine === 'S') {
          currentLine = 'GS';
          $('#stops-select').append(
            '<option value="901">Grand Central - 42 St</option>',
            '<option value="902">Times Sq - 42 St</option>'
          );
        } else {
          for(var stop of stops) {
            if (stop.lines.includes(currentLine)) {
              $('#stops-select').append(
              ${stopTmpl}
              );
            }
          }
        }

        if (currentLine === 'SIR') {
          currentLine = 'SI';
        }

        $('#stops-select')
        .change((e) => {
          e.preventDefault();
          currentStopGtfsCode = $(e.target).val();
        });
      };

      if (currentLine) {
        renderStops();
      }

      $('#lines-select')
      .change((e) => {
        e.preventDefault();
        currentLine = $(e.target).val();
        renderStops();
      });

      $('button').click((e) => {
        e.preventDefault();
        window.location.href = '' + currentStopGtfsCode + '-' + currentLine + '-2018-01.html';
      });
    });
  </script>
</body>
`;

fs.writeFile(`out/index.html`, output, (err) => {
  if (err) {
    throw err;
  }

  console.log('wrote index.html');
});
