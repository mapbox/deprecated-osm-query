![deprecated](https://c1.staticflickr.com/5/4396/36704337791_4268261089_n.jpg)

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
* Map area in view is by default taken to be the bounding box for the query
* Key in any specific tags that you want to query. Only one tag can be queried for at a time eg: building=yes
* On hitting `Submit`, total count of nodes and ways touched by the user is shown. This count is for a chosen tag, within a given time period, over a specific geographic area.
