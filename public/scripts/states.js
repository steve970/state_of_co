// src/client/states.js
var StatesMap = class {
  constructor() {
    this.width = Math.min(1460, window.innerWidth - 40);
    this.height = Math.min(960, window.innerHeight - 120);
    this.svg = null;
    this.projection = null;
    this.path = null;
    this.init();
  }
  init() {
    const loading = document.getElementById("loading");
    if (loading) loading.remove();
    this.svg = d3.select("#map-container").append("svg").attr("width", this.width).attr("height", this.height).attr("viewBox", `0 0 ${this.width} ${this.height}`).style("max-width", "100%").style("height", "auto");
    this.projection = d3.geoAlbers().center([-10, 37.25]).parallels([33, 45]).scale(2600).translate([this.width / 2, this.height / 2]);
    this.path = d3.geoPath().projection(this.projection).pointRadius(2);
    this.loadData();
  }
  async loadData() {
    try {
      const data = await d3.json("/data/states.json");
      this.renderMap(data);
    } catch (error) {
      console.error("Error loading states data:", error);
      this.showError("Failed to load map data");
    }
  }
  renderMap(data) {
    const subunits = topojson.feature(data, data.objects.subunits);
    this.svg.append("path").datum(subunits).attr("d", this.path);
    this.svg.selectAll(".subunit").data(subunits.features).enter().append("path").attr("class", (d) => `subunit ${d.id}`).attr("d", this.path).style("cursor", (d) => d.id === "COLORADO" || d.id === "UTAH" ? "pointer" : "default").on("click", (event, d) => {
      if (d.id === "COLORADO") {
        window.location.href = "/counties";
      } else if (d.id === "UTAH") {
        window.location.href = "/utah-counties";
      }
    }).on("mouseover", function(event, d) {
      if (d.id === "COLORADO" || d.id === "UTAH") {
        d3.select(this).style("opacity", 0.8);
      } else if (d.id === "CALIFORNIA") {
        d3.select(this).style("opacity", 0.9);
      }
    }).on("mouseout", function(event, d) {
      if (d.id === "COLORADO" || d.id === "UTAH") {
        d3.select(this).style("opacity", 1);
      } else if (d.id === "CALIFORNIA") {
        d3.select(this).style("opacity", 1);
      }
    });
    if (data.objects.places) {
      this.svg.append("path").datum(topojson.feature(data, data.objects.places)).attr("d", this.path).attr("class", "place");
      this.svg.selectAll(".place-label").data(topojson.feature(data, data.objects.places).features).enter().append("text").attr("class", "place-label").attr("transform", (d) => `translate(${this.projection(d.geometry.coordinates)})`).attr("dy", (d) => d.properties.name === "Salt Lake City" ? "1.5em" : ".35em").text((d) => d.properties.name).attr("x", (d) => d.properties.name === "Salt Lake City" ? 0 : d.geometry.coordinates[0] > -1 ? 6 : -6).style("text-anchor", (d) => d.properties.name === "Salt Lake City" ? "middle" : d.geometry.coordinates[0] > -1 ? "start" : "end");
    }
    this.svg.selectAll(".subunit-label").data(subunits.features).enter().append("text").attr("class", (d) => `subunit-label ${d.id}`).attr("transform", (d) => `translate(${this.path.centroid(d)})`).attr("dy", ".35em").text((d) => d.id).style("cursor", (d) => d.id === "COLORADO" || d.id === "UTAH" ? "pointer" : "default").on("click", (event, d) => {
      if (d.id === "COLORADO") {
        window.location.href = "/counties";
      } else if (d.id === "UTAH") {
        window.location.href = "/utah-counties";
      }
    });
  }
  showError(message) {
    d3.select("#map-container").append("div").attr("class", "error").style("text-align", "center").style("color", "red").style("font-size", "1.2rem").style("margin-top", "2rem").text(message);
  }
};
document.addEventListener("DOMContentLoaded", () => {
  new StatesMap();
});
window.addEventListener("resize", () => {
  clearTimeout(window.resizeTimeout);
  window.resizeTimeout = setTimeout(() => {
    location.reload();
  }, 250);
});
