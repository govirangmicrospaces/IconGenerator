/**
 * IconForge - Icon Generator PWA (Complete with Font Controls)
 * Includes ZIP file generation, PWA installation, and typography customization
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
      tapToFeedback: 100,
      navTransition: 1000,
      blockingOperation: 10000
    };

    // Font weight name mappings
    this.fontWeightNames = {
      100: 'Thin',
      200: 'Extra Light',
      300: 'Light',
      400: 'Normal',
      500: 'Medium',
      600: 'Semi Bold',
      700: 'Bold',
      800: 'Extra Bold',
      900: 'Black'
    };

    this.init();
  }

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

    // Font weight slider with live update
    const weightInput = document.getElementById('fontWeight');
    const weightValue = document.getElementById('fontWeightValue');
    const weightName = document.getElementById('fontWeightName');

    if (weightInput && weightValue) {
      weightInput.addEventListener('input', () => {
        const weight = weightInput.value;
        weightValue.textContent = weight;
        if (weightName) {
          weightName.textContent = this.fontWeightNames[weight] || '';
        }
      });
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

  initPWAFeatures() {
    window.addEventListener('beforeinstallprompt', (e) => {
      console.log('PWA install prompt available');
      e.preventDefault();
      this.deferredPrompt = e;
      this.isInstallable = true;
      this.showInstallButton();
      this.showInstallInstructions();
    });

    window.addEventListener('appinstalled', () => {
      console.log('IconForge PWA installed successfully');
      this.hideInstallButton();
      this.hideInstallInstructions();
      this.showSuccess('IconForge installed successfully!');
      this.deferredPrompt = null;
    });

    if (window.matchMedia('(display-mode: standalone)').matches || 
        window.navigator.standalone === true) {
      console.log('PWA is already installed');
      this.hideInstallButton();
      this.hideInstallInstructions();
    }
  }

  showInstallButton() {
    const installBtn = document.getElementById('installBtn');
    if (installBtn) {
      installBtn.style.display = 'flex';
      installBtn.setAttribute('aria-hidden', 'false');
    }
  }

  hideInstallButton() {
    const installBtn = document.getElementById('installBtn');
    if (installBtn) {
      installBtn.style.display = 'none';
      installBtn.setAttribute('aria-hidden', 'true');
    }
  }

  showInstallInstructions() {
    const installSection = document.getElementById('installInstructions');
    if (installSection) {
      installSection.style.display = 'block';
    }
  }

  hideInstallInstructions() {
    const installSection = document.getElementById('installInstructions');
    if (installSection) {
      installSection.style.display = 'none';
    }
  }

  switchTab(event) {
    const startTime = performance.now();

    const clickedTab = event.currentTarget;
    const targetTab = clickedTab.dataset.tab;

    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));

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

    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }
  }

  handleDragOver(event) {
    event.preventDefault();
    const uploadArea = document.getElementById('uploadArea');
    uploadArea.classList.add('dragover');
  }

  handleDragLeave(event) {
    event.preventDefault();
    const uploadArea = document.getElementById('uploadArea');
    uploadArea.classList.remove('dragover');
  }

  handleFileDrop(event) {
    const startTime = performance.now();

    event.preventDefault();
    const uploadArea = document.getElementById('uploadArea');
    uploadArea.classList.remove('dragover');

    const files = event.dataTransfer.files;
    if (files.length > 0) {
      this.processFile(files[0]);
    }

    const feedbackTime = performance.now() - startTime;
    if (feedbackTime < this.performanceMetrics.tapToFeedback) {
      setTimeout(() => this.showFeedback('File received'), 
                 this.performanceMetrics.tapToFeedback - feedbackTime);
    }
  }

  handleFileSelect(event) {
    const file = event.target.files[0];
    if (file) {
      this.processFile(file);
    }
  }

  async processFile(file) {
    try {
      if (!this.validateFile(file)) {
        return;
      }

      this.showLoading('Processing image...', 0);

      this.updateProgress(20, 'Loading image...');
      const image = await this.createImageFromFile(file);
      this.currentImage = image;

      this.updateProgress(50, 'Generating icons...');
      await this.generateIcons(image);

      this.updateProgress(90, 'Preparing preview...');
      this.showPreview();

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

  validateFile(file) {
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/bmp'];
    const maxSize = 50 * 1024 * 1024;

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
   * Generate text-based icon with font customization
   */
  async generateTextIcon() {
    try {
      const text = document.getElementById('iconText').value.trim();
      const textColor = document.getElementById('textColor').value;
      const bgColor = document.getElementById('bgColor').value;
      const fontFamily = document.getElementById('fontFamily')?.value || 'Inter, Arial, sans-serif';
      const fontStyle = document.getElementById('fontStyle')?.value || 'normal';
      let fontWeight = parseInt(document.getElementById('fontWeight')?.value || '700', 10);
      fontWeight = Math.min(900, Math.max(100, Math.round(fontWeight / 100) * 100));

      if (!text) {
        this.showError('Please enter text for the icon');
        return;
      }

      if (text.length > 3) {
        this.showError('Text must be 3 characters or less');
        return;
      }

      this.showLoading('Generating text icon...', 10);

      // Wait for fonts to be ready
      if (document.fonts?.ready) {
        await document.fonts.ready;
      }

      const baseSize = 512;
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = baseSize;
      canvas.height = baseSize;

      // Background fill
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, baseSize, baseSize);

      // Text properties
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = textColor;

      // Fit font size to canvas with padding
      const padding = 48;
      const fittedPx = this.fitTextToCanvas(
        ctx, 
        text, 
        baseSize - 2 * padding, 
        baseSize - 2 * padding, 
        fontStyle, 
        fontWeight, 
        fontFamily
      );

      ctx.font = this.buildCanvasFont(fontStyle, fontWeight, fittedPx, fontFamily);

      // Draw text centered
      ctx.fillText(text, baseSize / 2, baseSize / 2);

      // Convert to image
      const image = new Image();
      image.onload = async () => {
        this.currentImage = image;
        this.updateProgress(60, 'Generating icons...');
        await this.generateIcons(image, 'text');
        this.updateProgress(95, 'Preparing preview...');
        this.showPreview();
        this.updateProgress(100, 'Complete!');
        setTimeout(() => {
          this.hideLoading();
          this.showSuccess('Text icon generated successfully!');
        }, 250);
      };
      image.src = canvas.toDataURL();

    } catch (error) {
      console.error('Text icon generation error:', error);
      this.hideLoading();
      this.showError('Failed to generate text icon');
    }
  }

  /**
   * Build CSS font string for canvas
   */
  buildCanvasFont(style, weight, sizePx, family) {
    return `${style} ${weight} ${Math.max(12, Math.floor(sizePx))}px ${family}`;
  }

  /**
   * Fit text to canvas using binary search and measureText
   */
  fitTextToCanvas(ctx, text, maxW, maxH, style, weight, family) {
    let lo = 12;
    let hi = 420;
    let best = lo;

    for (let i = 0; i < 14; i++) {
      const mid = Math.floor((lo + hi) / 2);
      ctx.font = `${style} ${weight} ${mid}px ${family}`;
      const metrics = ctx.measureText(text);
      const width = metrics.width;
      const ascent = metrics.actualBoundingBoxAscent ?? mid * 0.8;
      const descent = metrics.actualBoundingBoxDescent ?? mid * 0.2;
      const height = ascent + descent;

      if (width <= maxW && height <= maxH) {
        best = mid;
        lo = mid + 1;
      } else {
        hi = mid - 1;
      }
    }
    return best;
  }

  async generateIcons(sourceImage, type = 'upload') {
    const selectedSizes = this.getSelectedSizes();
    const format = this.getSelectedFormat();

    this.generatedIcons = [];

    for (let i = 0; i < selectedSizes.length; i++) {
      const size = selectedSizes[i];
      const progress = 50 + (i / selectedSizes.length) * 30;
      this.updateProgress(progress, `Creating ${size}×${size} icon...`);

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      canvas.width = size;
      canvas.height = size;

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      ctx.drawImage(sourceImage, 0, 0, size, size);

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

      await new Promise(resolve => setTimeout(resolve, 10));
    }
  }

  getSelectedSizes() {
    const checkboxes = document.querySelectorAll('input[name="iconSize"]:checked');
    return Array.from(checkboxes).map(cb => parseInt(cb.value));
  }

  getSelectedFormat() {
    const radio = document.querySelector('input[name="format"]:checked');
    return radio ? radio.value : 'png';
  }

  showPreview() {
    const previewSection = document.getElementById('previewSection');
    const previewGrid = document.getElementById('previewGrid');

    previewGrid.innerHTML = '';

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

    document.querySelectorAll('.download-single').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const index = parseInt(e.currentTarget.dataset.index);
        this.downloadSingle(index);
      });
    });

    feather.replace();

    previewSection.style.display = 'block';
    previewSection.scrollIntoView({ behavior: 'smooth' });
  }

  downloadSingle(index) {
    const icon = this.generatedIcons[index];
    if (!icon) return;

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

  async downloadAllIcons() {
    if (this.generatedIcons.length === 0) {
      this.showError('No icons to download');
      return;
    }

    if (typeof JSZip === 'undefined') {
      this.showError('JSZip library not loaded. Please refresh the page.');
      return;
    }

    try {
      this.showLoading('Creating ZIP file...', 0);

      const zip = new JSZip();

      for (let i = 0; i < this.generatedIcons.length; i++) {
        const icon = this.generatedIcons[i];
        const progress = (i / this.generatedIcons.length) * 80;
        this.updateProgress(progress, `Adding ${icon.filename}...`);

        const response = await fetch(icon.dataUrl);
        const blob = await response.blob();

        zip.file(icon.filename, blob);

        await new Promise(resolve => setTimeout(resolve, 50));
      }

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

      this.updateProgress(90, 'Generating ZIP...');
      const zipBlob = await zip.generateAsync({
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 }
      });

      this.updateProgress(95, 'Downloading...');
      const link = document.createElement('a');
      const timestamp = new Date().toISOString().slice(0, 16).replace(/[:-]/g, '');
      link.download = `iconforge-icons-${timestamp}.zip`;
      link.href = URL.createObjectURL(zipBlob);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

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

  toggleIndividualDownload() {
    const downloadBtns = document.querySelectorAll('.download-single');
    const areVisible = downloadBtns.length > 0 && downloadBtns[0].style.display !== 'none';

    downloadBtns.forEach(btn => {
      btn.style.display = areVisible ? 'none' : 'flex';
    });

    const toggleBtn = document.getElementById('downloadIndividual');
    const btnText = toggleBtn.querySelector('span');
    if (btnText) {
      btnText.textContent = areVisible ? 'Show Download Buttons' : 'Hide Download Buttons';
    }

    this.showFeedback(areVisible ? 'Download buttons hidden' : 'Download buttons shown');
  }

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
        .filter(icon => icon.size >= 72)
        .map(icon => ({
          src: icon.filename,
          sizes: `${icon.size}x${icon.size}`,
          type: `image/${icon.format}`,
          purpose: icon.size >= 192 ? "maskable any" : "any"
        }))
    };

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(manifest, null, 2));
    const link = document.createElement('a');
    link.href = dataStr;
    link.download = "manifest.json";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    this.showSuccess('PWA manifest.json generated and downloaded!');
  }

  async installPWA() {
    if (!this.deferredPrompt) {
      this.showInstallInstructions();
      this.showFeedback('Use your browser\'s install option or "Add to Home Screen"');
      return;
    }

    try {
      this.deferredPrompt.prompt();

      const result = await this.deferredPrompt.userChoice;

      if (result.outcome === 'accepted') {
        console.log('User accepted PWA install');
        this.showSuccess('Installing IconForge...');
      } else {
        console.log('User dismissed PWA install');
        this.showFeedback('Installation cancelled');
      }

      this.deferredPrompt = null;
      this.isInstallable = false;

    } catch (error) {
      console.error('PWA installation error:', error);
      this.showError('Installation failed. Try using your browser\'s install option.');
    }
  }

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

  handleOnlineStatus(isOnline) {
    this.isOffline = !isOnline;

    const statusMessage = isOnline ? 'Back online - full functionality restored' : 'Working offline - limited functionality';
    this.showFeedback(statusMessage);

    const footerText = document.querySelector('.footer__text');
    if (footerText) {
      footerText.textContent = `IconForge - Professional Icon Generator PWA • ${isOnline ? 'Online' : 'Offline'}`;
    }

    if (isOnline) {
      this.syncPendingData();
    }
  }

  handleKeyboardNavigation(event) {
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

    if (event.key === 'Escape') {
      this.hideLoading();
    }
  }

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
        imageData: image.src.substring(0, 1000)
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

  async loadPersistedData() {
    if (!this.db) return;

    try {
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

  applySettings(settings) {
    if (settings.selectedSizes && settings.selectedSizes.length > 0) {
      const sizeCheckboxes = document.querySelectorAll('input[name="iconSize"]');
      sizeCheckboxes.forEach(cb => {
        cb.checked = settings.selectedSizes.includes(parseInt(cb.value));
      });
    }

    if (settings.outputFormat) {
      const formatRadio = document.querySelector(`input[name="format"][value="${settings.outputFormat}"]`);
      if (formatRadio) {
        formatRadio.checked = true;
      }
    }
  }

  async syncPendingData() {
    console.log('Syncing pending data...');
  }

  showLoading(message = 'Processing...', progress = 0) {
    const overlay = document.getElementById('loadingOverlay');
    const text = overlay.querySelector('.loading-text');

    text.textContent = message;
    this.updateProgress(progress, message);
    overlay.style.display = 'flex';
  }

  hideLoading() {
    const overlay = document.getElementById('loadingOverlay');
    overlay.style.display = 'none';
  }

  showSuccess(message) {
    this.showNotification(message, 'success');
  }

  showError(message) {
    this.showNotification(message, 'error');
  }

  showFeedback(message) {
    this.showNotification(message, 'info');
  }

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

    setTimeout(() => {
      notification.classList.add('notification--fade');
      setTimeout(() => {
        if (document.body.contains(notification)) {
          document.body.removeChild(notification);
        }
      }, 300);
    }, 4000);
  }

  getNotificationIcon(type) {
    switch (type) {
      case 'success': return 'check-circle';
      case 'error': return 'alert-circle';
      case 'info': return 'info';
      default: return 'info';
    }
  }
}

// Initialize app
let app;
document.addEventListener('DOMContentLoaded', () => {
  app = new IconForgeApp();
});

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
