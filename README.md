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
