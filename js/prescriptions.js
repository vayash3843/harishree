'use strict';
/* ============================================================
   prescriptions.js — Prescriptions module
   ============================================================ */

const PrescriptionsModule = {
  _drugCount: 1,

  render() {
    const el = document.getElementById('module-prescriptions');
    if (!el) return;

    const rxs = DB.getPrescriptions()
      .slice()
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    el.innerHTML = `
      <div class="page-header">
        <div>
          <h1>💊 Prescriptions</h1>
          <div class="subtitle">Create, manage and print prescriptions</div>
        </div>
        <button class="btn btn-primary" onclick="PrescriptionsModule.openNewRxModal()">➕ New Prescription</button>
      </div>

      <div class="card" style="padding:0;">
        <div class="table-wrapper">
          <table>
            <thead><tr>
              <th>Patient</th><th>Date</th><th>Medications</th><th>Notes</th><th>Actions</th>
            </tr></thead>
            <tbody>
              ${rxs.map(rx => `
                <tr>
                  <td style="font-weight:700;">${App.escHtml(rx.patientName)}</td>
                  <td>${App.formatDate(rx.createdAt)}</td>
                  <td>
                    ${rx.medications && rx.medications.length > 0
                      ? rx.medications.map(m => `<span class="badge" style="background:rgba(13,148,136,0.1);color:var(--primary);margin:2px;">${App.escHtml(m.name)}</span>`).join(' ')
                      : '—'}
                  </td>
                  <td style="color:var(--text-secondary);font-size:12px;">${App.escHtml((rx.notes||'').substring(0,40))}${(rx.notes||'').length>40?'…':''}</td>
                  <td>
                    <div class="td-actions">
                      <button class="btn btn-sm btn-secondary" onclick="PrescriptionsModule.viewRx('${rx.id}')">View</button>
                      <button class="btn btn-sm btn-primary"   onclick="PrescriptionsModule.printRx('${rx.id}')">🖨️ Print</button>
                      <button class="btn btn-sm btn-danger"    onclick="PrescriptionsModule._delete('${rx.id}')">Delete</button>
                    </div>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  },

  /* ── New Rx modal ── */
  openNewRxModal(prePatientId = '', visitId = '') {
    this._drugCount = 1;
    const patients = DB.getPatients();

    const body = `
      <div class="form-row">
        <div class="form-group">
          <label>Patient *</label>
          <select class="form-control" id="rxPatient">
            <option value="">Select patient</option>
            ${patients.map(p => `<option value="${p.id}" data-name="${App.escHtml(p.name)}" ${p.id===prePatientId?'selected':''}>${App.escHtml(p.name)}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label>Diagnosis / Notes</label>
          <input class="form-control" id="rxNotes" placeholder="e.g. For hypertension management">
        </div>
      </div>

      <hr class="section-divider">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
        <div style="font-size:12px;font-weight:700;color:var(--text-secondary);text-transform:uppercase;letter-spacing:0.06em;">💊 Medications</div>
        <button class="btn btn-sm btn-secondary" onclick="PrescriptionsModule._addDrug()">+ Add Drug</button>
      </div>
      <div id="drugsContainer">
        ${this._drugRowHTML(1)}
      </div>
    `;

    App.openModal('💊 New Prescription', body,
      `<button class="btn btn-secondary" onclick="App.closeModal()">Cancel</button>
       <button class="btn btn-primary"   onclick="PrescriptionsModule._save()">Save Prescription</button>`
    );
  },

  _drugRowHTML(n) {
    const medicines = DB.getMedicines();
    const doses = [
      '1 Tab (1 Tablet)',
      '1/2 Tab (Half Tablet)',
      '2 Tab (2 Tablets)',
      '1 Cap (1 Capsule)',
      '5 ml (1 Teaspoon)',
      '10 ml (2 Teaspoons)',
      '15 ml (1 Tablespoon)',
      '1 Ampoule (Injection)',
      '1 Vial (Injection)',
      '2 Drops',
      '4 Drops',
      '1 Puff',
      '2 Puffs',
      '1 Patch',
      '1 Sachet (Packet)',
      '500 mg',
      '650 mg',
      '250 mg',
      '100 mg'
    ];

    const freqs = [
      '1-0-1 After Food',
      '1-0-0 Morning',
      '0-0-1 Night',
      '1-1-1 Three times daily',
      '1-0-1 Before Food',
      '1-0-0 Before Breakfast',
      '0-0-1 At Bedtime',
      '1-1-1-1 Four times daily',
      'Once Daily (OD)',
      'Twice Daily (BD / BID)',
      'Thrice Daily (TDS / TID)',
      'As Needed (SOS / PRN)',
      'Every 8 Hours',
      'Every 12 Hours',
      'Weekly Once'
    ];

    const durations = [
      '3 Days',
      '5 Days',
      '7 Days',
      '10 Days',
      '14 Days (2 Weeks)',
      '15 Days',
      '21 Days',
      '1 Month (30 Days)',
      '2 Months (60 Days)',
      '3 Months (90 Days)',
      '1 Day (Single Dose)',
      'Continue / Long Term'
    ];

    return `
      <div class="drug-row" id="drug-row-${n}">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
          <span style="font-size:12px;font-weight:700;color:var(--text-muted);">Drug #${n}</span>
          ${n > 1 ? `<button class="btn btn-sm btn-danger" onclick="document.getElementById('drug-row-${n}').remove()">Remove</button>` : ''}
        </div>
        <div class="form-row">
          <div class="form-group" style="margin-bottom:8px;">
            <label>Select from Medicine Master (or type name)</label>
            <select class="form-control" onchange="PrescriptionsModule._onSelectMaster(this, ${n})">
              <option value="">-- Choose from Master Catalog --</option>
              ${medicines.map(m => `<option value="${m.id}" data-name="${App.escHtml(m.name)}" data-dose="${App.escHtml(m.dose||'')}" data-timing="${App.escHtml(m.timing||'')}">${App.escHtml(m.name)} (${App.escHtml(m.type||'Tab')} - ${App.escHtml(m.dose||'')})</option>`).join('')}
            </select>
          </div>
          <div class="form-group" style="margin-bottom:8px;">
            <label>Drug Name *</label>
            <input class="form-control drug-name" id="drug-name-${n}" placeholder="e.g. Paracetamol">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group" style="margin-bottom:8px;">
            <label>Dosage</label>
            <select class="form-control drug-dose" id="drug-dose-${n}">
              <option value="">-- Select Dosage --</option>
              ${doses.map(d => `<option value="${App.escHtml(d)}">${App.escHtml(d)}</option>`).join('')}
            </select>
          </div>
          <div class="form-group" style="margin-bottom:8px;">
            <label>Frequency / Timing</label>
            <select class="form-control drug-freq" id="drug-freq-${n}">
              <option value="">-- Select Frequency --</option>
              ${freqs.map(f => `<option value="${App.escHtml(f)}">${App.escHtml(f)}</option>`).join('')}
            </select>
          </div>
          <div class="form-group" style="margin-bottom:8px;">
            <label>Duration</label>
            <select class="form-control drug-duration" id="drug-duration-${n}">
              <option value="">-- Select Duration --</option>
              ${durations.map(dur => `<option value="${App.escHtml(dur)}">${App.escHtml(dur)}</option>`).join('')}
            </select>
          </div>
        </div>
      </div>
    `;
  },

  _onSelectMaster(selectEl, n) {
    const opt = selectEl.options[selectEl.selectedIndex];
    if (!opt || !opt.value) return;
    const name = opt.dataset.name || '';
    const dose = opt.dataset.dose || '';
    const timing = opt.dataset.timing || '';

    const nameInp = document.getElementById(`drug-name-${n}`);
    const doseSelect = document.getElementById(`drug-dose-${n}`);
    const freqSelect = document.getElementById(`drug-freq-${n}`);

    if (nameInp) nameInp.value = name;
    if (doseSelect && dose) {
      this._setOrAddSelectOption(doseSelect, dose);
    }
    if (freqSelect && timing) {
      this._setOrAddSelectOption(freqSelect, timing);
    }
    App.toast(`Loaded ${name} defaults from Medicine Master`, 'info', 1500);
  },

  _setOrAddSelectOption(selectEl, val) {
    let exists = false;
    for (let i = 0; i < selectEl.options.length; i++) {
      if (selectEl.options[i].value.toLowerCase() === val.toLowerCase()) {
        selectEl.selectedIndex = i;
        exists = true;
        break;
      }
    }
    if (!exists) {
      const newOpt = new Option(val, val, true, true);
      selectEl.add(newOpt);
    }
  },

  _addDrug() {
    this._drugCount++;
    document.getElementById('drugsContainer').insertAdjacentHTML('beforeend', this._drugRowHTML(this._drugCount));
  },

  _save() {
    const sel         = document.getElementById('rxPatient');
    const patientId   = sel.value;
    const patientName = sel.options[sel.selectedIndex]?.dataset.name || '';
    const notes       = document.getElementById('rxNotes').value.trim();

    if (!patientId) { App.toast('Please select a patient', 'error'); return; }

    const medications = [];
    document.querySelectorAll('.drug-row').forEach(row => {
      const name = row.querySelector('.drug-name').value.trim();
      if (name) {
        medications.push({
          name,
          dose:      row.querySelector('.drug-dose').value.trim(),
          frequency: (row.querySelector('.drug-freq')?.value || '').trim(),
          duration:  row.querySelector('.drug-duration').value.trim(),
        });
      }
    });

    if (medications.length === 0) { App.toast('Add at least one medication', 'error'); return; }

    DB.addPrescription({ patientId, patientName, notes, medications });
    App.closeModal();
    App.toast('Prescription saved', 'success');
    this.render();
  },

  _delete(id) {
    App.confirm('Delete this prescription?', () => {
      DB.deletePrescription(id);
      App.toast('Prescription deleted', 'info');
      this.render();
    });
  },

  viewRx(id) {
    const rx = DB.getPrescriptions().find(r => r.id === id);
    if (!rx) return;

    const body = `
      <div style="margin-bottom:16px;">
        <h3 style="font-size:16px;">${App.escHtml(rx.patientName)}</h3>
        <div style="color:var(--text-secondary);font-size:13px;">${App.formatDate(rx.createdAt)}</div>
        ${rx.notes ? `<div style="margin-top:6px;font-size:13px;color:var(--text-secondary);font-style:italic;">${App.escHtml(rx.notes)}</div>` : ''}
      </div>

      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>#</th><th>Drug</th><th>Dose</th><th>Frequency</th><th>Duration</th>
            </tr>
          </thead>
          <tbody>
            ${(rx.medications||[]).map((m, i) => `
              <tr>
                <td style="color:var(--text-muted);">${i+1}</td>
                <td style="font-weight:700;">${App.escHtml(m.name)}</td>
                <td>${App.escHtml(m.dose)}</td>
                <td>${App.escHtml(m.frequency)}</td>
                <td>${App.escHtml(m.duration)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;

    App.openModal('Prescription Details', body,
      `<button class="btn btn-secondary" onclick="App.closeModal()">Close</button>
       <button class="btn btn-primary" onclick="App.closeModal();PrescriptionsModule.printRx('${rx.id}')">🖨️ Print</button>`
    );
  },

  printRx(id) {
    const rx = DB.getPrescriptions().find(r => r.id === id);
    if (!rx) return;
    if (typeof DashboardModule !== 'undefined' && DashboardModule._executePrintData) {
      DashboardModule._activePatientId = rx.patientId;
      DashboardModule._activePatientName = rx.patientName;
      DashboardModule._rxList = (rx.medications || []).map(m => ({
        name: m.name,
        m: m.m || '1',
        a: m.a || '0',
        n: m.n || '1',
        s: m.s || '0',
        day: m.day || 3,
        qty: m.qty || 6,
        rate: m.rate || 0,
        total: m.total || 0,
        remark: m.remark || 'જમ્યા પછી (After Food)',
        method: m.method || 'TABLET'
      }));
      DashboardModule._executePrintData(rx.patientName);
    }
  },
};
