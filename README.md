# aqie-dataselector-frontend

[![Security Rating](https://sonarcloud.io/api/project_badges/measure?project=DEFRA_aqie-dataselector-frontend&metric=security_rating)](https://sonarcloud.io/summary/new_code?id=DEFRA_aqie-dataselector-frontend)
[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=DEFRA_aqie-dataselector-frontend&metric=alert_status)](https://sonarcloud.io/summary/new_code?id=DEFRA_aqie-dataselector-frontend)
[![Coverage](https://sonarcloud.io/api/project_badges/measure?project=DEFRA_aqie-dataselector-frontend&metric=coverage)](https://sonarcloud.io/summary/new_code?id=DEFRA_aqie-dataselector-frontend)

This service is to find air quality monitoring stations for the location provided by the user and also provide the details of pollutants in the area and also the users can download the details.

- [Requirements](#requirements)
  - [Node.js](#nodejs)
- [Server-side Caching](#server-side-caching)
- [Redis](#redis)
- [Google Analytics](#google-analytics)
- [Using the graph: an accessibility guide](#using-the-graph-an-accessibility-guide)
  - [Read the readings without the graph](#read-the-readings-without-the-graph)
  - [Use the graph with a keyboard](#use-the-graph-with-a-keyboard)
  - [Use the graph with a mouse or a touchscreen](#use-the-graph-with-a-mouse-or-a-touchscreen)
  - [Tell the pollutants apart](#tell-the-pollutants-apart)
  - [Times, gaps and status](#times-gaps-and-status)
  - [Zoom, small screens and no JavaScript](#zoom-small-screens-and-no-javascript)
- [Local Development](#local-development)
  - [Dependent Services (`aqie-monitoringstation-backend` & `aqie-back-end`)](#dependent-services-aqie-monitoringstation-backend--aqie-back-end)
  - [Environment Variables](#environment-variables)
  - [Setup](#setup)
  - [Development](#development)
  - [Production](#production)
  - [Npm scripts](#npm-scripts)
  - [Update dependencies](#update-dependencies)
  - [Formatting](#formatting)
    - [Windows prettier issue](#windows-prettier-issue)
- [Docker](#docker)
  - [Development image](#development-image)
  - [Production image](#production-image)
  - [Docker Compose](#docker-compose)
  - [Dependabot](#dependabot)
  - [SonarCloud](#sonarcloud)
- [Licence](#licence)
  - [About the licence](#about-the-licence)

## Requirements

### Node.js

Please install [Node.js](http://nodejs.org/) `>= v18` and [npm](https://nodejs.org/) `>= v9`. You will find it
easier to use the Node Version Manager [nvm](https://github.com/creationix/nvm)

To use the correct version of Node.js for this application, via nvm:

```bash
cd aqie-dataselector-frontend
nvm use
```

## Server-side Caching

We use Catbox for server-side caching. By default the service will use CatboxRedis when deployed and CatboxMemory for
local development.
You can override the default behaviour by setting the `SESSION_CACHE_ENGINE` environment variable to either `redis` or
`memory`.

Please note: CatboxMemory (`memory`) is _not_ suitable for production use! The cache will not be shared between each
instance of the service and it will not persist between restarts.

## Redis

Redis is an in-memory key-value store. Every instance of a service has access to the same Redis key-value store similar
to how services might have a database (or MongoDB). All frontend services are given access to a namespaced prefixed that
matches the service name. e.g. `my-service` will have access to everything in Redis that is prefixed with `my-service`.

If your service does not require a session cache to be shared between instances or if you don't require Redis, you can
disable setting `SESSION_CACHE_ENGINE=false` or changing the default value in `~/src/config/config.js`.

## Google Analytics

Google Analytics is loaded via Google Tag Manager (GTM). The GTM container ID is configured through an environment variable — no code change is needed to update it.

Copy `.env.example` to `.env` and set your container ID:

```bash
cp .env.example .env
```

```bash
# .env
GOOGLE_TAG_MANAGER_KEYS=GTM-XXXXXXXX
```

The application only injects the GTM script when a user has accepted analytics cookies. GA4 measurement IDs are configured as tags inside the GTM container, not in this application.

## Feature toggles

| Environment variable          | Default | Description                                                                                                                                                                                                                                                                                                                                                                                |
| ----------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `VIEW_GRAPH_SUMMARY_ENABLED`  | `false` | Shows the "View graph and pollutant summary" button on the station details page, for users with JavaScript enabled only. Users without JavaScript get the hourly readings in collapsed sections on the Daily Air Quality Index, Last 24 hours and Last 7 days tabs instead. It also registers the `/stationdetails/graph-summary` route. When unset or `false`, all of these are disabled. |
| `VIEW_DAQI_TAB_ENABLED`       | `false` | Shows the DAQI tab on the station details page, makes it the default view and registers the `/stationdetails/daqi` route. When unset or `false`, the year tables are the default view and the tab and route are disabled.                                                                                                                                                                  |
| `SEARCH_ON_MAP_ENABLED`       | `false` | Shows the "Search on a map" link on the hub page. The link also needs a maps URL, which defaults to the CDP service for `ENVIRONMENT`; set `MAPS_FRONT_END_URL` to override it. When unset or `false`, the link is hidden. It is also hidden without JavaScript, as the map needs it.                                                                                                      |
| `MAP_IN_DATASELECTOR_ENABLED` | `false` | Serves the air quality map from this service (`/map` and its `/api` routes) instead of linking to `aqie-maps-frontend`. Needs `AQIE_BACK_END_URL` (and optionally `AQIE_FORECAST_API_URL`) for the map's station, AURN and forecast data. When unset or `false`, links to the map go to `MAPS_FRONT_END_URL` instead.                                                                      |

Feature toggles are off by default, so a feature is only enabled in an environment by explicitly setting its variable to `true` there.

The flag is read at startup, so restart the server after changing it.

It is off by default, so a release does not show the feature in an environment until the variable is set to `true` there. Any value other than `false` turns it on, including `0`, `no` and an empty value, so leave the variable unset to keep it off. `.env.example` turns it on for local development.

### Graph and pollutant summary page

`GET /stationdetails/graph-summary` is reached from the "View graph and pollutant summary" button on a station page. The button is under the table on the Daily Air Quality Index, Last 24 hours, Last 7 days and year tabs. The Last 7 days tab opens the page on the last 7 days, and the other tabs open it on the last 24 hours. Back returns to the tab the button was on, and the page keeps that when you switch between its own Last 24 hours and Last 7 days tabs. It takes these query parameters:

| Parameter   | Required | Description                                                                                                                                                                                                                                                               |
| ----------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `stationId` | yes      | The station's `id` from the user's search results in the session. A station the user has not searched for, or an expired session, gives a 404.                                                                                                                            |
| `period`    | no       | `last24hours` (the default) or `last7days`. Anything else gives a 404.                                                                                                                                                                                                    |
| `from`      | no       | The station page tab Back returns to: `last24hours`, `last7days` or a four digit year for a year tab. Anything else gives a 404. Without it, Back opens the default view, which is the Daily Air Quality Index tab when that is switched on, so that tab does not set it. |

The page works without JavaScript: the tabs are links, and the graph is the only thing drawn client side. The date or date range under the heading is the window of readings that `aqie-back-end` returns from `GET /monitoringStationHistory` (in UTC). Both periods end at the latest hour with a reading and do not stop at midnight: the last 24 hours is that hour and the 23 before it (24 hourly readings), and the last 7 days is that hour and the 167 before it (168). With the latest hour ending at 10:00 on 13 November, the last 24 hours starts at 11:00 on 12 November and the last 7 days at 11:00 on 6 November. The line shows the first and last day, such as "12 November to 13 November 2026", or a single date when the window is within one day, which for the last 24 hours is only when the latest hour ends at midnight. It is left out, and the page still renders, when the station has no AURN `siteId` or the call fails. The page copy is in `graphsummary` in `src/server/data/en/homecontent.js`.

The page makes one call to `GET /monitoringStationHistory` and uses the response three times:

- **View pollutant summary:** a collapsed section with the shared summary table (`partials/pollutant-summary-table.njk`). It shows plain figures, without the limit toggletips of the station page.
- **View graph: hourly data:** one line for each pollutant the station measures. The series are embedded in the page as JSON and drawn by `src/client/javascripts/pollutant-graph.js` using the `d3-*` modules. That code is a separate webpack chunk, so only this page downloads it. The graph stays hidden unless it can be drawn.
- **View hourly data as a table:** the same readings in a collapsed table, in UTC. It is the text equivalent of the graph, and what users without JavaScript get.

Without JavaScript the button is hidden, as the graph needs JavaScript. In its place the station page's Daily Air Quality Index, Last 24 hours and Last 7 days tabs each have a collapsed section with the hourly readings table for its period (the last 24 hours, or the last 7 days on the Last 7 days tab). The section has no verification banner of its own, as the tab already shows "Data has not been checked and verified" above its summary table. `src/server/graph-summary/hourly-readings.js` builds it from the history the tab has already fetched, so it costs no extra API call, and `partials/hourly-readings-table.njk` renders it, as it does on the graph page. The tab templates put it inside `<noscript>`, so only users without JavaScript get it, and it is only on a full page load, not when a tab is swapped in. It is left out when the history has no readings for the station or the flag is off. The Daily Air Quality Index tab is behind `VIEW_DAQI_TAB_ENABLED`, so its section needs that on too. The Last 24 hours tab has no flag of its own. The year tabs have no such section, and neither has the separate no-JavaScript station page (`/stationDetailsNojs/...`), which has only year tabs and no graph button.

Each pollutant has a colour and a line style (solid, dashed, dotted or dash and dot). Two pollutants share the solid style, so the key and the tooltip also name each one in text. They are set in `src/server/graph-summary/pollutant-styles.js`.

Pointing at the graph, tapping it, or using the left and right arrow keys (Home, End and Escape too) once it has focus, shows the readings for the nearest hour in a tooltip, with a line and a dot on each pollutant. This is `src/client/javascripts/pollutant-graph-tooltip.js`. The verification status in the tooltip is fixed text, `graphsummary.graph.verificationStatus` in the page copy, not read from the data.

### Returning to the map

When a station page is opened from aqie-maps-frontend (via `/station-summary`), its Back link goes to `<MAPS_FRONT_END_URL>/map`, where the map restores the user's previous view. This works regardless of `SEARCH_ON_MAP_ENABLED`. The session remembers which station came from the map, so the Back link only points at the map while the user is on that station; starting a new search (hub, home or location search) clears it. When no maps URL is configured, the Back link keeps its usual search-journey target.

### View map of nearby monitoring stations

When `SEARCH_ON_MAP_ENABLED` is `true` and a maps URL is configured, station pages (summary, last 7 days and the no-JS view) show a "View map of nearby monitoring stations" link under the status line (`partials/map-nearby-link.njk`). It is a form button that POSTs the station's `lat`, `lng` and `siteId` (`localSiteID`) to `<MAPS_FRONT_END_URL>/map/view`, which opens the map zoomed in on the station with it selected. It uses a POST so no location data goes in the URL. The map needs JavaScript, so the link is hidden without it (`aq-js-only`). The CSP `form-action` directive allows the maps origin when `MAPS_FRONT_END_URL` is set. The existing "View on Google Maps" link is unchanged.

### Air quality map served from this service

When `MAP_IN_DATASELECTOR_ENABLED` is `true`, this service serves the air quality map itself at `/map`, with its data from `/api` routes, instead of linking to `aqie-maps-frontend`. All links to the map then go to `/map`, so `MAPS_FRONT_END_URL` is not used.

The map gets its data from these services. They are only used when the flag is on:

| Environment variable    | Default                 | Description                                                                                                              |
| ----------------------- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `AQIE_BACK_END_URL`     | `http://localhost:3001` | Base URL for `aqie-back-end`, used by the map for monitoring stations, station info, AURN and (as a fallback) forecasts. |
| `AQIE_FORECAST_API_URL` | unset                   | Base URL for the forecast API, used by the map. Falls back to `aqie-back-end`'s `/forecasts` when unset.                 |

## Using the graph: an accessibility guide

The graph shows a station's hourly readings for each pollutant it measures, for the last 24 hours or the last 7 days. Everything the graph shows is also on the page as text and tables.

### Read the readings without the graph

- Select **View hourly data as a table** under the graph. It opens a table with a row for each hour and a column for each pollutant. It has every reading the graph shows, and it works with a keyboard, a screen reader and without JavaScript.
- On the station page without JavaScript, the Daily Air Quality Index and Last 24 hours tabs have **View hourly data for the last 24 hours** and the Last 7 days tab has **View hourly data for the last 7 days**. Each opens a table like the one above.
- Select **View pollutant summary** above the graph for a short table for each pollutant: the average, how often it went over a legal limit (where there is one) and how much of the data was captured.

### Use the graph with a keyboard

1. Press Tab to move through the page. The graph comes after the "Last 24 hours" and "Last 7 days" tabs and the "View pollutant summary" section. When you reach it, it gets a yellow outline with a black inner edge, and a box shows the latest hour.
2. Press the left arrow to go back an hour and the right arrow to go forward an hour.
3. Press Home to jump to the first hour and End to jump to the last.
4. Press Escape to hide the box. The next arrow key press brings it back and carries on from the hour you were on.
5. Press Tab to move on.

The box shows the date and time (in UTC), each pollutant's reading with its unit (µg/m³), and the status of the data. The graph is labelled "Use the left and right arrow keys to move between hours", and the box is set up so a screen reader can read it out as you move. If your screen reader does not read the box out, use the table instead.

### Use the graph with a mouse or a touchscreen

- **Mouse or trackpad:** move the pointer across the graph. A line follows it to the nearest hour, with a dot on each pollutant's line and a box with the readings. Move the pointer away to hide the box.
- **Touchscreen:** tap the graph, or drag a finger along it. The box stays until you tap somewhere else. You can still scroll the page up and down with a finger over the graph.

### Tell the pollutants apart

Each pollutant has its own colour and line pattern. The key above the graph shows them, and the box names each pollutant in words.

| Pollutant        | Colour    | Line pattern |
| ---------------- | --------- | ------------ |
| PM2.5            | Black     | Solid        |
| PM10             | Turquoise | Dashed       |
| Nitrogen dioxide | Dark pink | Solid        |
| Ozone            | Blue      | Dotted       |
| Sulphur dioxide  | Orange    | Dash and dot |

PM2.5 and nitrogen dioxide are both solid lines, so use the box or the table to be sure which is which. The orange sulphur dioxide line is a darker orange than GOV.UK orange, so that it keeps at least 3:1 contrast against the white background. If any line is hard to see, use the table.

### Times, gaps and status

- All times are in UTC. In the UK summer, clocks are an hour ahead of UTC.
- A break in a line means there is no reading for that hour. The box says "No data" for that pollutant.
- The page says the data has not been checked and verified, and the box shows its status, currently "Unverified".

### Zoom, small screens and no JavaScript

- You can zoom the page in your browser. If you resize the window or turn your phone sideways, reload the page so the graph is redrawn to fit.
- Without JavaScript the graph is not shown. On the graph page the tabs, the summary and the hourly table all still work. On the station page the hourly data is in collapsed sections on the Daily Air Quality Index, Last 24 hours and Last 7 days tabs.

**Note for the team:** this guide describes how the page is built. It has not been checked with specific screen readers yet, so confirm the screen reader advice before sharing it outside the team. Keep it in step with `src/server/graph-summary/pollutant-styles.js` (colours and patterns) and `src/client/javascripts/pollutant-graph-tooltip.js` (keys and the box) if either changes.

## Proxy

We are using forward-proxy which is set up by default. To make use of this: `import { fetch } from 'undici'` then because of the `setGlobalDispatcher(new ProxyAgent(proxyUrl))` calls will use the ProxyAgent Dispatcher

If you are not using Wreck, Axios or Undici or a similar http that uses `Request`. Then you may have to provide the proxy dispatcher:

To add the dispatcher to your own client:

```javascript
import { ProxyAgent } from 'undici'

return await fetch(url, {
  dispatcher: new ProxyAgent({
    uri: proxyUrl,
    keepAliveTimeout: 10,
    keepAliveMaxTimeout: 10
  })
})
```

## Local Development

### Dependent Services (`aqie-monitoringstation-backend` & `aqie-back-end`)

When running `aqie-dataselector-frontend` locally (on `http://localhost:3010` via Docker Compose), station search and the **Last 7 days** tab (`http://localhost:3010/stationdetails/last-7-days`) depend on local backend services running first:

1. **`aqie-monitoringstation-backend` (Port `3555`)** — **Required**
   - Provides the monitoring station data (`POST /monitoringstation` for location search and `GET /monitoringstation/by-location` for deep links from `aqie-maps-frontend`).
   - Populates each station object with both `localSiteID` (short code, e.g. `MY1`) and `siteId` (Ricardo's AURN code, e.g. `UKA00315`).
   - On first startup, `ricardo-stations-scheduler.js` syncs the full station list from Ricardo into its local MongoDB `stations` collection.
   - Without `aqie-monitoringstation-backend` running and returning the station data (including `siteId`), the frontend session (`MonitoringstResult`) will not have the station metadata required for `/stationdetails` or `/stationdetails/last-7-days`.

   Start it before searching for stations in the frontend:

   ```bash
   cd ../aqie-monitoringstation-backend
   docker compose up --build -d
   ```

2. **`aqie-back-end` (Port `3001`)** — **Required for `/stationdetails/last-7-days`, and for the dates on `/stationdetails/graph-summary`**
   - Serves `GET /monitoringStationHistory?siteId=<AURN_siteId>&period=<24h|7d>`, which provides the hourly pollutant readings and summary figures (averages, data capture %, and hourly/daily exceedances) for the **Last 7 days** tab, and the window of readings that the graph and pollutant summary page shows as its dates.
   - Requires the station's AURN `siteId` supplied by `aqie-monitoringstation-backend`.

   ```bash
   cd ../../check-air-quality/aqie-back-end
   docker compose up --build -d
   ```

> **Note on navigating to `http://localhost:3010/stationdetails/last-7-days`:**
> Both `/stationdetails` and `/stationdetails/last-7-days` rely on station data stored in the user's session (`MonitoringstResult` and `SiteId`) and enforce an internal-navigation referer check. Navigating directly to `http://localhost:3010/stationdetails/last-7-days` in a fresh browser session will return a `404`. Always navigate via the location search flow (`/search-location`) or a `/station-summary` deep link from aqie-maps-frontend while `aqie-monitoringstation-backend` is running.

### Environment Variables

Ensure your `.env` file includes the required session secret and points to your running local backend containers:

```bash
# Required (minimum 32 characters)
SESSION_COOKIE_PASSWORD=your-session-cookie-password-at-least-32-chars

# Local backend endpoints (use host.docker.internal when running via Docker Compose, or localhost when running via npm run dev)
OS_MONITORING_STATION_DEV_URL=http://host.docker.internal:3555/monitoringstation/
MONITORING_STATION_HISTORY_DEV_URL=http://host.docker.internal:3001/monitoringStationHistory

# API key for CDP ephemeral dev endpoints (e.g. OS Names lookup / historical data tables)
OS_NAMES_DEV_API_KEYS=<your-dev-api-key>

# Google Tag Manager
GOOGLE_TAG_MANAGER_KEYS=GTM-XXXXXXXX

# Optional: the "Search on a map" link on the hub page needs the feature flag and the aqie-maps-frontend URL.
# The URL defaults to https://aqie-maps-frontend.<ENVIRONMENT>.cdp-int.defra.cloud when ENVIRONMENT is set, so locally you need to set it
MAPS_FRONT_END_URL=http://localhost:3000
SEARCH_ON_MAP_ENABLED=true

# Optional: serve the map from this service instead (see "Air quality map served from this service" above).
# Needs aqie-back-end running; use host.docker.internal when running via Docker Compose, or localhost when running via npm run dev
MAP_IN_DATASELECTOR_ENABLED=true
AQIE_BACK_END_URL=http://host.docker.internal:3001
```

### Setup

Install application dependencies:

```bash
npm install
```

### Dev API key

Locally the app calls the CDP dev backends, which need an API key. Without it, location search returns no results.

1. Log in to the CDP portal with your profile and generate a dev API key. The key expires after 24 hours, so you need to repeat this daily.
2. Add it to your `.env` file:

```bash
# .env
OS_NAMES_DEV_API_KEYS=<your-dev-api-key>
```

3. Restart the application.

### Development

To run the application in `development` mode run:

```bash
npm run dev
```

### Production

To mimic the application running in `production` mode locally run:

```bash
npm start
```

### Npm scripts

All available Npm scripts can be seen in [package.json](./package.json)
To view them in your command line run:

```bash
npm run
```

### Update dependencies

To update dependencies use [npm-check-updates](https://github.com/raineorshine/npm-check-updates):

> The following script is a good start. Check out all the options on
> the [npm-check-updates](https://github.com/raineorshine/npm-check-updates)

```bash
ncu --interactive --format group
```

### Formatting

#### Windows prettier issue

If you are having issues with formatting of line breaks on Windows update your global git config by running:

```bash
git config --global core.autocrlf false
```

## Docker

### Development image

Build:

```bash
docker build --target development --no-cache --tag aqie-dataselector-frontend:development .
```

Run:

```bash
docker run -p 3000:3000 aqie-dataselector-frontend:development
```

### Production image

Build:

```bash
docker build --no-cache --tag aqie-dataselector-frontend .
```

Run:

```bash
docker run -p 3000:3000 aqie-dataselector-frontend
```

### Docker Compose

A local environment with:

- Localstack for AWS services (S3, SQS)
- Redis
- MongoDB
- This service.
- A commented out backend example.

```bash
docker compose up --build -d
```

### Dependabot

We have added an example dependabot configuration file to the repository. You can enable it by renaming
the [.github/example.dependabot.yml](.github/example.dependabot.yml) to `.github/dependabot.yml`

### SonarCloud

Instructions for setting up SonarCloud can be found in [sonar-project.properties](./sonar-project.properties).

## Licence

THIS INFORMATION IS LICENSED UNDER THE CONDITIONS OF THE OPEN GOVERNMENT LICENCE found at:

<http://www.nationalarchives.gov.uk/doc/open-government-licence/version/3>

The following attribution statement MUST be cited in your products and applications when using this information.

> Contains public sector information licensed under the Open Government license v3

### About the licence

The Open Government Licence (OGL) was developed by the Controller of Her Majesty's Stationery Office (HMSO) to enable
information providers in the public sector to license the use and re-use of their information under a common open
licence.

It is designed to encourage use and re-use of information freely and flexibly, with only a few conditions.
