# IconForge - Professional Icon Generator PWA

IconForge is a Progressive Web App that generates professional app icons from images and text. It supports multiple image formats (JPEG, PNG, BMP) and creates icons in various sizes with PWA manifest generation capabilities.

## Features

### 🖼️ **Multi-Format Support**
- Upload JPEG, JPG, PNG, and BMP images
- Drag-and-drop interface with visual feedback
- File validation and size limits (10MB max)

### ✏️ **Text-to-Icon Generation**
- Create icons from text (up to 3 characters)
- Customizable text and background colors
- Professional typography with Inter font

### 📐 **Multiple Icon Sizes**
- 16×16 to 1024×1024 pixels
- Standard app icon sizes for iOS, Android, and PWA
- Batch generation with preview

### 🎨 **Output Formats**
- PNG (default, best quality)
- JPEG (smaller file size)
- WebP (modern browsers)

### 📱 **PWA Features**
- Offline functionality with service worker
- Installable on devices
- Background sync capabilities
- IndexedDB storage for persistent data

### ♿ **Accessibility**
- WCAG AA compliance
- Keyboard navigation support
- Screen reader friendly
- High contrast mode support

## File Structure

```
iconforge/
├── index.html          # Main HTML structure
├── styles.css          # Complete CSS styling
├── script.js           # JavaScript functionality
├── service-worker.js   # PWA offline capabilities
├── manifest.json       # PWA manifest
└── README.md          # This file
```

## Installation

1. **Clone or download all files**
2. **Serve via HTTP server** (required for PWA features):
   ```bash
   # Using Python
   python -m http.server 8000

   # Using Node.js
   npx http-server

   # Using Live Server (VS Code)
   # Install Live Server extension and use "Go Live"
   ```
3. **Access the application** at `http://localhost:8000`

## Usage

### Upload Image Mode
1. Click "Upload Image" tab
2. Drag and drop an image or click to browse
3. Select desired icon sizes and output format
4. Generated icons appear in preview section
5. Download individual icons or all as ZIP

### Text Icon Mode
1. Click "Text Icon" tab
2. Enter text (maximum 3 characters)
3. Choose text and background colors
4. Click "Generate Text Icon"
5. Download generated icons

### PWA Features
1. **Install**: Click install button (appears when supported)
2. **Offline**: Works without internet after first load
3. **Manifest**: Generate PWA manifest.json for your app

## Technical Specifications

### Performance Budgets
- **Input feedback**: ≤100ms
- **Navigation transitions**: ≤1s  
- **Icon generation**: ≤10s (with progress indicators)

### Browser Support
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

### Storage
- **IndexedDB**: Persistent icon storage
- **Service Worker**: Asset caching
- **Local Storage**: User preferences

### Accessibility Features
- Semantic HTML5 structure
- ARIA labels for screen readers
- Keyboard navigation support
- Color contrast compliance (WCAG AA)
- Focus indicators

## API Reference

### Main Application Class
```javascript
class IconForgeApp {
  // Initialize application
  async init()

  // Process uploaded file
  async processFile(file)

  // Generate text-based icon
  async generateTextIcon()

  // Generate icons in multiple sizes
  async generateIcons(sourceImage, type)

  // Download all icons as ZIP
  async downloadAllIcons()

  // Generate PWA manifest
  generatePWAManifest()
}
```

### Service Worker Events
- `install`: Cache static assets
- `activate`: Clean up old caches
- `fetch`: Handle network requests with caching strategies
- `sync`: Background sync for offline actions

### IndexedDB Schema
```javascript
// Object Stores
'icons': {
  keyPath: 'id',
  indexes: ['timestamp', 'type']
}

'settings': {
  keyPath: 'key'
}
```

## Performance Optimizations

1. **Lazy Loading**: Icons generate on-demand
2. **Canvas Optimization**: High-quality image smoothing
3. **Efficient Caching**: Service worker with multiple strategies
4. **Progressive Enhancement**: Core functionality without JavaScript
5. **Responsive Design**: Optimized for all screen sizes

## Development

### Code Structure
- **HTML**: Semantic structure with accessibility
- **CSS**: Custom properties, responsive design
- **JavaScript**: ES6+, modular functions
- **Service Worker**: Advanced caching strategies

### Build Process
No build process required - vanilla HTML/CSS/JS implementation.

## Contributing

1. Fork the repository
2. Create feature branch
3. Test across multiple browsers
4. Ensure accessibility compliance
5. Submit pull request

## License

MIT License - feel free to use in your projects.

## Support

For issues or feature requests, please create an issue in the repository.

---

**IconForge** - Professional icon generation made simple.
