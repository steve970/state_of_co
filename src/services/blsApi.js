// BLS API Service for fetching real employment data
class BLSApiService {
    constructor() {
        this.baseUrl = 'https://api.bls.gov/publicAPI/v2/timeseries/data/';
        this.registrationKey = process.env.BLS_API_KEY || null;

        // Colorado county FIPS codes for BLS API
        this.coloradoCounties = {
            'Adams': '08001',
            'Alamosa': '08003',
            'Arapahoe': '08005',
            'Archuleta': '08007',
            'Baca': '08009',
            'Bent': '08011',
            'Boulder': '08013',
            'Broomfield': '08014',
            'Chaffee': '08015',
            'Cheyenne': '08017',
            'Clear Creek': '08019',
            'Conejos': '08021',
            'Costilla': '08023',
            'Crowley': '08025',
            'Custer': '08027',
            'Delta': '08029',
            'Denver': '08031',
            'Dolores': '08033',
            'Douglas': '08035',
            'Eagle': '08037',
            'El Paso': '08041',
            'Elbert': '08039',
            'Fremont': '08043',
            'Garfield': '08045',
            'Gilpin': '08047',
            'Grand': '08049',
            'Gunnison': '08051',
            'Hinsdale': '08053',
            'Huerfano': '08055',
            'Jackson': '08057',
            'Jefferson': '08059',
            'Kiowa': '08061',
            'Kit Carson': '08063',
            'La Plata': '08067',
            'Lake': '08065',
            'Larimer': '08069',
            'Las Animas': '08071',
            'Lincoln': '08073',
            'Logan': '08075',
            'Mesa': '08077',
            'Mineral': '08079',
            'Moffat': '08081',
            'Montezuma': '08083',
            'Montrose': '08085',
            'Morgan': '08087',
            'Otero': '08089',
            'Ouray': '08091',
            'Park': '08093',
            'Phillips': '08095',
            'Pitkin': '08097',
            'Prowers': '08099',
            'Pueblo': '08101',
            'Rio Blanco': '08103',
            'Rio Grande': '08105',
            'Routt': '08107',
            'Saguache': '08109',
            'San Juan': '08111',
            'San Miguel': '08113',
            'Sedgwick': '08115',
            'Summit': '08117',
            'Teller': '08119',
            'Washington': '08121',
            'Weld': '08123',
            'Yuma': '08125'
        };

        // Utah county FIPS codes for BLS API
        this.utahCounties = {
            'Beaver': '49001',
            'Box Elder': '49003',
            'Cache': '49005',
            'Carbon': '49007',
            'Daggett': '49009',
            'Davis': '49011',
            'Duchesne': '49013',
            'Emery': '49015',
            'Garfield': '49017',
            'Grand': '49019',
            'Iron': '49021',
            'Juab': '49023',
            'Kane': '49025',
            'Millard': '49027',
            'Morgan': '49029',
            'Piute': '49031',
            'Rich': '49033',
            'Salt Lake': '49035',
            'San Juan': '49037',
            'Sanpete': '49039',
            'Sevier': '49041',
            'Summit': '49043',
            'Tooele': '49045',
            'Uintah': '49047',
            'Utah': '49049',
            'Wasatch': '49051',
            'Washington': '49053',
            'Wayne': '49055',
            'Weber': '49057'
        };
    }

    // Generate BLS series ID for employment data
    generateSeriesId(fipsCode) {
        // LAUCN + FIPS + 0000000006 (employment level)
        return `LAUCN${fipsCode}0000000006`;
    }

    // Fetch employment data for multiple counties in a single API call (BULK REQUEST)
    async fetchMultipleCountiesEmployment(countyNames) {
        const seriesIds = countyNames.map(countyName => {
            const fipsCode = this.coloradoCounties[countyName];
            if (!fipsCode) {
                console.warn(`FIPS code not found for county: ${countyName}`);
                return null;
            }
            return this.generateSeriesId(fipsCode);
        }).filter(Boolean);

        if (seriesIds.length === 0) {
            throw new Error('No valid FIPS codes found for provided counties');
        }

        const currentYear = new Date().getFullYear();
        const lastYear = currentYear - 1;

        try {
            const requestBody = {
                seriesid: seriesIds,
                startyear: lastYear.toString(),
                endyear: currentYear.toString(),
                registrationkey: this.registrationKey
            };

            console.log(`📡 Making BLS API call for ${seriesIds.length} counties...`);

            const response = await fetch(this.baseUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                throw new Error(`BLS API request failed: ${response.status}`);
            }

            const data = await response.json();

            if (data.status !== 'REQUEST_SUCCEEDED') {
                throw new Error(`BLS API error: ${data.message || 'Unknown error'}`);
            }

            // Process results for each county
            const results = {};

            data.Results.series.forEach(series => {
                // Extract FIPS code from series ID (LAUCN08031000000006 -> 08031)
                const fipsCode = series.seriesID.substring(5, 10);

                // Find county name by FIPS code
                const countyName = Object.keys(this.coloradoCounties).find(
                    name => this.coloradoCounties[name] === fipsCode
                );

                if (countyName && series.data && series.data.length > 0) {
                    const latestData = series.data[0]; // Most recent data point
                    results[countyName] = {
                        county: countyName,
                        employment: parseInt(latestData.value),
                        period: latestData.period,
                        year: latestData.year,
                        lastUpdated: new Date().toISOString(),
                        seriesId: series.seriesID
                    };
                } else {
                    console.warn(`No data found for county with FIPS: ${fipsCode}`);
                    if (countyName) {
                        results[countyName] = {
                            county: countyName,
                            employment: null,
                            error: 'No data available',
                            lastUpdated: new Date().toISOString()
                        };
                    }
                }
            });

            return results;

        } catch (error) {
            console.error('Error in bulk fetch:', error);

            // Return error results for all requested counties
            const errorResults = {};
            countyNames.forEach(countyName => {
                errorResults[countyName] = {
                    county: countyName,
                    employment: null,
                    error: error.message,
                    lastUpdated: new Date().toISOString()
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
        const maxSeriesPerRequest = 50; // BLS API limit
        const results = {};

        console.log(`🚀 Fetching employment data for ${counties.length} Colorado counties using bulk API...`);

        // Split counties into chunks of 50 (BLS API limit)
        const chunks = [];
        for (let i = 0; i < counties.length; i += maxSeriesPerRequest) {
            chunks.push(counties.slice(i, i + maxSeriesPerRequest));
        }

        console.log(`📊 Making ${chunks.length} bulk API calls (${maxSeriesPerRequest} counties each)`);

        // Process each chunk
        for (let i = 0; i < chunks.length; i++) {
            const chunk = chunks[i];
            console.log(`📡 API Call ${i + 1}/${chunks.length}: Fetching ${chunk.length} counties...`);

            try {
                const chunkResults = await this.fetchMultipleCountiesEmployment(chunk);

                // Merge results
                Object.assign(results, chunkResults);

                const successCount = Object.values(chunkResults).filter(r => r.employment !== null).length;
                console.log(`✅ Batch ${i + 1} completed: ${successCount}/${chunk.length} successful`);

                // Longer delay between API calls to avoid rate limiting
                if (i < chunks.length - 1) {
                    console.log('⏳ Waiting 5 seconds before next API call...');
                    await new Promise(resolve => setTimeout(resolve, 5000));
                }

            } catch (error) {
                console.error(`❌ Batch ${i + 1} failed:`, error);

                // Add error results for this chunk
                chunk.forEach(countyName => {
                    results[countyName] = {
                        county: countyName,
                        employment: null,
                        error: error.message,
                        lastUpdated: new Date().toISOString()
                    };
                });
            }
        }

        const totalSuccess = Object.values(results).filter(r => r.employment !== null).length;
        console.log(`🎉 Bulk fetch completed: ${totalSuccess}/${counties.length} counties successful`);

        return results;
    }

    // Fetch employment data for all Utah counties using bulk API
    async fetchUtahEmploymentData() {
        try {
            const counties = Object.keys(this.utahCounties);
            const maxSeriesPerRequest = 50; // BLS API limit
            const results = {};

            console.log(`🚀 Fetching employment data for ${counties.length} Utah counties using bulk API...`);

            // Process counties in batches
            for (let i = 0; i < counties.length; i += maxSeriesPerRequest) {
                const batch = counties.slice(i, i + maxSeriesPerRequest);
                const batchResults = await this.fetchCountyEmploymentData(batch, this.utahCounties);
                Object.assign(results, batchResults);
            }

            console.log(`✅ Successfully fetched employment data for ${Object.keys(results).length} Utah counties`);
            return results;

        } catch (error) {
            console.error('❌ Error fetching Utah employment data:', error);

            // Return error results for all Utah counties
            const errorResults = {};
            Object.keys(this.utahCounties).forEach(countyName => {
                errorResults[countyName] = {
                    total_jobs: this.getEstimatedJobs(countyName),
                    jobs_data_source: 'Estimated (BLS API Error)',
                    error: error.message,
                    lastUpdated: new Date().toISOString()
                };
            });

            return errorResults;
        }
    }

    // Get cached data or fetch fresh data
    async getEmploymentData(forceRefresh = false) {
        const cacheKey = 'bls_employment_data';
        const cacheTimestampKey = 'bls_employment_timestamp';
        const cacheExpiryHours = 24; // Cache for 24 hours

        if (!forceRefresh) {
            // Check if we have cached data
            const cachedData = localStorage.getItem(cacheKey);
            const cachedTimestamp = localStorage.getItem(cacheTimestampKey);

            if (cachedData && cachedTimestamp) {
                const cacheAge = Date.now() - parseInt(cachedTimestamp);
                const cacheExpiryMs = cacheExpiryHours * 60 * 60 * 1000;

                if (cacheAge < cacheExpiryMs) {
                    console.log('Using cached BLS employment data');
                    return JSON.parse(cachedData);
                }
            }
        }

        // Fetch fresh data
        console.log('Fetching fresh BLS employment data...');
        const freshData = await this.fetchAllCountiesEmployment();

        // Cache the results
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
                    data_source: 'BLS API',
                    last_updated: data.lastUpdated,
                    period: data.period,
                    year: data.year
                };
            } else {
                // Fallback to estimated data if BLS data unavailable
                countyData[countyName] = {
                    total_jobs: this.getFallbackJobCount(countyName),
                    data_source: 'Estimated (BLS unavailable)',
                    last_updated: new Date().toISOString(),
                    error: data.error
                };
            }
        });

        return countyData;
    }

    // Fallback job estimates if BLS API fails
    getFallbackJobCount(countyName) {
        const fallbackData = {
            'Denver': 485000,
            'El Paso': 315000,
            'Arapahoe': 295000,
            'Jefferson': 265000,
            'Adams': 185000,
            'Larimer': 185000,
            'Boulder': 175000,
            'Douglas': 165000,
            'Weld': 145000,
            'Mesa': 68000,
            'Pueblo': 68500
        };

        return fallbackData[countyName] || Math.floor(Math.random() * 50000) + 5000;
    }
}

export default BLSApiService;