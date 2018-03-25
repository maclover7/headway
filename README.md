# headway

A set of tools used to generate visualizations for the New York City
subway system's performance.

### Artifacts

- `gtfs-realtime.proto`: GTFS-RT Protocol Buffers definition
- `nyct-subway.proto`: NYC Subway extensions to GTFS-RT

### Tools

- `index-gen.js`: Creates `out/index.html`
- `rt-dumper-tph.js`: Uses processed data from `rt-to-json.js` and creates `.html` files in `out`. Each file is a unique combination of station and line.
- `rt-to-json.js`: Fetches archived GTFS-RT data and creates `.json`
  files in `outjson`
- `stationgrabber.js`: Fetches CSV file and creates `stations.json`

### Soup to Nuts: How to use headway

- Pick a date or series of dates you wish to analyze.
- Create a `mtadownload` directory within this repository.
- Download the full day's archival data via `https://datamine-history.s3.amazonaws.com/gtfs-YYYY-MM-DD.tgz`, and place into `mtadownload`.
- Unarchive the `.tgz`.
- Update the `YYYY-MM-DD` dates at the buttom of `rt-to-json.js`.
- Run `node rt-to-json.js`.
- Update variables in `rt-dumper-tph.js`.
- Run `node rt-dumper-tph.js`.
