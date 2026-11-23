'use strict';
/* ============================================================
   charges.js — Charges Master module (Desktop Software Match)
   ============================================================ */

const ChargesModule = {
  searchQuery: '',
  editingId: null,

  render() {
    const el = document.getElementById('module-charges');
    if (!el) return;

    el.innerHTML = `
      <!-- Header Banner -->
      <div class="win-title-bar" style="margin-bottom:var(--gap-sm);">
        <div style="font-size:15px;font-weight:900;width:100%;text-align:center;">💵 Charges Master</div>
      </div>

      <!-- Top Form Entry Box -->
      <div class="card" style="padding:14px;margin-bottom:var(--gap-md);background:var(--bg-elevated);border:1px solid var(--border-strong);font-size:12px;">
        
        <div style="display:flex;gap:12px;flex-wrap:wrap;align-items:flex-end;margin-bottom:12px;">
          <div style="flex:2;min-width:180px;display:flex;flex-direction:column;gap:3px;">
            <label style="font-weight:700;color:var(--text-secondary);">Charge / Case Type Name :</label>
            <input class="form-control" id="chName" placeholder="e.g. NEW OPD CONSULTATION, GP-2 FOLLOW UP, ECG" style="height:30px;font-weight:700;">
          </div>

          <div style="flex:1;min-width:140px;display:flex;flex-direction:column;gap:3px;">
            <label style="font-weight:700;color:var(--text-secondary);">Category :</label>
            <select class="form-control" id="chCategory" style="height:30px;">
              <option>Consultation</option>
              <option>Follow-Up</option>
              <option>Procedure</option>
              <option>Diagnostics</option>
              <option>Vaccines</option>
              <option>Ayurvedic</option>
              <option>Other</option>
            </select>
          </div>

          <div style="flex:1;min-width:120px;display:flex;flex-direction:column;gap:3px;">
            <label style="font-weight:700;color:var(--primary);">Rate / Amount (₹) :</label>
            <input class="form-control" id="chAmount" placeholder="100" style="height:30px;font-weight:700;color:var(--primary);">
          </div>

          <div style="flex:2;min-width:200px;display:flex;flex-direction:column;gap:3px;">
            <label style="font-weight:700;color:var(--text-secondary);">Notes / Description :</label>
            <input class="form-control" id="chNotes" placeholder="Default rate description…" style="height:30px;">
          </div>
        </div>

        <!-- Action Buttons Row -->
        <div class="win-action-footer-btns" style="margin-bottom:0;justify-content:center;display:flex;gap:8px;">
          <button class="win-act-btn" id="chSaveBtn" style="background:var(--primary);color:#fff;min-width:110px;" onclick="ChargesModule._save()">Save</button>
          <button class="win-act-btn" style="min-width:110px;" onclick="ChargesModule._deleteCurrent()">Delete</button>
          <button class="win-act-btn" style="min-width:110px;" onclick="ChargesModule._clearForm()">Cancel</button>
        </div>

      </div>

      <!-- Search Bar -->
      <div class="card" style="padding:10px 14px;margin-bottom:var(--gap-md);background:var(--bg-elevated);border:1px solid var(--border-strong);">
        <div style="display:flex;align-items:center;gap:14px;flex-wrap:wrap;">
          <span style="font-weight:700;font-size:12px;color:var(--text-secondary);">🔍 Search Charges :</span>
          <div class="search-bar" style="flex:1;min-width:220px;padding:4px 10px;">
            <input type="text" id="chargeSearch" placeholder="Type charge name or category to search…"
                   value="${App.escHtml(this.searchQuery)}"
                   oninput="ChargesModule._onSearch(this.value)">
          </div>
        </div>
      </div>

      <!-- Catalog Table -->
      <div class="card" style="padding:0;">
        <div id="chargesTable"></div>
      </div>
    `;

    this._renderTable();
  },

  _onSearch(q) {
    this.searchQuery = q;
    this._renderTable();
  },

  _clearForm() {
    this.editingId = null;
    ['chName','chAmount','chNotes'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
    const btn = document.getElementById('chSaveBtn');
    if (btn) { btn.textContent = 'Save'; btn.style.background = 'var(--primary)'; }
    App.toast('Form cleared', 'info', 1200);
  },

  _renderTable() {
    const el = document.getElementById('chargesTable');
    if (!el) return;

    let charges = DB.getCharges();
    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase();
      charges = charges.filter(c =>
        c.name.toLowerCase().includes(q) ||
        (c.category && c.category.toLowerCase().includes(q)) ||
        (c.notes && c.notes.toLowerCase().includes(q))
      );
    }

    if (charges.length === 0) {
      el.innerHTML = `
        <div class="table-wrapper" style="max-height:480px;overflow-y:auto;overflow-x:hidden;width:100%;">
          <table class="win-table" style="font-size:12px;">
            <thead>
              <tr>
                <th>#</th>
                <th>Charge / Case Type Name</th>
                <th>Category</th>
                <th style="text-align:right;">Amount (₹)</th>
                <th>Notes / Description</th>
                <th style="text-align:center;">Actions</th>
              </tr>
            </thead>
            <tbody></tbody>
          </table>
        </div>
      `;
      return;
    }

    el.innerHTML = `
      <div class="table-wrapper" style="max-height:480px;overflow-y:auto;overflow-x:hidden;width:100%;">
        <table class="win-table" style="font-size:12px;">
          <thead>
            <tr>
              <th>#</th>
              <th>Charge / Case Type Name</th>
              <th>Category</th>
              <th style="text-align:right;">Amount (₹)</th>
              <th>Notes / Description</th>
              <th style="text-align:center;">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${charges.map((c, idx) => `
              <tr style="cursor:pointer;" ondblclick="ChargesModule.loadChargeToForm('${c.id}')" title="Double click to edit charge rate">
                <td>${idx+1}</td>
                <td style="font-weight:700;color:var(--primary);" ondblclick="ChargesModule.loadChargeToForm('${c.id}')">
                  ${App.escHtml(c.name)}
                </td>
                <td><span class="badge badge-completed">${App.escHtml(c.category||'General')}</span></td>
                <td style="font-weight:800;color:var(--primary);text-align:right;font-size:13px;">
                  ₹${Number(c.amount||0).toFixed(0)}
                </td>
                <td style="color:var(--text-secondary);">${App.escHtml(c.notes||'—')}</td>
                <td style="text-align:center;">
                  <div class="td-actions" style="justify-content:center;">
                    <button class="btn btn-sm btn-secondary" onclick="ChargesModule.loadChargeToForm('${c.id}')" title="Edit">✏️</button>
                    <button class="btn btn-sm btn-danger"    onclick="ChargesModule.deleteCharge('${c.id}')" title="Delete">🗑️</button>
                  </div>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  },

  loadChargeToForm(id) {
    const c = DB.getCharges().find(item => item.id === id);
    if (!c) return;

    this.editingId = id;
    if (document.getElementById('chName'))     document.getElementById('chName').value = c.name || '';
    if (document.getElementById('chCategory')) document.getElementById('chCategory').value = c.category || 'Consultation';
    if (document.getElementById('chAmount'))   document.getElementById('chAmount').value = c.amount || 0;
    if (document.getElementById('chNotes'))    document.getElementById('chNotes').value = c.notes || '';

    const btn = document.getElementById('chSaveBtn');
    if (btn) { btn.textContent = 'Update'; btn.style.background = 'var(--accent)'; }

    const input = document.getElementById('chName');
    if (input) { input.focus(); input.select(); }

    App.toast(`Loaded ${c.name} (₹${c.amount}) into form ✏️`, 'info', 1500);
  },

  _save() {
    const name = document.getElementById('chName').value.trim();
    if (!name) { App.toast('Please enter Charge Name', 'error'); return; }

    const amount = parseFloat(document.getElementById('chAmount').value) || 0;
    const category = document.getElementById('chCategory').value;
    const notes = document.getElementById('chNotes').value.trim();

    const item = { name, category, amount, notes };

    if (this.editingId) {
      DB.updateCharge(this.editingId, item);
      App.toast('Charge updated in Charges Master ✅', 'success');
      this.editingId = null;
    } else {
      DB.addCharge(item);
      App.toast('Charge saved to Charges Master ✅', 'success');
    }
    this._clearForm();
    this.render();
  },

  _deleteCurrent() {
    if (!this.editingId) {
      App.toast('Double click a row to select charge to delete', 'info');
      return;
    }
    this.deleteCharge(this.editingId);
  },

  deleteCharge(id) {
    App.confirm('Delete this charge rate from Charges Master?', () => {
      DB.deleteCharge(id);
      App.toast('Charge rate deleted', 'info');
      if (this.editingId === id) this._clearForm();
      this.render();
    });
  }
};
