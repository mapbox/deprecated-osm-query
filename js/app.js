var osmtogeojson = require('osmtogeojson');
var util = require('util');
var async = require('async');
L.mapbox.accessToken = 'pk.eyJ1IjoiZ2VvaGFja2VyIiwiYSI6ImFIN0hENW8ifQ.GGpH9gLyEg0PZf3NPQ7Vrg';
var map = L.mapbox.map('map', 'mapbox.streets');

var osmData = {};

var formData = {};

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
    $('.loading').css('display', 'inline-block');
    var url = 'http://overpass.osm.rambler.ru/cgi/interpreter?data='+query;
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

function tableCreate(userList,userCount) {
    var count = document.getElementById('countbody');
    if (count){
       $("#countbody").remove();
   
    }

    var tblbody = document.createElement('tbody');
    tblbody.setAttribute('id','countbody');

    for (var i = 0; i < userList.length; i++){
         var tblrow = document.createElement('tr');
         tblrow.innerHTML = userList[i];
         for(j=0;j<2;j++){
            var tblcol = document.createElement('td');
            tblcol.innerHTML = userCount[i].features.length;
            tblrow.appendChild(tblcol);
         }
         tblbody.appendChild(tblrow);
         counttable.appendChild(tblbody);
  
    }
}


$('.button').on('click', function() {
    $('#count').css('display', 'none');

    osmData = {
    'type': "FeatureCollection",
    'features': []
    }

    formData = {
        'users': $('#usernames').val().split(','),
        'tags': $('#tags').val().split(','),
        'fromDate': $('#fromdate').val() ? new Date($('#todate').val()).toISOString() : '',
        'toDate': $('#todate').val() ? new Date($('#todate').val()).toISOString() : ''
    };


    if (formData.users.length && formData.users[0] == '') {
        errorNotice('Specify at least one username');
        return;
    };

    async.map(formData.users, queryOverpass, function (err, results) {
        Array.prototype.push.apply(osmData.features, results[0].features); 
       
        var json = JSON.stringify(osmData);

        var blob = new Blob([json], {type: "application/json"});
        var url = URL.createObjectURL(blob);

        
        $('#download').attr('href', url);
        $('#download').attr('download', 'Query_result.json');
    
        tableCreate(formData.users,results);
   
       
        $('#count').css('display', 'block');
        $('#download').css('display', 'inline-block');
        $('.loading').css('display', 'none');

    });
    
});
