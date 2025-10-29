// Data Manager for handling employment data updates
import BLSApiService from './blsApi.js';

class DataManager {
    constructor() {
        this.blsService = new BLSApiService();
        this.isUpdating = false;
    }

    // Update counties.json with fresh BLS data
    async updateCountiesWithBLSData() {
        if (this.isUpdating) {
            console.log('Data update already in progress...');
            return false;
        }

        this.isUpdating = true;
        
        try {
            console.log('🔄 Starting BLS data update...');
            
            // Fetch fresh employment data
            const blsData = await this.blsService.getEmploymentData(false);
            const employmentData = this.blsService.convertToCountyFormat(blsData);

            // Load existing counties data
            const response = await fetch('/data/counties.json');
            const countiesJson = await response.json();

            // Update each county with BLS employment data
            let updatedCount = 0;
            countiesJson.objects.counties.geometries = countiesJson.objects.counties.geometries.map(county => {
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

            // Store updated data in localStorage for client-side use
            localStorage.setItem('updated_counties_data', JSON.stringify(countiesJson));
            localStorage.setItem('data_update_timestamp', new Date().toISOString());

            console.log(`✅ Successfully updated ${updatedCount} counties with BLS data`);
            return countiesJson;

        } catch (error) {
            console.error('❌ Error updating counties with BLS data:', error);
            throw error;
        } finally {
            this.isUpdating = false;
        }
    }

    // Get the most current counties data (updated or original)
    async getCurrentCountiesData() {
        // Check if we have updated data in localStorage
        const updatedData = localStorage.getItem('updated_counties_data');
        const updateTimestamp = localStorage.getItem('data_update_timestamp');

        if (updatedData && updateTimestamp) {
            const updateAge = Date.now() - new Date(updateTimestamp).getTime();
            const maxAge = 24 * 60 * 60 * 1000; // 24 hours

            if (updateAge < maxAge) {
                console.log('📊 Using updated BLS data from cache');
                return JSON.parse(updatedData);
            }
        }

        // Fall back to original data and trigger update
        console.log('📊 Using original data, triggering BLS update...');
        const response = await fetch('/data/counties.json');
        const originalData = await response.json();

        // Trigger background update (don't wait for it)
        this.updateCountiesWithBLSData().catch(error => {
            console.error('Background BLS update failed:', error);
        });

        return originalData;
    }

    // Force refresh all data
    async forceRefresh() {
        console.log('🔄 Force refreshing all employment data...');
        
        // Clear cache
        localStorage.removeItem('bls_employment_data');
        localStorage.removeItem('bls_employment_timestamp');
        localStorage.removeItem('updated_counties_data');
        localStorage.removeItem('data_update_timestamp');

        // Fetch fresh data
        return await this.updateCountiesWithBLSData();
    }

    // Get data freshness info
    getDataInfo() {
        const blsTimestamp = localStorage.getItem('bls_employment_timestamp');
        const updateTimestamp = localStorage.getItem('data_update_timestamp');

        return {
            blsDataAge: blsTimestamp ? Date.now() - parseInt(blsTimestamp) : null,
            lastUpdate: updateTimestamp ? new Date(updateTimestamp) : null,
            isUpdating: this.isUpdating
        };
    }

    // Schedule automatic updates
    startAutoUpdate(intervalHours = 24) {
        const intervalMs = intervalHours * 60 * 60 * 1000;
        
        setInterval(async () => {
            console.log('🕐 Scheduled BLS data update starting...');
            try {
                await this.updateCountiesWithBLSData();
                console.log('✅ Scheduled update completed');
            } catch (error) {
                console.error('❌ Scheduled update failed:', error);
            }
        }, intervalMs);

        console.log(`⏰ Auto-update scheduled every ${intervalHours} hours`);
    }
}

export default DataManager;