/**
 * IconForge - Icon Generator PWA (Updated)
 * Fixed ZIP file generation and PWA installation functionality
 */

'use strict';

// Application state management
class IconForgeApp {
  constructor() {
    this.currentImage = null;
    this.generatedIcons = [];
    this.db = null;
    this.isOffline = !navigator.onLine;
    this.deferredPrompt = null;
    this.isInstallable = false;

    // Performance monitoring
    this.performanceMetrics = {
      tapToFeedback: 100, // ms
      navTransition: 1000, // ms
      blockingOperation: 10000 // ms
    };

    this.init();
  }

  /**
   * Initialize the application
   */
  async init() {
    try {
      await this.initIndexedDB();
      this.bindEventListeners();
      this.initPWAFeatures();
      await this.loadPersistedData();
      console.log('IconForge initialized successfully');
    } catch (error) {
      console.error('Failed to initialize IconForge:', error);
      this.showError('Failed to initialize application');
    }
  }

  /**
   * Initialize IndexedDB for offline storage
   */
  async initIndexedDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('IconForgeDB', 1);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Create object stores
        if (!db.objectStoreNames.contains('icons')) {
          const iconStore = db.createObjectStore('icons', { keyPath: 'id', autoIncrement: true });
          iconStore.createIndex('timestamp', 'timestamp', { unique: false });
          iconStore.createIndex('type', 'type', { unique: false });
        }

        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
        }
      };
    });
  }

  /**
   * Bind all event listeners
   */
  bindEventListeners() {
    // Tab navigation
    const tabBtns = document.querySelectorAll('.tab-btn');
    tabBtns.forEach(btn => {
      btn.addEventListener('click', (e) => this.switchTab(e));
    });

    // File upload
    const uploadArea = document.getElementById('uploadArea');
    const fileInput = document.getElementById('fileInput');

    if (uploadArea && fileInput) {
      uploadArea.addEventListener('click', () => fileInput.click());
      uploadArea.addEventListener('dragover', (e) => this.handleDragOver(e));
      uploadArea.addEventListener('dragleave', (e) => this.handleDragLeave(e));
      uploadArea.addEventListener('drop', (e) => this.handleFileDrop(e));
      fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
    }

    // Text icon generation
    const generateTextBtn = document.getElementById('generateTextIcon');
    if (generateTextBtn) {
      generateTextBtn.addEventListener('click', () => this.generateTextIcon());
    }

    // Download actions
    const downloadAllBtn = document.getElementById('downloadAll');
    const downloadIndividualBtn = document.getElementById('downloadIndividual');
    const generateManifestBtn = document.getElementById('generateManifest');

    if (downloadAllBtn) {
      downloadAllBtn.addEventListener('click', () => this.downloadAllIcons());
    }
    if (downloadIndividualBtn) {
      downloadIndividualBtn.addEventListener('click', () => this.toggleIndividualDownload());
    }
    if (generateManifestBtn) {
      generateManifestBtn.addEventListener('click', () => this.generatePWAManifest());
    }

    // Install PWA
    const installBtn = document.getElementById('installBtn');
    if (installBtn) {
      installBtn.addEventListener('click', () => this.installPWA());
    }

    // Settings changes
    const sizeCheckboxes = document.querySelectorAll('input[name="iconSize"]');
    const formatRadios = document.querySelectorAll('input[name="format"]');

    sizeCheckboxes.forEach(cb => cb.addEventListener('change', () => this.updateSettings()));
    formatRadios.forEach(radio => radio.addEventListener('change', () => this.updateSettings()));

    // Network status
    window.addEventListener('online', () => this.handleOnlineStatus(true));
    window.addEventListener('offline', () => this.handleOnlineStatus(false));

    // Keyboard accessibility
    document.addEventListener('keydown', (e) => this.handleKeyboardNavigation(e));
  }

  /**
   * Initialize PWA features with better error handling
   */
  initPWAFeatures() {
    // Handle install prompt
    window.addEventListener('beforeinstallprompt', (e) => {
      console.log('PWA install prompt available');
      e.preventDefault();
      this.deferredPrompt = e;
      this.isInstallable = true;
      this.showInstallButton();
      this.showInstallInstructions();
    });

    // Handle app installation
    window.addEventListener('appinstalled', () => {
      console.log('IconForge PWA installed successfully');
      this.hideInstallButton();
      this.hideInstallInstructions();
      this.showSuccess('IconForge installed successfully!');
      this.deferredPrompt = null;
    });

    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches || 
        window.navigator.standalone === true) {
      console.log('PWA is already installed');
      this.hideInstallButton();
      this.hideInstallInstructions();
    }
  }

  /**
   * Show install button
   */
  showInstallButton() {
    const installBtn = document.getElementById('installBtn');
    if (installBtn) {
      installBtn.style.display = 'flex';
      installBtn.setAttribute('aria-hidden', 'false');
    }
  }

  /**
   * Hide install button
   */
  hideInstallButton() {
    const installBtn = document.getElementById('installBtn');
    if (installBtn) {
      installBtn.style.display = 'none';
      installBtn.setAttribute('aria-hidden', 'true');
    }
  }

  /**
   * Show install instructions
   */
  showInstallInstructions() {
    const installSection = document.getElementById('installInstructions');
    if (installSection) {
      installSection.style.display = 'block';
    }
  }

  /**
   * Hide install instructions
   */
  hideInstallInstructions() {
    const installSection = document.getElementById('installInstructions');
    if (installSection) {
      installSection.style.display = 'none';
    }
  }

  /**
   * Switch between tabs with performance tracking
   * @param {Event} event - Click event
   */
  switchTab(event) {
    const startTime = performance.now();

    const clickedTab = event.currentTarget;
    const targetTab = clickedTab.dataset.tab;

    // Remove active states
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));

    // Add active states
    clickedTab.classList.add('active');
    const targetContent = document.getElementById(targetTab + '-tab');
    if (targetContent) {
      targetContent.classList.add('active');
    }

    const endTime = performance.now();
    const duration = endTime - startTime;

    if (duration > this.performanceMetrics.navTransition) {
      console.warn(`Tab switch exceeded budget: ${duration}ms`);
    }

    // Provide haptic feedback on supported devices
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }
  }

  /**
   * Handle file drag over
   * @param {DragEvent} event 
   */
  handleDragOver(event) {
    event.preventDefault();
    const uploadArea = document.getElementById('uploadArea');
    uploadArea.classList.add('dragover');
  }

  /**
   * Handle file drag leave
   * @param {DragEvent} event 
   */
  handleDragLeave(event) {
    event.preventDefault();
    const uploadArea = document.getElementById('uploadArea');
    uploadArea.classList.remove('dragover');
  }

  /**
   * Handle file drop with immediate feedback
   * @param {DragEvent} event 
   */
  handleFileDrop(event) {
    const startTime = performance.now();

    event.preventDefault();
    const uploadArea = document.getElementById('uploadArea');
    uploadArea.classList.remove('dragover');

    const files = event.dataTransfer.files;
    if (files.length > 0) {
      this.processFile(files[0]);
    }

    // Ensure feedback within 100ms
    const feedbackTime = performance.now() - startTime;
    if (feedbackTime < this.performanceMetrics.tapToFeedback) {
      setTimeout(() => this.showFeedback('File received'), 
                 this.performanceMetrics.tapToFeedback - feedbackTime);
    }
  }

  /**
   * Handle file selection
   * @param {Event} event 
   */
  handleFileSelect(event) {
    const file = event.target.files[0];
    if (file) {
      this.processFile(file);
    }
  }

  /**
   * Process uploaded file with progress indication
   * @param {File} file - Selected file
   */
  async processFile(file) {
    try {
      // Validate file type and size
      if (!this.validateFile(file)) {
        return;
      }

      this.showLoading('Processing image...', 0);

      // Create image from file
      this.updateProgress(20, 'Loading image...');
      const image = await this.createImageFromFile(file);
      this.currentImage = image;

      // Generate icons
      this.updateProgress(50, 'Generating icons...');
      await this.generateIcons(image);

      // Show preview
      this.updateProgress(90, 'Preparing preview...');
      this.showPreview();

      // Store in IndexedDB
      await this.storeImageData(file, image);

      this.updateProgress(100, 'Complete!');
      setTimeout(() => {
        this.hideLoading();
        this.showSuccess('Icons generated successfully!');
      }, 500);

    } catch (error) {
      console.error('File processing error:', error);
      this.hideLoading();
      this.showError('Failed to process image. Please try a different file.');
    }
  }

  /**
   * Update progress indicator
   * @param {number} percent - Progress percentage
   * @param {string} message - Progress message
   */
  updateProgress(percent, message) {
    const progressFill = document.getElementById('progressFill');
    const progressText = document.getElementById('progressText');
    const loadingText = document.querySelector('.loading-text');

    if (progressFill) {
      progressFill.style.width = `${percent}%`;
    }
    if (progressText) {
      progressText.textContent = `${percent}%`;
    }
    if (loadingText && message) {
      loadingText.textContent = message;
    }
  }

  /**
   * Validate uploaded file
   * @param {File} file - File to validate
   * @returns {boolean} - Is valid
   */
  validateFile(file) {
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/bmp'];
    const maxSize = 10 * 1024 * 1024; // 10MB

    if (!validTypes.includes(file.type)) {
      this.showError('Please select a valid image file (JPEG, PNG, BMP)');
      return false;
    }

    if (file.size > maxSize) {
      this.showError('File size must be less than 10MB');
      return false;
    }

    return true;
  }

  /**
   * Create image from file
   * @param {File} file - Image file
   * @returns {Promise<HTMLImageElement>} - Loaded image
   */
  createImageFromFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = e.target.result;
      };

      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  }

  /**
   * Generate text-based icon
   */
  async generateTextIcon() {
    try {
      const text = document.getElementById('iconText').value.trim();
      const textColor = document.getElementById('textColor').value;
      const bgColor = document.getElementById('bgColor').value;

      if (!text) {
        this.showError('Please enter text for the icon');
        return;
      }

      if (text.length > 3) {
        this.showError('Text must be 3 characters or less');
        return;
      }

      this.showLoading('Generating text icon...', 0);

      // Create text image
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      canvas.width = 512;
      canvas.height = 512;

      // Fill background
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, 512, 512);

      // Draw text
      ctx.fillStyle = textColor;
      ctx.font = 'bold 300px Inter, Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, 256, 256);

      // Convert to image
      const image = new Image();
      image.onload = async () => {
        this.currentImage = image;
        this.updateProgress(50, 'Generating icons...');
        await this.generateIcons(image, 'text');
        this.updateProgress(90, 'Preparing preview...');
        this.showPreview();
        this.updateProgress(100, 'Complete!');
        setTimeout(() => {
          this.hideLoading();
          this.showSuccess('Text icon generated successfully!');
        }, 500);
      };
      image.src = canvas.toDataURL();

    } catch (error) {
      console.error('Text icon generation error:', error);
      this.hideLoading();
      this.showError('Failed to generate text icon');
    }
  }

  /**
   * Generate icons in multiple sizes with progress tracking
   * @param {HTMLImageElement} sourceImage - Source image
   * @param {string} type - Icon type ('upload' or 'text')
   */
  async generateIcons(sourceImage, type = 'upload') {
    const selectedSizes = this.getSelectedSizes();
    const format = this.getSelectedFormat();

    this.generatedIcons = [];

    for (let i = 0; i < selectedSizes.length; i++) {
      const size = selectedSizes[i];
      const progress = 50 + (i / selectedSizes.length) * 30; // 50-80%
      this.updateProgress(progress, `Creating ${size}×${size} icon...`);

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      canvas.width = size;
      canvas.height = size;

      // Enable image smoothing for better quality
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // Draw resized image
      ctx.drawImage(sourceImage, 0, 0, size, size);

      // Convert to desired format
      let mimeType = 'image/png';
      let quality = 1.0;

      switch (format) {
        case 'jpeg':
          mimeType = 'image/jpeg';
          quality = 0.9;
          break;
        case 'webp':
          mimeType = 'image/webp';
          quality = 0.9;
          break;
      }

      const dataUrl = canvas.toDataURL(mimeType, quality);

      this.generatedIcons.push({
        size: size,
        format: format,
        dataUrl: dataUrl,
        type: type,
        timestamp: Date.now(),
        filename: `icon-${size}x${size}.${format}`
      });

      // Small delay to prevent UI blocking
      await new Promise(resolve => setTimeout(resolve, 10));
    }
  }

  /**
   * Get selected icon sizes
   * @returns {number[]} - Array of selected sizes
   */
  getSelectedSizes() {
    const checkboxes = document.querySelectorAll('input[name="iconSize"]:checked');
    return Array.from(checkboxes).map(cb => parseInt(cb.value));
  }

  /**
   * Get selected output format
   * @returns {string} - Selected format
   */
  getSelectedFormat() {
    const radio = document.querySelector('input[name="format"]:checked');
    return radio ? radio.value : 'png';
  }

  /**
   * Show icon preview with download buttons
   */
  showPreview() {
    const previewSection = document.getElementById('previewSection');
    const previewGrid = document.getElementById('previewGrid');

    // Clear existing previews
    previewGrid.innerHTML = '';

    // Create preview items
    this.generatedIcons.forEach((icon, index) => {
      const previewItem = document.createElement('div');
      previewItem.className = 'preview-item';

      previewItem.innerHTML = `
        <img src="${icon.dataUrl}" alt="Icon ${icon.size}x${icon.size}" class="preview-image" loading="lazy">
        <div class="preview-label">${icon.size}×${icon.size}</div>
        <div class="preview-size">${icon.format.toUpperCase()}</div>
        <button class="btn btn-secondary download-single" data-index="${index}" aria-label="Download ${icon.size}x${icon.size} icon">
          <i data-feather="download"></i>
          Download
        </button>
      `;

      previewGrid.appendChild(previewItem);
    });

    // Bind download single buttons
    document.querySelectorAll('.download-single').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const index = parseInt(e.currentTarget.dataset.index);
        this.downloadSingle(index);
      });
    });

    // Replace feather icons
    feather.replace();

    // Show preview section
    previewSection.style.display = 'block';
    previewSection.scrollIntoView({ behavior: 'smooth' });
  }

  /**
   * Download single icon
   * @param {number} index - Icon index
   */
  downloadSingle(index) {
    const icon = this.generatedIcons[index];
    if (!icon) return;

    // Convert data URL to blob for better download
    fetch(icon.dataUrl)
      .then(res => res.blob())
      .then(blob => {
        const link = document.createElement('a');
        link.download = icon.filename;
        link.href = URL.createObjectURL(blob);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);

        this.showSuccess(`Downloaded ${icon.filename}`);
      })
      .catch(error => {
        console.error('Download failed:', error);
        this.showError('Download failed');
      });
  }

  /**
   * Download all generated icons as a proper ZIP file using JSZip
   */
  async downloadAllIcons() {
    if (this.generatedIcons.length === 0) {
      this.showError('No icons to download');
      return;
    }

    // Check if JSZip is available
    if (typeof JSZip === 'undefined') {
      this.showError('JSZip library not loaded. Please refresh the page.');
      return;
    }

    try {
      this.showLoading('Creating ZIP file...', 0);

      // Create new JSZip instance
      const zip = new JSZip();

      // Add each icon to the ZIP
      for (let i = 0; i < this.generatedIcons.length; i++) {
        const icon = this.generatedIcons[i];
        const progress = (i / this.generatedIcons.length) * 80; // 0-80%
        this.updateProgress(progress, `Adding ${icon.filename}...`);

        // Convert data URL to binary data
        const response = await fetch(icon.dataUrl);
        const blob = await response.blob();

        // Add to ZIP
        zip.file(icon.filename, blob);

        // Small delay to prevent UI blocking
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      // Create manifest file
      this.updateProgress(85, 'Creating manifest...');
      const manifest = {
        name: "IconForge Generated Icons",
        generated: new Date().toISOString(),
        total_icons: this.generatedIcons.length,
        format: this.getSelectedFormat(),
        sizes: this.getSelectedSizes(),
        icons: this.generatedIcons.map(icon => ({
          filename: icon.filename,
          size: `${icon.size}x${icon.size}`,
          format: icon.format,
          type: icon.type
        }))
      };

      zip.file('manifest.json', JSON.stringify(manifest, null, 2));

      // Generate ZIP file
      this.updateProgress(90, 'Generating ZIP...');
      const zipBlob = await zip.generateAsync({
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 }
      });

      // Download ZIP
      this.updateProgress(95, 'Downloading...');
      const link = document.createElement('a');
      const timestamp = new Date().toISOString().slice(0, 16).replace(/[:-]/g, '');
      link.download = `iconforge-icons-${timestamp}.zip`;
      link.href = URL.createObjectURL(zipBlob);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Cleanup
      URL.revokeObjectURL(link.href);

      this.updateProgress(100, 'Complete!');
      setTimeout(() => {
        this.hideLoading();
        this.showSuccess(`ZIP file with ${this.generatedIcons.length} icons downloaded successfully!`);
      }, 500);

    } catch (error) {
      console.error('ZIP creation error:', error);
      this.hideLoading();
      this.showError('Failed to create ZIP file. Please try downloading individual icons.');
    }
  }

  /**
   * Toggle individual download mode
   */
  toggleIndividualDownload() {
    const downloadBtns = document.querySelectorAll('.download-single');
    const areVisible = downloadBtns.length > 0 && downloadBtns[0].style.display !== 'none';

    downloadBtns.forEach(btn => {
      btn.style.display = areVisible ? 'none' : 'flex';
    });

    const toggleBtn = document.getElementById('downloadIndividual');
    toggleBtn.querySelector('span').textContent = areVisible ? 'Show Download Buttons' : 'Hide Download Buttons';

    this.showFeedback(areVisible ? 'Download buttons hidden' : 'Download buttons shown');
  }

  /**
   * Generate PWA manifest file
   */
  generatePWAManifest() {
    if (this.generatedIcons.length === 0) {
      this.showError('Generate icons first');
      return;
    }

    const manifest = {
      name: "Your PWA Application",
      short_name: "PWA App",
      description: "Generated by IconForge - Professional Icon Generator",
      start_url: "/",
      display: "standalone",
      orientation: "portrait-primary",
      background_color: "#ffffff",
      theme_color: "#4F46E5",
      icons: this.generatedIcons
        .filter(icon => icon.size >= 72) // Only include icons 72px and larger for PWA
        .map(icon => ({
          src: icon.filename,
          sizes: `${icon.size}x${icon.size}`,
          type: `image/${icon.format}`,
          purpose: icon.size >= 192 ? "maskable any" : "any"
        }))
    };

    // Download manifest
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(manifest, null, 2));
    const link = document.createElement('a');
    link.href = dataStr;
    link.download = "manifest.json";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    this.showSuccess('PWA manifest.json generated and downloaded!');
  }

  /**
   * Install PWA with better error handling
   */
  async installPWA() {
    if (!this.deferredPrompt) {
      // Show manual installation instructions
      this.showInstallInstructions();
      this.showFeedback('Use your browser\'s install option or "Add to Home Screen"');
      return;
    }

    try {
      // Show the install prompt
      this.deferredPrompt.prompt();

      // Wait for user choice
      const result = await this.deferredPrompt.userChoice;

      if (result.outcome === 'accepted') {
        console.log('User accepted PWA install');
        this.showSuccess('Installing IconForge...');
      } else {
        console.log('User dismissed PWA install');
        this.showFeedback('Installation cancelled');
      }

      // Clear the prompt
      this.deferredPrompt = null;
      this.isInstallable = false;

    } catch (error) {
      console.error('PWA installation error:', error);
      this.showError('Installation failed. Try using your browser\'s install option.');
    }
  }

  /**
   * Update settings and persist to IndexedDB
   */
  async updateSettings() {
    const settings = {
      selectedSizes: this.getSelectedSizes(),
      outputFormat: this.getSelectedFormat(),
      timestamp: Date.now()
    };

    try {
      await this.storeSettings(settings);
      this.showFeedback('Settings saved');
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  }

  /**
   * Handle online/offline status
   * @param {boolean} isOnline - Connection status
   */
  handleOnlineStatus(isOnline) {
    this.isOffline = !isOnline;

    const statusMessage = isOnline ? 'Back online - full functionality restored' : 'Working offline - limited functionality';
    this.showFeedback(statusMessage);

    // Update footer text
    const footerText = document.querySelector('.footer__text');
    if (footerText) {
      footerText.textContent = `IconForge - Professional Icon Generator PWA • ${isOnline ? 'Online' : 'Offline'}`;
    }

    if (isOnline) {
      // Sync any pending data
      this.syncPendingData();
    }
  }

  /**
   * Handle keyboard navigation
   * @param {KeyboardEvent} event 
   */
  handleKeyboardNavigation(event) {
    // Tab navigation shortcuts
    if (event.ctrlKey || event.metaKey) {
      switch (event.key) {
        case '1':
          event.preventDefault();
          const uploadTab = document.querySelector('[data-tab="upload"]');
          if (uploadTab) uploadTab.click();
          break;
        case '2':
          event.preventDefault();
          const textTab = document.querySelector('[data-tab="text"]');
          if (textTab) textTab.click();
          break;
        case 'd':
          event.preventDefault();
          if (this.generatedIcons.length > 0) {
            this.downloadAllIcons();
          }
          break;
      }
    }

    // Escape key to close modals
    if (event.key === 'Escape') {
      this.hideLoading();
    }
  }

  /**
   * Store image data in IndexedDB
   * @param {File} file - Original file
   * @param {HTMLImageElement} image - Processed image
   */
  async storeImageData(file, image) {
    if (!this.db) return;

    try {
      const transaction = this.db.transaction(['icons'], 'readwrite');
      const store = transaction.objectStore('icons');

      const data = {
        filename: file.name,
        type: file.type,
        size: file.size,
        timestamp: Date.now(),
        imageData: image.src.substring(0, 1000) // Store preview only
      };

      await new Promise((resolve, reject) => {
        const request = store.add(data);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('Failed to store image data:', error);
    }
  }

  /**
   * Store settings in IndexedDB
   * @param {Object} settings - Settings object
   */
  async storeSettings(settings) {
    if (!this.db) return;

    try {
      const transaction = this.db.transaction(['settings'], 'readwrite');
      const store = transaction.objectStore('settings');

      await new Promise((resolve, reject) => {
        const request = store.put({ key: 'userSettings', ...settings });
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('Failed to store settings:', error);
    }
  }

  /**
   * Load persisted data from IndexedDB
   */
  async loadPersistedData() {
    if (!this.db) return;

    try {
      // Load settings
      const transaction = this.db.transaction(['settings'], 'readonly');
      const store = transaction.objectStore('settings');

      const settings = await new Promise((resolve, reject) => {
        const request = store.get('userSettings');
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });

      if (settings) {
        this.applySettings(settings);
      }
    } catch (error) {
      console.error('Failed to load persisted data:', error);
    }
  }

  /**
   * Apply loaded settings
   * @param {Object} settings - Settings to apply
   */
  applySettings(settings) {
    // Apply size selections
    if (settings.selectedSizes && settings.selectedSizes.length > 0) {
      const sizeCheckboxes = document.querySelectorAll('input[name="iconSize"]');
      sizeCheckboxes.forEach(cb => {
        cb.checked = settings.selectedSizes.includes(parseInt(cb.value));
      });
    }

    // Apply format selection
    if (settings.outputFormat) {
      const formatRadio = document.querySelector(`input[name="format"][value="${settings.outputFormat}"]`);
      if (formatRadio) {
        formatRadio.checked = true;
      }
    }
  }

  /**
   * Sync pending data when back online
   */
  async syncPendingData() {
    console.log('Syncing pending data...');
    // Implementation for syncing offline changes
  }

  /**
   * Show loading overlay with progress
   * @param {string} message - Loading message
   * @param {number} progress - Progress percentage
   */
  showLoading(message = 'Processing...', progress = 0) {
    const overlay = document.getElementById('loadingOverlay');
    const text = overlay.querySelector('.loading-text');

    text.textContent = message;
    this.updateProgress(progress, message);
    overlay.style.display = 'flex';
  }

  /**
   * Hide loading overlay
   */
  hideLoading() {
    const overlay = document.getElementById('loadingOverlay');
    overlay.style.display = 'none';
  }

  /**
   * Show success message
   * @param {string} message - Success message
   */
  showSuccess(message) {
    this.showNotification(message, 'success');
  }

  /**
   * Show error message
   * @param {string} message - Error message
   */
  showError(message) {
    this.showNotification(message, 'error');
  }

  /**
   * Show feedback message
   * @param {string} message - Feedback message
   */
  showFeedback(message) {
    this.showNotification(message, 'info');
  }

  /**
   * Show notification
   * @param {string} message - Notification message
   * @param {string} type - Notification type (success, error, info)
   */
  showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification--${type}`;
    notification.innerHTML = `
      <div class="notification__content">
        <i data-feather="${this.getNotificationIcon(type)}"></i>
        <span>${message}</span>
      </div>
    `;

    document.body.appendChild(notification);
    feather.replace();

    // Auto remove after 4 seconds
    setTimeout(() => {
      notification.classList.add('notification--fade');
      setTimeout(() => {
        if (document.body.contains(notification)) {
          document.body.removeChild(notification);
        }
      }, 300);
    }, 4000);
  }

  /**
   * Get notification icon based on type
   * @param {string} type - Notification type
   * @returns {string} - Feather icon name
   */
  getNotificationIcon(type) {
    switch (type) {
      case 'success': return 'check-circle';
      case 'error': return 'alert-circle';
      case 'info': return 'info';
      default: return 'info';
    }
  }
}

// Initialize app when DOM is loaded
let app;
document.addEventListener('DOMContentLoaded', () => {
  app = new IconForgeApp();
});

// Expose app globally for inline event handlers and debugging
window.app = app;

// Service Worker messaging
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('message', event => {
    const { type, data } = event.data;

    switch (type) {
      case 'SYNC_COMPLETE':
        console.log('Background sync completed:', data);
        if (app) {
          app.showFeedback('Data synced successfully');
        }
        break;

      case 'CACHE_SIZE':
        console.log('Cache size:', data.size);
        break;
    }
  });
}