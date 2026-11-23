'use strict';
/* ============================================================
   patients.js — Patients module (list + Case Entry Modal)
   ============================================================ */

const PatientsModule = {
  searchQuery: '',
  _suggestMatches: [],
  _suggestIndex: -1,

  render() {
    const el = document.getElementById('module-patients');
    if (!el) return;

    const patients = DB.getPatients();
    const q        = this.searchQuery.toLowerCase().trim();
    const filtered = q
      ? patients.filter(p =>
          p.name.toLowerCase().includes(q)  ||
          (p.phone && p.phone.includes(q)) ||
          (p.email && p.email.toLowerCase().includes(q))
        )
      : patients;

    const isCloud = window.CloudDB && window.CloudDB.isInitialized;

    el.innerHTML = `
      <div class="page-header" style="align-items:center;">
        <div>
          <h1>📋 Patient Directory</h1>
          <div class="subtitle">Manage patient records & case entries</div>
        </div>
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
          <button class="btn btn-secondary btn-sm" onclick="PatientsModule.fetchFromFirebase()" title="Pull patient records from Firebase Firestore Cloud">
            <span>☁️</span>
            <span>Fetch from Firebase</span>
          </button>
          <button class="btn btn-secondary btn-sm" onclick="PatientsModule.seedDummyPatients()" title="Load 10 clinical dummy patients and sync to Firebase">
            <span>🌱</span>
            <span>Load Dummy Patients</span>
          </button>
          <button class="btn btn-primary" onclick="PatientsModule.openAddModal()">➕ Patient Case Entry</button>
        </div>
      </div>

      <!-- Controls -->
      <div class="card" style="padding:var(--gap-md);margin-bottom:var(--gap-md);">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:var(--gap-md);flex-wrap:wrap;">
          <div class="search-bar" style="flex:1;max-width:400px;">
            <span>🔍</span>
            <input type="text" placeholder="Search patients by name, phone, email…"
                   value="${App.escHtml(this.searchQuery)}"
                   oninput="PatientsModule._onSearch(this.value)">
          </div>
          <div style="display:flex;align-items:center;gap:14px;font-size:13px;color:var(--text-secondary);font-weight:600;">
            <div style="display:flex;align-items:center;gap:6px;">
              <span style="font-size:11px;padding:3px 8px;border-radius:12px;background:${isCloud ? 'rgba(16,185,129,0.12)' : 'rgba(245,158,11,0.12)'};color:${isCloud ? '#10B981' : '#F59E0B'};font-weight:700;">
                ${isCloud ? '🟢 Cloud Synced' : '🟡 Local Mode'}
              </span>
            </div>
            <div>
              Total Patients: <strong style="color:var(--primary);">${patients.length}</strong>
            </div>
          </div>
        </div>
      </div>

      <!-- Patient Table -->
      <div class="card" style="padding:0;">
        <div id="patientTableWrap"></div>
      </div>
    `;

    this._renderTable(filtered);
  },

  _onSearch(q) {
    this.searchQuery = q;
    const patients = DB.getPatients();
    const filtered = q.trim()
      ? patients.filter(p =>
          p.name.toLowerCase().includes(q.toLowerCase())  ||
          (p.phone && p.phone.includes(q))               ||
          (p.email && p.email.toLowerCase().includes(q.toLowerCase()))
        )
      : patients;
    this._renderTable(filtered);
  },

  _renderTable(patients) {
    const wrap = document.getElementById('patientTableWrap');
    if (!wrap) return;

    if (patients.length === 0) {
      wrap.innerHTML = `
        <div class="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Pt. ID</th>
                <th>Patient Name</th>
                <th>Age</th>
                <th>Gender</th>
                <th>Mobile No</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody></tbody>
          </table>
        </div>
      `;
      return;
    }

    wrap.innerHTML = `
      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Pt. ID</th>
              <th>Patient Name</th>
              <th>Age</th>
              <th>Gender</th>
              <th>Mobile No</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${patients.map((p, idx) => `
              <tr style="cursor:pointer;" ondblclick="DashboardModule.openPatientHistoryModal('${p.id}')" title="Double-click to open Patient History Entry">
                <td style="font-weight:800;color:var(--primary);">${App.escHtml(p.id)}</td>
                <td>
                  <div style="display:flex;align-items:center;gap:10px;">
                    <div class="patient-avatar ${App.getAvatarClass(idx)}">
                      ${App.getInitials(p.name)}
                    </div>
                    <div>
                      <div style="font-weight:700;color:var(--primary);cursor:pointer;" onclick="PatientsModule.openEditModal('${p.id}')">
                        ${App.escHtml(p.name)}
                      </div>
                    </div>
                  </div>
                </td>
                <td>
                  <div style="font-weight:600;">${App.formatAge(p.dob) || (p.age ? p.age + ' yrs' : '—')}</div>
                </td>
                <td>${App.escHtml(p.gender||'—')}</td>
                <td>${App.escHtml(p.phone||'—')}</td>
                <td>
                  <div class="td-actions">
                    <button class="btn btn-sm btn-primary" onclick="DashboardModule.openPatientHistoryModal('${p.id}')" title="Open Patient History Entry">📋 History</button>
                    <button class="btn btn-sm btn-secondary" onclick="PatientsModule.viewPatient('${p.id}')">View</button>
                    <button class="btn btn-sm btn-secondary" onclick="PatientsModule.openEditModal('${p.id}')">Edit</button>
                    <button class="btn btn-sm btn-danger"    onclick="PatientsModule.deletePatient('${p.id}')">Delete</button>
                  </div>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      <div style="padding:10px 16px;font-size:12px;color:var(--text-muted);border-top:1px solid var(--border);">
        Showing ${patients.length} patient${patients.length !== 1 ? 's' : ''}
      </div>
    `;
  },

  /* ── Modals ── */
  openAddModal(preData = {}) {
    try {
      this._manualPaidOverride = false;
      this._casePaymentMode = 'Cash';
      let patientData = preData;
      if (typeof preData === 'string' && preData.trim()) {
        patientData = DB.getPatient(preData) || { id: preData };
      }
      this._renderCaseEntryModal(patientData);
    } catch (err) {
      console.error(err);
      App.toast('Error opening case entry: ' + err.message, 'error');
    }
  },

  openEditModal(id) {
    try {
      this._manualPaidOverride = false;
      this._casePaymentMode = 'Cash';
      const p = DB.getPatient(id);
      if (!p) return;
      this._renderCaseEntryModal(p);
    } catch (err) {
      console.error(err);
      App.toast('Error opening edit case entry: ' + err.message, 'error');
    }
  },

  _calcNet() {
    const fileChg = parseFloat(document.getElementById('cFileCharge')?.value) || 0;
    const med     = parseFloat(document.getElementById('cMedicine')?.value) || 0;
    const proc    = parseFloat(document.getElementById('cProcedure')?.value) || 0;
    const vacc    = parseFloat(document.getElementById('cVaccines')?.value) || 0;
    const indoor  = parseFloat(document.getElementById('cIndoorAmt')?.value) || 0;
    const disc    = parseFloat(document.getElementById('cDiscount')?.value) || 0;

    const total   = fileChg + med + proc + vacc + indoor;
    const net     = Math.max(0, total - disc);

    if (document.getElementById('cTotalAmt')) document.getElementById('cTotalAmt').value = total > 0 ? total.toFixed(0) : '0';
    if (document.getElementById('cNetAmt'))   document.getElementById('cNetAmt').value   = net > 0 ? net.toFixed(0) : '0';

    const paidEl = document.getElementById('cPaid');
    const pendingEl = document.getElementById('cPending');
    if (paidEl) {
      if (!this._manualPaidOverride) {
        paidEl.value = net > 0 ? net.toFixed(0) : '0';
      }
      const paidVal = parseFloat(paidEl.value) || 0;
      if (pendingEl) {
        const pending = Math.max(0, net - paidVal);
        pendingEl.value = pending.toFixed(0);
      }
    }
  },

  _onPaidInput() {
    this._manualPaidOverride = true;
    const net = parseFloat(document.getElementById('cNetAmt')?.value) || 0;
    const paid = parseFloat(document.getElementById('cPaid')?.value) || 0;
    const pending = Math.max(0, net - paid);
    if (document.getElementById('cPending')) {
      document.getElementById('cPending').value = pending.toFixed(0);
    }
  },

  _onGroupChange(groupCategory) {
    this._manualPaidOverride = false;
    const charges = DB.getCharges();
    const matchedCharge = charges.find(c => (c.category === groupCategory) || (c.name === groupCategory));
    const amount = matchedCharge ? Number(matchedCharge.amount || 0) : 0;

    if (matchedCharge) {
      const caseTypeSel = document.getElementById('cCaseType');
      if (caseTypeSel) {
        caseTypeSel.value = matchedCharge.name;
      }
    }

    if (document.getElementById('cFileCharge')) {
      document.getElementById('cFileCharge').value = amount > 0 ? amount : '';
    }

    this._calcNet();
  },

  _onCaseTypeChange(caseTypeName) {
    this._manualPaidOverride = false;
    const charges = DB.getCharges();
    const ch = charges.find(c => c.name === caseTypeName);
    const amount = ch ? Number(ch.amount || 0) : 100;

    if (document.getElementById('cFileCharge')) {
      document.getElementById('cFileCharge').value = amount > 0 ? amount : '';
    }

    this._calcNet();
  },

  _calculateFollowupDays(patientId) {
    if (!patientId) return '';
    const visits = DB.getVisits().filter(v => v.patientId === patientId);
    const appts  = DB.getAppointments().filter(a => a.patientId === patientId);

    const allDates = [...visits.map(v => v.date), ...appts.map(a => a.date)].filter(Boolean);
    if (allDates.length === 0) return '';

    allDates.sort((a, b) => b.localeCompare(a));
    const lastDate = new Date(allDates[0] + 'T12:00:00');
    const today    = new Date();

    const diffTime = today.getTime() - lastDate.getTime();
    const diffDays = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));

    return diffDays > 0 ? `${diffDays} Days` : 'Same Day';
  },

  _onCaseSearch(q) {
    const listEl = document.getElementById('cPatientSearchSuggest');
    if (!listEl) return;

    q = q.trim().toLowerCase();
    if (!q) {
      listEl.style.display = 'none';
      this._suggestMatches = [];
      this._suggestIndex = -1;
      return;
    }

    const patients = DB.getPatients();
    this._suggestMatches = patients.filter(p => 
      (p.phone && p.phone.toLowerCase().includes(q)) ||
      (p.name && p.name.toLowerCase().includes(q)) ||
      (p.id && p.id.toLowerCase().includes(q))
    );
    this._suggestIndex = -1;

    this._renderSuggestList();
  },

  _renderSuggestList() {
    const listEl = document.getElementById('cPatientSearchSuggest');
    if (!listEl) return;

    if (this._suggestMatches.length === 0) {
      listEl.innerHTML = `<div style="padding:10px;font-size:12px;color:var(--text-muted);">No matching patients found</div>`;
      listEl.style.display = 'block';
      return;
    }

    listEl.innerHTML = this._suggestMatches.map((p, i) => {
      const isSelected = (i === this._suggestIndex);

      return `
        <div id="suggestItem_${i}" class="suggest-item ${isSelected ? 'active' : ''}"
             style="padding:8px 12px;cursor:pointer;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;"
             onmousedown="PatientsModule._selectCaseSearchPatient('${p.id}')"
             onclick="PatientsModule._selectCaseSearchPatient('${p.id}')">
          <div>
            <strong style="font-size:12px;color:var(--primary);">${App.escHtml(p.name)}</strong>
            <div style="font-size:11px;color:var(--text-secondary);">${App.escHtml(p.phone || 'No phone')} &bull; ID: ${p.id.slice(-6).toUpperCase()}</div>
          </div>
          <span class="badge badge-completed" style="font-size:10px;">Select</span>
        </div>
      `;
    }).join('');

    listEl.style.display = 'block';

    if (this._suggestIndex >= 0) {
      const activeEl = document.getElementById(`suggestItem_${this._suggestIndex}`);
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  },

  _onCaseSearchKey(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      const val = (document.getElementById('cPatientSearch')?.value || '').trim();
      if (this._suggestMatches && this._suggestMatches.length > 0) {
        const targetIdx = this._suggestIndex >= 0 ? this._suggestIndex : 0;
        const targetP = this._suggestMatches[targetIdx];
        if (targetP) {
          this._selectCaseSearchPatient(targetP.id);
          return;
        }
      }
      if (val) {
        this._searchAndLoadPatient(val);
      }
      return;
    }

    const listEl = document.getElementById('cPatientSearchSuggest');
    if (!listEl || listEl.style.display === 'none') return;

    if (e.key === 'ArrowDown' || e.key === 'Down') {
      e.preventDefault();
      if (this._suggestMatches.length === 0) return;
      this._suggestIndex = (this._suggestIndex + 1) % this._suggestMatches.length;
      this._renderSuggestList();
    } else if (e.key === 'ArrowUp' || e.key === 'Up') {
      e.preventDefault();
      if (this._suggestMatches.length === 0) return;
      this._suggestIndex = (this._suggestIndex - 1 + this._suggestMatches.length) % this._suggestMatches.length;
      this._renderSuggestList();
    } else if (e.key === 'Escape') {
      listEl.style.display = 'none';
    }
  },

  _searchAndLoadPatient(query) {
    if (!query) return false;
    const cleanNum = String(query).replace(/\D/g, '');
    const cleanStr = String(query).trim().toLowerCase();
    const patients = DB.getPatients() || [];

    let matched = null;
    if (cleanNum.length >= 3) {
      matched = patients.find(p => p.phone && String(p.phone).replace(/\D/g, '') === cleanNum)
             || patients.find(p => p.phone && String(p.phone).replace(/\D/g, '').includes(cleanNum));
    }
    if (!matched) {
      matched = patients.find(p => p.name && p.name.toLowerCase() === cleanStr)
             || patients.find(p => p.id && String(p.id).toLowerCase() === cleanStr)
             || patients.find(p => p.name && p.name.toLowerCase().includes(cleanStr));
    }

    if (matched) {
      this._selectCaseSearchPatient(matched.id);
      return true;
    } else {
      App.toast(`No patient found for "${query}"`, 'warning', 1800);
      return false;
    }
  },

  _onMobileKeyDown(e, inputEl) {
    if (e.key === 'Enter') {
      e.preventDefault();
      const val = (inputEl ? inputEl.value : (document.getElementById('cMobNo')?.value || document.getElementById('pPhone')?.value || '')).trim();
      const num = val.replace(/\D/g, '');
      if (num) {
        const found = this._searchAndLoadPatient(num);
        if (found) {
          if (document.getElementById('cWaitTime')) document.getElementById('cWaitTime').focus();
        } else {
          if (document.getElementById('cMobNo')) document.getElementById('cMobNo').value = num;
          if (document.getElementById('pPhone')) document.getElementById('pPhone').value = num;
          if (document.getElementById('pName')) document.getElementById('pName').focus();
          App.toast(`Mobile #${num} set. Please fill patient details! ✍️`, 'info', 2000);
        }
      }
    }
  },

  _onMobileInput(val) {
    const num = (val || '').replace(/\D/g, '').slice(0, 10);
    const cMob = document.getElementById('cMobNo');
    const pPh = document.getElementById('pPhone');
    if (cMob && cMob.value !== num) cMob.value = num;
    if (pPh && pPh.value !== num) pPh.value = num;
  },

  _selectCaseSearchPatient(id) {
    const p = DB.getPatient(id);
    if (!p) return;

    const listEl = document.getElementById('cPatientSearchSuggest');
    if (listEl) listEl.style.display = 'none';

    if (document.getElementById('cPatientSearch')) document.getElementById('cPatientSearch').value = p.name || '';
    if (document.getElementById('pName')) document.getElementById('pName').value = p.name || '';
    if (document.getElementById('pPhone')) document.getElementById('pPhone').value = p.phone || '';
    if (document.getElementById('cMobNo')) document.getElementById('cMobNo').value = p.phone || '';
    if (document.getElementById('pAddress')) document.getElementById('pAddress').value = p.address || '';
    if (document.getElementById('pGender') && p.gender) document.getElementById('pGender').value = p.gender;
    if (document.getElementById('pBloodGroup') && p.bloodType) document.getElementById('pBloodGroup').value = p.bloodType;
    if (document.getElementById('pDob')) document.getElementById('pDob').value = p.dob || '';
    if (document.getElementById('pAgeCalcHint')) document.getElementById('pAgeCalcHint').textContent = p.dob ? App.formatAge(p.dob) : '';
    if (document.getElementById('pEmail')) document.getElementById('pEmail').value = p.email || '';
    if (document.getElementById('cPatientId')) document.getElementById('cPatientId').value = String(p.id || '');
    if (document.getElementById('cWeight')) document.getElementById('cWeight').value = p.weight || '';
    if (document.getElementById('cGroup') && p.group) document.getElementById('cGroup').value = p.group;
    if (document.getElementById('cCaseType')) {
      if (p.caseType) document.getElementById('cCaseType').value = p.caseType;
      this._onCaseTypeChange(p.caseType || document.getElementById('cCaseType').value);
    } else {
      this._calcNet();
    }
    if (document.getElementById('cPrePending')) {
      document.getElementById('cPrePending').value = p.prePending || '0.00';
    }

    // Calculate days elapsed since last visit
    const daysStr = this._calculateFollowupDays(p.id);
    if (document.getElementById('cDays')) document.getElementById('cDays').value = daysStr;

    App.toast(`Loaded ${p.name} (Followup: ${daysStr}) into Case Entry! 📋`, 'info', 1500);
  },

  _getNextPatientId() {
    const list = DB.getPatients() || [];
    const maxNum = list.reduce((max, p) => {
      const num = parseInt(String(p.id).replace(/\D/g, ''), 10);
      return !isNaN(num) && num > max ? num : max;
    }, 0);
    return String(maxNum + 1);
  },

  openNewPatientRegistrationModal() {
    const nextId = this._getNextPatientId();
    const body = `
      <div style="padding:4px 8px;">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
          <div style="grid-column:span 2;">
            <label style="font-weight:700;font-size:11px;margin-bottom:4px;display:block;">Patient Name * :</label>
            <input type="text" class="form-control" id="regModalName" placeholder="Enter full patient name" style="font-weight:700;" autofocus>
          </div>
          <div>
            <label style="font-weight:700;font-size:11px;margin-bottom:4px;display:block;">Mobile No * (10 digits) :</label>
            <input type="tel" class="form-control" id="regModalPhone" maxlength="10" placeholder="10-digit mobile number" oninput="this.value=this.value.replace(/\\D/g,'').slice(0,10)">
          </div>
          <div>
            <label style="font-weight:700;font-size:11px;margin-bottom:4px;display:block;">Sex :</label>
            <select class="form-control" id="regModalGender">
              <option value="">-- Select --</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div>
            <label style="font-weight:700;font-size:11px;margin-bottom:4px;display:block;">Blood Group :</label>
            <select class="form-control" id="regModalBlood">
              <option value="">-- Select --</option>
              <option value="O+">O+</option>
              <option value="O-">O-</option>
              <option value="A+">A+</option>
              <option value="A-">A-</option>
              <option value="B+">B+</option>
              <option value="B-">B-</option>
              <option value="AB+">AB+</option>
              <option value="AB-">AB-</option>
            </select>
          </div>
          <div>
            <label style="font-weight:700;font-size:11px;margin-bottom:4px;display:flex;justify-content:space-between;">
              <span>Age / DOB :</span>
              <span id="regAgeCalcHint" style="color:var(--primary);font-weight:800;"></span>
            </label>
            <input type="date" class="form-control" id="regModalDob" value="${new Date().toISOString().split('T')[0]}" oninput="document.getElementById('regAgeCalcHint').textContent = App.formatAge(this.value)">
          </div>
          <div style="grid-column:span 2;">
            <label style="font-weight:700;font-size:11px;margin-bottom:4px;display:block;">Address :</label>
            <input type="text" class="form-control" id="regModalAddress" placeholder="Patient address">
          </div>
        </div>
      </div>
    `;

    const footer = `
      <button class="btn btn-secondary" onclick="App.closeModal()">✕ Cancel</button>
      <button class="btn btn-primary" style="font-weight:700;background:var(--primary);color:#fff;" onclick="PatientsModule._submitNewPatientReg('${nextId}')">💾 Save Patient Details</button>
    `;

    App.openModal(`🆕 Register New Patient (ID: ${nextId})`, body, footer);
  },

  _submitNewPatientReg(generatedId) {
    const name = document.getElementById('regModalName')?.value.trim();
    const phone = (document.getElementById('regModalPhone')?.value || '').replace(/\D/g, '');
    const gender = document.getElementById('regModalGender')?.value || '';
    const bloodType = document.getElementById('regModalBlood')?.value || '';
    const dob = document.getElementById('regModalDob')?.value || '';
    const address = document.getElementById('regModalAddress')?.value.trim() || '';

    if (!name) { App.toast('Please enter patient name', 'error'); return; }
    if (phone && phone.length !== 10) { App.toast('Mobile number must be strictly 10 digits', 'error'); return; }

    const newP = DB.addPatient({
      id: generatedId,
      name,
      phone,
      gender,
      bloodType,
      dob,
      address
    });

    App.closeModal();
    App.toast(`Registered Patient #${newP.id} (${newP.name})! 🎉`, 'success', 2000);

    // Open Patient Case Entry pre-filled for this newly registered patient!
    this._renderCaseEntryModal(newP);
  },

  _resetForNewPatient() {
    this.openNewPatientRegistrationModal();
  },

  /* ── Patient Case Entry Modal (Desktop Software Match) ── */
  _renderCaseEntryModal(p = {}) {
    const today     = new Date().toISOString().split('T')[0];
    const now       = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const opdNo     = '47370';
    const tokenNo   = '98';
    const patientId = p.id || this._getNextPatientId();
    const settings  = DB.getSettings();
    const charges   = DB.getCharges() || [];
    const daysStr   = p.id ? this._calculateFollowupDays(p.id) : '';

    const groupCategories = [...new Set(charges.map(c => c.category || c.name))];
    const activeCaseType = p.caseType || (charges[0] ? charges[0].name : 'NEW OPD CONSULTATION');
    const matchedCharge = charges.find(c => c.name === activeCaseType) || charges[0] || { amount: 100 };
    const initFileAmt = matchedCharge ? (matchedCharge.amount || 100) : 100;

    const body = `
      <!-- Quick Search Bar (Search by Mobile No, Name, or Patient ID — Arrow Down/Up & Enter Supported) -->
      <div style="background:var(--bg-surface);padding:10px 14px;border-radius:var(--radius-sm);border:1px solid var(--border-strong);margin-bottom:12px;">
        <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
          <span style="font-weight:800;font-size:12px;color:var(--primary);white-space:nowrap;">🔍 Search Patient :</span>
          <div style="flex:1;min-width:240px;position:relative;">
            <input type="text" class="form-control" id="cPatientSearch" 
                   placeholder="Type Mobile No, Name, or ID… Use ⬇️ Arrow Down / ⬆️ Up to scroll & ENTER to select"
                   style="height:32px;font-size:12px;font-weight:600;"
                   oninput="PatientsModule._onCaseSearch(this.value)"
                   onkeydown="PatientsModule._onCaseSearchKey(event)">
            <div id="cPatientSearchSuggest" style="display:none;position:absolute;top:36px;left:0;right:0;z-index:999;background:var(--bg-elevated);border:1px solid var(--border-strong);border-radius:var(--radius-sm);box-shadow:var(--shadow-lg);max-height:220px;overflow-y:auto;"></div>
          </div>
        </div>
      </div>

      <!-- Header Section: Token & OPD Info -->
      <div class="case-entry-box">
        <div class="case-input-grid" style="grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));">
          <div class="case-field-row">
            <label>OPD NO :</label>
            <input class="form-control" id="cOpdNo" value="${opdNo}">
          </div>
          <div class="case-field-row">
            <label>Date :</label>
            <input class="form-control" id="cDate" type="date" value="${p.date || today}">
          </div>
          <div class="case-field-row">
            <label>Time :</label>
            <input class="form-control" id="cTime" value="${now}">
          </div>
          <div class="case-field-row">
            <label>Patient ID :</label>
            <input class="form-control" id="cPatientId" value="${patientId}" readonly>
            <button class="btn btn-sm btn-primary case-action-btn-sm" style="background:var(--primary);color:#fff;font-weight:700;" onclick="PatientsModule._resetForNewPatient()">➕ Create New</button>
          </div>
          <div class="case-field-row">
            <label>Token No :</label>
            <input class="form-control" id="cTokenNo" value="${tokenNo}">
          </div>
          <div class="case-field-row">
            <label style="color:var(--warning);font-weight:800;">Days :</label>
            <input class="form-control" id="cDays" value="${daysStr}" style="font-weight:800;color:var(--warning);" readonly>
          </div>
        </div>

        <div class="case-input-grid" style="margin-top:10px;grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));">
          <div class="case-field-row">
            <label>Mob No :</label>
            <input class="form-control" id="cMobNo" maxlength="10" placeholder="10-digit mobile number" value="${App.escHtml(p.phone || '')}" oninput="PatientsModule._onMobileInput(this.value)" onkeydown="PatientsModule._onMobileKeyDown(event, this)">
          </div>
          <div class="case-field-row" style="grid-column: span 2;">
            <label>Wait Time :</label>
            <input class="form-control" id="cWaitTime" value="30 Minutes (${now})">
            <label class="opd-radio" style="margin-left:8px;white-space:nowrap;">
              <input type="checkbox" id="cPhoneAppt"> Phone Appointment
            </label>
          </div>
        </div>

        <div class="case-input-grid" style="margin-top:10px;grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));">
          <div class="case-field-row">
            <label>Pre Pending :</label>
            <input class="form-control" id="cPrePending" value="${p.id && p.prePending ? p.prePending : ''}" placeholder="0.00">
            <button class="btn btn-sm btn-secondary case-action-btn-sm" onclick="App.toast('History pending loaded','info')">View</button>
          </div>
        </div>
      </div>

      <!-- Section 2: Patient Detail -->
      <div class="case-entry-box">
        <div class="case-section-header">:: PATIENT DETAIL ::</div>
        <div class="case-input-grid" style="grid-template-columns: repeat(auto-fit, minmax(215px, 1fr));">
          <div class="case-field-row" style="grid-column: span 2;">
            <label>Patient Name :</label>
            <input class="form-control" id="pName" placeholder="Full patient name *" value="${App.escHtml(p.name || '')}">
          </div>
          <div class="case-field-row">
            <label>Sex :</label>
            <select class="form-control" id="pGender">
              <option value="" ${!p.gender ? 'selected' : ''}>-- Select --</option>
              <option value="Male" ${p.gender==='Male'?'selected':''}>Male</option>
              <option value="Female" ${p.gender==='Female'?'selected':''}>Female</option>
              <option value="Other" ${p.gender==='Other'?'selected':''}>Other</option>
            </select>
          </div>
          <div class="case-field-row">
            <label>Blood Group :</label>
            <select class="form-control" id="pBloodGroup">
              <option value="" ${!p.bloodType ? 'selected' : ''}>-- Select --</option>
              <option value="O+"  ${p.bloodType==='O+'?'selected':''}>O+</option>
              <option value="O-"  ${p.bloodType==='O-'?'selected':''}>O-</option>
              <option value="A+"  ${p.bloodType==='A+'?'selected':''}>A+</option>
              <option value="A-"  ${p.bloodType==='A-'?'selected':''}>A-</option>
              <option value="B+"  ${p.bloodType==='B+'?'selected':''}>B+</option>
              <option value="B-"  ${p.bloodType==='B-'?'selected':''}>B-</option>
              <option value="AB+" ${p.bloodType==='AB+'?'selected':''}>AB+</option>
              <option value="AB-" ${p.bloodType==='AB-'?'selected':''}>AB-</option>
            </select>
          </div>
          <div class="case-field-row" style="grid-column: span 2;">
            <label>Address :</label>
            <input class="form-control" id="pAddress" placeholder="Patient address" value="${App.escHtml(p.address || '')}">
          </div>
          <div class="case-field-row">
            <label>DOB :</label>
            <input class="form-control" id="pDob" type="date" value="${p.dob || today}">
          </div>
          <div class="case-field-row">
            <label>Mob No :</label>
            <input class="form-control" id="pPhone" maxlength="10" placeholder="Mobile no" value="${App.escHtml(p.phone || '')}" oninput="PatientsModule._onMobileInput(this.value)" onkeydown="PatientsModule._onMobileKeyDown(event, this)">
          </div>
          <div class="case-field-row" style="grid-column: span 2;">
            <label>Email Id :</label>
            <input class="form-control" id="pEmail" type="email" placeholder="email@domain.com" value="${App.escHtml(p.email || '')}">
          </div>
          <div class="case-field-row">
            <label>Weight(Kg) :</label>
            <input class="form-control" id="cWeight" placeholder="e.g. 64.2" value="${App.escHtml(p.weight || '')}">
          </div>
          <div class="case-field-row">
            <label style="color:var(--primary);font-weight:800;">Group :</label>
            <select class="form-control" id="cGroup" style="font-weight:700;" onchange="PatientsModule._onGroupChange(this.value)">
              <option value="">-- Select --</option>
              ${groupCategories.map(g => `<option value="${App.escHtml(g)}" ${p.group === g ? 'selected' : ''}>${App.escHtml(g)}</option>`).join('')}
            </select>
          </div>
        </div>
      </div>

      <!-- Section 3: Entry Detail -->
      <div class="case-entry-box">
        <div class="case-section-header">:: ENTRY DETAIL ::</div>
        <div class="case-input-grid" style="margin-bottom:12px;">
          <div class="case-field-row" style="grid-column: span 2;">
            <label>Doctor Name :</label>
            <select class="form-control" id="cDoctorName">
              <option selected>${App.escHtml(settings.doctorName || 'DR. YASH VAGHANI')}</option>
              <option>NITA I BHAYANI</option>
              <option>Dr. Mark Torres</option>
            </select>
          </div>
          <div class="case-field-row" style="grid-column: span 2;">
            <label style="color:var(--primary);font-weight:800;">Case Type :</label>
            <select class="form-control" id="cCaseType" style="font-weight:700;" onchange="PatientsModule._onCaseTypeChange(this.value)">
              <option value="">-- Select Case Type --</option>
              ${charges.map(c => `<option value="${App.escHtml(c.name)}" ${(p.caseType === c.name || (!p.caseType && c.name === 'NEW OPD CONSULTATION')) ? 'selected' : ''}>${App.escHtml(c.name)} (₹${c.amount})</option>`).join('')}
            </select>
          </div>
        </div>

        <div class="case-amounts-grid">
          <div class="case-field-row">
            <label>File Charge :</label>
            <input class="form-control" id="cFileCharge" value="${initFileAmt}" placeholder="0" oninput="PatientsModule._calcNet()">
          </div>
          <div class="case-field-row">
            <label>Medicine :</label>
            <input class="form-control" id="cMedicine" value="" placeholder="0" oninput="PatientsModule._calcNet()">
          </div>
          <div class="case-field-row">
            <label style="color:var(--primary);">Net Amt :</label>
            <input class="form-control" id="cNetAmt" value="${initFileAmt}" placeholder="0" style="font-weight:700;color:var(--primary);" readonly>
          </div>
          <div class="case-field-row">
            <label style="color:var(--warning);">Pending :</label>
            <input class="form-control" id="cPending" value="0" placeholder="0" style="font-weight:700;color:var(--warning);">
          </div>
          <div class="case-field-row">
            <label>Procedure :</label>
            <input class="form-control" id="cProcedure" value="" placeholder="0" oninput="PatientsModule._calcNet()">
          </div>
          <div class="case-field-row">
            <label>Total Amt :</label>
            <input class="form-control" id="cTotalAmt" value="${initFileAmt}" placeholder="0" style="font-weight:700;" readonly>
          </div>
          <div class="case-field-row">
            <label>Discount :</label>
            <input class="form-control" id="cDiscount" value="" placeholder="0" oninput="PatientsModule._calcNet()">
          </div>
          <div class="case-field-row"></div>
          <div class="case-field-row">
            <label>Vaccines :</label>
            <input class="form-control" id="cVaccines" value="" placeholder="0" oninput="PatientsModule._calcNet()">
          </div>
          <div class="case-field-row">
            <label>Indoor Amt :</label>
            <input class="form-control" id="cIndoorAmt" value="" placeholder="0" oninput="PatientsModule._calcNet()">
          </div>
          <div class="case-field-row">
            <label style="color:var(--success);font-weight:800;">Paid :</label>
            <input class="form-control" id="cPaid" value="${initFileAmt}" placeholder="" style="font-weight:700;color:var(--success);" oninput="PatientsModule._onPaidInput()">
            <button type="button" id="cPaidBtn" class="btn btn-sm btn-success case-action-btn-sm" onclick="PatientsModule.promptPaymentMode()" style="font-weight:800;font-size:11px;padding:3px 10px;" title="Click to choose payment mode (Cash, UPI, Card, etc.)">Paid</button>
          </div>
        </div>
      </div>
    `;

    const footer = `
      <button class="btn btn-secondary" onclick="App.closeModal()">✕ Cancel</button>
      <button class="btn btn-primary" onclick="PatientsModule.${p.id ? `_saveEdit('${p.id}')` : '_saveNew()'}">💾 Save Case Entry</button>
    `;

    App.openModal('Patient Case Entry', body, footer, true);
    this._calcNet();
  },

  _casePaymentMode: 'Cash',

  promptPaymentMode() {
    const curMode = this._casePaymentMode || 'Cash';
    const net = document.getElementById('cNetAmt')?.value || document.getElementById('cFileCharge')?.value || '100';
    const amt = document.getElementById('cPaid')?.value || net;

    const overlay = document.createElement('div');
    overlay.id = 'quickPayModeOverlay';
    overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);z-index:99999;display:flex;align-items:center;justify-content:center;';
    overlay.innerHTML = `
      <div style="background:#fff;border-radius:8px;padding:20px;width:340px;box-shadow:0 10px 30px rgba(0,0,0,0.3);position:relative;font-family:sans-serif;">
        <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #e2e8f0;padding-bottom:8px;margin-bottom:12px;">
          <b style="font-size:14px;color:#0f172a;">💳 Select Payment Mode</b>
          <button style="border:none;background:transparent;font-size:18px;cursor:pointer;font-weight:bold;color:#64748b;" onclick="document.getElementById('quickPayModeOverlay').remove()">✕</button>
        </div>
        <div style="text-align:center;margin-bottom:14px;">
          <div style="font-size:11px;font-weight:700;color:#64748b;">PAYMENT AMOUNT</div>
          <div style="font-size:24px;font-weight:900;color:#16a34a;">₹${amt}</div>
        </div>
        <label style="font-weight:800;font-size:12px;display:block;margin-bottom:8px;color:#334155;">Select Mode:</label>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
          <button type="button" class="btn" onclick="PatientsModule._selectPayMode('Cash')" style="padding:12px;font-weight:800;font-size:13px;background:${curMode==='Cash'?'#dcfce7':'#f8fafc'};border:2px solid ${curMode==='Cash'?'#16a34a':'#cbd5e1'};color:#166534;border-radius:6px;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px;">
            💵 Cash
          </button>
          <button type="button" class="btn" onclick="PatientsModule._selectPayMode('UPI')" style="padding:12px;font-weight:800;font-size:13px;background:${curMode==='UPI'?'#dbeafe':'#f8fafc'};border:2px solid ${curMode==='UPI'?'#2563eb':'#cbd5e1'};color:#1e40af;border-radius:6px;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px;">
            📱 UPI / Online
          </button>
          <button type="button" class="btn" onclick="PatientsModule._selectPayMode('Card')" style="padding:12px;font-weight:800;font-size:13px;background:${curMode==='Card'?'#fef3c7':'#f8fafc'};border:2px solid ${curMode==='Card'?'#d97706':'#cbd5e1'};color:#92400e;border-radius:6px;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px;">
            💳 Card / Bank
          </button>
          <button type="button" class="btn" onclick="PatientsModule._selectPayMode('Other')" style="padding:12px;font-weight:800;font-size:13px;background:${curMode==='Other'?'#f3e8ff':'#f8fafc'};border:2px solid ${curMode==='Other'?'#7c3aed':'#cbd5e1'};color:#6b21a8;border-radius:6px;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px;">
            📝 Other
          </button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
  },

  _selectPayMode(mode) {
    this._casePaymentMode = mode;
    const net = document.getElementById('cNetAmt')?.value || document.getElementById('cFileCharge')?.value || '100';
    const paidInp = document.getElementById('cPaid');
    if (paidInp) {
      paidInp.value = net;
    }
    const btn = document.getElementById('cPaidBtn');
    if (btn) {
      btn.innerText = `Paid (${mode})`;
      btn.style.background = '#15803d';
    }
    const overlay = document.getElementById('quickPayModeOverlay');
    if (overlay) overlay.remove();
    App.toast(`Payment marked as Paid (${mode}: ₹${net})! 💰✅`, 'success', 1500);
  },

  _readForm() {
    const name = document.getElementById('pName').value.trim();
    const phone = (document.getElementById('pPhone')?.value.trim() || document.getElementById('cMobNo')?.value.trim() || '').replace(/\D/g, '');
    const customId = document.getElementById('cPatientId')?.value.trim();
    const caseType = document.getElementById('cCaseType')?.value || '';
    const group = document.getElementById('cGroup')?.value || '';
    const weight = document.getElementById('cWeight')?.value || '';
    if (!name) { App.toast('Patient name is required', 'error'); return null; }
    if (phone && phone.length !== 10) { App.toast('Mobile number must be strictly 10 digits', 'error'); return null; }
    return {
      id:        customId || undefined,
      name,
      dob:       document.getElementById('pDob').value,
      gender:    document.getElementById('pGender').value,
      bloodType: document.getElementById('pBloodGroup')?.value || 'O+',
      phone,
      email:     document.getElementById('pEmail')?.value.trim() || '',
      address:   document.getElementById('pAddress')?.value.trim() || '',
      caseType,
      group,
      weight
    };
  },

  _saveNew() {
    const data = this._readForm();
    if (!data) return;

    // Create patient and appointment automatically
    const newP = DB.addPatient(data);
    const reason = data.caseType || document.getElementById('cCaseType')?.value || 'New OPD Consultation';
    const date = document.getElementById('cDate')?.value || new Date().toISOString().split('T')[0];
    const time = document.getElementById('cTime')?.value || '09:00 AM';
    const feeAmt = Number(document.getElementById('cFileCharge')?.value || document.getElementById('cNetAmt')?.value || 100);
    const paidAmt = Number(document.getElementById('cPaid')?.value || feeAmt);
    const payMode = document.getElementById('cPayMode')?.value || this._casePaymentMode || 'Cash';
    const isPaid = paidAmt > 0;

    const newAppt = DB.addAppointment({
      patientId: newP.id,
      patientName: newP.name,
      date: date,
      time: time,
      reason: reason,
      caseType: reason,
      status: 'scheduled',
      fee: feeAmt,
      amt: isPaid ? 0 : feeAmt,
      originalFee: feeAmt,
      paid: isPaid,
      opdPaid: isPaid,
      paymentMode: payMode,
      paymentStatus: isPaid ? 'paid' : 'unpaid'
    });

    if (isPaid) {
      DB.addInvoice({
        patientId: newP.id,
        patientName: newP.name,
        appointmentId: newAppt ? newAppt.id : null,
        items: [{ desc: reason, amount: feeAmt }],
        total: feeAmt,
        status: 'paid',
        paymentMode: payMode,
        createdAt: new Date().toISOString(),
        paidAt: new Date().toISOString()
      });
      if (DB.addOpdEntry) {
        DB.addOpdEntry({
          patientId: newP.id,
          patientName: newP.name,
          date: date,
          type: 'Consultation',
          amount: feeAmt,
          payMode: payMode,
          note: `OPD Entry (${payMode})`,
          appointmentId: newAppt ? newAppt.id : null,
          createdAt: new Date().toISOString()
        });
      }
    }

    App.closeModal();
    App.toast(`Patient Case Entry saved (${payMode}: ₹${feeAmt})! ✅`, 'success');
    this.render();
    if (document.getElementById('module-dashboard') && document.getElementById('module-dashboard').classList.contains('active')) DashboardModule.render();
  },

  _saveEdit(id) {
    const data = this._readForm();
    if (!data) return;
    DB.updatePatient(id, data);

    // Also sync today's/active appointment with updated case type if available
    const appts = DB.getAppointments() || [];
    const targetAppt = appts.find(a => String(a.patientId) === String(id));
    if (targetAppt && data.caseType) {
      DB.updateAppointment(targetAppt.id, {
        reason: data.caseType,
        caseType: data.caseType
      });
    }

    App.closeModal();
    App.toast('Patient Case Entry updated ✅', 'success');
    this.render();
    if (document.getElementById('module-dashboard') && document.getElementById('module-dashboard').classList.contains('active')) DashboardModule.render();
  },

  deletePatient(id) {
    App.confirm(
      'Are you sure you want to delete this patient? All associated records will still be preserved.',
      () => { DB.deletePatient(id); App.toast('Patient deleted', 'info'); this.render(); }
    );
  },

  /* ── View patient detail ── */
  viewPatient(id) {
    const p = DB.getPatient(id);
    if (!p) return;

    const visits = DB.getVisits().filter(v => v.patientId === id);
    const appts  = DB.getAppointments().filter(a => a.patientId === id);
    const rxs    = DB.getPrescriptions().filter(r => r.patientId === id);

    const body = `
      <div style="display:flex;align-items:center;gap:16px;margin-bottom:20px;">
        <div class="patient-avatar avatar-teal" style="width:56px;height:56px;font-size:20px;">${App.getInitials(p.name)}</div>
        <div>
          <h2 style="font-size:19px;margin-bottom:4px;">${App.escHtml(p.name)}</h2>
          <div style="color:var(--text-secondary);font-size:13px;">${App.escHtml(p.phone||'—')} &bull; ${App.escHtml(p.email||'—')}</div>
          <div style="display:flex;gap:6px;margin-top:6px;flex-wrap:wrap;">
            ${p.gender ? `<span class="badge badge-completed">${App.escHtml(p.gender)}</span>` : ''}
          </div>
        </div>
      </div>

      <div class="vitals-grid" style="margin-bottom:16px;">
        <div class="vital-item"><div class="vital-value">${App.formatAge(p.dob)}</div><div class="vital-label">Age</div></div>
        <div class="vital-item"><div class="vital-value">${visits.length}</div><div class="vital-label">Visits</div></div>
        <div class="vital-item"><div class="vital-value">${appts.length}</div><div class="vital-label">Appointments</div></div>
        <div class="vital-item"><div class="vital-value">${rxs.length}</div><div class="vital-label">Prescriptions</div></div>
      </div>

      <div class="form-group">
        <label>Address</label>
        <div style="font-size:14px;">${App.escHtml(p.address||'—')}</div>
      </div>

      <hr class="section-divider">
      <h4 style="font-size:13px;font-weight:700;color:var(--text-secondary);margin-bottom:12px;text-transform:uppercase;letter-spacing:0.05em;">Recent Visits</h4>
      ${visits.length === 0
        ? `<p style="color:var(--text-muted);font-size:13px;">No visit records yet.</p>`
        : `<div class="timeline">${visits.slice().reverse().slice(0,4).map(v => `
            <div class="timeline-item">
              <div class="timeline-date">${App.formatDate(v.date)}</div>
              <div class="timeline-content">
                <div style="font-weight:600;font-size:13px;">${App.escHtml(v.diagnosis||'No diagnosis recorded')}</div>
                ${v.notes ? `<div style="font-size:12px;color:var(--text-secondary);margin-top:4px;line-height:1.5;">${App.escHtml(v.notes.substring(0,120))}${v.notes.length>120?'…':''}</div>` : ''}
              </div>
            </div>
          `).join('')}</div>`
      }
    `;

    App.openModal('Patient Profile', body,
      `<button class="btn btn-secondary" onclick="App.closeModal()">Close</button>
       <button class="btn btn-primary" onclick="App.closeModal();PatientsModule.openEditModal('${id}')">✏️ Edit</button>`
    );
  },

  async fetchFromFirebase() {
    if (!window.CloudDB || !window.CloudDB.isInitialized) {
      const savedCfg = localStorage.getItem('clinic_firebase_config') || '';
      const body = `
        <p style="color:var(--text-secondary);font-size:13.5px;line-height:1.6;margin-bottom:14px;">
          Your Firebase Cloud Database is currently running in <strong>Local Mode</strong>.
        </p>
        <div class="form-group">
          <label>Paste Firebase Config JSON to Connect & Fetch Live Patients:</label>
          <textarea class="form-control" id="fbQuickConfig" rows="5" style="font-family:monospace;font-size:12px;" placeholder='{
  "apiKey": "AIzaSy...",
  "authDomain": "clinic-xyz.firebaseapp.com",
  "projectId": "clinic-xyz",
  "storageBucket": "clinic-xyz.appspot.com",
  "messagingSenderId": "...",
  "appId": "..."
}'>${App.escHtml(savedCfg)}</textarea>
        </div>
        <p style="font-size:12px;color:var(--text-muted);margin-top:4px;">
          Alternatively, you can load 10 comprehensive clinical dummy patients directly below.
        </p>
      `;

      const footer = `
        <button class="btn btn-secondary" onclick="App.closeModal()">Cancel</button>
        <button class="btn btn-secondary" onclick="App.closeModal();PatientsModule.seedDummyPatients()">Load Local Dummy Patients</button>
        <button class="btn btn-primary" onclick="PatientsModule._connectAndFetch()">Connect & Fetch from Cloud</button>
      `;

      App.openModal('☁️ Fetch Patients from Firebase', body, footer);
      return;
    }

    App.toast('☁️ Pulling patient records from Firebase Firestore...', 'info');
    const res = await window.CloudDB.fetchPatientsFromCloud();
    if (res !== null) {
      this.render();
    }
  },

  async _connectAndFetch() {
    const raw = (document.getElementById('fbQuickConfig').value || '').trim();
    if (!raw) {
      App.toast('Please enter a valid Firebase configuration JSON', 'error');
      return;
    }

    try {
      const config = CloudDB.parseConfigInput(raw);
      if (!config || !config.apiKey || !config.projectId) {
        App.toast('Missing apiKey or projectId in Firebase config', 'error');
        return;
      }

      const ok = CloudDB.connect(config, true);
      if (ok) {
        App.closeModal();
        App.toast('☁️ Firebase connected! Fetching patients...', 'info');
        const list = await CloudDB.fetchPatientsFromCloud();
        if (list !== null) {
          this.render();
        }
      }
    } catch (e) {
      App.toast(e.message, 'error');
    }
  },

  async seedDummyPatients() {
    App.toast('🌱 Loading 10 clinical dummy patients with cases, vitals & prescriptions...', 'info');
    const list = await CloudDB.seedDummyPatientsToCloud();
    App.toast(`✅ Loaded ${list.length} clinical patient records successfully!`, 'success');
    this.render();
  },
};

