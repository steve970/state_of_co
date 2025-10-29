#!/bin/bash

# Heroku deployment script with automatic data updates
echo "🚀 Deploying to Heroku with fresh data..."

# Build the latest assets
echo "📦 Building assets..."
npm run build

# Deploy to Heroku
echo "🌐 Pushing to Heroku..."
git add .
git commit -m "Deploy with latest data and assets" || echo "No changes to commit"
git push heroku main

# Wait for deployment to complete
echo "⏳ Waiting for deployment..."
sleep 10

# Trigger data refresh on the deployed app
echo "🔄 Refreshing data on production..."
heroku run npm run update-all-data || echo "Manual data update failed, will auto-update on next restart"

echo "✅ Deployment complete!"
echo "🌍 Your app: $(heroku info -s | grep web_url | cut -d= -f2)"