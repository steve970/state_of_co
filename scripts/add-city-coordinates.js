#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

// Load both data files
const statesData = JSON.parse(fs.readFileSync('public/data/states.json', 'utf8'));
const countiesData = JSON.parse(fs.readFileSync('public/data/counties.json', 'utf8'));

// Extract cities from states.json with their coordinates
const cityCoordinates = {};
statesData.objects.places.geometries.forEach(city => {
    cityCoordinates[city.properties.name] = city.coordinates;
});

console.log('Available cities with coordinates:');
Object.keys(cityCoordinates).forEach(city => {
    console.log(`- ${city}: [${cityCoordinates[city][0]}, ${cityCoordinates[city][1]}]`);
});

// Add coordinates to counties where we have matching cities
let matchedCount = 0;
let totalCount = 0;

countiesData.objects.counties.geometries.forEach(county => {
    totalCount++;
    const largestCity = county.properties.largest_city;
    
    if (cityCoordinates[largestCity]) {
        // Add city coordinates to county properties
        county.properties.city_coordinates = cityCoordinates[largestCity];
        matchedCount++;
        console.log(`✓ Matched ${county.properties.name}: ${largestCity} -> [${cityCoordinates[largestCity][0]}, ${cityCoordinates[largestCity][1]}]`);
    } else {
        console.log(`✗ No coordinates found for ${county.properties.name}: ${largestCity}`);
    }
});

// Write updated counties.json
fs.writeFileSync('public/data/counties.json', JSON.stringify(countiesData, null, 2));

console.log(`\n✅ Complete! Matched ${matchedCount} out of ${totalCount} counties.`);
console.log('Updated counties.json with city coordinates.');