var osmtogeojson = require('osmtogeojson');
var util = require('util');
var async = require('async');
var moment = require('moment');

L.mapbox.accessToken = 'pk.eyJ1IjoiZ2VvaGFja2VyIiwiYSI6ImFIN0hENW8ifQ.GGpH9gLyEg0PZf3NPQ7Vrg';
var map = L.mapbox.map('map', 'mapbox.streets').addControl(L.mapbox.geocoderControl('mapbox.places'));

var formData = {};
var nodeCount =[];

$("#fromdate").val(moment().format('YYYY-MM-DD[T]00:00:01'));   
$("#todate").val(moment().format('YYYY-MM-DD[T]HH:mm:ss')); 

var head = '[out:json];'
var q = head+"node(user:'%s')%s%s(%s);out;";


function queryOverpass (u, callback) {
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
            console.log(value);
            if (value === undefined) {
                console.log('here')
                overpassFilter = overpassFilter+"['"+key+"']";
            } else {
                overpassFilter = overpassFilter+"['"+key+"'="+"'"+value+"']";
            }
        });
    }
    var query = util.format(q, u, overpassDate, overpassFilter, overpassBbox);
    console.log(query); 
    var url = 'http://overpass.osm.rambler.ru/cgi/interpreter?data='+query;

    $('.loading').css('display', 'inline-block');
    $.ajax(url)
    .done(function(data) {
        console.log(data);
        var geojson = osmtogeojson(data);
        callback(null, geojson);
    });
}



function errorNotice (message) {
    $('.note').css('display', 'block');
    $('.note p').text(message);
    window.setTimeout(function() {
        $('.note').css('display', 'none');
    }, 2000);

}

function createTable(userList,userCount) {

    if ($('table')) {
        $('table').remove();
    }

    var tableDiv = document.getElementById('count');
    var table = document.createElement('table');
    tableDiv.appendChild(table);

    $('table').addClass('prose');
    $('table').addClass('table');

    var tableHead = document.createElement('thead');
    table.appendChild(tableHead);
    $('thead').append('<tr><th>User</th><th>Node</th></tr>');

    var tableBody = document.createElement('tbody');
    table.appendChild(tableBody);


    for (var i = 0; i < userList.length; i++) {
        var userRow = document.createElement('tr');
        var userCell = document.createElement('td');
        userCell.innerHTML = userList[i];
        userRow.appendChild(userCell);

        for (j = 0; j < 1; j++) {
            var userColumn = document.createElement('td');
            userColumn.innerHTML = userCount[i];
            userRow.appendChild(userColumn);
        }
        tableBody.appendChild(userRow);
    }
}


$('.button').on('click', function() {
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
    
    if (formData.fromDate='Invalid date') {
        fromdate_default = moment().format('YYYY-MM-DD[T]00:00:01'); 
        formData.fromDate = moment(fromdate_default).utc().toISOString();
    };
    if (formData.toDate='Invalid date') {
        todate_default = moment().format('YYYY-MM-DD[T]HH:mm:ss'); 
        formData.toDate = moment(todate_default).utc().toISOString();
    };

    console.log(formData.fromDate)

    async.map(formData.users, queryOverpass, function (err, results) {
        Array.prototype.push.apply(osmData.features, results[0].features); 

        var json = JSON.stringify(osmData);

        var blob = new Blob([json], {type: "application/json"});
        var url = URL.createObjectURL(blob);
        for(i=0;i<formData.users.length;i++){
            nodeCount[i] = results[i].features.length;
            
        }


        $('#download').attr('href', url);
        $('#download').attr('download', 'data.json');

        createTable(formData.users,nodeCount);
        
        
        $('#count').css('display', 'block');
        $('#download').css('display', 'inline-block');
        $('.loading').css('display', 'none');

    });


});
