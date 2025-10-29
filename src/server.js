import express from 'express';
import helmet from 'helmet';
import compression from 'compression';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';
import { DataUpdater } from './services/dataUpdater.js';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://d3js.org"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// Performance middleware
app.use(compression());
app.use(cors());

// Static files
app.use(express.static(join(__dirname, '../public')));

// View engine setup
app.set('views', join(__dirname, '../views'));
app.set('view engine', 'html');
app.engine('html', (await import('ejs')).renderFile);

// Routes
app.get('/', (req, res) => {
  res.render('pages/index.html');
});

app.get('/counties', (req, res) => {
  res.render('pages/counties.html');
});

app.get('/counties-bls', (req, res) => {
  res.sendFile('test-bls.html', { root: '.' });
});

app.get('/counties-mock', (req, res) => {
  res.sendFile('test-mock-bls.html', { root: '.' });
});

// Health check endpoint
app.get('/utah-counties', (req, res) => {
  res.render('pages/utah-counties');
});

app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Manual data refresh endpoint (for admin use)
app.post('/api/refresh-data', async (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    try {
      const dataUpdater = new DataUpdater();
      await dataUpdater.updateAllData();
      res.json({ 
        success: true, 
        message: 'Data refresh completed',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({ 
        success: false, 
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  } else {
    res.json({ 
      success: false, 
      message: 'Data refresh only available in production mode' 
    });
  }
});

// Error handling
app.use((req, res) => {
  res.status(404).render('pages/404.html');
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

const server = app.listen(PORT, async () => {
  const actualPort = server.address().port;
  console.log(`🚀 Server running on port ${actualPort}`);
  console.log(`📍 Local: http://localhost:${actualPort}`);
  
  // Initialize data updater for fresh BLS data
  if (process.env.NODE_ENV === 'production') {
    console.log('🔄 Production mode: Starting automatic data update...');
    const dataUpdater = new DataUpdater();
    
    // Update data on startup (don't wait for it to complete)
    dataUpdater.updateAllData().catch(error => {
      console.error('⚠️  Startup data update failed, using existing data:', error.message);
    });
    
    // Start periodic updates for long-running dynos
    dataUpdater.startPeriodicUpdates();
    
    // Add health check endpoint for data status
    app.get('/api/data-status', (req, res) => {
      res.json(dataUpdater.getStatus());
    });
  } else {
    console.log('🔧 Development mode: Skipping automatic data updates');
  }
});