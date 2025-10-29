// src/services/blsApi.js
var BLSApiService = class {
  constructor() {
    this.baseUrl = "https://api.bls.gov/publicAPI/v2/timeseries/data/";
    this.registrationKey = process.env.BLS_API_KEY || null;
    this.coloradoCounties = {
      "Adams": "08001",
      "Alamosa": "08003",
      "Arapahoe": "08005",
      "Archuleta": "08007",
      "Baca": "08009",
      "Bent": "08011",
      "Boulder": "08013",
      "Broomfield": "08014",
      "Chaffee": "08015",
      "Cheyenne": "08017",
      "Clear Creek": "08019",
      "Conejos": "08021",
      "Costilla": "08023",
      "Crowley": "08025",
      "Custer": "08027",
      "Delta": "08029",
      "Denver": "08031",
      "Dolores": "08033",
      "Douglas": "08035",
      "Eagle": "08037",
      "El Paso": "08041",
      "Elbert": "08039",
      "Fremont": "08043",
      "Garfield": "08045",
      "Gilpin": "08047",
      "Grand": "08049",
      "Gunnison": "08051",
      "Hinsdale": "08053",
      "Huerfano": "08055",
      "Jackson": "08057",
      "Jefferson": "08059",
      "Kiowa": "08061",
      "Kit Carson": "08063",
      "La Plata": "08067",
      "Lake": "08065",
      "Larimer": "08069",
      "Las Animas": "08071",
      "Lincoln": "08073",
      "Logan": "08075",
      "Mesa": "08077",
      "Mineral": "08079",
      "Moffat": "08081",
      "Montezuma": "08083",
      "Montrose": "08085",
      "Morgan": "08087",
      "Otero": "08089",
      "Ouray": "08091",
      "Park": "08093",
      "Phillips": "08095",
      "Pitkin": "08097",
      "Prowers": "08099",
      "Pueblo": "08101",
      "Rio Blanco": "08103",
      "Rio Grande": "08105",
      "Routt": "08107",
      "Saguache": "08109",
      "San Juan": "08111",
      "San Miguel": "08113",
      "Sedgwick": "08115",
      "Summit": "08117",
      "Teller": "08119",
      "Washington": "08121",
      "Weld": "08123",
      "Yuma": "08125"
    };
    this.utahCounties = {
      "Beaver": "49001",
      "Box Elder": "49003",
      "Cache": "49005",
      "Carbon": "49007",
      "Daggett": "49009",
      "Davis": "49011",
      "Duchesne": "49013",
      "Emery": "49015",
      "Garfield": "49017",
      "Grand": "49019",
      "Iron": "49021",
      "Juab": "49023",
      "Kane": "49025",
      "Millard": "49027",
      "Morgan": "49029",
      "Piute": "49031",
      "Rich": "49033",
      "Salt Lake": "49035",
      "San Juan": "49037",
      "Sanpete": "49039",
      "Sevier": "49041",
      "Summit": "49043",
      "Tooele": "49045",
      "Uintah": "49047",
      "Utah": "49049",
      "Wasatch": "49051",
      "Washington": "49053",
      "Wayne": "49055",
      "Weber": "49057"
    };
  }
  // Generate BLS series ID for employment data
  generateSeriesId(fipsCode) {
    return `LAUCN${fipsCode}0000000006`;
  }
  // Fetch employment data for multiple counties in a single API call (BULK REQUEST)
  async fetchMultipleCountiesEmployment(countyNames) {
    const seriesIds = countyNames.map((countyName) => {
      const fipsCode = this.coloradoCounties[countyName];
      if (!fipsCode) {
        console.warn(`FIPS code not found for county: ${countyName}`);
        return null;
      }
      return this.generateSeriesId(fipsCode);
    }).filter(Boolean);
    if (seriesIds.length === 0) {
      throw new Error("No valid FIPS codes found for provided counties");
    }
    const currentYear = (/* @__PURE__ */ new Date()).getFullYear();
    const lastYear = currentYear - 1;
    try {
      const requestBody = {
        seriesid: seriesIds,
        startyear: lastYear.toString(),
        endyear: currentYear.toString(),
        registrationkey: this.registrationKey
      };
      console.log(`\u{1F4E1} Making BLS API call for ${seriesIds.length} counties...`);
      const response = await fetch(this.baseUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(requestBody)
      });
      if (!response.ok) {
        throw new Error(`BLS API request failed: ${response.status}`);
      }
      const data = await response.json();
      if (data.status !== "REQUEST_SUCCEEDED") {
        throw new Error(`BLS API error: ${data.message || "Unknown error"}`);
      }
      const results = {};
      data.Results.series.forEach((series) => {
        const fipsCode = series.seriesID.substring(5, 10);
        const countyName = Object.keys(this.coloradoCounties).find(
          (name) => this.coloradoCounties[name] === fipsCode
        );
        if (countyName && series.data && series.data.length > 0) {
          const latestData = series.data[0];
          results[countyName] = {
            county: countyName,
            employment: parseInt(latestData.value),
            period: latestData.period,
            year: latestData.year,
            lastUpdated: (/* @__PURE__ */ new Date()).toISOString(),
            seriesId: series.seriesID
          };
        } else {
          console.warn(`No data found for county with FIPS: ${fipsCode}`);
          if (countyName) {
            results[countyName] = {
              county: countyName,
              employment: null,
              error: "No data available",
              lastUpdated: (/* @__PURE__ */ new Date()).toISOString()
            };
          }
        }
      });
      return results;
    } catch (error) {
      console.error("Error in bulk fetch:", error);
      const errorResults = {};
      countyNames.forEach((countyName) => {
        errorResults[countyName] = {
          county: countyName,
          employment: null,
          error: error.message,
          lastUpdated: (/* @__PURE__ */ new Date()).toISOString()
        };
      });
      return errorResults;
    }
  }
  // Fetch employment data for a single county (now uses bulk method)
  async fetchCountyEmployment(countyName) {
    const results = await this.fetchMultipleCountiesEmployment([countyName]);
    return results[countyName];
  }
  // Fetch employment data for all Colorado counties using BULK API calls
  async fetchAllCountiesEmployment() {
    const counties = Object.keys(this.coloradoCounties);
    const maxSeriesPerRequest = 50;
    const results = {};
    console.log(`\u{1F680} Fetching employment data for ${counties.length} Colorado counties using bulk API...`);
    const chunks = [];
    for (let i = 0; i < counties.length; i += maxSeriesPerRequest) {
      chunks.push(counties.slice(i, i + maxSeriesPerRequest));
    }
    console.log(`\u{1F4CA} Making ${chunks.length} bulk API calls (${maxSeriesPerRequest} counties each)`);
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      console.log(`\u{1F4E1} API Call ${i + 1}/${chunks.length}: Fetching ${chunk.length} counties...`);
      try {
        const chunkResults = await this.fetchMultipleCountiesEmployment(chunk);
        Object.assign(results, chunkResults);
        const successCount = Object.values(chunkResults).filter((r) => r.employment !== null).length;
        console.log(`\u2705 Batch ${i + 1} completed: ${successCount}/${chunk.length} successful`);
        if (i < chunks.length - 1) {
          console.log("\u23F3 Waiting 5 seconds before next API call...");
          await new Promise((resolve) => setTimeout(resolve, 5e3));
        }
      } catch (error) {
        console.error(`\u274C Batch ${i + 1} failed:`, error);
        chunk.forEach((countyName) => {
          results[countyName] = {
            county: countyName,
            employment: null,
            error: error.message,
            lastUpdated: (/* @__PURE__ */ new Date()).toISOString()
          };
        });
      }
    }
    const totalSuccess = Object.values(results).filter((r) => r.employment !== null).length;
    console.log(`\u{1F389} Bulk fetch completed: ${totalSuccess}/${counties.length} counties successful`);
    return results;
  }
  // Fetch employment data for Utah counties using bulk API
  async fetchUtahEmploymentData() {
    const counties = Object.keys(this.utahCounties);
    const maxSeriesPerRequest = 50;
    const results = {};
    console.log(`\u{1F680} Fetching employment data for ${counties.length} Utah counties using bulk API...`);
    const chunks = [];
    for (let i = 0; i < counties.length; i += maxSeriesPerRequest) {
      chunks.push(counties.slice(i, i + maxSeriesPerRequest));
    }
    console.log(`\u{1F4CA} Making ${chunks.length} bulk API calls (${maxSeriesPerRequest} counties each)`);
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      console.log(`\u{1F4E1} API Call ${i + 1}/${chunks.length}: Fetching ${chunk.length} counties...`);
      try {
        const seriesIds = chunk.map((countyName) => {
          const fipsCode = this.utahCounties[countyName];
          if (!fipsCode) {
            console.warn(`FIPS code not found for Utah county: ${countyName}`);
            return null;
          }
          return this.generateSeriesId(fipsCode);
        }).filter(Boolean);
        if (seriesIds.length === 0) continue;
        const currentYear = (/* @__PURE__ */ new Date()).getFullYear();
        const lastYear = currentYear - 1;
        const requestBody = {
          seriesid: seriesIds,
          startyear: lastYear.toString(),
          endyear: currentYear.toString(),
          registrationkey: this.registrationKey
        };
        const response = await fetch(this.baseUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(requestBody)
        });
        if (!response.ok) {
          throw new Error(`BLS API request failed: ${response.status}`);
        }
        const data = await response.json();
        if (data.status !== "REQUEST_SUCCEEDED") {
          throw new Error(`BLS API error: ${data.message || "Unknown error"}`);
        }
        data.Results.series.forEach((series) => {
          const fipsCode = series.seriesID.substring(5, 10);
          const countyName = Object.keys(this.utahCounties).find(
            (name) => this.utahCounties[name] === fipsCode
          );
          if (countyName && series.data && series.data.length > 0) {
            const latestData = series.data[0];
            results[countyName] = {
              county: countyName,
              employment: parseInt(latestData.value),
              period: latestData.period,
              year: latestData.year,
              lastUpdated: (/* @__PURE__ */ new Date()).toISOString(),
              seriesId: series.seriesID
            };
          } else {
            console.warn(`No data found for Utah county with FIPS: ${fipsCode}`);
            if (countyName) {
              results[countyName] = {
                county: countyName,
                employment: null,
                error: "No data available",
                lastUpdated: (/* @__PURE__ */ new Date()).toISOString()
              };
            }
          }
        });
        const successCount = Object.values(results).filter((r) => r.employment !== null).length;
        console.log(`\u2705 Batch ${i + 1} completed: ${successCount}/${chunk.length} successful`);
        if (i < chunks.length - 1) {
          console.log("\u23F3 Waiting 5 seconds before next API call...");
          await new Promise((resolve) => setTimeout(resolve, 5e3));
        }
      } catch (error) {
        console.error(`\u274C Batch ${i + 1} failed:`, error);
        chunk.forEach((countyName) => {
          results[countyName] = {
            county: countyName,
            employment: null,
            error: error.message,
            lastUpdated: (/* @__PURE__ */ new Date()).toISOString()
          };
        });
      }
    }
    const totalSuccess = Object.values(results).filter((r) => r.employment !== null).length;
    console.log(`\u{1F389} Utah bulk fetch completed: ${totalSuccess}/${counties.length} counties successful`);
    return results;
  }
  // Get cached data or fetch fresh data
  async getEmploymentData(forceRefresh = false) {
    const cacheKey = "bls_employment_data";
    const cacheTimestampKey = "bls_employment_timestamp";
    const cacheExpiryHours = 24;
    if (!forceRefresh) {
      const cachedData = localStorage.getItem(cacheKey);
      const cachedTimestamp = localStorage.getItem(cacheTimestampKey);
      if (cachedData && cachedTimestamp) {
        const cacheAge = Date.now() - parseInt(cachedTimestamp);
        const cacheExpiryMs = cacheExpiryHours * 60 * 60 * 1e3;
        if (cacheAge < cacheExpiryMs) {
          console.log("Using cached BLS employment data");
          return JSON.parse(cachedData);
        }
      }
    }
    console.log("Fetching fresh BLS employment data...");
    const freshData = await this.fetchAllCountiesEmployment();
    localStorage.setItem(cacheKey, JSON.stringify(freshData));
    localStorage.setItem(cacheTimestampKey, Date.now().toString());
    return freshData;
  }
  // Convert BLS employment data to our county format
  convertToCountyFormat(blsData) {
    const countyData = {};
    Object.entries(blsData).forEach(([countyName, data]) => {
      if (data.employment !== null) {
        countyData[countyName] = {
          total_jobs: data.employment,
          data_source: "BLS API",
          last_updated: data.lastUpdated,
          period: data.period,
          year: data.year
        };
      } else {
        countyData[countyName] = {
          total_jobs: this.getFallbackJobCount(countyName),
          data_source: "Estimated (BLS unavailable)",
          last_updated: (/* @__PURE__ */ new Date()).toISOString(),
          error: data.error
        };
      }
    });
    return countyData;
  }
  // Fallback job estimates if BLS API fails
  getFallbackJobCount(countyName) {
    const fallbackData = {
      "Denver": 485e3,
      "El Paso": 315e3,
      "Arapahoe": 295e3,
      "Jefferson": 265e3,
      "Adams": 185e3,
      "Larimer": 185e3,
      "Boulder": 175e3,
      "Douglas": 165e3,
      "Weld": 145e3,
      "Mesa": 68e3,
      "Pueblo": 68500
    };
    return fallbackData[countyName] || Math.floor(Math.random() * 5e4) + 5e3;
  }
  // Alias for compatibility
  fetchAllEmploymentData() {
    return this.fetchAllCountiesEmployment();
  }
  // Alias for compatibility
  getEstimatedJobs(countyName) {
    return this.getFallbackJobCount(countyName);
  }
};
var blsApi_default = BLSApiService;

// src/services/dataManager.js
var DataManager = class {
  constructor() {
    this.blsService = new blsApi_default();
    this.isUpdating = false;
  }
  // Update counties.json with fresh BLS data
  async updateCountiesWithBLSData() {
    if (this.isUpdating) {
      console.log("Data update already in progress...");
      return false;
    }
    this.isUpdating = true;
    try {
      console.log("\u{1F504} Starting BLS data update...");
      const blsData = await this.blsService.getEmploymentData(false);
      const employmentData = this.blsService.convertToCountyFormat(blsData);
      const response = await fetch("/data/counties.json");
      const countiesJson = await response.json();
      let updatedCount = 0;
      countiesJson.objects.counties.geometries = countiesJson.objects.counties.geometries.map((county) => {
        const countyId = county.id;
        const blsEmploymentData = employmentData[countyId];
        if (blsEmploymentData) {
          updatedCount++;
          return {
            ...county,
            properties: {
              ...county.properties,
              total_jobs: blsEmploymentData.total_jobs,
              jobs_data_source: blsEmploymentData.data_source,
              jobs_last_updated: blsEmploymentData.last_updated,
              jobs_period: blsEmploymentData.period,
              jobs_year: blsEmploymentData.year
            }
          };
        } else {
          console.warn(`No BLS data found for county: ${countyId}`);
          return county;
        }
      });
      localStorage.setItem("updated_counties_data", JSON.stringify(countiesJson));
      localStorage.setItem("data_update_timestamp", (/* @__PURE__ */ new Date()).toISOString());
      console.log(`\u2705 Successfully updated ${updatedCount} counties with BLS data`);
      return countiesJson;
    } catch (error) {
      console.error("\u274C Error updating counties with BLS data:", error);
      throw error;
    } finally {
      this.isUpdating = false;
    }
  }
  // Get the most current counties data (updated or original)
  async getCurrentCountiesData() {
    const updatedData = localStorage.getItem("updated_counties_data");
    const updateTimestamp = localStorage.getItem("data_update_timestamp");
    if (updatedData && updateTimestamp) {
      const updateAge = Date.now() - new Date(updateTimestamp).getTime();
      const maxAge = 24 * 60 * 60 * 1e3;
      if (updateAge < maxAge) {
        console.log("\u{1F4CA} Using updated BLS data from cache");
        return JSON.parse(updatedData);
      }
    }
    console.log("\u{1F4CA} Using original data, triggering BLS update...");
    const response = await fetch("/data/counties.json");
    const originalData = await response.json();
    this.updateCountiesWithBLSData().catch((error) => {
      console.error("Background BLS update failed:", error);
    });
    return originalData;
  }
  // Force refresh all data
  async forceRefresh() {
    console.log("\u{1F504} Force refreshing all employment data...");
    localStorage.removeItem("bls_employment_data");
    localStorage.removeItem("bls_employment_timestamp");
    localStorage.removeItem("updated_counties_data");
    localStorage.removeItem("data_update_timestamp");
    return await this.updateCountiesWithBLSData();
  }
  // Get data freshness info
  getDataInfo() {
    const blsTimestamp = localStorage.getItem("bls_employment_timestamp");
    const updateTimestamp = localStorage.getItem("data_update_timestamp");
    return {
      blsDataAge: blsTimestamp ? Date.now() - parseInt(blsTimestamp) : null,
      lastUpdate: updateTimestamp ? new Date(updateTimestamp) : null,
      isUpdating: this.isUpdating
    };
  }
  // Schedule automatic updates
  startAutoUpdate(intervalHours = 24) {
    const intervalMs = intervalHours * 60 * 60 * 1e3;
    setInterval(async () => {
      console.log("\u{1F550} Scheduled BLS data update starting...");
      try {
        await this.updateCountiesWithBLSData();
        console.log("\u2705 Scheduled update completed");
      } catch (error) {
        console.error("\u274C Scheduled update failed:", error);
      }
    }, intervalMs);
    console.log(`\u23F0 Auto-update scheduled every ${intervalHours} hours`);
  }
};
var dataManager_default = DataManager;

// src/client/counties-bls.js
var CountiesMapBLS = class {
  constructor() {
    this.width = Math.min(1500, window.innerWidth - 40);
    this.height = Math.min(700, window.innerHeight - 100);
    this.svg = null;
    this.projection = null;
    this.path = null;
    this.tooltip = null;
    this.dataManager = new dataManager_default();
    this.colorScale = d3.scaleLinear().domain([0, 5e5]).range(["#BFD3E6", "#88419D"]);
    this.init();
  }
  init() {
    this.showLoading("Loading BLS employment data...");
    this.svg = d3.select("#map-container").append("svg").attr("width", this.width).attr("height", this.height).attr("viewBox", `0 0 ${this.width} ${this.height}`).style("max-width", "100%").style("height", "auto");
    this.projection = d3.geoConicConformal().parallels([39 + 43 / 60, 40 + 47 / 60]).rotate([105 + 0 / 60, -39 - 0 / 60]).scale(5e3).translate([this.width / 2, this.height / 2]);
    this.path = d3.geoPath().projection(this.projection);
    this.tooltip = d3.select("#tooltip");
    this.addRefreshButton();
    this.loadData();
  }
  showLoading(message) {
    const loading = d3.select("#map-container").append("div").attr("id", "loading").style("position", "absolute").style("top", "50%").style("left", "50%").style("transform", "translate(-50%, -50%)").style("background", "rgba(255, 255, 255, 0.9)").style("padding", "2rem").style("border-radius", "8px").style("box-shadow", "0 4px 12px rgba(0, 0, 0, 0.15)").style("text-align", "center").style("font-size", "1.2rem").style("color", "#2c3e50");
    loading.append("div").style("margin-bottom", "1rem").text(message);
    loading.append("div").style("width", "40px").style("height", "40px").style("border", "4px solid #f3f3f3").style("border-top", "4px solid #3498db").style("border-radius", "50%").style("animation", "spin 1s linear infinite").style("margin", "0 auto");
    if (!document.getElementById("spinner-style")) {
      const style = document.createElement("style");
      style.id = "spinner-style";
      style.textContent = `
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `;
      document.head.appendChild(style);
    }
  }
  hideLoading() {
    const loading = document.getElementById("loading");
    if (loading) loading.remove();
  }
  async loadData() {
    try {
      const countiesData = await this.dataManager.getCurrentCountiesData();
      this.hideLoading();
      this.renderMap(countiesData);
    } catch (error) {
      console.error("Error loading counties data:", error);
      this.hideLoading();
      this.showError("Failed to load counties data: " + error.message);
    }
  }
  renderMap(countiesData) {
    const counties = topojson.feature(countiesData, countiesData.objects.counties);
    const jobCounts = counties.features.map((d) => d.properties?.total_jobs || 0);
    const minJobs = Math.min(...jobCounts);
    const maxJobs = Math.max(...jobCounts);
    this.colorScale.domain([minJobs, maxJobs]);
    this.svg.append("g").attr("class", "colorado").selectAll("path").data(counties.features).enter().append("path").attr("d", this.path).attr("id", (d) => d.id).style("fill", "white").style("stroke", "#999").style("stroke-width", 0.5).style("cursor", "pointer").on("mouseover", (event, d) => this.handleMouseOver(event, d)).on("mousemove", (event, d) => this.handleMouseMove(event, d)).on("mouseout", (event, d) => this.handleMouseOut(event, d)).on("click", (event, d) => this.handleClick(event, d));
    this.svg.append("path").datum(topojson.mesh(countiesData, countiesData.objects.counties, (a, b) => a !== b)).attr("class", "county-border").attr("d", this.path);
    this.svg.append("path").datum(topojson.mesh(countiesData, countiesData.objects.counties, (a, b) => a === b)).attr("class", "state-border").attr("d", this.path);
    this.renderCountyCities(counties, countiesData);
    this.addLegend();
    this.addDataInfo();
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
    const dataSource = props.jobs_data_source || "Sample data";
    const lastUpdated = props.jobs_last_updated ? new Date(props.jobs_last_updated).toLocaleDateString() : "Unknown";
    this.tooltip.style("opacity", 1).html(`
                <div class="tooltip-title" style="font-weight: bold; font-size: 14px; margin-bottom: 8px; color: #2c3e50;">
                    ${props.name || d.id + " County"}
                </div>
                <div class="tooltip-content" style="line-height: 1.4; color: #34495e;">
                    <div><strong>Total Jobs:</strong> ${formatJobs(props.total_jobs)}</div>
                    <div style="font-size: 10px; color: #95a5a6; margin-bottom: 4px;">
                        ${dataSource} \u2022 Updated: ${lastUpdated}
                    </div>
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
    const props = d.properties || {};
    console.log("County clicked:", d);
    const formatPopulation = (num) => num ? num.toLocaleString("en-US") : "N/A";
    const formatArea = (num) => num ? num.toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + " sq mi" : "N/A";
    const formatPoverty = (num) => num ? num.toFixed(1) + "%" : "N/A";
    const formatIncome = (num) => num ? "$" + num.toLocaleString("en-US") : "N/A";
    const formatJobs = (num) => num ? num.toLocaleString("en-US") : "N/A";
    console.log(`
\u{1F4CD} ${props.name || d.id + " County"} Details:
\u{1F4BC} Total Jobs: ${formatJobs(props.total_jobs)} (${props.jobs_data_source || "Sample"})
\u{1F4C5} Last Updated: ${props.jobs_last_updated ? new Date(props.jobs_last_updated).toLocaleString() : "Unknown"}
\u{1F465} Population: ${formatPopulation(props.population)}
\u{1F3D9}\uFE0F Largest City: ${props.largest_city || "N/A"}
\u{1F4CF} Area: ${formatArea(props.area_sq_miles)}
\u{1F4CA} Poverty Rate: ${formatPoverty(props.poverty_rate)}
\u{1F4B0} Median Income: ${formatIncome(props.median_income)}
\u{1F3ED} Main Industry: ${props.main_industry || "N/A"}
        `);
  }
  addRefreshButton() {
    const button = d3.select("#map-container").append("button").attr("id", "refresh-data").style("position", "absolute").style("top", "20px").style("right", "20px").style("padding", "10px 15px").style("background", "#3498db").style("color", "white").style("border", "none").style("border-radius", "6px").style("cursor", "pointer").style("font-size", "14px").style("font-weight", "500").style("box-shadow", "0 2px 8px rgba(0, 0, 0, 0.15)").style("transition", "all 0.3s ease").text("\u{1F504} Refresh BLS Data").on("click", () => this.refreshData()).on("mouseover", function() {
      d3.select(this).style("background", "#2980b9");
    }).on("mouseout", function() {
      d3.select(this).style("background", "#3498db");
    });
  }
  async refreshData() {
    const button = d3.select("#refresh-data");
    button.text("\u{1F504} Refreshing...").style("background", "#95a5a6");
    try {
      await this.dataManager.forceRefresh();
      this.svg.selectAll("*").remove();
      await this.loadData();
      button.text("\u2705 Refreshed!").style("background", "#27ae60");
      setTimeout(() => {
        button.text("\u{1F504} Refresh BLS Data").style("background", "#3498db");
      }, 2e3);
    } catch (error) {
      console.error("Refresh failed:", error);
      button.text("\u274C Failed").style("background", "#e74c3c");
      setTimeout(() => {
        button.text("\u{1F504} Refresh BLS Data").style("background", "#3498db");
      }, 2e3);
    }
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
      legend.append("text").attr("x", 45).attr("y", y + 12).style("font-size", "14px").style("font-weight", "600").style("fill", "#2c3e50").text(range.label);
      legend.append("text").attr("x", 45).attr("y", y + 26).style("font-size", "11px").style("fill", "#7f8c8d").text(range.sublabel);
    });
    legend.append("text").attr("x", 90).attr("y", 230).style("text-anchor", "middle").style("font-size", "10px").style("fill", "#95a5a6").text("* Bureau of Labor Statistics");
    legend.append("text").attr("x", 90).attr("y", 245).style("text-anchor", "middle").style("font-size", "9px").style("fill", "#95a5a6").text("(August 2025)");
  }
  addDataInfo() {
    const dataInfo = this.dataManager.getDataInfo();
    const info = this.svg.append("g").attr("id", "data-info").attr("transform", `translate(${this.width - 250}, ${this.height - 60})`);
    info.append("rect").attr("x", 0).attr("y", 0).attr("width", 240).attr("height", 50).attr("rx", 6).style("fill", "rgba(255, 255, 255, 0.9)").style("stroke", "#ddd").style("stroke-width", 1);
    const lastUpdate = dataInfo.lastUpdate ? dataInfo.lastUpdate.toLocaleDateString() : "Never";
    info.append("text").attr("x", 120).attr("y", 18).style("text-anchor", "middle").style("font-size", "12px").style("font-weight", "600").style("fill", "#2c3e50").text("Data Status");
    info.append("text").attr("x", 120).attr("y", 35).style("text-anchor", "middle").style("font-size", "10px").style("fill", "#7f8c8d").text(`Last Updated: ${lastUpdate}`);
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
      if (screenCoords) {
        this.svg.append("circle").attr("class", "city-dot").attr("cx", screenCoords[0]).attr("cy", screenCoords[1]).attr("r", 2).style("fill", "#2c3e50").style("stroke", "white").style("stroke-width", 1).style("opacity", 0.8).append("title").text(`${county.properties.largest_city} (${county.properties.name})`);
      }
    });
  }
  showError(message) {
    d3.select("#map-container").append("div").attr("class", "error").style("position", "absolute").style("top", "50%").style("left", "50%").style("transform", "translate(-50%, -50%)").style("background", "rgba(231, 76, 60, 0.9)").style("color", "white").style("padding", "2rem").style("border-radius", "8px").style("text-align", "center").style("font-size", "1.2rem").style("max-width", "400px").text(message);
  }
};
document.addEventListener("DOMContentLoaded", () => {
  new CountiesMapBLS();
});
window.addEventListener("resize", () => {
  clearTimeout(window.resizeTimeout);
  window.resizeTimeout = setTimeout(() => {
    location.reload();
  }, 250);
});
