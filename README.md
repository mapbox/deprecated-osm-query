# osm-query
Planets, stars, nodes and ways

# development
* `npm install`
* `browserify js/app.js > dist/bundle.js`
* `serve`

www.mapbox.com/osm-query


# How does it work?
* Key in OSM usernames.
* By default, time period is set for current date and current time
* Map area in view is by default taken to be the boudning box for the query
* Key in any specific tags that you want to query. Only one tag is possible ata time eg: building=yes
* On hitting `Submit`, total count of nodes and ways touched by the user is shown. This count is for a chosen tag, within a given time period, over a specific geographic area.
