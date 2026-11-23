'use strict';
/* ============================================================
   opd.js — OPD (Outpatient Department) Collection module
   ============================================================ */

const OpdModule = {

  render() {
    const el = document.getElementById('module-opd');
    if (!el) return;

    const entries  = this._getEntries();
    const today    = new Date().toISOString().split('T')[0];

    const todayEntries = entries.filter(e => e.date === today);
    const todayTotal   = todayEntries.reduce((s, e) => s + (Number(e.amount) || 0), 0);

    el.innerHTML = `
      <div class="page-header">
        <div>
          <h1>🏥 OPD Collection</h1>
          <div class="subtitle">Reception OPD fee & collection records</div>
        </div>
        <button class="btn btn-primary" onclick="OpdModule.openAddModal()">➕ Add Collection</button>
      </div>

      <!-- Stats -->
      <div class="stats-grid" style="grid-template-columns:repeat(auto-fit,minmax(180px,1fr));margin-bottom:var(--gap-lg);">
        <div class="stat-card teal">
          <div class="stat-icon teal">📅</div>
          <div class="stat-info">
            <div class="stat-value">₹${todayTotal.toFixed(0)}</div>
            <div class="stat-label">Today's Collection</div>
          </div>
        </div>
        <div class="stat-card indigo">
          <div class="stat-icon indigo">📋</div>
          <div class="stat-info">
            <div class="stat-value">${entries.length}</div>
            <div class="stat-label">Collection Records</div>
          </div>
        </div>
        <div class="stat-card amber">
          <div class="stat-icon amber">🧾</div>
          <div class="stat-info">
            <div class="stat-value">${todayEntries.length}</div>
            <div class="stat-label">Today's Patients</div>
          </div>
        </div>
      </div>

      <!-- Date filter + table -->
      <div class="card" style="padding:0;">
        <div style="padding:var(--gap-md) var(--gap-lg);border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:var(--gap-sm);">
          <div class="card-title" style="margin:0;">📋 Collection Records</div>
          <div style="display:flex;align-items:center;gap:var(--gap-sm);">
            <label style="font-size:12px;font-weight:700;color:var(--text-secondary);text-transform:uppercase;letter-spacing:0.05em;">Filter Date</label>
            <input type="date" class="form-control" id="opdDateFilter"
                   style="width:auto;padding:6px 10px;"
                   value="${today}"
                   onchange="OpdModule._renderTable(this.value)">
            <button class="btn btn-sm btn-secondary" onclick="OpdModule._renderTable('')">All</button>
          </div>
        </div>
        <div id="opdTable"></div>
      </div>
    `;

    this._renderTable(today);
  },

  _renderTable(dateFilter) {
    const el = document.getElementById('opdTable');
    if (!el) return;

    let entries = this._getEntries().slice().sort((a, b) => {
      if (a.date !== b.date) return b.date.localeCompare(a.date);
      return b.createdAt.localeCompare(a.createdAt);
    });

    if (dateFilter) {
      entries = entries.filter(e => e.date === dateFilter);
    }

    if (entries.length === 0) {
      el.innerHTML = `
        <div class="table-wrapper">
          <table class="opd-table">
            <thead>
              <tr>
                <th>Patient Name</th>
                <th>OPD No</th>
                <th>Fee Amount (₹)</th>
                <th>Payment Mode</th>
                <th>Date & Time</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody></tbody>
          </table>
        </div>
      `;
      return;
    }

    const dayTotal = entries.reduce((s, e) => s + (Number(e.amount) || 0), 0);

    const modeColors = {
      Cash:   'badge-completed',
      Card:   'badge-scheduled',
      UPI:    'badge-paid',
      Online: 'badge-pending',
      Other:  'badge-cancelled',
    };

    el.innerHTML = `
      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Patient Name</th>
              <th>Date</th>
              <th>Type</th>
              <th>Amount</th>
              <th>Payment Mode</th>
              <th>Note</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${entries.map(e => `
              <tr>
                <td style="font-weight:700;">${App.escHtml(e.patientName||'Walk-in')}</td>
                <td>${App.formatDate(e.date)}</td>
                <td>
                  <span class="badge" style="background:rgba(13,148,136,0.1);color:var(--primary);">
                    ${App.escHtml(e.type||'Consultation')}
                  </span>
                </td>
                <td style="font-weight:800;color:var(--success);font-size:15px;">
                  $${Number(e.amount).toFixed(2)}
                </td>
                <td>
                  <span class="badge ${modeColors[e.payMode]||'badge-scheduled'}">
                    ${App.escHtml(e.payMode||'Cash')}
                  </span>
                </td>
                <td style="color:var(--text-secondary);font-size:12px;">${App.escHtml((e.note||'').substring(0,40))}</td>
                <td>
                  <div class="td-actions">
                    <button class="btn btn-sm btn-danger" onclick="OpdModule._delete('${e.id}')">Delete</button>
                  </div>
                </td>
              </tr>
            `).join('')}
          </tbody>
          <tfoot>
            <tr style="background:var(--bg-elevated);">
              <td colspan="3" style="padding:12px 16px;font-weight:700;color:var(--text-secondary);">
                ${dateFilter ? `Total for ${App.formatDate(dateFilter)}` : 'Grand Total'} (${entries.length} entries)
              </td>
              <td colspan="4" style="padding:12px 16px;font-weight:900;font-size:18px;color:var(--primary);">
                $${dayTotal.toFixed(2)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    `;
  },

  openAddModal() {
    const patients = DB.getPatients();
    const today    = new Date().toISOString().split('T')[0];
    const types    = ['Consultation','Follow-up','Dressing','Injection','Lab Test','X-Ray','ECG','Vaccination','Other'];
    const modes    = ['Cash','Card','UPI','Online','Other'];

    const body = `
      <div class="form-row">
        <div class="form-group">
          <label>Patient Name</label>
          <input class="form-control" id="opdPatientName" list="opdPatientList" placeholder="Type name or select patient">
          <datalist id="opdPatientList">
            ${patients.map(p => `<option value="${App.escHtml(p.name)}">`).join('')}
          </datalist>
        </div>
        <div class="form-group">
          <label>Date</label>
          <input class="form-control" id="opdDate" type="date" value="${today}">
        </div>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label>Visit Type</label>
          <select class="form-control" id="opdType">
            ${types.map(t => `<option>${t}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label>Amount ($) *</label>
          <input class="form-control" id="opdAmount" type="number" min="0" step="0.01" placeholder="0.00">
        </div>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label>Payment Mode</label>
          <select class="form-control" id="opdPayMode">
            ${modes.map(m => `<option>${m}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label>Receipt / Note</label>
          <input class="form-control" id="opdNote" placeholder="Optional note or receipt no.">
        </div>
      </div>
    `;

    App.openModal('🏥 Add OPD Collection', body,
      `<button class="btn btn-secondary" onclick="App.closeModal()">Cancel</button>
       <button class="btn btn-primary"   onclick="OpdModule._save()">Save Collection</button>`
    );
  },

  _save() {
    const patientName = document.getElementById('opdPatientName').value.trim() || 'Walk-in';
    const date        = document.getElementById('opdDate').value;
    const type        = document.getElementById('opdType').value;
    const amount      = parseFloat(document.getElementById('opdAmount').value);
    const payMode     = document.getElementById('opdPayMode').value;
    const note        = document.getElementById('opdNote').value.trim();

    if (!date)              { App.toast('Please select a date', 'error');        return; }
    if (isNaN(amount) || amount <= 0) { App.toast('Please enter a valid amount', 'error'); return; }

    const entries = this._getEntries();
    entries.push({
      id: DB.genId(),
      patientName,
      date,
      type,
      amount,
      payMode,
      note,
      createdAt: new Date().toISOString(),
    });
    this._saveEntries(entries);

    App.closeModal();
    App.toast(`$${amount.toFixed(2)} OPD collection recorded ✅`, 'success');
    this.render();
  },

  _delete(id) {
    App.confirm('Delete this OPD collection entry?', () => {
      const entries = this._getEntries().filter(e => e.id !== id);
      this._saveEntries(entries);
      App.toast('Entry deleted', 'info');
      this.render();
    });
  },

  /* ── Storage helpers ── */
  _getEntries() {
    let entries = [];
    try { entries = JSON.parse(localStorage.getItem('opd_entries') || '[]'); } catch { entries = []; }
    
    // Seed initial reception collection data if empty
    if (entries.length === 0) {
      const today = new Date().toISOString().split('T')[0];
      entries = [
        { id: 'opd_rec_1', patientName: 'Sarah Johnson', date: today, type: 'Consultation & BP', amount: 65, payMode: 'Cash', note: 'Reception Collection', createdAt: new Date().toISOString() },
        { id: 'opd_rec_2', patientName: 'Ahmed Al-Rashidi', date: today, type: 'Consultation Fee', amount: 50, payMode: 'UPI', note: 'Reception OPD Fee', createdAt: new Date().toISOString() }
      ];
      this._saveEntries(entries);
    }
    return entries;
  },
  _saveEntries(data) { localStorage.setItem('opd_entries', JSON.stringify(data)); },
};
