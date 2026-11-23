'use strict';
/* ============================================================
   cloud.js — Google Firebase Firestore Cloud Integration
   Local-First Real-Time Sync & Cloud Database Engine
   ============================================================ */

const CloudDB = {
  firebaseApp: null,
  firestore: null,
  isInitialized: false,
  status: 'unconfigured', // 'unconfigured' | 'connected' | 'syncing' | 'offline' | 'error'
  lastSyncTime: null,
  activeListeners: [],

  COLLECTIONS: [
    'patients',
    'appointments',
    'visits',
    'prescriptions',
    'invoices',
    'opd_entries',
    'medicines',
    'charges',
    'lab_tests',
    'extra_advices',
    'staff',
    'settings',
    'clinic_lab_reports'
  ],

  /* ── Initialize from stored config ── */
  init() {
    this.updateBadge();
    const rawConfig = localStorage.getItem('clinic_firebase_config');
    if (!rawConfig) {
      this.status = 'unconfigured';
      this.updateBadge();
      return;
    }

    try {
      const config = JSON.parse(rawConfig);
      this.connect(config, false);
    } catch (err) {
      console.warn('Could not parse saved Firebase config:', err);
      this.status = 'error';
      this.updateBadge();
    }
  },

  /* ── Parse various configuration formats (JSON, JS snippet) ── */
  parseConfigInput(text) {
    if (!text || !text.trim()) return null;
    let str = text.trim();

    // If user pasted JS code like: const firebaseConfig = { ... };
    if (str.includes('{') && str.includes('}')) {
      const start = str.indexOf('{');
      const end = str.lastIndexOf('}');
      str = str.substring(start, end + 1);
    }

    // Convert JS object keys to valid JSON if needed
    try {
      return JSON.parse(str);
    } catch (e) {
      try {
        // Evaluate safely in isolated function if it's relaxed JS object
        const cleaned = str
          .replace(/([a-zA-Z0-9_]+)\s*:/g, '"$1":')
          .replace(/'/g, '"')
          .replace(/,\s*}/g, '}');
        return JSON.parse(cleaned);
      } catch (err2) {
        throw new Error('Config format is invalid. Please paste a valid JSON or Firebase config object.');
      }
    }
  },

  /* ── Connect to Firebase ── */
  connect(config, showToast = true) {
    if (!window.firebase) {
      this.status = 'offline';
      this.updateBadge();
      if (showToast && window.App) App.toast('Firebase SDK is loading or not available offline', 'warning');
      return false;
    }

    try {
      // Avoid duplicate init
      if (firebase.apps && firebase.apps.length > 0) {
        this.firebaseApp = firebase.app();
      } else {
        this.firebaseApp = firebase.initializeApp(config);
      }

      this.firestore = firebase.firestore();

      // Enable offline persistence for Firestore
      try {
        this.firestore.enablePersistence({ synchronizeTabs: true }).catch(err => {
          if (err.code === 'failed-precondition') {
            // Multiple tabs open, persistence enabled in first tab
            console.log('Firestore persistence multi-tab note:', err.message);
          } else if (err.code === 'unimplemented') {
            console.log('Browser does not support persistence');
          }
        });
      } catch (e) {
        // Ignore persistence error if already initialized
      }

      this.isInitialized = true;
      this.status = 'connected';
      this.lastSyncTime = new Date();
      localStorage.setItem('clinic_firebase_config', JSON.stringify(config));
      this.updateBadge();

      // Start realtime listeners on key collections
      this.setupRealtimeListeners();

      if (showToast && window.App) {
        App.toast('☁️ Firebase Cloud Database connected successfully!', 'success');
      }
      return true;
    } catch (err) {
      console.error('Firebase connection error:', err);
      this.status = 'error';
      this.updateBadge();
      if (showToast && window.App) {
        App.toast('Cloud Connection Error: ' + err.message, 'danger');
      }
      return false;
    }
  },

  /* ── Disconnect / Return to Local Mode ── */
  disconnect() {
    this.activeListeners.forEach(unsub => {
      try { unsub(); } catch(e) {}
    });
    this.activeListeners = [];

    localStorage.removeItem('clinic_firebase_config');
    this.isInitialized = false;
    this.status = 'unconfigured';
    this.firestore = null;
    this.updateBadge();

    if (window.App) {
      App.toast('Disconnected from Cloud. Now running in 100% Local Mode.', 'info');
    }
  },

  /* ── Realtime collection listener ── */
  setupRealtimeListeners() {
    if (!this.firestore) return;
    this.activeListeners.forEach(unsub => {
      try { unsub(); } catch(e) {}
    });
    this.activeListeners = [];

    // Listen to changes in patients and appointments from other devices
    ['patients', 'appointments'].forEach(colName => {
      try {
        const unsub = this.firestore.collection(colName).onSnapshot(snapshot => {
          if (snapshot.metadata.hasPendingWrites) {
            // Local change, skip re-saving to avoid loop
            return;
          }
          if (!snapshot.empty) {
            const list = [];
            snapshot.forEach(doc => {
              list.push(doc.data());
            });
            // Update local storage
            localStorage.setItem(colName, JSON.stringify(list));
            this.lastSyncTime = new Date();
            this.updateBadge();
          }
        }, err => {
          console.warn('Realtime listener note:', err);
        });
        this.activeListeners.push(unsub);
      } catch (e) {
        console.warn('Could not attach listener for', colName, e);
      }
    });
  },

  /* ── Single Document Sync Hook (called from DB CRUD) ── */
  async syncDoc(colName, id, data) {
    if (!this.isInitialized || !this.firestore || !id) return;
    try {
      this.status = 'syncing';
      this.updateBadge();

      // Clean up object (Firestore doesn't allow undefined values)
      const cleanData = JSON.parse(JSON.stringify(data));
      await this.firestore.collection(colName).doc(String(id)).set(cleanData, { merge: true });
      
      this.status = 'connected';
      this.lastSyncTime = new Date();
      this.updateBadge();
    } catch (err) {
      console.warn(`Cloud sync failed for ${colName}/${id}:`, err);
      this.status = 'connected'; // still keep connected state
      this.updateBadge();
    }
  },

  /* ── Single Document Removal Hook ── */
  async removeDoc(colName, id) {
    if (!this.isInitialized || !this.firestore || !id) return;
    try {
      this.status = 'syncing';
      this.updateBadge();
      await this.firestore.collection(colName).doc(String(id)).delete();
      this.status = 'connected';
      this.lastSyncTime = new Date();
      this.updateBadge();
    } catch (err) {
      console.warn(`Cloud remove failed for ${colName}/${id}:`, err);
      this.status = 'connected';
      this.updateBadge();
    }
  },

  /* ── Fetch Patients from Firebase Cloud ── */
  async fetchPatientsFromCloud() {
    if (!this.isInitialized || !this.firestore) {
      // Try restoring saved config if available
      const raw = localStorage.getItem('clinic_firebase_config');
      if (raw) {
        try {
          this.connect(JSON.parse(raw), false);
        } catch(e) {}
      }
    }

    if (!this.isInitialized || !this.firestore) {
      if (window.App) {
        App.toast('Firebase is in Local Mode. Please connect your Firebase project in Settings.', 'warning');
      }
      return null;
    }

    try {
      this.status = 'syncing';
      this.updateBadge();

      const snapshot = await this.firestore.collection('patients').get();
      if (snapshot.empty) {
        if (window.App) {
          App.toast('No patients found in Firebase "patients" collection. Click "Upload Sample Patients" to populate Firebase!', 'info');
        }
        this.status = 'connected';
        this.updateBadge();
        return [];
      }

      const list = [];
      snapshot.forEach(doc => {
        const d = doc.data();
        if (!d.id) d.id = doc.id;
        list.push(d);
      });

      localStorage.setItem('patients', JSON.stringify(list));
      this.status = 'connected';
      this.lastSyncTime = new Date();
      this.updateBadge();

      if (window.App) {
        App.toast(`✅ Successfully pulled ${list.length} patients from Firebase Cloud!`, 'success');
      }
      return list;
    } catch (err) {
      console.error('Failed to fetch patients from Firebase:', err);
      this.status = 'error';
      this.updateBadge();
      if (window.App) {
        App.toast('Firebase Fetch Error: ' + err.message, 'danger');
      }
      return null;
    }
  },

  /* ── Seed / Push Dummy Patients to Firebase Cloud ── */
  async seedDummyPatientsToCloud() {
    const list = DB.seedDummyPatients(true);

    if (!this.isInitialized || !this.firestore) {
      if (window.App) {
        App.toast('Loaded 10 rich patient records locally! Connect Firebase in Settings to sync to Cloud.', 'success');
      }
      return list;
    }

    try {
      this.status = 'syncing';
      this.updateBadge();

      let uploaded = 0;
      for (const p of list) {
        const clean = JSON.parse(JSON.stringify(p));
        await this.firestore.collection('patients').doc(String(p.id)).set(clean, { merge: true });
        uploaded++;
      }

      this.status = 'connected';
      this.lastSyncTime = new Date();
      this.updateBadge();

      if (window.App) {
        App.toast(`☁️ Successfully uploaded ${uploaded} rich patient records directly to Firebase!`, 'success');
      }
      return list;
    } catch (err) {
      console.error('Seed patients to cloud error:', err);
      this.status = 'connected';
      this.updateBadge();
      if (window.App) {
        App.toast('Cloud Upload Error: ' + err.message, 'danger');
      }
      return list;
    }
  },

  /* ── UPLOAD ALL LOCAL DATA TO CLOUD (User Button in Settings) ── */
  async uploadAllToCloud(onProgress) {
    if (!this.isInitialized || !this.firestore) {
      if (window.App) App.toast('Please connect your Firebase Cloud Database first!', 'warning');
      return false;
    }

    try {
      this.status = 'syncing';
      this.updateBadge();

      let totalItems = 0;
      let uploadedCount = 0;

      // Calculate total
      this.COLLECTIONS.forEach(col => {
        try {
          const raw = localStorage.getItem(col);
          if (raw) {
            const data = JSON.parse(raw);
            if (Array.isArray(data)) totalItems += data.length;
            else if (typeof data === 'object') totalItems += 1;
          }
        } catch(e) {}
      });

      // Upload collection by collection using batched writes
      for (const col of this.COLLECTIONS) {
        const raw = localStorage.getItem(col);
        if (!raw) continue;
        const data = JSON.parse(raw);

        if (Array.isArray(data)) {
          for (const item of data) {
            const docId = String(item.id || item._id || DB.genId());
            const clean = JSON.parse(JSON.stringify(item));
            await this.firestore.collection(col).doc(docId).set(clean, { merge: true });
            uploadedCount++;
            if (onProgress) onProgress(uploadedCount, totalItems, col);
          }
        } else if (typeof data === 'object' && data !== null) {
          const clean = JSON.parse(JSON.stringify(data));
          await this.firestore.collection('config').doc(col).set(clean, { merge: true });
          uploadedCount++;
          if (onProgress) onProgress(uploadedCount, totalItems, col);
        }
      }

      this.status = 'connected';
      this.lastSyncTime = new Date();
      this.updateBadge();

      if (window.App) {
        App.toast(`✅ Successfully uploaded all ${uploadedCount} clinic records to Cloud!`, 'success');
      }
      return true;
    } catch (err) {
      console.error('Cloud Upload error:', err);
      this.status = 'error';
      this.updateBadge();
      if (window.App) {
        App.toast('Upload Error: ' + err.message, 'danger');
      }
      return false;
    }
  },

  /* ── DOWNLOAD / RESTORE DATA FROM CLOUD (User Button in Settings) ── */
  async downloadAllFromCloud(onProgress) {
    if (!this.isInitialized || !this.firestore) {
      if (window.App) App.toast('Please connect your Firebase Cloud Database first!', 'warning');
      return false;
    }

    try {
      this.status = 'syncing';
      this.updateBadge();

      let downloadedCount = 0;

      for (const col of this.COLLECTIONS) {
        if (col === 'settings') {
          const docSnap = await this.firestore.collection('config').doc('settings').get();
          if (docSnap.exists) {
            localStorage.setItem('settings', JSON.stringify(docSnap.data()));
            downloadedCount++;
          }
          continue;
        }

        const querySnap = await this.firestore.collection(col).get();
        if (!querySnap.empty) {
          const list = [];
          querySnap.forEach(doc => list.push(doc.data()));
          localStorage.setItem(col, JSON.stringify(list));
          downloadedCount += list.length;
        }
        if (onProgress) onProgress(downloadedCount, col);
      }

      this.status = 'connected';
      this.lastSyncTime = new Date();
      this.updateBadge();

      if (window.App) {
        App.toast(`✅ Restored ${downloadedCount} records from Cloud Database!`, 'success');
        // Refresh current module view
        const activeItem = document.querySelector('.nav-item.active');
        if (activeItem && activeItem.dataset.module && window.MODULE_LOADERS) {
          const loader = MODULE_LOADERS[activeItem.dataset.module];
          if (loader) loader();
        }
      }
      return true;
    } catch (err) {
      console.error('Cloud Download error:', err);
      this.status = 'error';
      this.updateBadge();
      if (window.App) {
        App.toast('Download Error: ' + err.message, 'danger');
      }
      return false;
    }
  },

  /* ── Update Cloud Status Badge in Topbar & Settings ── */
  updateBadge() {
    const badge = document.getElementById('cloudStatusBadge');
    if (!badge) return;

    let icon = '🟡';
    let text = 'Local Mode';
    let tooltip = 'Running locally in browser. Click to setup Cloud Database.';
    let cssClass = 'cloud-badge-local';

    if (this.status === 'connected') {
      icon = '🟢';
      text = 'Cloud Synced';
      const timeStr = this.lastSyncTime ? this.lastSyncTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Now';
      tooltip = `Cloud Database Connected (Firebase Firestore). Synced at ${timeStr}.`;
      cssClass = 'cloud-badge-connected';
    } else if (this.status === 'syncing') {
      icon = '🔄';
      text = 'Syncing...';
      tooltip = 'Synchronizing changes with Cloud Database...';
      cssClass = 'cloud-badge-syncing';
    } else if (this.status === 'error') {
      icon = '🔴';
      text = 'Cloud Error';
      tooltip = 'Cloud connection error. Data safe in local storage.';
      cssClass = 'cloud-badge-error';
    } else if (this.status === 'offline') {
      icon = '⚪';
      text = 'Offline Mode';
      tooltip = 'Working offline. Local storage active.';
      cssClass = 'cloud-badge-offline';
    }

    badge.className = `cloud-status-badge ${cssClass}`;
    badge.title = tooltip;
    badge.innerHTML = `
      <span class="cloud-badge-dot">${icon}</span>
      <span class="cloud-badge-text">${text}</span>
    `;
  }
};

// Initialize cloud listener on page load
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => CloudDB.init(), 300);
});
