/* GLOBAL VARIABLES */
var geoCountries, geoRegions, geoWorld, researches, countryLookup, centreUrls;

/* IF A DATASHEET COLUMN HEADER CHANGES WE ONLY HAVE TO */
/* EDIT ONE LINE HERE INSTEAD OF THROUGHOUT THE CODE */
var titleKey = 'PROJECT TITLE';
var fundingKey = 'PRIMARY FUNDING SOURCE';
var secondaryFundingKey = 'SECONDARY FUNDING SOURCE (Optional)';
var otherFundingKey = '"OTHER" FUNDING SOURCE (Include description)';
var researchTypeKey = 'TYPE OF RESEARCH';
var focusKey = 'PRIMARY RESEARCH FOCUS';
var secondaryResearchKey = 'ADDITIONAL RESEARCH FOCUS';
var otherResearchKey = '"OTHER" RESEARCH FOCUS (Include description)';
var leadOrgKey = 'PROJECT LEAD ORGANIZATION';
var leadLogoKey = "LEAD LOGO";
var leadContactKey = 'PROJECT LEAD CONTACT NAME (Include email)';
var geoScopeKey = 'GEOGRAPHIC SCOPE';
var countriesKey = 'LIST COUNTRIES OR IFRC REGIONS (separate list with semicolon and list region only when an entire region is covered)';
var isoKey = 'ISO3';
var statusKey = 'PROJECT STATUS';
var startMonthKey = 'START MONTH';
var startYearKey = 'START YEAR';
var endMonthKey = 'END MONTH';
var endYearKey = 'END YEAR';
var linkKey = 'LINK (to most relevant report)';
var docTypeKey = 'TYPE OF DOCUMENT';
var languageKey = 'DOCUMENT LANGUAGE';
var partnerKey = 'PARTNER TYPE';
var secondaryPartnerKey = '2ND PARTNER TYPE (Optional)';
var allPartnersKey = 'LIST ALL PARTNERS';


/* GET OUT PAGE ELEMENTS READY FOR DC.JS */
var researchFocusChart = dc.pieChart('#research-focus-chart');
var primaryPartnerChart = dc.pieChart('#primary-partner-chart');
var primaryFundingChart = dc.pieChart('#primary-funding-chart');
var worldChart = dc_leaflet.choroplethChart("#world-chart");

/* GRAB RESEARCH MAPPING DATA */
function fetchMapping() {
  return new Promise(function(resolve, reject) {
    Papa.parse('https://americanredcross.github.io/google-sheets-workaround/research-mapping.csv', {
      download: true,
      header: true,
      complete: function(results) {
        resolve(results.data);
      }
    })
  })
}
        
window.addEventListener('DOMContentLoaded', function(){
  /* PROMISES I GUESS??? */
  Promise.all([d3.json("./data/ne_50m-simple-topo.json"), 
    fetchMapping(),
    d3.csv("./img/logos/urls.csv")]).then(function(values) {
      getData(values)
  });
})

/* GET OUR FETCHED DATA READY TO USE */
function getData(dataArray){
  /* SAVE OUR FETCHED DATA TO OUR GLOBAL VARIABLES */
  geoCountries = topojson.feature(dataArray[0], dataArray[0].objects.world);
  researches = dataArray[1];
  centreUrls = dataArray[2];
  /* LOOP THROUGH AND DO ANY DATA CLEANING ETC ON OUR RESEARCH MAPPING DATA */
  for (var i = 0; i < researches.length; i++){
    /* SAVE THE INDEX AS A UNIQUE ID FOR LATER */
    researches[i]["rowid"] = i
    /* BLANK CELLS AREN'T COUNTED CORRECTLY SO FILL THEM IN */
    if(researches[i][focusKey] === "") { researches[i][focusKey] = "NO DATA" }
    if(researches[i][partnerKey] === "") { researches[i][partnerKey] = "NO DATA" }
    if(researches[i][fundingKey] === "") { researches[i][fundingKey] = "NO DATA" }
    /* TURN OUR SPACE DELIMITED ISO CODES INTO AN ARRAY */
    /* REDUCE MULTIPLE SPACES TO ONE AND THEN SPLIT ON SPACE */
    researches[i][isoKey] = researches[i][isoKey].replace(/\s\s+/g, ' ').split(" ")
  }
  /* CREATE A LOOKUP FOR COUNTRY NAMES */
  countryLookup = {}
  for (var i = 0; i < geoCountries.features.length; i++){ 
    var name = geoCountries.features[i].properties.name;
    var iso = geoCountries.features[i].properties.iso;
    countryLookup[iso] = name;
  }
  
  drawResearch();
}

function drawResearch(){
  
  /* ADD THE TOTAL NUMBER TO THE PAGE */
  $("#research-count").text(researches.length + " ");

  /* CONFIGURE OUR DATA IN CROSSFILTER */
  cf = crossfilter(researches);
  cf.onChange(function(){
    updateCards();
  });

  researchFocusDimension = cf.dimension(function(d){
    return d[focusKey];
  });
  primaryPartnerDimension = cf.dimension(function(d){
    return d[partnerKey];
  });
  primaryFundingDimension = cf.dimension(function(d){
    return d[fundingKey];
  });
  countriesDimension = cf.dimension(function(d){ return d[isoKey];}, true);

  researchFocusGroup = researchFocusDimension.group();
  primaryPartnerGroup = primaryPartnerDimension.group();
  primaryFundingGroup = primaryFundingDimension.group();
  countriesGroup = countriesDimension.group();
  
  /* FIGURE OUT HOW MUCH SPACE WE HAVE TO WORK WITH */
  var chartWidth = $(".chart-space").width()
  var mapWidth = $("#map-row").width()
  
  /* CONFIGURE OUR CHARTS AND MAP */
  var focusDomain = researchFocusGroup.top(5).map(x => x.key)
  researchFocusChart
    .width(chartWidth)
    .height(null)
    .renderLabel(false)
    .colorDomain(focusDomain)
    .colors(d3.scaleOrdinal().range(["#8dd3c7", "#ffffb3", "#bebada", "#fb8072", "#80b1d3", "#fdb462", "#b3de69", "#fccde5", "#d9d9d9", "#bc80bd", "#ccebc5", "#ffed6f"]))
    .slicesCap(11)  
    // .colors(d3.scaleOrdinal().range(["#7fc97f","#beaed4","#fdc086","#ffff99","#386cb0","#f0027f"]))  
    // .slicesCap(5)
    .externalLabels(50)
    .externalRadiusPadding(50)
    .drawPaths(true)
    .dimension(researchFocusDimension)
    .group(researchFocusGroup)
    .legend(dc.legend());
    
  var partnerDomain = primaryPartnerGroup.top(5).map(x => x.key)
  primaryPartnerChart
    .width(chartWidth)
    .height(null)
    .renderLabel(false)
    .colorDomain(partnerDomain)
    .colors(d3.scaleOrdinal().range(["#8dd3c7", "#ffffb3", "#bebada", "#fb8072", "#80b1d3", "#fdb462", "#b3de69", "#fccde5", "#d9d9d9", "#bc80bd", "#ccebc5", "#ffed6f"]))
    .slicesCap(11)  
    // .colors(d3.scaleOrdinal().range(["#7fc97f","#beaed4","#fdc086","#ffff99","#386cb0","#f0027f"]))  
    // .slicesCap(5)
    .externalLabels(50)
    .externalRadiusPadding(50)
    .drawPaths(true)
    .dimension(primaryPartnerDimension)
    .group(primaryPartnerGroup)
    .legend(dc.legend());
  
  var fundingDomain = primaryFundingGroup.top(5).map(x => x.key)
  primaryFundingChart
    .width(chartWidth)
    .height(null)
    .renderLabel(false)
    .colorDomain(fundingDomain)
    .colors(d3.scaleOrdinal().range(["#8dd3c7", "#ffffb3", "#bebada", "#fb8072", "#80b1d3", "#fdb462", "#b3de69", "#fccde5", "#d9d9d9", "#bc80bd", "#ccebc5", "#ffed6f"]))
    .slicesCap(11) 
    // .colors(d3.scaleOrdinal().range(["#7fc97f","#beaed4","#fdc086","#ffff99","#386cb0","#f0027f"]))  
    // .slicesCap(5)
    .externalLabels(50)
    .externalRadiusPadding(50)
    .drawPaths(true)
    .dimension(primaryFundingDimension)
    .group(primaryFundingGroup)
    .legend(dc.legend());
    
  worldChart
    .width(mapWidth)
    .height(400)
    .center([24, 4.9])
    .zoom(2)
    .dimension(countriesDimension)
    .group(countriesGroup)
    .colors(function(d){
      var colorScale = d3.scaleQuantize()
          // .range(["#fc9272","#fb6a4a","#ef3b2c","#cb181d","#a50f15","#67000d"]) // reds
          .range(["#bcbddc","#9e9ac8","#807dba","#6a51a3","#54278f","#3f007d"]) // purples
          .domain([0, countriesGroup.top(2)[1].value])
      if(d.value == 0){
        return "#9b9b9b"
      }else{
        return colorScale(d.value);
      }
    })
    .colorAccessor(function(d){ return d; })
    .geojson(geoCountries)
    .featureKeyAccessor(function(feature){
      return feature.properties.iso;
    }) 
    .on('renderlet', function (d,i) {
      d3.selectAll('.leaflet-interactive[stroke="#ffbf00"]').moveToFront();
    })
    
  /* REMOVE THE LOADING SPINNERS */  
  $(".chart-loading").remove();
  /* DRAW OUR CHARTS AND MAP */ 
  dc.renderAll();
  
  /* REMOVE THE OSM BASEMAP FOR A CLEAN LOOK */
  worldChart.map().eachLayer(function(layer){
    if( layer instanceof L.TileLayer ){ worldChart.map().removeLayer(layer); }
  });
  
  $("#reset-dc").on("click", function(e){
    resetDc()
  });

  updateCards();
}



function updateCards() {

  var researchCards = d3.select('#research-cards').selectAll('div.col-sm-4')
        .data(cf.allFiltered(), function(d) { return d.rowid; });

  // EXIT
  researchCards.exit().remove();
  // no UPDATE
  // ENTER
  researchCards.enter().append('div')
    .attr('class', 'col-sm-4 p-0')
    .attr('id', function(d) { return "research-" + d["rowid"]; })
    .html(function(d) {  
        var html = '<div class="card mb-3 mx-1"><div class="card-body">' +
              '<h5 class="card-title">' + d[titleKey] + '</h5>' +
              '<p class="card-text">' +
                ( (d[startYearKey].length > 1) ? 'Start ' + d[startYearKey] + '. ' : '') +
                ( (d[endYearKey].length > 1) ? 'End ' + d[endYearKey] + '. ' : '') + 
                ( (d[focusKey].length > 1) ? '<br> Focus on ' + d[focusKey] + '. ' : '') + 
              '</p>'+
              '<button type="button" data-rowid="' + d["rowid"] + '" class="btn btn-secondary btn-sm" data-toggle="modal" data-target="#research-modal">Learn More</button>' +
            '</div></div>'
        return html;
      })
  
}



/* HELPER FUNCTIONS */
function resetDc() {
  dc.filterAll();
  dc.redrawAll();
  worldChart.map().setView([0,0], 2)
}

function lookupUrl(filename) {
  for(var i = 0; i < centreUrls.length; i++) {
    console.log(centreUrls[i])
    if(centreUrls[i]['filename'] == filename) { return centreUrls[i].url; }
  }
  return ''
}

function toTitleCase(str) {
  return str.toLowerCase().replace(/(?:^|\s)\w/g, function(match) {
    return match.toUpperCase();
  });
}

d3.selection.prototype.moveToFront = function() {
  return this.each(function(){
    this.parentNode.appendChild(this);
  });
};

/* SOCIAL SHARE OPENS UP IN SMALLER POPUP WINDOW */
$("#twitter-share").on('click', function() {
  window.open('https://twitter.com/intent/tweet?status=Research%20mapping%3A%20https%3A%2F%2Fresearch.preparecenter.org%20via%20%40PrepareCenter', "shareOnTwitter", 'width=800,height=600');
})
$("#facebook-share").on('click', function() {
  window.open('https://www.facebook.com/sharer/sharer.php?u=https%3A%2F%2Famericanredcross.github.io%2Fresearch-mapping%2F', "shareOnFacebook", 'width=800,height=600');
})
$("#linkedin-share").on('click', function() {
  window.open('https://www.linkedin.com/shareArticle?mini=true&url=https%3A//research.preparecenter.org/', "shareOnLinkedIn", 'width=800,height=600');
})

/* IF USER RESIZES THE PAGE, RESIZE OUR PAGE ELEMENTS */
d3.select(window).on("resize", throttle);
var throttleTimer;
function throttle() {
  $("#research-focus-chart").hide();
  $("#primary-partner-chart").hide();
  $("#primary-funding-chart").hide();
  window.clearTimeout(throttleTimer);
    throttleTimer = window.setTimeout(function() {
      /* CHARTS */
      var chartWidth = $(".chart-space").width();
      $("#research-focus-chart").show();
      $("#primary-partner-chart").show();
      $("#primary-funding-chart").show();
      researchFocusChart.width(chartWidth).redraw();
      primaryPartnerChart.width(chartWidth).redraw();
      primaryFundingChart.width(chartWidth).redraw();
      /* MAP */
      var mapWidth = $("#map-row").width();
      $(".dc-leaflet.leaflet-container").width(mapWidth);
      worldChart.map().invalidateSize(); /* SEE https://github.com/Leaflet/Leaflet/issues/690 */  
    }, 200);
}

$('#research-modal').on('show.bs.modal', function (event) {
  var button = $(event.relatedTarget); /* BUTTON THAT TRIGGERED MODAL */
  var cardId = "#research-" + button.data('rowid');
  var cardData = d3.select(cardId).data()[0];

  /* Need to strip out the "NO DATA" we added earlier for counting */ 
  for(key in cardData){
    if(cardData[key] === "NO DATA"){ cardData[key] = '' }
  }
  
  /* Some of our text requires more complex logic to build */ 
  var timespan = ''
  if( (cardData[startYearKey].length > 3) && (cardData[endYearKey].length > 3) ) {
    timespan = '<span class="">' + cardData[startMonthKey] + ' ' + cardData[startYearKey]  + ' - ' + cardData[endMonthKey] + ' ' + cardData[endYearKey]  + '</span>. '
  } else if( (cardData[startYearKey].length > 3) && (cardData[endYearKey].length < 3) ) {
    timespan = '<span class="">' + cardData[startMonthKey] + ' ' + cardData[startYearKey]  + ' - ?</span>. '
  } else if( (cardData[startYearKey].length < 3) && (cardData[endYearKey].length > 3) ) {
    timespan = 'End date: <span class="">' + cardData[endMonthKey] + ' ' + cardData[endYearKey]  + '</span>. '
  } else {
    timespan = ''
  }
  var partnerType = ''
  if (cardData[partnerKey].length > 3 && cardData[secondaryPartnerKey].length > 3) {
    partnerType = 'The partner types include <span class="">' + cardData[partnerKey] + '</span> and <span class="">' + cardData[secondaryPartnerKey] + '</span>. '
  } else if (cardData[partnerKey].length > 3 || cardData[secondaryPartnerKey].length > 3) {
    partnerType = 'The partner type is <span class="">' + cardData[partnerKey] + cardData[secondaryPartnerKey] + '</span>. '
  } else {
    partnerType = ''
  }
  
  /* Putting together the rest of the text for the modal */ 
  var description = '<h4>' + cardData[titleKey] + '</h4>' + 
    '<p>' + 
    ( (cardData[linkKey].length > 0) ? '<span class=""><a target="_blank" href="'+ cardData[linkKey] +'">You can get more details about the project at this link <i class="fas fa-external-link-alt"></i></a></span> ' : "<span class=''>Unfortunately we don't have a link to this.</span> " ) + 
    ( (cardData[docTypeKey].length > 1) ? ' The type of document is <span class="">' + cardData[docTypeKey] + '</span>. ' : '') +
    ( (cardData[languageKey].length > 1) ? ' The language of publication is <span class="">' + cardData[languageKey] + '</span>. ' : '') +
    '</p>' +
    '<p>' +
    ( (cardData[statusKey].length > 1) ? ' This project is <span class="">' + cardData[statusKey].toLowerCase() + '</span>. ' : '') +
    timespan + 
    '</p>' +
    '<p>' +
    ( (cardData[focusKey].length > 1 && cardData[focusKey] != 'OTHER') ? ' The primary research focus is <span class="">' + cardData[focusKey] + '</span>. ' : '') +
    ( (cardData[secondaryResearchKey].length > 1 && cardData[secondaryResearchKey] != 'OTHER') ? ' An additional research focus is <span class="">' + cardData[secondaryResearchKey] + '</span>. ' : '') +
    ( (cardData[otherResearchKey].length > 1) ? ' The project includes focus on <span class="">' + cardData[otherResearchKey] + '</span>. ' : '') +
    ( (cardData[researchTypeKey].length > 1) ? ' The type of research is <span class="">' + cardData[researchTypeKey] + '</span>. ' : '') +
    '</p>' +  
    '<p>' +
    ( (cardData[geoScopeKey].length > 1) ? ' This geographic scope of the project is <span class="">' + cardData[geoScopeKey] + '</span>. ' : '') +
    ( (cardData[countriesKey].length > 1) ? ' The places covered by the project include <span class="">' + cardData[countriesKey] + '</span>. ' : '') +
    '</p>' +  
    '<p>' +
    partnerType +
    ( (cardData[allPartnersKey].length > 1) ? ' The project partner(s) are: <span class="">' + cardData[allPartnersKey] + '</span>. ' : '') +
    '</p>' +  
    '<p>' +
    ( (cardData[fundingKey].length > 1) ? ' The primary funding source is <span class="">' + cardData[fundingKey].toLowerCase() + '</span>. ' : '') +
    ( (cardData[secondaryFundingKey].length > 1) ? ' A secondary funding source is <span class="">' + cardData[secondaryFundingKey].toLowerCase() + '</span>. ' : '') +
    '</p>' +  
    '<p>' +
    ( (cardData[leadOrgKey].length > 1) ? 'The project lead organization is <span class="">' + cardData[leadOrgKey] + '</span>.' : '') +
    ( (cardData[leadLogoKey].length > 3) ? '<br>' +
        (( lookupUrl(cardData[leadLogoKey]).length > 1 ) ? '<a target="_blank" href="'+ lookupUrl(cardData[leadLogoKey]) +'">' : '') +
        '<img class="logo" src=./img/logos/' + cardData[leadLogoKey] + ' />'  +
        (( lookupUrl(cardData[leadLogoKey]).length > 1 ) ? '</a>' : '') 
      : '' ) +
    '</p>';
  var modal = $(this);
  $(modal).find('.modal-body-content').html(description);

})
