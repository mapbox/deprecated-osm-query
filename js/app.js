// To extract node and way count for users over a given time period and area bounds.

var osmtogeojson = require('osmtogeojson');
var util = require('util');
var async = require('async');
var moment = require('moment');
var _ = require('underscore');

L.mapbox.accessToken = 'pk.eyJ1IjoiZ2VvaGFja2VyIiwiYSI6ImFIN0hENW8ifQ.GGpH9gLyEg0PZf3NPQ7Vrg';
var map = L.mapbox.map('map', 'mapbox.streets').addControl(L.mapbox.geocoderControl('mapbox.places'));

var formData = {};
var nodeCount = []; 
var wayCount = [];

$("#fromdate").val(moment().format('YYYY-MM-DD[T]00:00:01')); 
$("#todate").val(moment().format('YYYY-MM-DD[T]HH:mm:ss'));  

var head = '[out:json];'
var q = head+"%s(user:'%s')%s%s(%s);(._;>;);out body;";

// runs queries for nodes
function getNodes (user, callback) {
    var url = getQuery('node',user);
    $('.loading').css('display', 'inline-block');
    $.ajax(url)
    .done(function(data) { 
        var geojson = osmtogeojson(data); 
        callback(null, geojson);
    })
    .fail(function() { 
        callback('error', null);
    });
}

// runs queries for ways
function getWays (user, callback) {
    var url = getQuery('way',user);
    $('.loading').css('display', 'inline-block');
    $.ajax(url)
    .done(function(data) { 
        callback(null, data); 
    })
    .fail(function() { 
        callback('error', null);
    });
}

// constructs overpass query based on user inputs
function getQuery (type, u) {
    var bbox = map.getBounds().toBBoxString().split(',');
    var overpassBbox = bbox[1]+','+bbox[0]+','+bbox[3]+','+bbox[2];
    var overpassDate = '';
    var overpassFilter = '';
    if (formData.fromDate != '' && formData.toDate != '') {
        overpassDate = "(changed:'"+formData.fromDate+"','"+formData.toDate+"')"
    } else if (formData.fromDate != '' && formData.toDate === '') {
        overpassDate = "(changed:'"+formData.fromDate+"')";
    }

    if (formData.tags.length && formData.tags[0] != '') {
        formData.tags.forEach(function (tag) {
            var key = tag.split('=')[0];
            var value = tag.split('=')[1];
            if (value === undefined) {
                overpassFilter = overpassFilter+"['"+key+"']";
            } else {
                overpassFilter = overpassFilter+"['"+key+"'="+"'"+value+"']";
            }
        });
    }

    var query = util.format(q, type, u, overpassDate, overpassFilter, overpassBbox); 
    var url = 'http://overpass.osm.rambler.ru/cgi/interpreter?data='+query; 
    return url;
}

// displays error messages to the user
function errorNotice (message, time) {
    $('.note').css('display', 'block');
    $('.note p').text(message);
    if(time)
    {
        window.setTimeout(function() {
        $('.note').css('display', 'none');
    }, time);
    }
    else
    {
        window.setTimeout(function() {
            $('.note').css('display', 'none');
        }, 2000);
    }

}

// generates a table to display node and way counts
function createTable(userList, userNode, userWay) {
    var nodeTotal = 0;
    var wayTotal = 0;
    if ($('table')) {
        $('table').remove(); 
    }

    var tableDiv = document.getElementById('count');
    var table = document.createElement('table');
    table.setAttribute('id','countTable');
    tableDiv.appendChild(table);

    $('table').addClass('prose');
    $('table').addClass('table');

    var tableHead = document.createElement('thead');
    table.appendChild(tableHead);
    $('thead').append('<tr><th>User</th><th>Node</th><th>Way</th><th>Total</th></tr>');

    var tableBody = document.createElement('tbody');
    table.appendChild(tableBody);

    for (var i = 0; i < userList.length; i++) {
        var userRow = document.createElement('tr');
        var userCell = document.createElement('td');
        userCell.innerHTML = userList[i];
        userRow.appendChild(userCell);
        var nodeCell = document.createElement('td');
        nodeCell.innerHTML = userNode[i];
        userRow.appendChild(nodeCell);
        var wayCell = document.createElement('td');
        wayCell.innerHTML = userWay[i];      
        userRow.appendChild(wayCell);
        var userTotal = userNode[i] + userWay[i]; 
        var userTotalCell = document.createElement('td');
        userTotalCell.innerHTML = userTotal;
        userRow.appendChild(userTotalCell);
        tableBody.appendChild(userRow);

        nodeTotal = nodeTotal + userNode[i]; 
        wayTotal = wayTotal + userWay[i];
        
    }

    var teamTotal = nodeTotal+wayTotal; 
    var tableFoot =document.createElement('tfoot');
    var totalRow = document.createElement('tr'); 
    totalRow.setAttribute('class','fill-gray');
    var totalLabel = document.createElement('td');
    totalLabel.innerHTML = 'Team Total';
    totalRow.appendChild(totalLabel);
    var nodeTotalCell = document.createElement('td');
    nodeTotalCell .innerHTML = nodeTotal;
    totalRow.appendChild(nodeTotalCell );
    var wayTotalCell  = document.createElement('td');
    wayTotalCell.innerHTML = wayTotal;
    totalRow.appendChild(wayTotalCell);
    var teamTotalCell  = document.createElement('td');
    teamTotalCell.innerHTML = teamTotal.toString().bold();
    totalRow.appendChild(teamTotalCell);
    tableFoot.appendChild(totalRow);
    table.appendChild(tableFoot);
}


// get geojson for a point type
function getNodeGeoJSON(node) {
    var props = node.tags || {};
    props.id = node.id;
    return {
        'type': 'Feature',
        'properties': props,
        'geometry': {
            'type': 'Point',
            'coordinates': [node.lon, node.lat]
        }
    };
}

// get geojson for a "way" - either line or polygon
function getWayGeoJSON(way, nodeLookup) {
    var props = way.tags || {};
    props.id = way.id;
    var firstNode = way.nodes[0];
    var lastNode = way.nodes[way.nodes.length - 1];
    var geomType;
    if (firstNode === lastNode) {
        return getPolygonGeoJSON(props, way.nodes, nodeLookup);
    } else {
        return getLineStringGeoJSON(props, way.nodes, nodeLookup);
    }
}

// get geojson for a line
function getLineStringGeoJSON(properties, nodes, nodeLookup) {
    var json = {
        'type': 'Feature',
        'properties': properties,
        'geometry': {
            'type': 'LineString',
            'coordinates': []
        }
    };
    nodes.forEach(function(node) {
        var nodeCoords = nodeLookup[node];
        json.geometry.coordinates.push(nodeCoords);
    });
    return json;
}

// get geojson for a polygon
function getPolygonGeoJSON(properties, nodes, nodeLookup) {
    var json = {
        'type': 'Feature',
        'properties': properties,
        'geometry': {
            'type': 'Polygon',
            'coordinates': [[]]
        }
    };
    nodes.forEach(function(node) {
        var nodeCoords = nodeLookup[node];
        json.geometry.coordinates[0].push(nodeCoords);
    });
    return json;
}

$('#submit').on('click', function() {
    $('#count').css('display', 'none');
   
    formData = {
        'users': $('#usernames').val().split(',').map(function(name) {
            return name.trim();
        }),
        'tags': $('#tags').val().split(','),
        'fromDate': moment($('#fromdate').val()).utc().toISOString(),
        'toDate': moment($('#todate').val()).utc().toISOString()
    };

    if (formData.users.length && formData.users[0] == '') {
        errorNotice('Specify at least one username');
        return;
    };
    
    if (formData.fromDate === 'Invalid date') {
        fromdate_default = moment().format('YYYY-MM-DD[T]00:00:01'); 
        formData.fromDate = moment(fromdate_default).utc().toISOString();
    };
    if (formData.toDate === 'Invalid date') {
        todate_default = moment().format('YYYY-MM-DD[T]HH:mm:ss'); 
        formData.toDate = moment(todate_default).utc().toISOString();
    };

    
    // getNodes function iterated over user list using async utility. Return values from each call to the function is stored in resultsNode.
    async.mapSeries(formData.users, getNodes, function (err, resultsNode) {
        if (err) {
                errorNotice('Oops! Something went wrong...',10000);
                $('.loading').css('display', 'none');
               
        } else {
        
            for(i = 0; i < formData.users.length; i++){
                nodeCount[i] = resultsNode[i].features.length;
            }

            // getWays function iterated over user list using async utility. Return values from each call to the function is stored in resultsWay.
            async.mapSeries(formData.users, getWays, function (err, resultsWay) {
                if (err) {
                    errorNotice('Oops! Something went wrong...',10000);
                    $('.loading').css('display', 'none');
                 
                } else {
           
                    // first we flatten all the data for all users into a single array
                    var allUsersData = [];
                    resultsWay.forEach(function(v) {
                        Array.prototype.push.apply(allUsersData, v.elements);
                    });

                    // get only nodes
                    var nodes = _.filter(allUsersData, function(obj) {
                        return obj['type'] === 'node';
                    });

                    // get only ways
                    var ways = _.filter(allUsersData, function(obj) {
                        return obj['type'] === 'way';
                    });
                    
                    // we use node lookup to make looking up lat-lng of a node id more efficient
                    var nodeLookup = {};

                    // we identify nodes with tags to add them as Point features to the GeoJSON
                    var nodesWithTags = [];
                    
                    nodes.forEach(function(node) {
                        nodeLookup[node.id] = [node.lon, node.lat];
                        if (node.hasOwnProperty('tags')) {
                            nodesWithTags.push(node);
                        }
                    });
                    
                    var geoJSON = {
                        'type': 'FeatureCollection',
                        'features': []
                    };
                    
                    // console.log("nodes", nodes);
                    // console.log("ways", ways);
                    
                    // add GeoJSON for ways
                    ways.forEach(function(way) {
                        var wayGeoJSON = getWayGeoJSON(way, nodeLookup);
                        geoJSON.features.push(wayGeoJSON);
                    });

                    // add GeoJSON for nodes
                    nodesWithTags.forEach(function(node) {
                        var nodeGeoJSON = getNodeGeoJSON(node);
                        geoJSON.features.push(nodeGeoJSON);
                    });

                    // calculate per user way count
                    for (var i = 0;i < formData.users.length; i++) {
                        wayCount[i] = _.filter(resultsWay[i].elements, function(elem) {
                            return elem['type'] === 'way';
                        }).length; 
                    }

                    // stringify geojson and create download blob
                    var json = JSON.stringify(geoJSON, null, 2);
                    var blob = new Blob([json], {type: "application/json"});
                    var url = URL.createObjectURL(blob);
                    $('#download').attr('href', url);
                    $('#download').attr('download', 'data.json');

                    // render results
                    createTable(formData.users, nodeCount, wayCount);
                    $('#count').css('display', 'block');
                    $("#countTable").tablesorter(); 
                    $('#download').css('display', 'inline-block'); 
                    $('.loading').css('display', 'none');

                }
            });
        } 
    });
});