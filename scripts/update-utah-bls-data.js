#!/usr/bin/env node

// Update Utah counties with real BLS employment data
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import BLS API service
import { BLSApiService } from '../src/services/blsApi.js';

async function updateUtahCountiesWithBLS() {
    try {
        console.log('🚀 Starting Utah BLS data update...');
        
        // Load current Utah counties data
        const countiesPath = path.join(__dirname, '../public/data/utah-counties.json');
        const countiesData = JSON.parse(fs.readFileSync(countiesPath, 'utf8'));
        
        // Initialize BLS API service
        const blsService = new BLSApiService();
        
        // Fetch Utah employment data
        console.log('📡 Fetching Utah employment data from BLS API...');
        const employmentData = await blsService.fetchUtahEmploymentData();
        
        // Update counties with BLS data
        let updatedCount = 0;
        countiesData.objects.counties.geometries.forEach(county => {
            const countyName = county.properties.name.replace(' County', '');
            const blsData = employmentData[countyName];
            
            if (blsData) {
                // Update with BLS data
                county.properties.total_jobs = blsData.total_jobs;
                county.properties.jobs_data_source = blsData.jobs_data_source || 'BLS API';
                county.properties.jobs_last_updated = blsData.lastUpdated;
                county.properties.jobs_period = blsData.period;
                county.properties.jobs_year = blsData.year;
                
                if (blsData.error) {
                    county.properties.jobs_error = blsData.error;
                }
                
                updatedCount++;
                console.log(`✅ Updated ${countyName} County: ${blsData.total_jobs?.toLocaleString()} jobs`);
            } else {
                console.log(`⚠️  No BLS data found for ${countyName} County`);
            }
        });
        
        // Save updated data
        fs.writeFileSync(countiesPath, JSON.stringify(countiesData, null, 2));
        
        console.log(`\n🎉 Utah BLS update complete!`);
        console.log(`📊 Updated ${updatedCount} out of ${countiesData.objects.counties.geometries.length} counties`);
        console.log(`💾 Saved to: ${countiesPath}`);
        
    } catch (error) {
        console.error('❌ Error updating Utah counties with BLS data:', error);
        process.exit(1);
    }
}

// Run the update
updateUtahCountiesWithBLS();