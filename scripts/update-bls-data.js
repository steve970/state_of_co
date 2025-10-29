#!/usr/bin/env node

// Script to update counties.json with BLS employment data
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Simple BLS API service for Node.js environment
class BLSApiServiceNode {
    constructor() {
        this.baseUrl = 'https://api.bls.gov/publicAPI/v2/timeseries/data/';
        
        // Colorado county FIPS codes
        this.coloradoCounties = {
            'Adams': '08001', 'Alamosa': '08003', 'Arapahoe': '08005', 'Archuleta': '08007',
            'Baca': '08009', 'Bent': '08011', 'Boulder': '08013', 'Broomfield': '08014',
            'Chaffee': '08015', 'Cheyenne': '08017', 'Clear Creek': '08019', 'Conejos': '08021',
            'Costilla': '08023', 'Crowley': '08025', 'Custer': '08027', 'Delta': '08029',
            'Denver': '08031', 'Dolores': '08033', 'Douglas': '08035', 'Eagle': '08037',
            'El Paso': '08041', 'Elbert': '08039', 'Fremont': '08043', 'Garfield': '08045',
            'Gilpin': '08047', 'Grand': '08049', 'Gunnison': '08051', 'Hinsdale': '08053',
            'Huerfano': '08055', 'Jackson': '08057', 'Jefferson': '08059', 'Kiowa': '08061',
            'Kit Carson': '08063', 'La Plata': '08067', 'Lake': '08065', 'Larimer': '08069',
            'Las Animas': '08071', 'Lincoln': '08073', 'Logan': '08075', 'Mesa': '08077',
            'Mineral': '08079', 'Moffat': '08081', 'Montezuma': '08083', 'Montrose': '08085',
            'Morgan': '08087', 'Otero': '08089', 'Ouray': '08091', 'Park': '08093',
            'Phillips': '08095', 'Pitkin': '08097', 'Prowers': '08099', 'Pueblo': '08101',
            'Rio Blanco': '08103', 'Rio Grande': '08105', 'Routt': '08107', 'Saguache': '08109',
            'San Juan': '08111', 'San Miguel': '08113', 'Sedgwick': '08115', 'Summit': '08117',
            'Teller': '08119', 'Washington': '08121', 'Weld': '08123', 'Yuma': '08125'
        };
    }

    generateSeriesId(fipsCode) {
        return `LAUCN${fipsCode}0000000006`;
    }

    async fetchCountyEmployment(countyName) {
        const fipsCode = this.coloradoCounties[countyName];
        if (!fipsCode) {
            throw new Error(`FIPS code not found for county: ${countyName}`);
        }

        const seriesId = this.generateSeriesId(fipsCode);
        const currentYear = new Date().getFullYear();
        const lastYear = currentYear - 1;

        try {
            const requestBody = {
                seriesid: [seriesId],
                startyear: lastYear.toString(),
                endyear: currentYear.toString()
            };

            const response = await fetch(this.baseUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                throw new Error(`BLS API request failed: ${response.status}`);
            }

            const data = await response.json();
            
            if (data.status !== 'REQUEST_SUCCEEDED') {
                throw new Error(`BLS API error: ${data.message}`);
            }

            const series = data.Results.series[0];
            if (series && series.data && series.data.length > 0) {
                const latestData = series.data[0];
                return {
                    county: countyName,
                    employment: parseInt(latestData.value),
                    period: latestData.period,
                    year: latestData.year,
                    lastUpdated: new Date().toISOString()
                };
            } else {
                throw new Error(`No employment data found for ${countyName}`);
            }
        } catch (error) {
            console.error(`Error fetching data for ${countyName}:`, error.message);
            return null;
        }
    }

    async updateCountiesFile() {
        console.log('🔄 Starting BULK BLS data update for counties.json...');
        
        // Read existing counties.json
        const countiesPath = path.join(__dirname, '../public/data/counties.json');
        const countiesJson = JSON.parse(fs.readFileSync(countiesPath, 'utf8'));

        const counties = Object.keys(this.coloradoCounties);
        const maxSeriesPerRequest = 50;
        let successCount = 0;
        let failCount = 0;

        console.log(`📊 Fetching data for ${counties.length} counties using bulk API (max ${maxSeriesPerRequest} per call)...`);

        // Split into chunks for bulk requests
        const chunks = [];
        for (let i = 0; i < counties.length; i += maxSeriesPerRequest) {
            chunks.push(counties.slice(i, i + maxSeriesPerRequest));
        }

        console.log(`🚀 Making ${chunks.length} bulk API calls...`);

        // Process each chunk
        for (let i = 0; i < chunks.length; i++) {
            const chunk = chunks[i];
            console.log(`\n📡 API Call ${i + 1}/${chunks.length}: Processing ${chunk.length} counties...`);

            try {
                const chunkResults = await this.fetchMultipleCountiesEmployment(chunk);

                // Update counties.json with results
                Object.entries(chunkResults).forEach(([countyName, result]) => {
                    if (result && result.employment) {
                        // Find and update the county in the JSON
                        const countyGeometry = countiesJson.objects.counties.geometries.find(
                            geo => geo.id === countyName
                        );

                        if (countyGeometry) {
                            countyGeometry.properties = {
                                ...countyGeometry.properties,
                                total_jobs: result.employment,
                                jobs_data_source: 'BLS API',
                                jobs_last_updated: result.lastUpdated,
                                jobs_period: result.period,
                                jobs_year: result.year
                            };
                            successCount++;
                            console.log(`✅ ${countyName}: ${result.employment.toLocaleString()} jobs`);
                        }
                    } else {
                        failCount++;
                        console.log(`❌ ${countyName}: ${result?.error || 'No data'}`);
                    }
                });

                // Longer delay between API calls to avoid rate limiting
                if (i < chunks.length - 1) {
                    console.log('⏳ Waiting 10 seconds before next API call...');
                    await new Promise(resolve => setTimeout(resolve, 10000));
                }

            } catch (error) {
                console.error(`❌ Bulk API call ${i + 1} failed:`, error.message);
                failCount += chunk.length;
            }
        }

        // Write updated counties.json
        fs.writeFileSync(countiesPath, JSON.stringify(countiesJson, null, 2));

        console.log(`\n🎉 BULK BLS Data Update Complete:`);
        console.log(`✅ Successfully updated: ${successCount} counties`);
        console.log(`❌ Failed to update: ${failCount} counties`);
        console.log(`📁 Updated file: ${countiesPath}`);
        console.log(`\n💡 API calls used: ${chunks.length} (vs ${counties.length} with individual calls)`);

        return { successCount, failCount, totalCount: counties.length };
    }

    // Add bulk fetch method for command line script
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

        const requestBody = {
            seriesid: seriesIds,
            startyear: lastYear.toString(),
            endyear: currentYear.toString()
        };

        const response = await fetch(this.baseUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            throw new Error(`BLS API request failed: ${response.status}`);
        }

        const data = await response.json();
        
        if (data.status !== 'REQUEST_SUCCEEDED') {
            throw new Error(`BLS API error: ${data.message || 'Unknown error'}`);
        }

        // Process results
        const results = {};
        
        data.Results.series.forEach(series => {
            const fipsCode = series.seriesID.substring(5, 10);
            const countyName = Object.keys(this.coloradoCounties).find(
                name => this.coloradoCounties[name] === fipsCode
            );

            if (countyName && series.data && series.data.length > 0) {
                const latestData = series.data[0];
                results[countyName] = {
                    county: countyName,
                    employment: parseInt(latestData.value),
                    period: latestData.period,
                    year: latestData.year,
                    lastUpdated: new Date().toISOString()
                };
            } else if (countyName) {
                results[countyName] = {
                    county: countyName,
                    employment: null,
                    error: 'No data available',
                    lastUpdated: new Date().toISOString()
                };
            }
        });

        return results;
    }
}

// Run the update if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    const updater = new BLSApiServiceNode();
    
    updater.updateCountiesFile()
        .then(result => {
            console.log('\n🎉 Update completed successfully!');
            process.exit(0);
        })
        .catch(error => {
            console.error('\n💥 Update failed:', error);
            process.exit(1);
        });
}

export default BLSApiServiceNode;