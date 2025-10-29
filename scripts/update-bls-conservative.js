#!/usr/bin/env node

// Conservative BLS update - smaller batches with verified counties
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const API_KEY = '1f9c37cfa2a6420fb9e95e0a14895486';
const BASE_URL = 'https://api.bls.gov/publicAPI/v2/timeseries/data/';

// Colorado counties with verified FIPS codes
const coloradoCounties = {
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
    'Elbert': '08039',
    'El Paso': '08041',
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
    'Lake': '08065',
    'La Plata': '08067',
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

async function fetchCountyBatch(countyNames) {
    const seriesIds = countyNames.map(name => {
        const fips = coloradoCounties[name];
        return `LAUCN${fips}0000000006`;
    });

    const currentYear = new Date().getFullYear();
    const lastYear = currentYear - 1;

    const requestBody = {
        seriesid: seriesIds,
        startyear: lastYear.toString(),
        endyear: currentYear.toString(),
        registrationkey: API_KEY
    };

    const response = await fetch(BASE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    
    if (data.status !== 'REQUEST_SUCCEEDED') {
        throw new Error(`BLS API: ${data.message}`);
    }

    // Process results
    const results = {};
    data.Results.series.forEach(series => {
        const fipsCode = series.seriesID.substring(5, 10);
        const countyName = Object.keys(coloradoCounties).find(
            name => coloradoCounties[name] === fipsCode
        );

        if (countyName && series.data && series.data.length > 0) {
            const latestData = series.data[0];
            results[countyName] = {
                employment: parseInt(latestData.value),
                period: latestData.period,
                year: latestData.year,
                periodName: latestData.periodName,
                lastUpdated: new Date().toISOString()
            };
        }
    });

    return results;
}

async function updateAllCountiesConservative() {
    console.log('🔄 Starting CONSERVATIVE BLS update...');
    
    const countiesPath = path.join(__dirname, '../public/data/counties.json');
    const countiesJson = JSON.parse(fs.readFileSync(countiesPath, 'utf8'));

    const allCounties = Object.keys(coloradoCounties);
    const batchSize = 10; // Smaller batches
    let totalSuccess = 0;
    let totalFailed = 0;

    console.log(`📊 Processing ${allCounties.length} counties in batches of ${batchSize}...`);

    // Process in smaller batches
    for (let i = 0; i < allCounties.length; i += batchSize) {
        const batch = allCounties.slice(i, i + batchSize);
        const batchNum = Math.floor(i / batchSize) + 1;
        const totalBatches = Math.ceil(allCounties.length / batchSize);

        console.log(`\n📡 Batch ${batchNum}/${totalBatches}: ${batch.join(', ')}`);

        try {
            const results = await fetchCountyBatch(batch);
            
            // Update counties.json
            Object.entries(results).forEach(([countyName, data]) => {
                const countyGeometry = countiesJson.objects.counties.geometries.find(
                    geo => geo.id === countyName
                );

                if (countyGeometry) {
                    countyGeometry.properties = {
                        ...countyGeometry.properties,
                        total_jobs: data.employment,
                        jobs_data_source: 'BLS API',
                        jobs_last_updated: data.lastUpdated,
                        jobs_period: data.period,
                        jobs_year: data.year,
                        jobs_period_name: data.periodName
                    };
                    totalSuccess++;
                    console.log(`✅ ${countyName}: ${data.employment.toLocaleString()} jobs (${data.periodName} ${data.year})`);
                }
            });

            // Delay between batches
            if (i + batchSize < allCounties.length) {
                console.log('⏳ Waiting 3 seconds before next batch...');
                await new Promise(resolve => setTimeout(resolve, 3000));
            }

        } catch (error) {
            console.error(`❌ Batch ${batchNum} failed:`, error.message);
            totalFailed += batch.length;
        }
    }

    // Save updated data
    fs.writeFileSync(countiesPath, JSON.stringify(countiesJson, null, 2));

    console.log(`\n🎉 CONSERVATIVE UPDATE COMPLETE:`);
    console.log(`✅ Successfully updated: ${totalSuccess} counties`);
    console.log(`❌ Failed to update: ${totalFailed} counties`);
    console.log(`📊 Success rate: ${((totalSuccess / allCounties.length) * 100).toFixed(1)}%`);
    console.log(`📁 Updated: ${countiesPath}`);

    return { totalSuccess, totalFailed };
}

updateAllCountiesConservative()
    .then(result => {
        console.log('\n🚀 Update completed! Check your counties map for real BLS data.');
    })
    .catch(error => {
        console.error('\n💥 Update failed:', error);
    });