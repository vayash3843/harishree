'use strict';
/* ============================================================
   medicines.js — Outside Medicine Master module (Desktop Software Exact Image 1 Match)
   ============================================================ */

const MedicinesModule = {
  searchQuery: '',
  searchFilter: 'medicine', // 'medicine' | 'dower' | 'generic'
  editingId: null,

  render() {
    const el = document.getElementById('module-medicines');
    if (!el) return;

    el.innerHTML = `
      <!-- Header Banner -->
      <div class="win-title-bar" style="margin-bottom:var(--gap-sm);">
        <div style="font-size:15px;font-weight:900;width:100%;text-align:center;">Outside Medicine Master</div>
      </div>

      <!-- Top Form Entry Box (Image 1 Exact Layout Match) -->
      <div class="card" style="padding:14px;margin-bottom:var(--gap-md);background:var(--bg-elevated);border:1px solid var(--border-strong);font-size:11px;">
        
        <!-- Row 1: Top Label Fields (Medicine Name, Generic, Packing, Op.Stock, Loss Qnty, Total Qnty, Unit, Op Rate Per Qnty, Total, Type) -->
        <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:flex-end;margin-bottom:12px;">
          
          <div style="flex:2;min-width:140px;display:flex;flex-direction:column;gap:3px;">
            <label style="font-weight:700;color:var(--text-secondary);">Medicine Name</label>
            <input class="form-control" id="mName" placeholder="" style="height:28px;font-weight:700;">
          </div>

          <div style="flex:2;min-width:140px;display:flex;flex-direction:column;gap:3px;">
            <label style="font-weight:700;color:var(--text-secondary);">Generic</label>
            <input class="form-control" id="mGeneric" placeholder="" style="height:28px;">
          </div>

          <div style="flex:1;min-width:70px;display:flex;flex-direction:column;gap:3px;">
            <label style="font-weight:700;color:var(--text-secondary);">Packing</label>
            <input class="form-control" id="mPacking" placeholder="" value="" style="height:28px;">
          </div>

          <div style="flex:1;min-width:65px;display:flex;flex-direction:column;gap:3px;">
            <label style="font-weight:700;color:var(--text-secondary);">Op.Stock</label>
            <input class="form-control" id="mOpStock" value="" oninput="MedicinesModule._calcStock()" style="height:28px;">
          </div>

          <div style="flex:1;min-width:65px;display:flex;flex-direction:column;gap:3px;">
            <label style="font-weight:700;color:var(--text-secondary);">Loss Qnty</label>
            <input class="form-control" id="mLossQnty" value="" oninput="MedicinesModule._calcStock()" style="height:28px;">
          </div>

          <div style="flex:1;min-width:65px;display:flex;flex-direction:column;gap:3px;">
            <label style="font-weight:700;color:var(--text-secondary);">Total Qnty</label>
            <input class="form-control" id="mTotalQnty" value="" oninput="MedicinesModule._calcStock()" style="height:28px;">
          </div>

          <div style="flex:1;min-width:90px;display:flex;flex-direction:column;gap:3px;">
            <label style="font-weight:700;color:var(--text-secondary);">Unit</label>
            <select class="form-control" id="mUnit" style="height:28px;">
              <option>TAB.</option>
              <option>CAP.</option>
              <option>SYP.</option>
              <option>INJ.</option>
              <option>OINT.</option>
              <option>DROPS</option>
              <option>BOTTEL</option>
              <option>I.V SET</option>
              <option>CHURN</option>
              <option>GHRIT</option>
              <option>KWATH</option>
              <option>OIL</option>
              <option>SACHET</option>
              <option>RESPULES</option>
              <option>LOTION</option>
              <option>SOAP</option>
              <option>CREAM</option>
              <option>GEL</option>
              <option>SUPPOSITORY</option>
              <option>FIXATOR</option>
              <option>TUBE</option>
              <option>VIAL</option>
              <option>AMPOULE</option>
              <option>PACK</option>
            </select>
          </div>

          <div style="flex:1;min-width:100px;display:flex;flex-direction:column;gap:3px;">
            <label style="font-weight:700;color:var(--text-secondary);">Op Rate Per Qnty</label>
            <input class="form-control" id="mOpRate" value="" oninput="MedicinesModule._calcStock()" style="height:28px;">
          </div>

          <div style="flex:1;min-width:65px;display:flex;flex-direction:column;gap:3px;">
            <label style="font-weight:700;color:var(--text-secondary);">Total</label>
            <input class="form-control" id="mTotal" value="" style="height:28px;">
          </div>

          <div style="flex:1;min-width:90px;display:flex;flex-direction:column;gap:3px;">
            <label style="font-weight:700;color:var(--text-secondary);">Type</label>
            <select class="form-control" id="mType" style="height:28px;">
              <option>ALLOPATHIC</option>
              <option>AYURVEDIC</option>
              <option>GENERAL</option>
            </select>
          </div>

        </div>

        <!-- Row 2: Checkboxes, MRP Per Pack, Or.Qnty, M A N S dosage boxes, Dower No -->
        <div style="display:flex;gap:12px;flex-wrap:wrap;align-items:center;margin-bottom:12px;">
          
          <!-- Checkboxes -->
          <div style="display:flex;gap:12px;align-items:center;">
            <label class="opd-radio" style="font-weight:700;"><input type="checkbox" id="mDisplayIndoor" checked> Display Indoor</label>
            <label class="opd-radio" style="font-weight:700;"><input type="checkbox" id="mIsTablet"> Tablet</label>
            <label class="opd-radio" style="font-weight:700;"><input type="checkbox" id="mDisplayOpd" checked> Display OPD</label>
          </div>

          <!-- MRP Per Pack -->
          <div style="display:flex;align-items:center;gap:6px;">
            <label style="font-weight:700;white-space:nowrap;">MRP Per Pack :</label>
            <input class="form-control" id="mMrpPack" placeholder="" value="" style="width:80px;height:28px;">
          </div>

          <!-- Or.Qnty -->
          <div style="display:flex;align-items:center;gap:6px;">
            <label style="font-weight:700;white-space:nowrap;">Or.Qnty :</label>
            <input class="form-control" id="mOrQty" value="" style="width:70px;height:28px;">
          </div>

          <!-- M A N S Dosage inputs -->
          <div style="display:flex;gap:4px;align-items:center;text-align:center;">
            <div style="display:flex;flex-direction:column;align-items:center;">
              <span style="font-weight:800;font-size:10px;">M</span>
              <input class="form-control" id="mDoseM" value="" style="width:32px;height:26px;text-align:center;padding:2px;">
            </div>
            <div style="display:flex;flex-direction:column;align-items:center;">
              <span style="font-weight:800;font-size:10px;">A</span>
              <input class="form-control" id="mDoseA" value="" style="width:32px;height:26px;text-align:center;padding:2px;">
            </div>
            <div style="display:flex;flex-direction:column;align-items:center;">
              <span style="font-weight:800;font-size:10px;">N</span>
              <input class="form-control" id="mDoseN" value="" style="width:32px;height:26px;text-align:center;padding:2px;">
            </div>
            <div style="display:flex;flex-direction:column;align-items:center;">
              <span style="font-weight:800;font-size:10px;">S</span>
              <input class="form-control" id="mDoseS" value="" style="width:32px;height:26px;text-align:center;padding:2px;">
            </div>
          </div>

          <!-- Dower No -->
          <div style="display:flex;align-items:center;gap:6px;margin-left:auto;">
            <label style="font-weight:700;white-space:nowrap;">Dower No :</label>
            <select class="form-control" id="mDower" style="width:85px;height:28px;">
              <option value="">--</option>
              <option>G24</option>
              <option>G23</option>
              <option>G3/1</option>
              <option>95</option>
              <option>99</option>
            </select>
          </div>

        </div>

        <!-- Row 3: Method, Or Max Qnty, PTR, Stock Dower No -->
        <div style="display:flex;gap:12px;flex-wrap:wrap;align-items:center;margin-bottom:12px;">
          
          <div style="display:flex;align-items:center;gap:6px;flex:1;min-width:200px;">
            <label style="font-weight:700;white-space:nowrap;">Method :</label>
            <select class="form-control" id="mMethod" style="flex:1;height:28px;">
              <option>INJECTION / IV</option>
              <option>IM (Intramuscular Injection)</option>
              <option>IV (Intravenous Injection)</option>
              <option>TABLET</option>
              <option>CAPSULE</option>
              <option>SYRUP / LIQUID</option>
              <option>DROPS (EYE / EAR / NASAL)</option>
              <option>TOPICAL (OINTMENT / GEL)</option>
              <option>EXTERNAL USE</option>
            </select>
          </div>

          <div style="display:flex;align-items:center;gap:6px;">
            <label style="font-weight:700;white-space:nowrap;">Or Max Qnty :</label>
            <input class="form-control" id="mMaxQty" value="" style="width:80px;height:28px;">
          </div>

          <div style="display:flex;align-items:center;gap:6px;">
            <label style="font-weight:700;white-space:nowrap;">PTR :</label>
            <input class="form-control" id="mPtr" value="" style="width:80px;height:28px;">
          </div>

          <div style="display:flex;align-items:center;gap:6px;margin-left:auto;">
            <label style="font-weight:700;white-space:nowrap;">Stock Dower No :</label>
            <select class="form-control" id="mStockDower" style="width:90px;height:28px;">
              <option value="">--</option>
              <option>S1/2/2</option>
              <option>S1/1</option>
              <option>S3/2</option>
              <option>S1/6</option>
              <option>S3/3/</option>
              <option>HO</option>
            </select>
          </div>

        </div>

        <!-- Row 4: Use -->
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:14px;">
          <label style="font-weight:700;white-space:nowrap;">Use :</label>
          <input class="form-control" id="mUse" placeholder="e.g. For Vitamin C & Immunity / Infection / Pain" value="" style="flex:1;height:28px;">
        </div>

        <!-- Action Buttons Row (Save, Delete, Cancel) -->
        <div class="win-action-footer-btns" style="margin-bottom:0;justify-content:center;display:flex;gap:8px;">
          <button class="win-act-btn" id="mSaveBtn" style="background:var(--primary);color:#fff;min-width:110px;" onclick="MedicinesModule._saveNew()">Save</button>
          <button class="win-act-btn" style="min-width:110px;" onclick="MedicinesModule._deleteCurrent()">Delete</button>
          <button class="win-act-btn" style="min-width:110px;" onclick="MedicinesModule._clearForm()">Cancel</button>
        </div>

      </div>

      <!-- Search & Radio Selection Bar -->
      <div class="card" style="padding:10px 14px;margin-bottom:var(--gap-md);background:var(--bg-elevated);border:1px solid var(--border-strong);">
        <div style="display:flex;align-items:center;gap:14px;flex-wrap:wrap;">
          <label class="opd-radio"><input type="radio" name="medSearchFilter" value="medicine" ${this.searchFilter==='medicine'?'checked':''} onchange="MedicinesModule._setSearchFilter('medicine')"> Medicine (Brand) :</label>
          <label class="opd-radio"><input type="radio" name="medSearchFilter" value="dower"    ${this.searchFilter==='dower'   ?'checked':''} onchange="MedicinesModule._setSearchFilter('dower')"> Dower No :</label>
          <label class="opd-radio"><input type="radio" name="medSearchFilter" value="generic"  ${this.searchFilter==='generic' ?'checked':''} onchange="MedicinesModule._setSearchFilter('generic')"> Generic (Content) :</label>
          <div class="search-bar" style="flex:1;min-width:220px;padding:4px 10px;">
            <span>🔍</span>
            <input type="text" id="medicineSearch" placeholder="Type search query…"
                   value="${App.escHtml(this.searchQuery)}"
                   oninput="MedicinesModule._onSearch(this.value)">
          </div>
        </div>
      </div>

      <!-- Catalog Table Card -->
      <div class="card" style="padding:0;">
        <div id="medicinesTable"></div>
      </div>
    `;

    this._renderTable();
  },

  _calcStock() {
    const op = document.getElementById('mOpStock');
    const loss = document.getElementById('mLossQnty');
    const totQ = document.getElementById('mTotalQnty');
    const rate = document.getElementById('mOpRate');
    const tot = document.getElementById('mTotal');
    const orQ = document.getElementById('mOrQty');

    if (op && totQ && op.value !== '') {
      const opVal = parseFloat(op.value) || 0;
      const lossVal = parseFloat(loss ? loss.value : 0) || 0;
      const calcTotQ = Math.max(0, opVal - lossVal);
      totQ.value = calcTotQ;
      if (orQ && (!orQ.value || orQ.value == opVal)) orQ.value = calcTotQ;

      if (rate && tot && rate.value !== '') {
        tot.value = (calcTotQ * (parseFloat(rate.value) || 0)).toFixed(2);
      }
    }
  },

  _setSearchFilter(f) {
    this.searchFilter = f;
    this._renderTable();
  },

  _onSearch(q) {
    this.searchQuery = q;
    this._renderTable();
  },

  _clearForm() {
    this.editingId = null;
    ['mName','mGeneric','mPacking','mOpStock','mLossQnty','mTotalQnty','mOpRate','mTotal','mMrpPack','mOrQty','mDoseM','mDoseA','mDoseN','mDoseS','mMaxQty','mPtr','mUse'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
    if (document.getElementById('mDower')) document.getElementById('mDower').value = '';
    if (document.getElementById('mStockDower')) document.getElementById('mStockDower').value = '';
    if (document.getElementById('mIsTablet')) document.getElementById('mIsTablet').checked = false;
    const saveBtn = document.getElementById('mSaveBtn');
    if (saveBtn) { saveBtn.textContent = 'Save'; saveBtn.style.background = 'var(--primary)'; }
    App.toast('Form cleared','info', 1200);
  },

  _renderTable() {
    const el = document.getElementById('medicinesTable');
    if (!el) return;

    let medicines = DB.getMedicines();
    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase();
      medicines = medicines.filter(m => {
        if (this.searchFilter === 'dower') return (m.dower && m.dower.toLowerCase().includes(q)) || (m.stockDower && m.stockDower.toLowerCase().includes(q));
        if (this.searchFilter === 'generic') return m.generic && m.generic.toLowerCase().includes(q);
        return m.name && m.name.toLowerCase().includes(q);
      });
    }

    if (medicines.length === 0) {
      el.innerHTML = `
        <div class="table-wrapper" style="max-height:480px;overflow-y:auto;overflow-x:auto;width:100%;">
          <table class="win-table" style="font-size:12px;">
            <thead>
              <tr>
                <th>Medicine Name (Brand)</th>
                <th>Unit</th>
                <th>MRP</th>
                <th>Or.Qty</th>
                <th>Generic (Content)</th>
                <th style="text-align:center;">Display Indoor</th>
                <th style="text-align:center;">Display OPD</th>
                <th style="text-align:center;">Not Use</th>
                <th style="text-align:center;">Re Order</th>
                <th>Max</th>
                <th>Dower</th>
                <th>Stock Dower</th>
                <th>PTR</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody></tbody>
          </table>
        </div>
      `;
      return;
    }

    el.innerHTML = `
      <div class="table-wrapper" style="max-height:480px;overflow-y:auto;overflow-x:auto;width:100%;">
        <table class="win-table" style="font-size:12px;">
          <thead>
            <tr>
              <th>Medicine Name (Brand)</th>
              <th>Unit</th>
              <th>MRP</th>
              <th>Or.Qty</th>
              <th>Generic (Content)</th>
              <th style="text-align:center;">Display Indoor</th>
              <th style="text-align:center;">Display OPD</th>
              <th style="text-align:center;">Not Use</th>
              <th style="text-align:center;">Re Order</th>
              <th>Max</th>
              <th>Dower</th>
              <th>Stock Dower</th>
              <th>PTR</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${medicines.map((m, idx) => `
              <tr style="cursor:pointer;" ondblclick="MedicinesModule.loadMedicineToForm('${m.id}')" title="Double click to edit medicine detail">
                <td style="font-weight:700;color:var(--primary);min-width:170px;" ondblclick="MedicinesModule.loadMedicineToForm('${m.id}')">
                  ${idx+1}.${App.escHtml(m.name)}
                </td>
                <td><span class="badge" style="background:rgba(99,102,241,0.12);color:var(--accent);">${App.escHtml(m.unit||'INJ.')}</span></td>
                <td style="font-weight:700;color:var(--primary);">${Number(m.mrppack||m.price||0).toFixed(2)}</td>
                <td style="text-align:center;">${m.orqty||m.stock||0}</td>
                <td style="color:var(--text-primary);font-size:11px;font-weight:700;max-width:220px;">${App.escHtml(m.generic||'—')}</td>
                <td style="text-align:center;">
                  <input type="checkbox" style="width:16px;height:16px;cursor:pointer;" ${m.displayIndoor!==false?'checked':''}
                         onchange="MedicinesModule._toggleFlag('${m.id}', 'displayIndoor', this.checked)" title="Toggle Display Indoor">
                </td>
                <td style="text-align:center;">
                  <input type="checkbox" style="width:16px;height:16px;cursor:pointer;" ${m.displayOpd!==false?'checked':''}
                         onchange="MedicinesModule._toggleFlag('${m.id}', 'displayOpd', this.checked)" title="Toggle Display OPD">
                </td>
                <td style="text-align:center;">
                  <input type="checkbox" style="width:16px;height:16px;cursor:pointer;" ${m.notUse?'checked':''}
                         onchange="MedicinesModule._toggleFlag('${m.id}', 'notUse', this.checked)" title="Toggle Not Use">
                </td>
                <td style="text-align:center;">
                  <input type="checkbox" style="width:16px;height:16px;cursor:pointer;" ${m.reOrder!==false?'checked':''}
                         onchange="MedicinesModule._toggleFlag('${m.id}', 'reOrder', this.checked)" title="Toggle Re Order">
                </td>
                <td style="text-align:center;">${m.maxQty||100}</td>
                <td>${App.escHtml(m.dower||'G24')}</td>
                <td>${App.escHtml(m.stockDower||'S1/1')}</td>
                <td style="font-weight:700;">${Number(m.ptr||0).toFixed(2)}</td>
                <td>
                  <div class="td-actions">
                    <button class="btn btn-sm btn-secondary" onclick="MedicinesModule.loadMedicineToForm('${m.id}')" title="Edit">✏️</button>
                    <button class="btn btn-sm btn-danger"    onclick="MedicinesModule.deleteMedicine('${m.id}')" title="Delete">🗑️</button>
                  </div>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  },

  loadMedicineToForm(id) {
    const m = DB.getMedicines().find(item => item.id === id);
    if (!m) return;

    this.editingId = id;
    if (document.getElementById('mName')) document.getElementById('mName').value = m.name || '';
    if (document.getElementById('mGeneric')) document.getElementById('mGeneric').value = m.generic || '';
    if (document.getElementById('mPacking')) document.getElementById('mPacking').value = m.packing || '';
    if (document.getElementById('mOpStock')) document.getElementById('mOpStock').value = m.opStock ?? m.orqty ?? m.stock ?? '';
    if (document.getElementById('mLossQnty')) document.getElementById('mLossQnty').value = m.lossQnty ?? '';
    if (document.getElementById('mTotalQnty')) document.getElementById('mTotalQnty').value = m.totalQnty ?? m.orqty ?? m.stock ?? '';
    if (document.getElementById('mOpRate')) document.getElementById('mOpRate').value = m.opRate ?? '';
    if (document.getElementById('mTotal')) document.getElementById('mTotal').value = m.total ?? '';
    if (document.getElementById('mMrpPack')) document.getElementById('mMrpPack').value = m.mrppack ?? m.price ?? '';
    if (document.getElementById('mOrQty')) document.getElementById('mOrQty').value = m.orqty ?? '';
    if (document.getElementById('mDoseM')) document.getElementById('mDoseM').value = m.doseM ?? '';
    if (document.getElementById('mDoseA')) document.getElementById('mDoseA').value = m.doseA ?? '';
    if (document.getElementById('mDoseN')) document.getElementById('mDoseN').value = m.doseN ?? '';
    if (document.getElementById('mDoseS')) document.getElementById('mDoseS').value = m.doseS ?? '';
    if (document.getElementById('mUnit') && m.unit) document.getElementById('mUnit').value = m.unit;
    if (document.getElementById('mMethod') && m.method) document.getElementById('mMethod').value = m.method;
    if (document.getElementById('mMaxQty')) document.getElementById('mMaxQty').value = m.maxQty ?? '';
    if (document.getElementById('mPtr')) document.getElementById('mPtr').value = m.ptr ?? '';
    if (document.getElementById('mDower')) document.getElementById('mDower').value = m.dower || '';
    if (document.getElementById('mStockDower')) document.getElementById('mStockDower').value = m.stockDower || '';
    if (document.getElementById('mUse')) document.getElementById('mUse').value = m.use || '';

    if (document.getElementById('mDisplayIndoor')) document.getElementById('mDisplayIndoor').checked = m.displayIndoor !== false;
    if (document.getElementById('mIsTablet')) document.getElementById('mIsTablet').checked = !!m.isTablet;
    if (document.getElementById('mDisplayOpd')) document.getElementById('mDisplayOpd').checked = m.displayOpd !== false;

    const saveBtn = document.getElementById('mSaveBtn');
    if (saveBtn) { saveBtn.textContent = 'Update'; saveBtn.style.background = 'var(--accent)'; }

    const nameInput = document.getElementById('mName');
    if (nameInput) { nameInput.focus(); nameInput.select(); }

    App.toast(`Loaded ${m.name} details into form ✏️`, 'info', 1500);
  },

  _toggleFlag(id, field, value) {
    DB.updateMedicine(id, { [field]: value });
    App.toast(`Updated ${field}`, 'info', 1000);
  },

  _saveNew() {
    const name = document.getElementById('mName').value.trim();
    if (!name) { App.toast('Please enter Medicine Name', 'error'); return; }

    const item = {
      name,
      generic:       document.getElementById('mGeneric').value.trim(),
      packing:       document.getElementById('mPacking').value.trim(),
      opStock:       parseFloat(document.getElementById('mOpStock')?.value) || 0,
      lossQnty:      parseFloat(document.getElementById('mLossQnty')?.value) || 0,
      totalQnty:     parseFloat(document.getElementById('mTotalQnty')?.value) || 0,
      unit:          document.getElementById('mUnit').value,
      opRate:        parseFloat(document.getElementById('mOpRate')?.value) || 0,
      total:         parseFloat(document.getElementById('mTotal')?.value) || 0,
      type:          document.getElementById('mType').value,
      mrppack:       parseFloat(document.getElementById('mMrpPack').value) || 0,
      orqty:         parseInt(document.getElementById('mOrQty').value, 10) || 0,
      doseM:         document.getElementById('mDoseM')?.value || '',
      doseA:         document.getElementById('mDoseA')?.value || '',
      doseN:         document.getElementById('mDoseN')?.value || '',
      doseS:         document.getElementById('mDoseS')?.value || '',
      method:        document.getElementById('mMethod').value,
      dower:         document.getElementById('mDower').value,
      stockDower:    document.getElementById('mStockDower').value,
      maxQty:        parseInt(document.getElementById('mMaxQty').value, 10) || 0,
      ptr:           parseFloat(document.getElementById('mPtr').value) || 0,
      isTablet:      document.getElementById('mIsTablet').checked,
      displayIndoor: document.getElementById('mDisplayIndoor').checked,
      displayOpd:    document.getElementById('mDisplayOpd').checked,
      use:           document.getElementById('mUse').value.trim()
    };

    if (this.editingId) {
      DB.updateMedicine(this.editingId, item);
      App.toast('Medicine updated in Outside Medicine Master & synced everywhere ✅', 'success');
      this.editingId = null;
    } else {
      DB.addMedicine(item);
      App.toast('Medicine saved to Outside Medicine Master & synced everywhere ✅', 'success');
    }

    if (typeof DashboardModule._populateRxMedDropdown === 'function') {
      DashboardModule._populateRxMedDropdown();
    }

    this._clearForm();
    this.render();
  },

  _deleteCurrent() {
    if (!this.editingId) {
      App.toast('Double click a medicine row to load & delete', 'info');
      return;
    }
    this.deleteMedicine(this.editingId);
  },

  deleteMedicine(id) {
    App.confirm('Delete this medicine from Outside Medicine Master?', () => {
      DB.deleteMedicine(id);
      App.toast('Medicine deleted and synced everywhere', 'info');
      if (typeof DashboardModule._populateRxMedDropdown === 'function') {
        DashboardModule._populateRxMedDropdown();
      }
      if (this.editingId === id) this._clearForm();
      this.render();
    });
  }
};
