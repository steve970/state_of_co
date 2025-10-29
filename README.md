# State of Colorado - Interactive Map Visualization

A modern, interactive web application for visualizing Colorado state and county data using D3.js v7 and Express.js.

## Features

- 🗺️ Interactive state map with clickable Colorado
- 🏘️ Detailed county-level visualization
- 📱 Responsive design for all devices
- 🎨 Modern UI with smooth animations
- 🔒 Security-first approach with Helmet.js
- ⚡ Performance optimized with compression
- 🛠️ Modern development tooling

## Tech Stack

- **Backend**: Node.js 18+, Express.js 4.19+
- **Frontend**: D3.js v7, Vanilla JavaScript (ES6+)
- **Build Tools**: ESBuild, PostCSS, Autoprefixer
- **Code Quality**: ESLint, Prettier
- **Security**: Helmet.js, CORS

## Quick Start

### Prerequisites
- Node.js 18.0.0 or higher
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/steve970/state_of_co.git
cd state_of_co

# Install dependencies
npm install

# Build assets
npm run build

# Start the server
npm start
```

### Development

```bash
# Start development server with auto-reload
npm run dev

# Build CSS and JS assets
npm run build

# Lint code
npm run lint

# Format code
npm run format
```

## Project Structure

```
├── src/
│   ├── server.js          # Express server with modern middleware
│   ├── client/            # Client-side JavaScript modules
│   │   ├── states.js      # States map visualization
│   │   └── counties.js    # Counties map visualization
│   └── styles/            # Source CSS files
│       ├── states.css     # States page styling
│       └── counties.css   # Counties page styling
├── public/                # Static assets (built)
│   ├── data/             # GeoJSON data files
│   ├── scripts/          # Built JavaScript files
│   └── styles/           # Built CSS files
├── views/                # HTML templates
│   └── pages/
│       ├── index.html    # States page
│       ├── counties.html # Counties page
│       └── 404.html      # Error page
└── package.json          # Dependencies and scripts
```

## API Endpoints

- `GET /` - States visualization page
- `GET /counties` - Counties visualization page
- `GET /health` - Health check endpoint
- `GET /data/states.json` - States GeoJSON data
- `GET /data/counties.json` - Counties GeoJSON data

## Modernization Changes

### From Legacy (v1.0.0) to Modern (v2.0.0):

1. **Dependencies Updated**:
   - Express 4.15.2 → 4.19.2
   - D3.js v3 → v7
   - Added security, performance, and development tools

2. **Code Modernization**:
   - `var` → `const`/`let`
   - ES6+ modules and classes
   - Async/await for data loading
   - Modern event handling

3. **Security Enhancements**:
   - Helmet.js for security headers
   - CORS configuration
   - Input validation and error handling

4. **Performance Improvements**:
   - Gzip compression
   - Optimized asset loading
   - Responsive design
   - Efficient D3.js patterns

5. **Developer Experience**:
   - ESLint and Prettier configuration
   - Build system with ESBuild and PostCSS
   - Hot reload development server
   - Modern project structure

## Browser Support

- Chrome 88+
- Firefox 85+
- Safari 14+
- Edge 88+

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## License

ISC License - see LICENSE file for details

## Author

Steve Hirschhorn - [GitHub](https://github.com/steve970)