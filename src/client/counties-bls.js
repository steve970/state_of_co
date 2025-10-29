// Modern D3.js v7 implementation with BLS API integration
import DataManager from '../services/dataManager.js';

class CountiesMapBLS {
    constructor() {
        this.width = Math.min(1500, window.innerWidth - 40);
        this.height = Math.min(700, window.innerHeight - 100);
        this.svg = null;
        this.projection = null;
        this.path = null;
        this.tooltip = null;
        this.dataManager = new DataManager();

        // Color scale for choropleth (jobs-based)
        this.colorScale = d3.scaleLinear()
            .domain([0, 500000]) // Will be updated with actual data range
            .range(['#BFD3E6', '#88419D']);

        this.init();
    }

    init() {
        // Show loading indicator
        this.showLoading('Loading BLS employment data...');

        // Create SVG container
        this.svg = d3.select('#map-container')
            .append('svg')
            .attr('width', this.width)
            .attr('height', this.height)
            .attr('viewBox', `0 0 ${this.width} ${this.height}`)
            .style('max-width', '100%')
            .style('height', 'auto');

        // Set up Colorado-specific projection
        this.projection = d3.geoConicConformal()
            .parallels([39 + 43 / 60, 40 + 47 / 60])
            .rotate([105 + 0 / 60, -39 - 0 / 60])
            .scale(5000)
            .translate([this.width / 2, this.height / 2]);

        this.path = d3.geoPath()
            .projection(this.projection);

        // Initialize tooltip
        this.tooltip = d3.select('#tooltip');

        // Add refresh button
        this.addRefreshButton();

        this.loadData();
    }

    showLoading(message) {
        const loading = d3.select('#map-container')
            .append('div')
            .attr('id', 'loading')
            .style('position', 'absolute')
            .style('top', '50%')
            .style('left', '50%')
            .style('transform', 'translate(-50%, -50%)')
            .style('background', 'rgba(255, 255, 255, 0.9)')
            .style('padding', '2rem')
            .style('border-radius', '8px')
            .style('box-shadow', '0 4px 12px rgba(0, 0, 0, 0.15)')
            .style('text-align', 'center')
            .style('font-size', '1.2rem')
            .style('color', '#2c3e50');

        loading.append('div')
            .style('margin-bottom', '1rem')
            .text(message);

        // Add spinner
        loading.append('div')
            .style('width', '40px')
            .style('height', '40px')
            .style('border', '4px solid #f3f3f3')
            .style('border-top', '4px solid #3498db')
            .style('border-radius', '50%')
            .style('animation', 'spin 1s linear infinite')
            .style('margin', '0 auto');

        // Add CSS animation for spinner
        if (!document.getElementById('spinner-style')) {
            const style = document.createElement('style');
            style.id = 'spinner-style';
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
        const loading = document.getElementById('loading');
        if (loading) loading.remove();
    }

    async loadData() {
        try {
            // Get current counties data (with BLS updates if available)
            const countiesData = await this.dataManager.getCurrentCountiesData();
            this.hideLoading();
            this.renderMap(countiesData);
        } catch (error) {
            console.error('Error loading counties data:', error);
            this.hideLoading();
            this.showError('Failed to load counties data: ' + error.message);
        }
    }

    renderMap(countiesData) {
        const counties = topojson.feature(countiesData, countiesData.objects.counties);

        // Calculate job data range for color scale
        const jobCounts = counties.features.map(d => d.properties?.total_jobs || 0);
        const minJobs = Math.min(...jobCounts);
        const maxJobs = Math.max(...jobCounts);
        
        // Update color scale domain with actual data range
        this.colorScale.domain([minJobs, maxJobs]);

        // Render counties
        this.svg.append('g')
            .attr('class', 'colorado')
            .selectAll('path')
            .data(counties.features)
            .enter()
            .append('path')
            .attr('d', this.path)
            .attr('id', d => d.id)
            .style('fill', 'white')
            .style('stroke', '#999')
            .style('stroke-width', 0.5)
            .style('cursor', 'pointer')
            .on('mouseover', (event, d) => this.handleMouseOver(event, d))
            .on('mousemove', (event, d) => this.handleMouseMove(event, d))
            .on('mouseout', (event, d) => this.handleMouseOut(event, d))
            .on('click', (event, d) => this.handleClick(event, d));

        // County borders
        this.svg.append('path')
            .datum(topojson.mesh(countiesData, countiesData.objects.counties, (a, b) => a !== b))
            .attr('class', 'county-border')
            .attr('d', this.path);

        // State border
        this.svg.append('path')
            .datum(topojson.mesh(countiesData, countiesData.objects.counties, (a, b) => a === b))
            .attr('class', 'state-border')
            .attr('d', this.path);

        // Add city dots for counties that have coordinates
        this.renderCountyCities(counties, countiesData);

        this.addLegend();
        this.addDataInfo();
    }

    handleMouseOver(event, d) {
        // Show county color based on job count
        const jobs = d.properties?.total_jobs || 0;
        const jobColor = jobs > 0 ? this.colorScale(jobs) : '#f0f0f0';
        
        d3.select(event.currentTarget)
            .style('fill', jobColor)
            .style('stroke', '#000')
            .style('stroke-width', 1.5);

        // Show tooltip with formatted data
        const props = d.properties || {};
        
        // Format numbers properly
        const formatPopulation = (num) => num ? num.toLocaleString('en-US') : 'N/A';
        const formatArea = (num) => num ? num.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + ' sq mi' : 'N/A';
        const formatPoverty = (num) => num ? num.toFixed(1) + '%' : 'N/A';
        const formatIncome = (num) => num ? '$' + num.toLocaleString('en-US') : 'N/A';
        const formatJobs = (num) => num ? num.toLocaleString('en-US') : 'N/A';
        
        // Format data source and update info
        const dataSource = props.jobs_data_source || 'Sample data';
        const lastUpdated = props.jobs_last_updated ? 
            new Date(props.jobs_last_updated).toLocaleDateString() : 'Unknown';
        
        this.tooltip
            .style('opacity', 1)
            .html(`
                <div class="tooltip-title" style="font-weight: bold; font-size: 14px; margin-bottom: 8px; color: #2c3e50;">
                    ${props.name || d.id + ' County'}
                </div>
                <div class="tooltip-content" style="line-height: 1.4; color: #34495e;">
                    <div><strong>Total Jobs:</strong> ${formatJobs(props.total_jobs)}</div>
                    <div style="font-size: 10px; color: #95a5a6; margin-bottom: 4px;">
                        ${dataSource} • Updated: ${lastUpdated}
                    </div>
                    <div><strong>Population:</strong> ${formatPopulation(props.population)}</div>
                    <div><strong>Largest City:</strong> ${props.largest_city || 'N/A'}</div>
                    <div><strong>Area:</strong> ${formatArea(props.area_sq_miles)}</div>
                    <div><strong>Poverty Rate:</strong> ${formatPoverty(props.poverty_rate)}</div>
                    <div><strong>Median Income:</strong> ${formatIncome(props.median_income)}</div>
                    <div><strong>Main Industry:</strong> ${props.main_industry || 'N/A'}</div>
                </div>
            `);
    }

    handleMouseMove(event, d) {
        this.tooltip
            .style('left', (event.pageX + 10) + 'px')
            .style('top', (event.pageY - 10) + 'px');
    }

    handleMouseOut(event, d) {
        // Reset county appearance back to white
        d3.select(event.currentTarget)
            .style('fill', 'white')
            .style('stroke', '#999')
            .style('stroke-width', 0.5);

        // Hide tooltip
        this.tooltip.style('opacity', 0);
    }

    handleClick(event, d) {
        const props = d.properties || {};
        console.log('County clicked:', d);
        
        // Format numbers for console output
        const formatPopulation = (num) => num ? num.toLocaleString('en-US') : 'N/A';
        const formatArea = (num) => num ? num.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + ' sq mi' : 'N/A';
        const formatPoverty = (num) => num ? num.toFixed(1) + '%' : 'N/A';
        const formatIncome = (num) => num ? '$' + num.toLocaleString('en-US') : 'N/A';
        const formatJobs = (num) => num ? num.toLocaleString('en-US') : 'N/A';
        
        // Show detailed info in console
        console.log(`
📍 ${props.name || d.id + ' County'} Details:
💼 Total Jobs: ${formatJobs(props.total_jobs)} (${props.jobs_data_source || 'Sample'})
📅 Last Updated: ${props.jobs_last_updated ? new Date(props.jobs_last_updated).toLocaleString() : 'Unknown'}
👥 Population: ${formatPopulation(props.population)}
🏙️ Largest City: ${props.largest_city || 'N/A'}
📏 Area: ${formatArea(props.area_sq_miles)}
📊 Poverty Rate: ${formatPoverty(props.poverty_rate)}
💰 Median Income: ${formatIncome(props.median_income)}
🏭 Main Industry: ${props.main_industry || 'N/A'}
        `);
    }

    addRefreshButton() {
        const button = d3.select('#map-container')
            .append('button')
            .attr('id', 'refresh-data')
            .style('position', 'absolute')
            .style('top', '20px')
            .style('right', '20px')
            .style('padding', '10px 15px')
            .style('background', '#3498db')
            .style('color', 'white')
            .style('border', 'none')
            .style('border-radius', '6px')
            .style('cursor', 'pointer')
            .style('font-size', '14px')
            .style('font-weight', '500')
            .style('box-shadow', '0 2px 8px rgba(0, 0, 0, 0.15)')
            .style('transition', 'all 0.3s ease')
            .text('🔄 Refresh BLS Data')
            .on('click', () => this.refreshData())
            .on('mouseover', function() {
                d3.select(this).style('background', '#2980b9');
            })
            .on('mouseout', function() {
                d3.select(this).style('background', '#3498db');
            });
    }

    async refreshData() {
        const button = d3.select('#refresh-data');
        button.text('🔄 Refreshing...').style('background', '#95a5a6');

        try {
            await this.dataManager.forceRefresh();
            
            // Clear existing map
            this.svg.selectAll('*').remove();
            
            // Reload with fresh data
            await this.loadData();
            
            button.text('✅ Refreshed!').style('background', '#27ae60');
            setTimeout(() => {
                button.text('🔄 Refresh BLS Data').style('background', '#3498db');
            }, 2000);
            
        } catch (error) {
            console.error('Refresh failed:', error);
            button.text('❌ Failed').style('background', '#e74c3c');
            setTimeout(() => {
                button.text('🔄 Refresh BLS Data').style('background', '#3498db');
            }, 2000);
        }
    }

    addLegend() {
        const legend = this.svg.append('g')
            .attr('id', 'legend')
            .attr('transform', `translate(30, 80)`);

        // Add background for better readability
        legend.append('rect')
            .attr('x', -20)
            .attr('y', -40)
            .attr('width', 220)
            .attr('height', 300)
            .attr('rx', 8)
            .style('fill', 'rgba(255, 255, 255, 0.95)')
            .style('stroke', '#ddd')
            .style('stroke-width', 1);

        // Title
        legend.append('text')
            .attr('x', 90)
            .attr('y', -10)
            .style('text-anchor', 'middle')
            .style('font-size', '16px')
            .style('font-weight', 'bold')
            .style('fill', '#2c3e50')
            .text('Employment Level');

        // Subtitle
        legend.append('text')
            .attr('x', 90)
            .attr('y', 8)
            .style('text-anchor', 'middle')
            .style('font-size', '12px')
            .style('fill', '#7f8c8d')
            .text('(Hover over counties)');

        // Create color swatches with labels
        const [minJobs, maxJobs] = this.colorScale.domain();
        const jobRanges = [
            { min: minJobs, max: 50000, label: 'Low', sublabel: '< 50K jobs', color: '#BFD3E6' },
            { min: 50000, max: 150000, label: 'Medium', sublabel: '50K - 150K', color: '#9BB3D9' },
            { min: 150000, max: 300000, label: 'High', sublabel: '150K - 300K', color: '#7A8FCC' },
            { min: 300000, max: maxJobs, label: 'Very High', sublabel: '300K+ jobs', color: '#88419D' }
        ];

        jobRanges.forEach((range, i) => {
            const y = 40 + (i * 45);
            
            // Color swatch
            legend.append('rect')
                .attr('x', 10)
                .attr('y', y)
                .attr('width', 25)
                .attr('height', 25)
                .attr('rx', 3)
                .style('fill', range.color)
                .style('stroke', '#666')
                .style('stroke-width', 0.5);

            // Main label
            legend.append('text')
                .attr('x', 45)
                .attr('y', y + 12)
                .style('font-size', '14px')
                .style('font-weight', '600')
                .style('fill', '#2c3e50')
                .text(range.label);

            // Sub label
            legend.append('text')
                .attr('x', 45)
                .attr('y', y + 26)
                .style('font-size', '11px')
                .style('fill', '#7f8c8d')
                .text(range.sublabel);
        });

        // Data source note
        legend.append('text')
            .attr('x', 90)
            .attr('y', 230)
            .style('text-anchor', 'middle')
            .style('font-size', '10px')
            .style('fill', '#95a5a6')
            .text('* Bureau of Labor Statistics');

        // Date note
        legend.append('text')
            .attr('x', 90)
            .attr('y', 245)
            .style('text-anchor', 'middle')
            .style('font-size', '9px')
            .style('fill', '#95a5a6')
            .text('(August 2025)');
    }

    addDataInfo() {
        const dataInfo = this.dataManager.getDataInfo();
        
        const info = this.svg.append('g')
            .attr('id', 'data-info')
            .attr('transform', `translate(${this.width - 250}, ${this.height - 60})`);

        // Background
        info.append('rect')
            .attr('x', 0)
            .attr('y', 0)
            .attr('width', 240)
            .attr('height', 50)
            .attr('rx', 6)
            .style('fill', 'rgba(255, 255, 255, 0.9)')
            .style('stroke', '#ddd')
            .style('stroke-width', 1);

        // Data freshness info
        const lastUpdate = dataInfo.lastUpdate ? 
            dataInfo.lastUpdate.toLocaleDateString() : 'Never';
        
        info.append('text')
            .attr('x', 120)
            .attr('y', 18)
            .style('text-anchor', 'middle')
            .style('font-size', '12px')
            .style('font-weight', '600')
            .style('fill', '#2c3e50')
            .text('Data Status');

        info.append('text')
            .attr('x', 120)
            .attr('y', 35)
            .style('text-anchor', 'middle')
            .style('font-size', '10px')
            .style('fill', '#7f8c8d')
            .text(`Last Updated: ${lastUpdate}`);
    }

    renderCountyCities(counties, countiesData) {
        // Filter counties that have city coordinates
        const countiesWithCities = counties.features.filter(d => 
            d.properties.city_coordinates && d.properties.largest_city
        );

        // Get the transform from states.json (we still need this for coordinate conversion)
        const statesTransform = {
            "scale": [0.002038506576897769, 0.0013674284622462395],
            "translate": [-114.82210811499999, 31.327184550000112]
        };
        
        countiesWithCities.forEach(county => {
            const coords = county.properties.city_coordinates;
            
            // Apply states.json transform to get geographic coordinates
            const lon = coords[0] * statesTransform.scale[0] + statesTransform.translate[0];
            const lat = coords[1] * statesTransform.scale[1] + statesTransform.translate[1];
            
            // Project to screen coordinates
            const screenCoords = this.projection([lon, lat]);
            
            if (screenCoords) {
                // Render city dot as circle
                this.svg.append('circle')
                    .attr('class', 'city-dot')
                    .attr('cx', screenCoords[0])
                    .attr('cy', screenCoords[1])
                    .attr('r', 2)
                    .style('fill', '#2c3e50')
                    .style('stroke', 'white')
                    .style('stroke-width', 1)
                    .style('opacity', 0.8)
                    .append('title')
                    .text(`${county.properties.largest_city} (${county.properties.name})`);
            }
        });
    }

    showError(message) {
        d3.select('#map-container')
            .append('div')
            .attr('class', 'error')
            .style('position', 'absolute')
            .style('top', '50%')
            .style('left', '50%')
            .style('transform', 'translate(-50%, -50%)')
            .style('background', 'rgba(231, 76, 60, 0.9)')
            .style('color', 'white')
            .style('padding', '2rem')
            .style('border-radius', '8px')
            .style('text-align', 'center')
            .style('font-size', '1.2rem')
            .style('max-width', '400px')
            .text(message);
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new CountiesMapBLS();
});

// Handle window resize
window.addEventListener('resize', () => {
    clearTimeout(window.resizeTimeout);
    window.resizeTimeout = setTimeout(() => {
        location.reload();
    }, 250);
});