/* GLOBAL VARIABLES */
var world, researches, countryLookup;

/* IF A DATASHEET COLUMN HEADER CHANGES WE ONLY HAVE TO */
/* EDIT ONE LINE HERE INSTEAD OF THROUGHOUT THE CODE */
var titleKey = 'PROJECT TITLE';
var fundingKey = 'PRIMARY FUNDING SOURCE';
var secondaryFundingKey = 'SECONDARY FUNDING SOURCE (Optional)';
var otherFundingKey = '"OTHER" FUNDING SOURCE (Include description)';
var focusKey = 'PRIMARY RESEARCH FOCUS';
var secondaryResearchKey = 'ADDITIONAL RESEARCH FOCUS';
var otherResearchKey = '"OTHER" RESEARCH FOCUS (Include description)';
var leadOrgKey = 'PROJECT LEAD ORGANIZATION';
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
var partnerKey = 'PARTNER TYPE';
var secondaryPartnerKey = '2ND PARTNER TYPE (Optional)';
var allPartnersKey = 'LIST ALL PARTNERS';


/* GET OUT PAGE ELEMENTS READY FOR DC.JS */
var researchFocusChart = dc.pieChart('#research-focus-chart');
var primaryPartnerChart = dc.pieChart('#primary-partner-chart');
var primaryFundingChart = dc.pieChart('#primary-funding-chart');
var worldChart = dc_leaflet.choroplethChart("#world-chart");

/* USE TABLETOP TO GRAB RESEARCH MAPPING DATA FROM GOOGLE SHEET */
var publicSpreadsheetUrl = 'https://docs.google.com/spreadsheets/d/1NgKu_88w4Im7fWeosuRdzLeIg1qG26q0x70RYULdew0/edit?usp=sharing';
function fetchMapping() {
    return new Promise(function(resolve, reject) {
      Tabletop.init( { key: publicSpreadsheetUrl,
                       callback: function(data, tabletop) { resolve(data) },
                       simpleSheet: true }
                    )
    });
}

/* PROMISES I GUESS??? */
Promise.all([d3.json("./data/ne_50m-simple-topo.json"), fetchMapping()]).then(function(values) {
    getData(values)
});

/* GET OUR FETCHED DATA READY TO USE */
function getData(dataArray){
  /* SAVE OUR FETCHED DATA TO OUR GLOBAL VARIABLES */
  world = topojson.feature(dataArray[0], dataArray[0].objects.ne_50m);
  researches = dataArray[1];
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
  for (var i = 0; i < world.features.length; i++){ 
    var name = world.features[i].properties.name;
    var iso = world.features[i].properties.iso;
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
    .colors(d3.scaleOrdinal().range(["#7fc97f","#beaed4","#fdc086","#ffff99","#386cb0","#f0027f"]))  
    .colorDomain(focusDomain)
    .slicesCap(5)
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
    .colors(d3.scaleOrdinal().range(["#7fc97f","#beaed4","#fdc086","#ffff99","#386cb0","#f0027f"]))  
    .colorDomain(partnerDomain)
    .slicesCap(5)
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
    .colors(d3.scaleOrdinal().range(["#7fc97f","#beaed4","#fdc086","#ffff99","#386cb0","#f0027f"]))  
    .colorDomain(fundingDomain)
    .slicesCap(5)
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
    .geojson(world)
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
                '<span class="font-weight-bolder">Research focus:</span> ' + d[focusKey] + '<br>' +
                '<span class="font-weight-bolder">Partner type:</span> ' + d[partnerKey] + '<br>' +
                '<span class="font-weight-bolder">Primary funding source:</span> ' + d[fundingKey] + '<br>' +
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
}

d3.selection.prototype.moveToFront = function() {
  return this.each(function(){
    this.parentNode.appendChild(this);
  });
};

/* If USER RESIZES THE PAGE, RESIZE OUR PAGE ELEMENTS */
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
  var description = '<p>' +
    '<span class="font-weight-bolder">Primary Research Focus: </span>' + cardData[focusKey] + '<br>' +
    '<span class="font-weight-bolder">Additional Research Focus: </span>' + cardData[secondaryResearchKey] + '<br>' +
    '<span class="font-weight-bolder">Project Lead Organization: </span>' + cardData[leadOrgKey] + '<br>' +
    '<span class="font-weight-bolder">Geographic scope: </span>' + cardData[geoScopeKey] + '<br>' +
    '<span class="font-weight-bolder">Countries: </span>' + cardData[countriesKey] + '<br>' +
    '<span class="font-weight-bolder">Project Status: </span>' + cardData[statusKey] + '<br>' +
    '<span class="font-weight-bolder">Partner Type: </span>' + cardData[partnerKey] + '<br>' +
    '<span class="font-weight-bolder">Second Partner Type: </span>' + cardData[secondaryPartnerKey] + '<br>' +
    '<span class="font-weight-bolder">Primary Funding Source: </span>' + cardData[fundingKey] + '<br>' +
    '<span class="font-weight-bolder">Secondary Funding Source: </span>' + cardData[secondaryFundingKey] + '<br>' +
    '<span class="font-weight-bolder">Link: </span>' +
    ( (cardData[linkKey].length > 0) ? '<a target="_blank" href="'+ cardData[linkKey] +'">Link</a>' : 'No Link Provided' ) +
    '</p>';
  var modal = $(this);
  modal.find('.modal-title').text(cardData[titleKey]);
  $(modal).find('.modal-body').html(description);

})