'use strict';
/* ============================================================
   settings.js — Settings module with Cloud Database Integration
   ============================================================ */

const SettingsModule = {

  render() {
    const el = document.getElementById('module-settings');
    if (!el) return;

    const s = DB.getSettings();
    const isCloudConnected = window.CloudDB && CloudDB.status === 'connected';
    const savedConfig = localStorage.getItem('clinic_firebase_config') || '';
    const lastSync = window.CloudDB && CloudDB.lastSyncTime
      ? CloudDB.lastSyncTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      : 'Never';

    el.innerHTML = `
      <div class="page-header">
        <div>
          <h1>⚙️ Settings & Data Backup</h1>
          <div class="subtitle">Configure clinic profile, live cloud database sync, and data backups</div>
        </div>
      </div>

      <div class="grid-2" style="align-items:start;">

        <!-- Left column: Clinic Info -->
        <div style="display:flex;flex-direction:column;gap:var(--gap-md);">
          <div class="card">
            <div class="card-title">🏥 Clinic Information</div>

            <div class="form-group">
              <label>Clinic Name</label>
              <input class="form-control" id="sClinicName" value="${App.escHtml(s.clinicName||'')}" placeholder="Your Clinic Name">
            </div>
            <div class="form-group">
              <label>Doctor Name</label>
              <input class="form-control" id="sDoctorName" value="${App.escHtml(s.doctorName||'')}" placeholder="Dr. Your Name">
            </div>
            <div class="form-group">
              <label>Specialty</label>
              <input class="form-control" id="sSpecialty" value="${App.escHtml(s.specialty||'')}" placeholder="General / Family Medicine">
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>Phone</label>
                <input class="form-control" id="sPhone" value="${App.escHtml(s.phone||'')}" placeholder="+91 98250 99887">
              </div>
              <div class="form-group">
                <label>Email</label>
                <input class="form-control" id="sEmail" type="email" value="${App.escHtml(s.email||'')}" placeholder="clinic@email.com">
              </div>
            </div>
            <div class="form-group">
              <label>Address</label>
              <textarea class="form-control" id="sAddress" rows="2" placeholder="Clinic full address">${App.escHtml(s.address||'')}</textarea>
            </div>

            <button class="btn btn-primary" onclick="SettingsModule._save()">💾 Save Clinic Details</button>
          </div>

          <!-- Offline / Local JSON Backup -->
          <div class="card">
            <div class="card-title">💾 Local File Backup (JSON Export / Restore)</div>
            <p style="font-size:12.5px;color:var(--text-secondary);margin-bottom:12px;line-height:1.5;">
              Aap apne computer me bina internet ke bhi 1-click me clinic ka poora data download karke safe rakh sakte hain.
            </p>
            <div style="display:flex;gap:10px;flex-wrap:wrap;">
              <button class="btn btn-secondary" onclick="SettingsModule._exportJSON()" style="flex:1;min-width:160px;">
                📥 Download Backup File (.json)
              </button>
              <button class="btn btn-secondary" onclick="document.getElementById('jsonFileInput').click()" style="flex:1;min-width:160px;">
                📂 Restore from Backup File
              </button>
              <input type="file" id="jsonFileInput" accept=".json" style="display:none;" onchange="SettingsModule._importJSON(event)">
            </div>
          </div>
        </div>

        <!-- Right column: Cloud Database Sync & System Summary -->
        <div style="display:flex;flex-direction:column;gap:var(--gap-md);">

          <!-- Cloud Database Card -->
          <div class="card cloud-card">
            <div class="card-title" style="color:var(--primary);font-size:15px;">
              <span>☁️ Free Cloud Database (Google Firebase)</span>
              <span class="cloud-status-badge ${isCloudConnected ? 'cloud-badge-connected' : 'cloud-badge-local'}" style="margin-left:auto;">
                <span class="cloud-badge-dot">${isCloudConnected ? '🟢' : '🟡'}</span>
                <span class="cloud-badge-text">${isCloudConnected ? 'Cloud Active' : 'Local Mode'}</span>
              </span>
            </div>

            <div class="cloud-stat-banner" style="background:${isCloudConnected ? 'rgba(16,185,129,0.08)' : 'rgba(245,158,11,0.08)'};border-color:${isCloudConnected ? 'rgba(16,185,129,0.25)' : 'rgba(245,158,11,0.25)'};">
              <div>
                <div style="font-size:13px;font-weight:700;color:${isCloudConnected ? '#047857' : '#b45309'};">
                  ${isCloudConnected ? '✅ Cloud Sync Connected & Live' : '⚠️ Running in Local Storage (Not Synced)'}
                </div>
                <div style="font-size:12px;color:var(--text-muted);margin-top:2px;">
                  ${isCloudConnected ? `Last Cloud Sync: <strong>${lastSync}</strong> (Auto-syncs live on changes)` : 'Data browser me safe hai. Cloud se jodne ke liye neeche config enter karein.'}
                </div>
              </div>
            </div>

            <!-- Action Buttons requested by User -->
            <div style="display:flex;flex-direction:column;gap:10px;margin-bottom:14px;">
              <button class="btn btn-primary" id="btnUploadCloud" onclick="SettingsModule._uploadToCloud()" style="width:100%;font-size:13.5px;padding:10px 16px;background:#0284c7;border-color:#0284c7;">
                📤 Upload All Data to Cloud (Initial / Manual Sync)
              </button>
              
              <div style="display:flex;gap:10px;">
                <button class="btn btn-secondary" onclick="SettingsModule._downloadFromCloud()" style="flex:1;font-size:12.5px;">
                  📥 Pull / Restore from Cloud
                </button>
                ${isCloudConnected ? `
                  <button class="btn btn-danger" onclick="SettingsModule._disconnectCloud()" style="font-size:12.5px;">
                    Disconnect Cloud
                  </button>
                ` : ''}
              </div>
            </div>

            <!-- Firebase Config Input -->
            <div class="form-group" style="margin-top:8px;">
              <label style="display:flex;justify-content:space-between;align-items:center;">
                <span>Firebase Configuration Object (JSON)</span>
                <a href="https://console.firebase.google.com/" target="_blank" style="font-size:11.5px;color:var(--primary);text-decoration:underline;">Open Firebase Console ↗</a>
              </label>
              <textarea class="form-control" id="firebaseConfigInput" rows="4" style="font-family:monospace;font-size:11.5px;" placeholder='{
  "apiKey": "AIzaSy...",
  "authDomain": "clinic-xyz.firebaseapp.com",
  "projectId": "clinic-xyz",
  "storageBucket": "clinic-xyz.appspot.com",
  "messagingSenderId": "...",
  "appId": "..."
}'>${App.escHtml(savedConfig)}</textarea>
            </div>

            <button class="btn btn-secondary" onclick="SettingsModule._saveAndConnectCloud()" style="width:100%;">
              🔗 Save & Connect Firebase Cloud
            </button>

            <!-- Collapsible 2-minute Setup Guide -->
            <details class="cloud-guide-accordion">
              <summary>ℹ️ Free Firebase Cloud kaise connect karein? (2 Minute Guide)</summary>
              <div style="margin-top:8px;">
                <ol style="padding-left:18px;margin:0;display:flex;flex-direction:column;gap:6px;">
                  <li><a href="https://console.firebase.google.com/" target="_blank" style="color:var(--primary);font-weight:600;">console.firebase.google.com</a> par jayein aur Gmail se login karein.</li>
                  <li><strong>"Add Project"</strong> par click karke apne clinic ka naam dalein (e.g. <code>my-clinic</code>).</li>
                  <li>Sidebar se <strong>"Build" ➔ "Firestore Database"</strong> chunein aur <strong>"Create Database"</strong> par click karke <em>Test mode</em> me Start karein.</li>
                  <li>Project Overview me <strong>Web (&lt;/&gt;)</strong> icon par click karein aur jo <code>firebaseConfig</code> object mile use copy karke upar box me paste kar dein!</li>
                  <li><strong>"Save & Connect"</strong> dabate hi aapka sara clinic data hamesha ke liye free cloud me sync ho jayega!</li>
                </ol>
              </div>
            </details>
          </div>

          <!-- System Info Summary -->
          <div class="card">
            <div class="card-title">📊 Clinical Data Summary</div>
            <div style="display:flex;flex-direction:column;gap:8px;">
              ${[
                ['👤 Patients Registered', DB.getPatients().length],
                ['📅 Appointments Scheduled', DB.getAppointments().length],
                ['🩺 Medical Visit Records', DB.getVisits().length],
                ['💊 Prescriptions Created', DB.getPrescriptions().length],
                ['🧾 Invoices & Bills', DB.getInvoices().length],
                ['🏥 OPD Collection Records', DB.getOpdEntries().length],
                ['💊 Medicines in Master', DB.getMedicines().length],
                ['🧪 Lab Tests Configured', DB.getLabTests().length],
                ['👩‍⚕️ Staff Members', DB.getStaff().length],
              ].map(([label, count]) => `
                <div style="display:flex;justify-content:space-between;align-items:center;padding:7px 0;border-bottom:1px solid var(--border);">
                  <span style="font-size:13px;color:var(--text-secondary);">${label}</span>
                  <span style="font-weight:800;color:var(--primary);font-size:15px;">${count}</span>
                </div>
              `).join('')}
            </div>

            <div style="margin-top:16px;display:flex;justify-content:space-between;align-items:center;">
              <button class="btn btn-danger" onclick="SettingsModule._resetData()" style="font-size:12px;opacity:0.8;">
                ⚠️ Reset All Sample Data
              </button>
            </div>
          </div>

        </div>
      </div>
    `;
  },

  _save() {
    const settings = {
      clinicName: document.getElementById('sClinicName').value.trim(),
      doctorName: document.getElementById('sDoctorName').value.trim(),
      specialty:  document.getElementById('sSpecialty').value.trim(),
      phone:      document.getElementById('sPhone').value.trim(),
      email:      document.getElementById('sEmail').value.trim(),
      address:    document.getElementById('sAddress').value.trim(),
    };

    DB.saveSettings(settings);

    // Update sidebar branding live
    const bName = document.querySelector('.brand-name');
    const bSub = document.querySelector('.brand-sub');
    if (bName && settings.clinicName) bName.textContent = settings.clinicName;
    if (bSub && settings.doctorName) bSub.textContent  = settings.doctorName;

    App.toast('Clinic settings saved successfully ✅', 'success');
  },

  /* ── Cloud Database Handlers ── */
  _saveAndConnectCloud() {
    const inputVal = document.getElementById('firebaseConfigInput').value;
    if (!inputVal.trim()) {
      App.toast('Please paste your Firebase configuration snippet first.', 'warning');
      return;
    }

    try {
      const config = CloudDB.parseConfigInput(inputVal);
      if (!config || !config.apiKey || !config.projectId) {
        throw new Error('Missing apiKey or projectId in the configuration.');
      }

      const ok = CloudDB.connect(config, true);
      if (ok) {
        this.render();
      }
    } catch (err) {
      App.toast('Configuration Error: ' + err.message, 'danger');
    }
  },

  async _uploadToCloud() {
    const btn = document.getElementById('btnUploadCloud');
    if (btn) {
      btn.disabled = true;
      btn.textContent = '⏳ Uploading to Cloud...';
    }

    await CloudDB.uploadAllToCloud((done, total, col) => {
      if (btn) btn.textContent = `⏳ Uploading... (${done}/${total})`;
    });

    if (btn) {
      btn.disabled = false;
      btn.textContent = '📤 Upload All Data to Cloud (Initial / Manual Sync)';
    }
    this.render();
  },

  async _downloadFromCloud() {
    App.confirm(
      'Are you sure you want to download data from Cloud? This will merge and update your local records with cloud data.',
      async () => {
        await CloudDB.downloadAllFromCloud();
        this.render();
      },
      'Yes, Restore Cloud Data'
    );
  },

  _disconnectCloud() {
    App.confirm(
      'Are you sure you want to disconnect from Firebase Cloud? Local records will remain safe in your browser.',
      () => {
        CloudDB.disconnect();
        this.render();
      },
      'Yes, Disconnect'
    );
  },

  /* ── Local JSON Export & Import ── */
  _exportJSON() {
    const backup = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      clinic: DB.getSettings(),
      patients: DB.getPatients(),
      appointments: DB.getAppointments(),
      visits: DB.getVisits(),
      prescriptions: DB.getPrescriptions(),
      invoices: DB.getInvoices(),
      opd_entries: DB.getOpdEntries(),
      medicines: DB.getMedicines(),
      charges: DB.getCharges(),
      lab_tests: DB.getLabTests(),
      extra_advices: DB.getAdvices(),
      staff: DB.getStaff(),
    };

    const dateStr = new Date().toISOString().split('T')[0];
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(backup, null, 2));
    const a = document.createElement('a');
    a.setAttribute('href', dataStr);
    a.setAttribute('download', `clinic_backup_${dateStr}.json`);
    document.body.appendChild(a);
    a.click();
    a.remove();
    App.toast('Full Clinic Backup downloaded successfully! 📁', 'success');
  },

  _importJSON(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target.result);
        if (!data.patients && !data.medicines) {
          throw new Error('Invalid clinic backup file format.');
        }

        if (data.patients) localStorage.setItem('patients', JSON.stringify(data.patients));
        if (data.appointments) localStorage.setItem('appointments', JSON.stringify(data.appointments));
        if (data.visits) localStorage.setItem('visits', JSON.stringify(data.visits));
        if (data.prescriptions) localStorage.setItem('prescriptions', JSON.stringify(data.prescriptions));
        if (data.invoices) localStorage.setItem('invoices', JSON.stringify(data.invoices));
        if (data.opd_entries) localStorage.setItem('opd_entries', JSON.stringify(data.opd_entries));
        if (data.medicines) localStorage.setItem('medicines', JSON.stringify(data.medicines));
        if (data.charges) localStorage.setItem('charges', JSON.stringify(data.charges));
        if (data.lab_tests) localStorage.setItem('lab_tests', JSON.stringify(data.lab_tests));
        if (data.extra_advices) localStorage.setItem('extra_advices', JSON.stringify(data.extra_advices));
        if (data.staff) localStorage.setItem('staff', JSON.stringify(data.staff));
        if (data.clinic) localStorage.setItem('settings', JSON.stringify(data.clinic));

        App.toast('Backup restored successfully! All clinic records updated.', 'success');
        this.render();
      } catch (err) {
        App.toast('Restore Failed: ' + err.message, 'danger');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  },

  _resetData() {
    App.confirm(
      'This will <strong>reset all sample data</strong>. Are you sure you want to proceed?',
      () => {
        localStorage.clear();
        DB.seed(true);
        App.toast('Sample data restored', 'info');
        this.render();
      },
      'Yes, Reset',
      'btn-danger'
    );
  },
};
