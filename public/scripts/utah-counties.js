// src/client/utah-counties.js
var UtahCountiesMap = class {
  constructor() {
    this.width = Math.min(1500, window.innerWidth - 40);
    this.height = Math.min(700, window.innerHeight - 100);
    this.svg = null;
    this.projection = null;
    this.path = null;
    this.tooltip = null;
    this.colorScale = d3.scaleLinear().domain([0, 5e5]).range(["#BFD3E6", "#88419D"]);
    this.init();
  }
  init() {
    const loading = document.getElementById("loading");
    if (loading) loading.remove();
    this.svg = d3.select("#map-container").append("svg").attr("width", this.width).attr("height", this.height).attr("viewBox", `0 0 ${this.width} ${this.height}`).style("max-width", "100%").style("height", "auto");
    this.projection = d3.geoConicConformal().parallels([40 + 43 / 60, 41 + 47 / 60]).rotate([111 + 30 / 60, -39 - 0 / 60]).scale(6e3).translate([this.width / 2, this.height / 2]);
    this.path = d3.geoPath().projection(this.projection);
    this.tooltip = d3.select("#tooltip");
    this.loadData();
  }
  async loadData() {
    try {
      const countiesData = await d3.json("/data/utah-counties.json");
      this.renderMap(countiesData);
    } catch (error) {
      console.error("Error loading Utah counties data:", error);
      this.showError("Failed to load Utah counties data");
    }
  }
  renderMap(countiesData) {
    const counties = topojson.feature(countiesData, countiesData.objects.counties);
    const jobCounts = counties.features.map((d) => d.properties?.total_jobs || 0);
    const minJobs = Math.min(...jobCounts);
    const maxJobs = Math.max(...jobCounts);
    this.colorScale.domain([minJobs, maxJobs]);
    this.svg.append("g").attr("class", "utah").selectAll("path").data(counties.features).enter().append("path").attr("d", this.path).attr("id", (d) => d.id).style("fill", "white").style("stroke", "#999").style("stroke-width", 0.5).style("cursor", "pointer").on("mouseover", (event, d) => this.handleMouseOver(event, d)).on("mousemove", (event, d) => this.handleMouseMove(event, d)).on("mouseout", (event, d) => this.handleMouseOut(event, d)).on("click", (event, d) => this.handleClick(event, d));
    this.svg.append("path").datum(topojson.mesh(countiesData, countiesData.objects.counties, (a, b) => a !== b)).attr("class", "county-border").attr("d", this.path).style("fill", "none").style("stroke", "#34495e").style("stroke-width", 0.5).style("pointer-events", "none");
    this.svg.append("path").datum(topojson.mesh(countiesData, countiesData.objects.counties, (a, b) => a === b)).attr("class", "state-border").attr("d", this.path).style("fill", "none").style("stroke", "#2c3e50").style("stroke-width", 2).style("pointer-events", "none");
    this.renderCountyCities(counties, countiesData);
    this.addLegend();
  }
  handleMouseOver(event, d) {
    const jobs = d.properties?.total_jobs || 0;
    const jobColor = jobs > 0 ? this.colorScale(jobs) : "#f0f0f0";
    d3.select(event.currentTarget).style("fill", jobColor).style("stroke", "#000").style("stroke-width", 1.5);
    const props = d.properties || {};
    const formatPopulation = (num) => num ? num.toLocaleString("en-US") : "N/A";
    const formatArea = (num) => num ? num.toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + " sq mi" : "N/A";
    const formatPoverty = (num) => num ? num.toFixed(1) + "%" : "N/A";
    const formatIncome = (num) => num ? "$" + num.toLocaleString("en-US") : "N/A";
    const formatJobs = (num) => num ? num.toLocaleString("en-US") : "N/A";
    this.tooltip.style("opacity", 1).html(`
                <div class="tooltip-title" style="font-weight: bold; font-size: 14px; margin-bottom: 8px; color: #2c3e50;">
                    ${props.name || "Unknown County"}
                </div>
                <div class="tooltip-content" style="line-height: 1.4; color: #34495e;">
                    <div><strong>Total Jobs:</strong> ${formatJobs(props.total_jobs)}</div>
                    <div><strong>Population:</strong> ${formatPopulation(props.population)}</div>
                    <div><strong>Largest City:</strong> ${props.largest_city || "N/A"}</div>
                    <div><strong>Area:</strong> ${formatArea(props.area_sq_miles)}</div>
                    <div><strong>Poverty Rate:</strong> ${formatPoverty(props.poverty_rate)}</div>
                    <div><strong>Median Income:</strong> ${formatIncome(props.median_income)}</div>
                    <div><strong>Main Industry:</strong> ${props.main_industry || "N/A"}</div>
                </div>
            `);
  }
  handleMouseMove(event, d) {
    this.tooltip.style("left", event.pageX + 10 + "px").style("top", event.pageY - 10 + "px");
  }
  handleMouseOut(event, d) {
    d3.select(event.currentTarget).style("fill", "white").style("stroke", "#999").style("stroke-width", 0.5);
    this.tooltip.style("opacity", 0);
  }
  handleClick(event, d) {
    console.log("Clicked on:", d.properties?.name);
  }
  addLegend() {
    const legend = this.svg.append("g").attr("id", "legend").attr("transform", `translate(30, 80)`);
    legend.append("rect").attr("x", -20).attr("y", -40).attr("width", 220).attr("height", 300).attr("rx", 8).style("fill", "rgba(255, 255, 255, 0.95)").style("stroke", "#ddd").style("stroke-width", 1);
    legend.append("text").attr("x", 90).attr("y", -10).style("text-anchor", "middle").style("font-size", "16px").style("font-weight", "bold").style("fill", "#2c3e50").text("Employment Level");
    legend.append("text").attr("x", 90).attr("y", 8).style("text-anchor", "middle").style("font-size", "12px").style("fill", "#7f8c8d").text("(Hover over counties)");
    const [minJobs, maxJobs] = this.colorScale.domain();
    const jobRanges = [
      { min: minJobs, max: 5e4, label: "Low", sublabel: "< 50K jobs", color: "#BFD3E6" },
      { min: 5e4, max: 15e4, label: "Medium", sublabel: "50K - 150K", color: "#9BB3D9" },
      { min: 15e4, max: 3e5, label: "High", sublabel: "150K - 300K", color: "#7A8FCC" },
      { min: 3e5, max: maxJobs, label: "Very High", sublabel: "300K+ jobs", color: "#88419D" }
    ];
    jobRanges.forEach((range, i) => {
      const y = 40 + i * 45;
      legend.append("rect").attr("x", 10).attr("y", y).attr("width", 25).attr("height", 25).attr("rx", 3).style("fill", range.color).style("stroke", "#666").style("stroke-width", 0.5);
      legend.append("text").attr("x", 45).attr("y", y + 12).style("font-size", "12px").style("font-weight", "500").style("fill", "#2c3e50").text(range.label);
      legend.append("text").attr("x", 45).attr("y", y + 28).style("font-size", "10px").style("fill", "#7f8c8d").text(range.sublabel);
    });
    legend.append("text").attr("x", 90).attr("y", 230).style("text-anchor", "middle").style("font-size", "9px").style("fill", "#95a5a6").text("Data: Bureau of Labor Statistics");
    legend.append("text").attr("x", 90).attr("y", 245).style("text-anchor", "middle").style("font-size", "9px").style("fill", "#95a5a6").text("(August 2025)");
  }
  renderCountyCities(counties, countiesData) {
    const countiesWithCities = counties.features.filter(
      (d) => d.properties.city_coordinates && d.properties.largest_city
    );
    const statesTransform = {
      "scale": [0.002038506576897769, 0.0013674284622462395],
      "translate": [-114.82210811499999, 31.327184550000112]
    };
    countiesWithCities.forEach((county) => {
      const coords = county.properties.city_coordinates;
      const lon = coords[0] * statesTransform.scale[0] + statesTransform.translate[0];
      const lat = coords[1] * statesTransform.scale[1] + statesTransform.translate[1];
      const screenCoords = this.projection([lon, lat]);
      if (screenCoords && screenCoords[0] >= 0 && screenCoords[0] <= this.width && screenCoords[1] >= 0 && screenCoords[1] <= this.height) {
        this.svg.append("circle").attr("class", "city-dot").attr("cx", screenCoords[0]).attr("cy", screenCoords[1]).attr("r", 2).style("fill", "#2c3e50").style("stroke", "white").style("stroke-width", 1).style("opacity", 0.8).append("title").text(`${county.properties.largest_city} (${county.properties.name})`);
      }
    });
  }
  showError(message) {
    d3.select("#map-container").append("div").attr("class", "error").style("text-align", "center").style("color", "red").style("font-size", "1.2rem").style("margin-top", "2rem").text(message);
  }
};
document.addEventListener("DOMContentLoaded", () => {
  new UtahCountiesMap();
});
window.addEventListener("resize", () => {
  clearTimeout(window.resizeTimeout);
  window.resizeTimeout = setTimeout(() => {
    location.reload();
  }, 250);
});
