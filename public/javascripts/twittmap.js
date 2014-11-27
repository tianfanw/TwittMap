function initialize() {
  var mapCanvas = document.getElementById('map_canvas');
  var mapOptions = {
      center: new google.maps.LatLng(35.0072, 15.3551),
      zoom: 2,
      mapTypeId: google.maps.MapTypeId.ROADMAP
    }
  map = new google.maps.Map(mapCanvas, mapOptions);

  // var myLatlng = new google.maps.LatLng(17.7850,-12.4183);
  // var light_grey_style = [{"featureType":"landscape","stylers":[{"saturation":-100},{"lightness":65},{"visibility":"on"}]},{"featureType":"poi","stylers":[{"saturation":-100},{"lightness":51},{"visibility":"simplified"}]},{"featureType":"road.highway","stylers":[{"saturation":-100},{"visibility":"simplified"}]},{"featureType":"road.arterial","stylers":[{"saturation":-100},{"lightness":30},{"visibility":"on"}]},{"featureType":"road.local","stylers":[{"saturation":-100},{"lightness":40},{"visibility":"on"}]},{"featureType":"transit","stylers":[{"saturation":-100},{"visibility":"simplified"}]},{"featureType":"administrative.province","stylers":[{"visibility":"off"}]},{"featureType":"water","elementType":"labels","stylers":[{"visibility":"on"},{"lightness":-25},{"saturation":-100}]},{"featureType":"water","elementType":"geometry","stylers":[{"hue":"#ffff00"},{"lightness":-25},{"saturation":-97}]}];
  // var myOptions = {
  //   zoom: 2,
  //   center: myLatlng,
  //   mapTypeId: google.maps.MapTypeId.ROADMAP,
  //   mapTypeControl: true,
  //   mapTypeControlOptions: {
  //     style: google.maps.MapTypeControlStyle.HORIZONTAL_BAR,
  //     position: google.maps.ControlPosition.LEFT_BOTTOM
  //   },
  //   styles: light_grey_style
  // };
  // var map = new google.maps.Map(document.getElementById("map_canvas"), myOptions);

  // //Setup heat map and link to Twitter array we will append data to

  var numKeywords = 5;  
  var markerImgs = [
  'public/images/blue-dot-md.png', 
  'public/images/green-dot-md.png',
  'public/images/neon-green-dot-md.png',
  'public/images/purple-dot-md.png',
  'public/images/red-dot-md.png',
  ];
  var heatmapData = [];
  for(var i = 0; i < numKeywords + 1; i++) {
    heatmapData[i] = new google.maps.MVCArray();
  }
  var markers = [];
  for(var i = 0; i < numKeywords + 1; i++) {
    markers[i] = [];
  }

  var heatmap = new google.maps.visualization.HeatmapLayer({
    data: [],
    radius: 20,
    map: map
  });

  var socket = io();
  var maxTweets = 500;
  var tweets = [];
  var curIdx = 0;
  var maxTweetsReached = false;
  
  // $(date).click( function() {
  //   emit('getKeywords');
  //   emit('getTweets');
  // }
  var keywords = [];
  var keywordsIndices = {};
  socket.on('keywords', function(res){
    // Initialization after keyword update
    for(var i = 0; i < numKeywords + 1; i++) {
      heatmapData[i].clear();
    }
    heatmap.setData([]);
    for(var i = 0; i < numKeywords + 1; i++) {
      for(var j = 0; j < markers[i].length; j++) {
        markers[i][j].setMap(null);
      }
      markers[i].length = 0;
    }
    keywords.length = 0;
    tweets.length = 0;
    $("#tweetlist").text('');
    curIdx = 0;
    maxTweetsReached = false;
    currentView = viewScatter;
    currentKeyword = numKeywords;
    
    var keywordnames = "";
    var n = res.length;
    for(var i = 0; i < res.length; i++) {
      keywords[i] = res[i];
      keywordsIndices[keywords[i]] = i;
      // console.log(keywordsIndices[keywords[i]]);
      $('#keyword' + i).text(keywords[i]);
      $('#keyword' + i).prepend('<img src="' + markerImgs[i] + '"> ');
      // $('#keywords').append('<li role="presentation"><a id=keyword' + i + 
      //   ' role = "menuitem" tabindex="-1" href="#"> ' + keywords[i] + ' </a></li>');
      // console.log(keywords[i]);
      keywordnames += keywords[i];
      if(i < (n - 1)) keywordnames += ", ";
    }
    $("#keywordnames").text(keywordnames);
    socket.emit('tweets', keywords);
  });


  // var flashMarker = new google.maps.Marker({
  //   position: latLng,
  //   map: map,
    
  //   animation: google.maps.Animation.DROP,
  //   }
  // }
  socket.on('tweet', function(res){
    if(keywords.indexOf(res.keyword) > -1) {
      res.keywords
      tweets[curIdx] = res;
      var latLng = new google.maps.LatLng(res.longitude, res.latitude);
      heatmapData[numKeywords].push({
        location: latLng,
        weight: 1
      });

      var keywordIndex = keywordsIndices[tweets[curIdx].keyword];
      heatmapData[keywordIndex].push({
        location: latLng,
        weight: 1
      });
      var iconBase = 'https://maps.google.com/mapfiles/kml/shapes/';
      var marker = new google.maps.Marker({
        position: latLng,
        map: map,
        animation: google.maps.Animation.BOUNCE,
        icon: icon = {
          url: markerImgs[keywordIndex], // url
          scaledSize: new google.maps.Size(8, 8), // size
          category: tweets[curIdx].keyword,
          // origin: new google.maps.Point(0,0), // origin
          // anchor: new google.maps.Point(30,30) // anchor 
         }
        // icon: {
        //   path: google.maps.SymbolPath.CIRCLE,
        //   fillColor: 'red',
        //   fillOpacity: 1.0,
        //   scale: 1,
        //   strokeColor: 'white',
        //   strokeWeight: .5
        // }
      });
      setTimeout(function(){
        if (marker.getAnimation() != null) {
          marker.setAnimation(null);
        }
      },2000);
      if(!((currentView == viewScatter) && (currentKeyword == keywordIndex || currentKeyword == numKeywords))) {
        marker.setVisible(false);
      }
      
      markers[keywordIndex].push(marker);
      markers[numKeywords].push(marker);
      
      $('#tweetlist').prepend(
        $('<li>').append(
          '<img src="' + tweets[curIdx].profile + '"/> <span>' + tweets[curIdx].user + ': '
          + tweets[curIdx].text + '</span>'));
      if(maxTweetsReached) {
        $('#tweetlist li:last').remove();
      }
      curIdx++;
      if(curIdx == maxTweets) {
        maxTweetsReached = true;
        curIdx = 0;
      }
    }
  });

  socket.on('tweets', function(res){
    for(var i = 0; i < res.length; i++) {
      tweets[curIdx] = res[i];
      var latLng = new google.maps.LatLng(res[i].longitude, res[i].latitude);
      heatmapData[numKeywords].push({
        location: latLng,
        weight: 1
      });

      var keywordIndex = keywordsIndices[tweets[curIdx].keyword];
      heatmapData[keywordIndex].push({
        location: latLng,
        weight: 1
      });
      var iconBase = 'https://maps.google.com/mapfiles/kml/shapes/';
      var marker = new google.maps.Marker({
        position: latLng,
        map: map,
        icon: icon = {
          url: markerImgs[keywordIndex], // url
          scaledSize: new google.maps.Size(8, 8), // size
          category: tweets[curIdx].keyword,
          // origin: new google.maps.Point(0,0), // origin
          // anchor: new google.maps.Point(30,30) // anchor 
         }        
        // icon: {
        //   path: google.maps.SymbolPath.CIRCLE,
        //   fillColor: 'red',
        //   fillOpacity: 1.0,
        //   scale: 1,
        //   strokeColor: 'white',
        //   strokeWeight: .5
        // }
      });
      if(!((currentView == viewScatter) && (currentKeyword == keywordIndex || currentKeyword == numKeywords))) {
        marker.setVisible(false);
      }
      markers[keywordIndex].push(marker);
      markers[numKeywords].push(marker);
      
      $('#tweetlist').append(
        $('<li>').append(
          '<img src="' + tweets[curIdx].profile + '"/> <span>' + tweets[curIdx].user + ': '
          + tweets[curIdx].text + '</span>'));
      if(maxTweetsReached) {
        $('#tweetlist li:last').remove();
      }
      curIdx++;
      if(curIdx == maxTweets) {
        maxTweetsReached = true;
        curIdx = 0;
      }
    }
  });

  // Toggle map display
  var viewScatter = 0;
  var viewHeatmap = 1;
  var currentView = viewScatter;
  var currentKeyword = numKeywords;
  $("#scatter").click( function() {
    if(currentView != viewScatter) {
      heatmap.setData([]);
      for(var i = 0; i < markers[currentKeyword].length; i++) {
        markers[currentKeyword][i].setVisible(true);
      }
      currentView = viewScatter;
    }
  });
  $("#heatmap").click( function() {
    if(currentView != viewHeatmap) {
      for(var i = 0; i < markers[currentKeyword].length; i++) {
        markers[currentKeyword][i].setVisible(false);
      }
      heatmap.setData(heatmapData[currentKeyword]);
      currentView = viewHeatmap;
    }
  });

  $("#keyword0").click( function() {
    if(currentKeyword != 0) {
      if(currentView == viewHeatmap)
        heatmap.setData(heatmapData[0]);
      else {
        for(var i = 0; i < markers[currentKeyword].length; i++) {
          markers[currentKeyword][i].setVisible(false);
        }
        for(var i = 0; i < markers[0].length; i++) {
          markers[0][i].setVisible(true);
        }
      }
      currentKeyword = 0;
    }
  });
  $("#keyword1").click( function() {
    if(currentKeyword != 1) {
      if(currentView == viewHeatmap)
        heatmap.setData(heatmapData[1]);
      else {
        for(var i = 0; i < markers[currentKeyword].length; i++) {
          markers[currentKeyword][i].setVisible(false);
        }
        for(var i = 0; i < markers[1].length; i++) {
          markers[1][i].setVisible(true);
        }
      }
      currentKeyword = 1;
    }
  });
  $("#keyword2").click( function() {
    if(currentKeyword != 2) {
      if(currentView == viewHeatmap)
        heatmap.setData(heatmapData[2]);
      else {
        for(var i = 0; i < markers[currentKeyword].length; i++) {
          markers[currentKeyword][i].setVisible(false);
        }
        for(var i = 0; i < markers[2].length; i++) {
          markers[2][i].setVisible(true);
        }
      }
      currentKeyword = 2;
    }
  });
  $("#keyword3").click( function() {
    if(currentKeyword != 3) {
      if(currentView == viewHeatmap)
        heatmap.setData(heatmapData[3]);
      else {
        for(var i = 0; i < markers[currentKeyword].length; i++) {
          markers[currentKeyword][i].setVisible(false);
        }
        for(var i = 0; i < markers[3].length; i++) {
          markers[3][i].setVisible(true);
        }
      }
      currentKeyword = 3;
    }
  });
  $("#keyword4").click( function() {
    if(currentKeyword != 4) {
      if(currentView == viewHeatmap)
        heatmap.setData(heatmapData[4]);
      else {
        for(var i = 0; i < markers[currentKeyword].length; i++) {
          markers[currentKeyword][i].setVisible(false);
        }
        for(var i = 0; i < markers[4].length; i++) {
          markers[4][i].setVisible(true);
        }
      }
      currentKeyword = 4;
    }
  });
  $("#keywordall").click( function() {
    if(currentKeyword != numKeywords) {
      if(currentView == viewHeatmap)
        heatmap.setData(heatmapData[numKeywords]);
      else {
        for(var i = 0; i < markers[currentKeyword].length; i++) {
          markers[currentKeyword][i].setVisible(false);
        }
        for(var i = 0; i < markers[numKeywords].length; i++) {
          markers[numKeywords][i].setVisible(true);
        }
      }
      currentKeyword = numKeywords;
    }
  });

  var dateOption = 0;
  $("#current").click( function() {
    if(dateOption != 0) {
      socket.emit("current");
      dateOption = 0;
    }
  });
  $("#lasthour").click( function() {
    if(dateOption != 1) {
      socket.emit("history", {hours: 1, days: 0});
      dateOption = 1;
    }
  });
  $("#last2hours").click( function() {
    if(dateOption != 2) {
      socket.emit("history", {hours: 2, days: 0});
      dateOption = 2;
    }
  });
  $("#last4hours").click( function() {
    if(dateOption != 3) {
      socket.emit("history", {hours: 4, days: 0});
      dateOption = 3;
    }
  });
  $("#last12hours").click( function() {
    if(dateOption != 4) {
      socket.emit("history", {hours: 12, days: 0});
      dateOption = 4;
    }
  });
  $("#lastday").click( function() {
    if(dateOption != 5) {
      socket.emit("history", {hours: 0, days: 1});
      dateOption = 5;
    }
  });
  $("#last3days").click( function() {
    if(dateOption != 6) {
      socket.emit("history", {hours: 0, days: 3});
      dateOption = 6;
    }
  });
  $("#lastweek").click( function() {
    if(dateOption != 7) {
      socket.emit("history", {hours: 0, days: 7});
      dateOption = 7;
    }
  });
}
google.maps.event.addDomListener(window, 'load', initialize);
