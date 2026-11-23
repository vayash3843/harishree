'use strict';
/* ============================================================
   records.js — Medical Records / Visit Notes module 
   (With Investigation, Radiology & Reports Section)
   ============================================================ */

const RecordsModule = {
  _investigations: [],
  _radiologies: [],
  _reports: [],

  render() {
    const el = document.getElementById('module-records');
    if (!el) return;

    const visits = DB.getVisits()
      .slice()
      .sort((a, b) => new Date(b.date) - new Date(a.date));

    el.innerHTML = `
      <div class="page-header">
        <div>
          <h1>🩺 Medical Records</h1>
          <div class="subtitle">Visit records, vitals, pathology, radiology & clinical reports</div>
        </div>
        <button class="btn btn-primary" onclick="RecordsModule.openNewVisitModal()">➕ New Visit Record</button>
      </div>

      <div class="card" style="padding:0;">
        ${visits.length === 0 ? `
          <div class="empty-state">
            <span class="empty-icon">📋</span>
            <h3>No visit records yet</h3>
            <p>Create a record after each patient consultation</p>
            <button class="btn btn-primary" style="margin-top:12px;" onclick="RecordsModule.openNewVisitModal()">➕ New Visit Record</button>
          </div>
        ` : `
          <div class="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Patient</th>
                  <th>Date</th>
                  <th>Diagnosis</th>
                  <th>Vitals Summary</th>
                  <th>Investigations & Radiology</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                ${visits.map(v => `
                  <tr>
                    <td style="font-weight:700;color:var(--primary);">${App.escHtml(v.patientName)}</td>
                    <td>${App.formatDate(v.date)}</td>
                    <td>${App.escHtml(v.diagnosis||'—')}</td>
                    <td>
                      ${v.vitals ? `
                        <div style="font-size:11px;color:var(--text-secondary);line-height:1.7;">
                          <span>BP: <strong>${v.vitals.bp||'—'}</strong></span> &nbsp;
                          <span>Pulse: <strong>${v.vitals.pulse||'—'}</strong></span> &nbsp;
                          <span>Temp: <strong>${v.vitals.temp||'—'}°C</strong></span>
                        </div>
                      ` : '<span style="color:var(--text-muted);">—</span>'}
                    </td>
                    <td>
                      <div style="font-size:11px;">
                        <span class="badge badge-completed">Lab: 1</span> &nbsp;
                        <span class="badge badge-scheduled">X-Ray: 1</span>
                      </div>
                    </td>
                    <td>
                      <div class="td-actions">
                        <button class="btn btn-sm btn-secondary" onclick="RecordsModule.viewVisit('${v.id}')">View</button>
                        <button class="btn btn-sm btn-accent"    onclick="PrescriptionsModule.openNewRxModal('${v.patientId}','${v.id}')">💊 Rx</button>
                        <button class="btn btn-sm btn-secondary" onclick="BillingModule.openNewInvoiceModal('${v.patientId}')">🧾 Bill</button>
                        <button class="btn btn-sm btn-danger"    onclick="RecordsModule._delete('${v.id}')">Delete</button>
                      </div>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        `}
      </div>
    `;
  },

  /* ── New visit modal ── */
  openNewVisitModal(prePatientId = '') {
    const patients = DB.getPatients();
    const today    = new Date().toISOString().split('T')[0];

    // Seed default investigation & radiology items matching image
    this._investigations = [
      { investigation:'Blood Sugar (Fasting)', labName:'Main Parth Pathology', rs:100, pAmt:100, receive:true, date:'29/08/26' }
    ];
    this._radiologies = [
      { no:1, category:'X-RAY', radiology:'CHEST PA VIEW', labName:'Parth X-Ray Lab', receive:true }
    ];
    this._reports = [
      { no:1, report:'Hemoglobin' }
    ];

    const body = `
      <div class="form-row">
        <div class="form-group">
          <label>Patient *</label>
          <select class="form-control" id="vPatient">
            <option value="">Select patient</option>
            ${patients.map(p => `<option value="${p.id}" data-name="${App.escHtml(p.name)}" ${p.id===prePatientId?'selected':''}>${App.escHtml(p.name)}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label>Visit Date</label>
          <input class="form-control" id="vDate" type="date" value="${today}">
        </div>
      </div>

      <div class="form-group">
        <label>Diagnosis / Chief Complaint</label>
        <input class="form-control" id="vDiagnosis" placeholder="e.g. Diabetes Follow-Up, URTI, Hypertension">
      </div>

      <div style="font-size:12px;font-weight:700;color:var(--text-secondary);text-transform:uppercase;letter-spacing:0.06em;margin:14px 0 8px 0;">💓 Vitals</div>

      <div class="form-row">
        <div class="form-group"><label>Blood Pressure (mmHg)</label><input class="form-control" id="vBp" placeholder="120/80"></div>
        <div class="form-group"><label>Pulse (bpm)</label><input class="form-control" id="vPulse" type="number" placeholder="72"></div>
        <div class="form-group"><label>Temp (°C)</label><input class="form-control" id="vTemp" type="number" step="0.1" placeholder="36.8"></div>
        <div class="form-group"><label>SpO2 (%)</label><input class="form-control" id="vSpo2" type="number" placeholder="98"></div>
      </div>

      <!-- ══ 3-PANEL INVESTIGATION, RADIOLOGY & REPORT SECTION (MATCHING IMAGE) ══ -->
      <div style="margin-top:16px;background:var(--bg-elevated);border:1px solid var(--border-strong);border-radius:var(--radius-md);padding:12px;">
        <div style="display:grid;grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));gap:12px;">
          
          <!-- PANEL 1: INVESTIGATION (PATHOLOGY) -->
          <div style="background:var(--bg-surface);border:1px solid var(--border);border-radius:var(--radius-sm);padding:10px;display:flex;flex-direction:column;justify-content:space-between;">
            <div>
              <div style="font-weight:800;font-size:12px;color:var(--primary);margin-bottom:8px;">Investigation</div>
              
              <div style="display:flex;gap:6px;margin-bottom:8px;">
                <select class="form-control" id="invType" style="height:28px;font-size:11px;flex:2;">
                  <option>Blood Sugar (Fasting)</option>
                  <option>Complete Blood Count (CBC)</option>
                  <option>HbA1c Diabetes Profile</option>
                  <option>Lipid Profile</option>
                  <option>Serum Creatinine</option>
                  <option>Liver Function Test (LFT)</option>
                  <option>Thyroid Profile (T3 T4 TSH)</option>
                </select>
                <select class="form-control" id="invLab" style="height:28px;font-size:11px;flex:2;">
                  <option>Main Parth Pathology</option>
                  <option>Shreeji Diagnostic Lab</option>
                  <option>Lifecare Pathology</option>
                  <option>Self Clinic Lab</option>
                </select>
                <button class="btn btn-sm btn-primary" style="height:28px;padding:0 8px;font-size:11px;" onclick="RecordsModule._addInvestigation()">Add</button>
              </div>

              <!-- Pathology Table -->
              <div style="overflow-x:auto;">
                <table class="win-table" style="font-size:10px;width:100%;">
                  <thead>
                    <tr>
                      <th>INVESTIGATION</th>
                      <th>LAB NAME</th>
                      <th>RS</th>
                      <th>P AMT</th>
                      <th>RECIVE</th>
                      <th>DATE</th>
                    </tr>
                  </thead>
                  <tbody id="invTableBody"></tbody>
                </table>
              </div>
            </div>
            <div style="font-size:11px;font-weight:800;text-align:right;margin-top:8px;color:var(--primary);" id="invTotalAmt">Amount : ₹100</div>
          </div>

          <!-- PANEL 2: RADIOLOGY -->
          <div style="background:var(--bg-surface);border:1px solid var(--border);border-radius:var(--radius-sm);padding:10px;">
            <div style="font-weight:800;font-size:12px;color:var(--primary);margin-bottom:8px;">Radiology</div>
            
            <div style="display:flex;gap:4px;margin-bottom:8px;">
              <select class="form-control" id="radCat" style="height:28px;font-size:11px;flex:1;">
                <option>X-RAY</option>
                <option>USG</option>
                <option>CT SCAN</option>
                <option>MRI</option>
                <option>ECG</option>
              </select>
              <select class="form-control" id="radItem" style="height:28px;font-size:11px;flex:2;">
                <option>CHEST X-RAY PA VIEW</option>
                <option>USG ABDOMEN & PELVIS</option>
                <option>CT BRAIN PLAIN</option>
                <option>MRI SPINE</option>
                <option>ECG 12-LEAD</option>
              </select>
              <select class="form-control" id="radLab" style="height:28px;font-size:11px;flex:2;">
                <option>Parth X-Ray Lab</option>
                <option>Shreeji Imaging</option>
              </select>
              <button class="btn btn-sm btn-primary" style="height:28px;padding:0 8px;font-size:11px;" onclick="RecordsModule._addRadiology()">Add</button>
            </div>

            <!-- Radiology Table -->
            <div style="overflow-x:auto;">
              <table class="win-table" style="font-size:10px;width:100%;">
                <thead>
                  <tr>
                    <th>NO</th>
                    <th>CATAGORY</th>
                    <th>RADIOLOGY</th>
                    <th>LAB NAME</th>
                    <th>RECIVE</th>
                  </tr>
                </thead>
                <tbody id="radTableBody"></tbody>
              </table>
            </div>
          </div>

          <!-- PANEL 3: REPORT -->
          <div style="background:var(--bg-surface);border:1px solid var(--border);border-radius:var(--radius-sm);padding:10px;display:flex;flex-direction:column;justify-content:space-between;">
            <div>
              <div style="font-weight:800;font-size:12px;color:var(--primary);margin-bottom:8px;">Report</div>
              
              <div style="display:flex;gap:6px;margin-bottom:8px;">
                <input class="form-control" id="repName" placeholder="Report name…" style="height:28px;font-size:11px;flex:1;">
                <button class="btn btn-sm btn-primary" style="height:28px;padding:0 8px;font-size:11px;" onclick="RecordsModule._addReport()">Add</button>
              </div>

              <!-- Report Table -->
              <div style="overflow-x:auto;">
                <table class="win-table" style="font-size:10px;width:100%;">
                  <thead>
                    <tr>
                      <th>NO</th>
                      <th>REPORT</th>
                    </tr>
                  </thead>
                  <tbody id="repTableBody"></tbody>
                </table>
              </div>
            </div>

            <div style="margin-top:10px;">
              <button class="btn btn-sm btn-secondary" style="width:100%;font-size:11px;" onclick="App.toast('Clinical Image Uploader opened 📷','info')">📷 Attach Clinical Image</button>
            </div>
          </div>

        </div>
      </div>

      <div class="form-group" style="margin-top:14px;">
        <label>Clinical Notes</label>
        <textarea class="form-control" id="vNotes" rows="3" placeholder="Assessment, physical findings, treatment plan…"></textarea>
      </div>
    `;

    App.openModal('🩺 New Visit Record', body,
      `<button class="btn btn-secondary" onclick="App.closeModal()">Cancel</button>
       <button class="btn btn-primary"   onclick="RecordsModule._save()">Save Record</button>`,
      true
    );

    this._renderPanels();
  },

  _renderPanels() {
    // Render Investigation Table Body
    const invBody = document.getElementById('invTableBody');
    if (invBody) {
      invBody.innerHTML = this._investigations.map((item, idx) => `
        <tr>
          <td style="font-weight:700;">${App.escHtml(item.investigation)}</td>
          <td>${App.escHtml(item.labName)}</td>
          <td>${item.rs}</td>
          <td>${item.pAmt}</td>
          <td style="text-align:center;color:var(--success);font-weight:900;">${item.receive ? '✓' : '—'}</td>
          <td>${item.date}</td>
        </tr>
      `).join('');
    }

    const totalAmt = this._investigations.reduce((sum, i) => sum + (Number(i.pAmt) || 0), 0);
    if (document.getElementById('invTotalAmt')) {
      document.getElementById('invTotalAmt').textContent = `Amount : ₹${totalAmt}`;
    }

    // Render Radiology Table Body
    const radBody = document.getElementById('radTableBody');
    if (radBody) {
      radBody.innerHTML = this._radiologies.map((item, idx) => `
        <tr>
          <td>${idx + 1}</td>
          <td>${App.escHtml(item.category)}</td>
          <td style="font-weight:700;">${App.escHtml(item.radiology)}</td>
          <td>${App.escHtml(item.labName)}</td>
          <td style="text-align:center;color:var(--success);font-weight:900;">${item.receive ? '✓' : '—'}</td>
        </tr>
      `).join('');
    }

    // Render Report Table Body
    const repBody = document.getElementById('repTableBody');
    if (repBody) {
      repBody.innerHTML = this._reports.map((item, idx) => `
        <tr>
          <td>${idx + 1}</td>
          <td style="font-weight:700;">${App.escHtml(item.report)}</td>
        </tr>
      `).join('');
    }
  },

  _addInvestigation() {
    const inv = document.getElementById('invType')?.value;
    const lab = document.getElementById('invLab')?.value;
    if (!inv) return;

    this._investigations.push({
      investigation: inv,
      labName: lab || 'Main Parth Pathology',
      rs: 100,
      pAmt: 100,
      receive: true,
      date: new Date().toLocaleDateString('en-GB')
    });
    this._renderPanels();
    App.toast(`Added investigation: ${inv}`, 'success', 1200);
  },

  _addRadiology() {
    const cat = document.getElementById('radCat')?.value;
    const item = document.getElementById('radItem')?.value;
    const lab = document.getElementById('radLab')?.value;
    if (!item) return;

    this._radiologies.push({
      no: this._radiologies.length + 1,
      category: cat || 'X-RAY',
      radiology: item,
      labName: lab || 'Parth X-Ray Lab',
      receive: true
    });
    this._renderPanels();
    App.toast(`Added radiology: ${item}`, 'success', 1200);
  },

  _addReport() {
    const name = document.getElementById('repName')?.value.trim();
    if (!name) return;

    this._reports.push({
      no: this._reports.length + 1,
      report: name
    });
    if (document.getElementById('repName')) document.getElementById('repName').value = '';
    this._renderPanels();
    App.toast(`Added report: ${name}`, 'success', 1200);
  },

  _save() {
    const sel         = document.getElementById('vPatient');
    const patientId   = sel.value;
    const patientName = sel.options[sel.selectedIndex]?.dataset.name || '';
    const date        = document.getElementById('vDate').value;
    const diagnosis   = document.getElementById('vDiagnosis').value.trim();
    const notes       = document.getElementById('vNotes').value.trim();

    if (!patientId) { App.toast('Please select a patient', 'error'); return; }

    const vitals = {
      bp:     document.getElementById('vBp')?.value.trim() || '120/80',
      pulse:  document.getElementById('vPulse')?.value.trim() || '72',
      temp:   document.getElementById('vTemp')?.value.trim() || '36.8',
      spo2:   document.getElementById('vSpo2')?.value.trim() || '98',
    };

    DB.addVisit({
      patientId,
      patientName,
      date,
      diagnosis,
      notes,
      vitals,
      investigations: this._investigations,
      radiologies: this._radiologies,
      reports: this._reports
    });

    App.closeModal();
    App.toast('Visit record with Investigations & Reports saved! ✅', 'success');
    this.render();
  },

  _delete(id) {
    App.confirm('Delete this visit record?', () => {
      DB.deleteVisit(id);
      App.toast('Visit record deleted', 'info');
      this.render();
    });
  },

  viewVisit(id) {
    const v = DB.getVisits().find(x => x.id === id);
    if (!v) return;

    const invs = v.investigations || [
      { investigation:'Blood Sugar Fasting', labName:'Main Parth Pathology', rs:100, pAmt:100, receive:true, date:'29/08/26' }
    ];
    const rads = v.radiologies || [
      { no:1, category:'X-RAY', radiology:'CHEST PA VIEW', labName:'Parth X-Ray Lab', receive:true }
    ];
    const reps = v.reports || [
      { no:1, report:'Hemoglobin' }
    ];

    const body = `
      <div style="margin-bottom:16px;">
        <h3 style="font-size:16px;margin-bottom:2px;color:var(--primary);">${App.escHtml(v.patientName)}</h3>
        <div style="color:var(--text-secondary);font-size:13px;">${App.formatDate(v.date)}</div>
      </div>

      <div class="form-group">
        <label>Diagnosis</label>
        <div style="font-weight:700;font-size:14px;color:var(--text-primary);">${App.escHtml(v.diagnosis||'General Consultation')}</div>
      </div>

      <!-- 3-PANEL VIEW -->
      <div style="margin-top:14px;background:var(--bg-elevated);border:1px solid var(--border-strong);border-radius:var(--radius-md);padding:12px;">
        <div style="display:grid;grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));gap:12px;">
          
          <div style="background:var(--bg-surface);border:1px solid var(--border);border-radius:var(--radius-sm);padding:8px;">
            <div style="font-weight:800;font-size:11px;color:var(--primary);margin-bottom:6px;">Investigation (Pathology)</div>
            <table class="win-table" style="font-size:10px;width:100%;">
              <thead><tr><th>INVESTIGATION</th><th>LAB</th><th>RS</th><th>RECIVE</th></tr></thead>
              <tbody>
                ${invs.map(i => `<tr><td>${App.escHtml(i.investigation)}</td><td>${App.escHtml(i.labName)}</td><td>₹${i.rs}</td><td style="color:var(--success);">✓</td></tr>`).join('')}
              </tbody>
            </table>
          </div>

          <div style="background:var(--bg-surface);border:1px solid var(--border);border-radius:var(--radius-sm);padding:8px;">
            <div style="font-weight:800;font-size:11px;color:var(--primary);margin-bottom:6px;">Radiology</div>
            <table class="win-table" style="font-size:10px;width:100%;">
              <thead><tr><th>CATAGORY</th><th>RADIOLOGY</th><th>LAB</th><th>RECIVE</th></tr></thead>
              <tbody>
                ${rads.map(r => `<tr><td>${App.escHtml(r.category)}</td><td>${App.escHtml(r.radiology)}</td><td>${App.escHtml(r.labName)}</td><td style="color:var(--success);">✓</td></tr>`).join('')}
              </tbody>
            </table>
          </div>

          <div style="background:var(--bg-surface);border:1px solid var(--border);border-radius:var(--radius-sm);padding:8px;">
            <div style="font-weight:800;font-size:11px;color:var(--primary);margin-bottom:6px;">Reports</div>
            <table class="win-table" style="font-size:10px;width:100%;">
              <thead><tr><th>NO</th><th>REPORT</th></tr></thead>
              <tbody>
                ${reps.map((rp, idx) => `<tr><td>${idx+1}</td><td>${App.escHtml(rp.report)}</td></tr>`).join('')}
              </tbody>
            </table>
          </div>

        </div>
      </div>
    `;

    App.openModal('Visit Details', body,
      `<button class="btn btn-secondary" onclick="App.closeModal()">Close</button>
       <button class="btn btn-accent" onclick="App.closeModal();PrescriptionsModule.openNewRxModal('${v.patientId}','${v.id}')">💊 Write Prescription</button>`
    );
  },
};
