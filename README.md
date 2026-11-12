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

| Environment variable         | Default | Description                                                                                                                                                                                                                 |
| ---------------------------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `VIEW_GRAPH_SUMMARY_ENABLED` | `false` | Shows the "View graph and pollutant summary" button on the station details page, for users with JavaScript enabled only, and registers the `/stationdetails/graph-summary` route. When unset or `false`, both are disabled. |
| `VIEW_DAQI_TAB_ENABLED`      | `false` | Shows the DAQI tab on the station details page, makes it the default view and registers the `/stationdetails/daqi` route. When unset or `false`, the year tables are the default view and the tab and route are disabled.   |

Feature toggles are off by default, so a feature is only enabled in an environment by explicitly setting its variable to `true` there.

The flag is read at startup, so restart the server after changing it.

It is off by default, so a release does not show the feature in an environment until the variable is set to `true` there. Any value other than `false` turns it on, including `0`, `no` and an empty value, so leave the variable unset to keep it off. `.env.example` turns it on for local development.

### Graph and pollutant summary page

`GET /stationdetails/graph-summary` is reached from the "View graph and pollutant summary" button on a station page. It takes these query parameters:

| Parameter   | Required | Description                                                                                                                                         |
| ----------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `stationId` | yes      | The station's `id` from the user's search results in the session. A station the user has not searched for, or an expired session, gives a 404.      |
| `period`    | no       | `last24hours` (the default) or `last7days`. Anything else gives a 404.                                                                              |
| `nojs`      | no       | `true` makes Back return to the no-JavaScript station page. That page no longer links here, so nothing in the app sets it now. Defaults to `false`. |

The page works without JavaScript: the tabs are links, and the graph is the only thing drawn client side. The date or date range under the heading is the window of readings that `aqie-back-end` returns from `GET /monitoringStationHistory` (in UTC): the day of the latest reading for the last 24 hours, and 7 complete days for the last 7 days. It is left out, and the page still renders, when the station has no AURN `siteId` or the call fails. The page copy is in `graphsummary` in `src/server/data/en/homecontent.js`.

The page makes one call to `GET /monitoringStationHistory` and uses the response three times:

- **View pollutant summary:** a collapsed section with the shared summary table (`partials/pollutant-summary-table.njk`). It shows plain figures, without the limit toggletips of the station page.
- **View graph: hourly data:** one line for each pollutant the station measures. The series are embedded in the page as JSON and drawn by `src/client/javascripts/pollutant-graph.js` using the `d3-*` modules. That code is a separate webpack chunk, so only this page downloads it. The graph stays hidden unless it can be drawn.
- **View hourly data as a table:** the same readings in a collapsed table, in UTC. It is the text equivalent of the graph, and what users without JavaScript get.

The no-JavaScript station page (`/stationDetailsNojs/...`) has no graph button, as the graph needs JavaScript. In its place it has two collapsed sections with the hourly readings table, one for the last 24 hours and one for the last 7 days, each with the "Data has not been checked and verified" text above the table. `src/server/graph-summary/hourly-readings.js` fetches both periods, at the same time as the page's own table, and `partials/hourly-readings-table.njk` renders them, as it does on the graph page. A period is left out when the station has no AURN `siteId` or its call fails, and none are shown when the flag is off.

Each pollutant has a colour and a line style (solid, dashed, dotted or dash and dot). Two pollutants share the solid style, so the key and the tooltip also name each one in text. They are set in `src/server/graph-summary/pollutant-styles.js`.

Pointing at the graph, tapping it, or using the left and right arrow keys (Home, End and Escape too) once it has focus, shows the readings for the nearest hour in a tooltip, with a line and a dot on each pollutant. This is `src/client/javascripts/pollutant-graph-tooltip.js`. The verification status in the tooltip is fixed text, `graphsummary.graph.verificationStatus` in the page copy, not read from the data.

## Using the graph: an accessibility guide

The graph shows a station's hourly readings for each pollutant it measures, for the last 24 hours or the last 7 days. Everything the graph shows is also on the page as text and tables.

### Read the readings without the graph

- Select **View hourly data as a table** under the graph. It opens a table with a row for each hour and a column for each pollutant. It has every reading the graph shows, and it works with a keyboard, a screen reader and without JavaScript.
- On the station page without JavaScript, select **View hourly data for the last 24 hours** or **View hourly data for the last 7 days**. Each opens a table like the one above.
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

PM2.5 and nitrogen dioxide are both solid lines, so use the box or the table to be sure which is which. The orange sulphur dioxide line is the palest. If it is hard to see, use the table.

### Times, gaps and status

- All times are in UTC. In the UK summer, clocks are an hour ahead of UTC.
- A break in a line means there is no reading for that hour. The box says "No data" for that pollutant.
- The page says the data has not been checked and verified, and the box shows its status, currently "Unverified".

### Zoom, small screens and no JavaScript

- You can zoom the page in your browser. If you resize the window or turn your phone sideways, reload the page so the graph is redrawn to fit.
- Without JavaScript the graph is not shown. On the graph page the tabs, the summary and the hourly table all still work. On the station page the hourly data for the last 24 hours and the last 7 days is in collapsed sections.

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
