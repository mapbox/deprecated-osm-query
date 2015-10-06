//To extract node and way count for users over a given time period and area bounds.

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
var nodeTotal = 0;
var wayTotal = 0;

$("#fromdate").val(moment().format('YYYY-MM-DD[T]00:00:01')); 
$("#todate").val(moment().format('YYYY-MM-DD[T]HH:mm:ss'));  

var head = '[out:json];'
var q = head+"%s(user:'%s')%s%s(%s);(._;>;);out body;";

//runs queries for nodes
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

//runs queries for ways
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

//constructs overpass query based on user inputs
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

    // 
    var query = util.format(q, type, u, overpassDate, overpassFilter, overpassBbox); 
    var url = 'http://overpass.osm.rambler.ru/cgi/interpreter?data='+query; 
    return url;
}

//displays error messages to the user
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

//generates a table to display node and way counts
function createTable(userList, userNode, userWay) {

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



$('#submit').on('click', function() {
    $('#count').css('display', 'none');

    var osmData = {
        'type': "FeatureCollection",
        'features': []
    }

   
    formData = {
        'users': $('#usernames').val().split(','),
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
    async.map(formData.users, getNodes, function (err, resultsNode) {
        if (err) {
                errorNotice('Oops! Something went wrong...',10000);
                $('.loading').css('display', 'none');
               
        } else {
        
            console.log('# Okay nodes', resultsNode);

            console.log("osm data", osmData);
            for(i = 0; i < formData.users.length; i++){
                Array.prototype.push.apply(osmData.features, resultsNode[i].features); 

                nodeCount[i] = resultsNode[i].features.length;
            }
            // var nodeLookupTable = {};
            // for (j = 0; j < osmData.features.length; j++) {
            //     var feature = osmData.features[j];
            //     var id = feature.properties.id;
            //     var coords = feature.geometry.coordinates;
            //     if (coords === null) {
            //         console.log("coords are null!", feature);
            //     }
            //     nodeLookupTable[id] = coords;
            // }
         // getWays function iterated over user list using async utility. Return values from each call to the function is stored in resultsWay.
            async.map(formData.users, getWays, function (err, resultsWay) {
                if (err) {
                    errorNotice('Oops! Something went wrong...',10000);
                    $('.loading').css('display', 'none');
                 
                } else {
           
                    console.log('# Okay ways', resultsWay);
                    var allUsersData = [];
                    resultsWay.forEach(function(v) {
                        Array.prototype.push.apply(allUsersData, v.elements);
                    });

                    var nodes = _.filter(allUsersData, function(obj) {
                        return obj['type'] === 'node';
                    });
                    var ways = _.filter(allUsersData, function(obj) {
                        return obj['type'] === 'way';
                    });
                    var nodeLookup = {};
                    nodes.forEach(function(node) {
                        nodeLookup[node.id] = [node.lon, node.lat];
                    });
                    var waysGeoJSON = {
                        'type': 'FeatureCollection',
                        'features': []
                    };
                    console.log("ways", ways);
                    ways.forEach(function(way) {
                        var props = way.tags;
                        props.id = way.id;
                        //var geometryType = getGeometryType(way);
                        var wayGeoJSON = {
                            'type': 'Feature',
                            'properties': props,
                            'geometry': {
                                'type': 'LineString',
                                'coordinates': []
                            }
                        };
                        way.nodes.forEach(function(node) {
                            var nodeCoords = nodeLookup[node];
                            wayGeoJSON.geometry.coordinates.push(nodeCoords);
                        });
                        waysGeoJSON.features.push(wayGeoJSON);
                    });
                    for (var i = 0;i < formData.users.length; i++) {
                        wayCount[i] = resultsWay[i].elements.length; 
                        //var thisResult = resultsWay[i];
                        // for (var j = 0, length = thisResult.elements.length; j < length; j++) {
                        //     var thisElement = thisResult.elements[j];
                        //     var thisFeature = {
                        //         'type': 'Feature',
                        //         'properties': thisElement.tags,
                        //         'geometry': {
                        //             'type': 'LineString',
                        //             'coordinates': []
                        //         }
                        //     };
                        //     //console.log("this element", thisElement);
                        //     if (thisElement['type'] === 'way') {
                        //         for (var k = 0; k < thisElement.nodes.length; k++) {
                        //             var thisNode = thisElement.nodes[k];
                        //             if (!nodeLookupTable.hasOwnProperty(thisNode)) {
                        //                 console.log("node not found in table", thisNode);
                        //             } else {
                        //                 var coords = nodeLookupTable[thisNode];
                        //                 thisFeature.geometry.coordinates.push(coords);
                        //             }
                        //         }
                        //     }
                        //     waysGeoJSON.features.push(thisFeature);
                        // }
                    }
                    console.log("geojson", waysGeoJSON);
                    var json = JSON.stringify(waysGeoJSON, null, 2);
                    var blob = new Blob([json], {type: "application/json"});
                    var url = URL.createObjectURL(blob);
                    $('#download').attr('href', url);
                    $('#download').attr('download', 'data.json'); 
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