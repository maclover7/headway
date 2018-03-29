# headway

A set of tools used to generate visualizations for the New York City
subway system's performance.

This toolbelt was used in reporting["Out in the cold: Irregular subway ops leads to longer wait times"](https://nybigboard.com/2018/02/15/out-in-the-cold-irregular-subway-ops-leads-to-longer-wait-times/), as seen on _The Big Board_.

### Artifacts

- `gtfs-realtime.proto`: GTFS-RT Protocol Buffers definition
- `nyct-subway.proto`: NYC Subway extensions to GTFS-RT

### Configuration

The central configuration file is `config.json`. Below are a list of
keys, and their significance:

- `attrMap` of type `Object<String, String>`, a mapping of hourStat keys
  to their proper HTML output heading values
- `dates` of type `Array<String>`, a list of `YYYY-MM-DD` dates to
  perform operations on
- `dayCode` of type `String`, the beginning of the GTFS static trip ID
  (possible values are `WKD_`, `SAT_`, etc.)
- `jsonRouteGroups` of type `Array<String>` (inferred from NYCT)
- `monthYearPrefixGtfs` of type `String`, which GTFS-RT JSON dump files
  to read in
- `monthYearPrefixOutFilename` of type `String`, suffix for the output
  HTML file
- `monthYearString` of type `String`, the HTML header value for date
- `routeGroups` of type `Array<String>` (inferred from NYCT)
- `validDirectionsMap` of type `Object<String,Array<String>>` (inferred
  from NYCT)

### Tools

- `index-gen.js`: Creates `out/index.html`
- `rt-dumper-compare.js`: Uses processed data from `rt-to-json.js` and
  compares the stop time updates for between two individual stations,
over the control and experimental groups of dates
- `rt-dumper-tph.js`: Uses processed data from `rt-to-json.js` and creates `.html` files in `out`. Each file is a unique combination of station and line.
  - Loads GTFS-RT and GTFS static data into memory
  - For each direction, finds the "scheduled" and "actual" values for:
    - "Number of Trains": The number of train IDs that have stop time
      updates
    - "Average Wait Time": The average (rounded) number of minutes
      between stop time updates
    - "Max Wait Time": The maximum (rounded) number of minutes between
      two individual stop time updates
  - Outputs the data into one HTML file per GTFS stop code and line code
    pairing
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
