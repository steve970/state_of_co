// Automatic data updater service for keeping BLS data current
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import BLSApiService from './blsApi.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class DataUpdater {
    constructor() {
        this.blsService = new BLSApiService();
        this.isUpdating = false;
        this.lastUpdateTime = null;
        this.updateInterval = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
    }

    // Update both Colorado and Utah data
    async updateAllData() {
        if (this.isUpdating) {
            console.log('📊 Data update already in progress, skipping...');
            return;
        }

        this.isUpdating = true;
        console.log('🚀 Starting automatic data update...');

        try {
            // Update Colorado counties
            await this.updateColoradoData();
            
            // Update Utah counties  
            await this.updateUtahData();
            
            this.lastUpdateTime = new Date();
            console.log(`✅ Data update completed at ${this.lastUpdateTime.toISOString()}`);
            
        } catch (error) {
            console.error('❌ Data update failed:', error.message);
            console.log('📋 Continuing with existing data...');
        } finally {
            this.isUpdating = false;
        }
    }

    async updateColoradoData() {
        try {
            console.log('📡 Updating Colorado counties data...');
            
            const countiesPath = path.join(__dirname, '../../public/data/counties.json');
            const countiesData = JSON.parse(fs.readFileSync(countiesPath, 'utf8'));
            
            // Fetch latest BLS data for Colorado
            const employmentData = await this.blsService.fetchAllEmploymentData();
            
            let updatedCount = 0;
            
            // Update counties with fresh BLS data
            countiesData.objects.counties.geometries.forEach(county => {
                const countyName = county.properties.name.replace(' County', '');
                const blsData = employmentData[countyName];
                
                if (blsData && !blsData.error) {
                    county.properties.total_jobs = blsData.total_jobs;
                    county.properties.jobs_data_source = 'BLS API - Auto Updated';
                    county.properties.jobs_last_updated = blsData.lastUpdated;
                    county.properties.jobs_period = blsData.period;
                    county.properties.jobs_year = blsData.year;
                    updatedCount++;
                }
            });
            
            // Save updated data
            fs.writeFileSync(countiesPath, JSON.stringify(countiesData, null, 2));
            console.log(`✅ Updated ${updatedCount} Colorado counties with fresh BLS data`);
            
        } catch (error) {
            console.error('❌ Colorado data update failed:', error.message);
        }
    }

    async updateUtahData() {
        try {
            console.log('📡 Updating Utah counties data...');
            
            const utahPath = path.join(__dirname, '../../public/data/utah-counties.json');
            const utahData = JSON.parse(fs.readFileSync(utahPath, 'utf8'));
            
            // Fetch latest BLS data for Utah
            const employmentData = await this.blsService.fetchUtahEmploymentData();
            
            let updatedCount = 0;
            
            // Update counties with fresh BLS data
            utahData.objects.counties.geometries.forEach(county => {
                const countyName = county.properties.name.replace(' County', '');
                const blsData = employmentData[countyName];
                
                if (blsData && !blsData.error) {
                    county.properties.total_jobs = blsData.total_jobs;
                    county.properties.jobs_data_source = 'BLS API - Auto Updated';
                    county.properties.jobs_last_updated = blsData.lastUpdated;
                    county.properties.jobs_period = blsData.period;
                    county.properties.jobs_year = blsData.year;
                    updatedCount++;
                }
            });
            
            // Save updated data
            fs.writeFileSync(utahPath, JSON.stringify(utahData, null, 2));
            console.log(`✅ Updated ${updatedCount} Utah counties with fresh BLS data`);
            
        } catch (error) {
            console.error('❌ Utah data update failed:', error.message);
        }
    }

    // Check if data needs updating (older than 24 hours)
    needsUpdate() {
        if (!this.lastUpdateTime) return true;
        
        const timeSinceUpdate = Date.now() - this.lastUpdateTime.getTime();
        return timeSinceUpdate > this.updateInterval;
    }

    // Start periodic updates (optional - for long-running dynos)
    startPeriodicUpdates() {
        // Update immediately if needed
        if (this.needsUpdate()) {
            this.updateAllData();
        }

        // Set up periodic updates every 24 hours
        setInterval(() => {
            if (this.needsUpdate()) {
                this.updateAllData();
            }
        }, this.updateInterval);

        console.log('⏰ Periodic data updates enabled (every 24 hours)');
    }

    // Get update status for health checks
    getStatus() {
        return {
            isUpdating: this.isUpdating,
            lastUpdateTime: this.lastUpdateTime,
            needsUpdate: this.needsUpdate()
        };
    }
}

export { DataUpdater };