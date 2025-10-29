// Mock BLS API Service for testing when rate limited
class MockBLSApiService {
    constructor() {
        // Simulate realistic employment data for Colorado counties
        this.mockEmploymentData = {
            'Adams': 185000,
            'Alamosa': 8500,
            'Arapahoe': 295000,
            'Archuleta': 6200,
            'Baca': 1200,
            'Bent': 1400,
            'Boulder': 175000,
            'Broomfield': 42000,
            'Chaffee': 9800,
            'Cheyenne': 800,
            'Clear Creek': 4200,
            'Conejos': 2800,
            'Costilla': 1100,
            'Crowley': 2200,
            'Custer': 1800,
            'Delta': 14500,
            'Denver': 485000,
            'Dolores': 900,
            'Douglas': 165000,
            'Eagle': 32000,
            'El Paso': 315000,
            'Elbert': 8500,
            'Fremont': 18500,
            'Garfield': 28000,
            'Gilpin': 2800,
            'Grand': 9500,
            'Gunnison': 7200,
            'Hinsdale': 350,
            'Huerfano': 2400,
            'Jackson': 650,
            'Jefferson': 265000,
            'Kiowa': 550,
            'Kit Carson': 2800,
            'La Plata': 28500,
            'Lake': 3200,
            'Larimer': 185000,
            'Las Animas': 5500,
            'Lincoln': 2100,
            'Logan': 9800,
            'Mesa': 68000,
            'Mineral': 380,
            'Moffat': 5800,
            'Montezuma': 11200,
            'Montrose': 19500,
            'Morgan': 12500,
            'Otero': 7200,
            'Ouray': 2400,
            'Park': 8500,
            'Phillips': 1900,
            'Pitkin': 12500,
            'Prowers': 4800,
            'Pueblo': 68500,
            'Rio Blanco': 2800,
            'Rio Grande': 4200,
            'Routt': 15500,
            'Saguache': 2200,
            'San Juan': 280,
            'San Miguel': 4800,
            'Sedgwick': 950,
            'Summit': 18500,
            'Teller': 9200,
            'Washington': 1800,
            'Weld': 145000,
            'Yuma': 4200
        };
    }

    // Simulate API delay
    async delay(ms = 500) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Mock single county fetch
    async fetchCountyEmployment(countyName) {
        console.log(`🧪 MOCK API: Fetching ${countyName} employment data...`);
        await this.delay(300); // Simulate API delay

        const employment = this.mockEmploymentData[countyName];
        
        if (employment) {
            return {
                county: countyName,
                employment: employment,
                period: 'M10', // October
                year: '2024',
                lastUpdated: new Date().toISOString(),
                source: 'MOCK_BLS_API'
            };
        } else {
            return {
                county: countyName,
                employment: null,
                error: 'County not found in mock data',
                lastUpdated: new Date().toISOString()
            };
        }
    }

    // Mock bulk fetch (simulates the efficiency of bulk API)
    async fetchMultipleCountiesEmployment(countyNames) {
        console.log(`🧪 MOCK BULK API: Fetching ${countyNames.length} counties in one call...`);
        await this.delay(800); // Simulate single bulk API call delay

        const results = {};
        
        countyNames.forEach(countyName => {
            const employment = this.mockEmploymentData[countyName];
            
            if (employment) {
                results[countyName] = {
                    county: countyName,
                    employment: employment,
                    period: 'M10',
                    year: '2024',
                    lastUpdated: new Date().toISOString(),
                    source: 'MOCK_BLS_BULK_API'
                };
            } else {
                results[countyName] = {
                    county: countyName,
                    employment: null,
                    error: 'County not found in mock data',
                    lastUpdated: new Date().toISOString()
                };
            }
        });

        return results;
    }

    // Mock all counties fetch
    async fetchAllCountiesEmployment() {
        const counties = Object.keys(this.mockEmploymentData);
        const maxSeriesPerRequest = 50;
        const results = {};

        console.log(`🧪 MOCK: Fetching ${counties.length} counties using simulated bulk API...`);

        // Simulate chunking like real API
        const chunks = [];
        for (let i = 0; i < counties.length; i += maxSeriesPerRequest) {
            chunks.push(counties.slice(i, i + maxSeriesPerRequest));
        }

        console.log(`🧪 MOCK: Simulating ${chunks.length} bulk API calls...`);

        // Process each chunk
        for (let i = 0; i < chunks.length; i++) {
            const chunk = chunks[i];
            console.log(`🧪 MOCK API Call ${i + 1}/${chunks.length}: ${chunk.length} counties`);

            const chunkResults = await this.fetchMultipleCountiesEmployment(chunk);
            Object.assign(results, chunkResults);

            // Simulate small delay between calls
            if (i < chunks.length - 1) {
                console.log('🧪 MOCK: Simulating 1 second delay...');
                await this.delay(1000);
            }
        }

        const successCount = Object.values(results).filter(r => r.employment !== null).length;
        console.log(`🧪 MOCK: Completed ${successCount}/${counties.length} counties`);

        return results;
    }

    // Convert mock data to county format
    convertToCountyFormat(mockData) {
        const countyData = {};

        Object.entries(mockData).forEach(([countyName, data]) => {
            if (data.employment !== null) {
                countyData[countyName] = {
                    total_jobs: data.employment,
                    data_source: 'Mock BLS API (Rate Limited)',
                    last_updated: data.lastUpdated,
                    period: data.period,
                    year: data.year
                };
            }
        });

        return countyData;
    }

    // Get cached or mock data
    async getEmploymentData(forceRefresh = false) {
        console.log('🧪 Using MOCK BLS API due to rate limiting...');
        const mockData = await this.fetchAllCountiesEmployment();
        return mockData;
    }
}

export default MockBLSApiService;