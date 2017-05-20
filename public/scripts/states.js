
/* JavaScript goes here. */

var width = 1460,
    height = 960;

//CREATING THE SVG CONTAINER
var svg = d3.select("body")
    .append("svg")
        .attr("width", width)
        .attr("height", height);

//PARSING STATES.JSON TO CREATE MAP
d3.json("/data/states.json", function(error, co) {
  if (error) return console.error(error);

  //RETURNS THE FeatureCollection FOR THE OBJECT IN THE GIVEN TOPOLGOY
  var subunits = topojson.feature(co, co.objects.subunits);

  //SCALES MAP TO U.S. CENTRIC PROJECTIONS
  var projection = d3.geo.albers()
      .center([-10, 37.25])
      // .rotate([96, 39])
      .parallels([33, 45])
      .scale(3250)
      .translate([width / 2, height / 2]);

  //RENDERS THE MAP
  var path = d3.geo.path()
      .projection(projection)
      . pointRadius(2);

  svg.append("path")
      .datum(subunits)
      .attr("d", path)

  svg.selectAll(".subunit")
    .data(topojson.feature(co, co.objects.subunits).features)
    // console.log(topojson.feature(co, co.objects.subunits).features)
    .enter().append("path")
    .attr("class", function(d) { return "subunit " + d.id; })
    .attr("d", path);

  svg.append("path")
    .datum(topojson.feature(co, co.objects.places))
    .attr("d", path)
    .attr("class", "place");

  svg.selectAll(".place-label")
    .data(topojson.feature(co, co.objects.places).features)
  .enter().append("text")
    .attr("class", "place-label")
    .attr("transform", function(d) { return "translate(" + projection(d.geometry.coordinates) + ")"; })
    .attr("dy", ".35em")
    .text(function(d) { return d.properties.name; });

  svg.selectAll(".place-label")
    .attr("x", function(d) { return d.geometry.coordinates[0] > -1 ? 6 : -6; })
    .style("text-anchor", function(d) { return d.geometry.coordinates[0] > -1 ? "start" : "end"; });

  svg.selectAll(".subunit-label")
    .data(topojson.feature(co, co.objects.subunits).features)
    .enter()
    .append("a")
      .attr("href", function(d) {
          return d.id === "COLORADO" ? "/counties" : "#";
      })
    .append("text")
    .attr("class", function(d) { console.log(d); return "subunit-label " + d.id; })
    .attr("transform", function(d) { console.log(d); return "translate(" + path.centroid(d) + ")"; })
    .attr("dy", ".35em")
    .text(function(d) { console.log(d); return d.id; })

  // svg.select("div")
  //   .append("a")
  //   .attr("href", "counties.html")
  //   .text(function(d) { console.log("FIRED"); });

});
