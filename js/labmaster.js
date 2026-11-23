'use strict';
/* ============================================================
   labmaster.js — Lab Master module (Pathology & Radiology Test Management)
   ============================================================ */

const LabMasterModule = {
  searchQuery: '',
  categoryFilter: 'all', // 'all' | 'Pathology' | 'Radiology'

  render() {
    const el = document.getElementById('module-labmaster');
    if (!el) return;

    const tests = DB.getLabTests ? DB.getLabTests() : [];
    const q = this.searchQuery.toLowerCase().trim();

    let filtered = tests;
    if (this.categoryFilter !== 'all') {
      filtered = filtered.filter(t => t.category === this.categoryFilter);
    }
    if (q) {
      filtered = filtered.filter(t =>
        (t.name && t.name.toLowerCase().includes(q)) ||
        (t.category && t.category.toLowerCase().includes(q)) ||
        (t.labName && t.labName.toLowerCase().includes(q))
      );
    }

    el.innerHTML = `
      <div class="page-header">
        <div>
          <h1>🧪 Lab Master</h1>
          <div class="subtitle">Manage Pathology & Radiology Test Catalog</div>
        </div>
        <button class="btn btn-primary" onclick="LabMasterModule.openAddModal()">➕ Add Lab Test</button>
      </div>

      <!-- Controls & Filter -->
      <div class="card" style="padding:var(--gap-md);margin-bottom:var(--gap-md);">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:var(--gap-md);flex-wrap:wrap;">
          <div class="search-bar" style="flex:1;max-width:380px;">
            <span>🔍</span>
            <input type="text" placeholder="Search test name, category, or lab name…"
                   value="${App.escHtml(this.searchQuery)}"
                   oninput="LabMasterModule._onSearch(this.value)">
          </div>

          <div style="display:flex;align-items:center;gap:8px;">
            <button class="btn btn-sm ${this.categoryFilter === 'all' ? 'btn-primary' : 'btn-secondary'}" onclick="LabMasterModule._setCategory('all')">All Tests (${tests.length})</button>
            <button class="btn btn-sm ${this.categoryFilter === 'Pathology' ? 'btn-primary' : 'btn-secondary'}" onclick="LabMasterModule._setCategory('Pathology')">🔬 Pathology</button>
            <button class="btn btn-sm ${this.categoryFilter === 'Radiology' ? 'btn-primary' : 'btn-secondary'}" onclick="LabMasterModule._setCategory('Radiology')">🩻 Radiology</button>
          </div>
        </div>
      </div>

      <!-- Table Wrapper -->
      <div class="card" style="padding:0;">
        <div id="labMasterTableWrap"></div>
      </div>
    `;

    this._renderTable(filtered);
  },

  _onSearch(q) {
    this.searchQuery = q;
    this.render();
  },

  _setCategory(cat) {
    this.categoryFilter = cat;
    this.render();
  },

  _renderTable(tests) {
    const wrap = document.getElementById('labMasterTableWrap');
    if (!wrap) return;

    if (tests.length === 0) {
      wrap.innerHTML = `
        <div class="table-wrapper">
          <table>
            <thead>
              <tr><th>#</th><th>Test Name</th><th>Category</th><th>Default Lab Name</th><th>Rate (₹)</th><th>Actions</th></tr>
            </thead>
            <tbody></tbody>
          </table>
        </div>
        <div style="padding:24px;text-align:center;color:var(--text-muted);font-style:italic;">No matching lab tests found.</div>
      `;
      return;
    }

    wrap.innerHTML = `
      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th style="width:40px;">#</th>
              <th>Test Name</th>
              <th>Category</th>
              <th>Default Lab Name</th>
              <th style="text-align:right;">Rate (₹)</th>
              <th style="width:140px;">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${tests.map((t, idx) => `
              <tr>
                <td>${idx + 1}</td>
                <td style="font-weight:700;color:var(--primary);">${App.escHtml(t.name)}</td>
                <td>
                  <span class="badge" style="background:${t.category === 'Radiology' ? 'rgba(217,119,6,0.12)' : 'rgba(13,148,136,0.12)'};color:${t.category === 'Radiology' ? '#d97706' : 'var(--primary)'};font-weight:700;">
                    ${t.category === 'Radiology' ? '🩻 Radiology' : '🔬 Pathology'}
                  </span>
                </td>
                <td>${App.escHtml(t.labName || 'Main Lab')}</td>
                <td style="text-align:right;font-weight:700;color:var(--text-primary);">₹${Number(t.rate || 0).toFixed(2)}</td>
                <td>
                  <div class="td-actions">
                    <button class="btn btn-sm btn-secondary" onclick="LabMasterModule.openEditModal('${t.id}')">Edit</button>
                    <button class="btn btn-sm btn-danger" onclick="LabMasterModule.deleteTest('${t.id}')">Delete</button>
                  </div>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      <div style="padding:10px 16px;font-size:12px;color:var(--text-muted);border-top:1px solid var(--border);">
        Showing ${tests.length} test${tests.length !== 1 ? 's' : ''}
      </div>
    `;
  },

  openAddModal() {
    this._renderModal({});
  },

  openEditModal(id) {
    const t = (DB.getLabTests() || []).find(item => item.id === id);
    if (!t) return;
    this._renderModal(t);
  },

  _renderModal(t = {}) {
    const isEdit = !!t.id;
    const body = `
      <div style="display:flex;flex-direction:column;gap:12px;">
        <div>
          <label style="font-size:11px;font-weight:700;margin-bottom:4px;display:block;">Test Name * :</label>
          <input class="form-control" id="labTestName" value="${App.escHtml(t.name || '')}" placeholder="e.g. CBC (Complete Blood Count)">
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
          <div>
            <label style="font-size:11px;font-weight:700;margin-bottom:4px;display:block;">Category :</label>
            <select class="form-control" id="labTestCategory">
              <option value="Pathology" ${t.category !== 'Radiology' ? 'selected' : ''}>Pathology</option>
              <option value="Radiology" ${t.category === 'Radiology' ? 'selected' : ''}>Radiology</option>
            </select>
          </div>
          <div>
            <label style="font-size:11px;font-weight:700;margin-bottom:4px;display:block;">Standard Rate (₹) :</label>
            <input type="number" class="form-control" id="labTestRate" value="${t.rate || 150}" placeholder="150">
          </div>
        </div>
        <div>
          <label style="font-size:11px;font-weight:700;margin-bottom:4px;display:block;">Default Lab Name :</label>
          <input class="form-control" id="labTestLabName" value="${App.escHtml(t.labName || 'Main Parth Pathology')}" placeholder="Main Parth Pathology">
        </div>
      </div>
    `;

    const footer = `
      <button class="btn btn-secondary" onclick="App.closeModal()">✕ Cancel</button>
      <button class="btn btn-primary" style="font-weight:700;background:var(--primary);color:#fff;" onclick="LabMasterModule._saveTest('${t.id || ''}')">💾 Save Lab Test</button>
    `;

    App.openModal(isEdit ? 'Edit Lab Test' : '➕ Add New Lab Test', body, footer);
  },

  _saveTest(id) {
    const name = document.getElementById('labTestName')?.value.trim();
    const category = document.getElementById('labTestCategory')?.value || 'Pathology';
    const rate = parseFloat(document.getElementById('labTestRate')?.value) || 0;
    const labName = document.getElementById('labTestLabName')?.value.trim() || 'Main Lab';

    if (!name) { App.toast('Test name is required', 'error'); return; }

    this._pendingTest = { id, name, category, rate, labName };

    const body = `
      <div style="padding:16px 8px;text-align:center;font-size:14px;font-weight:700;color:var(--text-primary);">
        Are you sure you want to save this lab test details?
      </div>
    `;

    const footer = `
      <button class="btn btn-secondary" style="min-width:80px;font-weight:700;" onclick="App.closeModal()">No</button>
      <button class="btn btn-primary" style="min-width:80px;font-weight:800;background:var(--primary);color:#fff;" onclick="LabMasterModule._executeSaveTest()">Yes</button>
    `;

    App.openModal('❓ Confirmation Required', body, footer);
  },

  _executeSaveTest() {
    if (!this._pendingTest) return;
    const { id, name, category, rate, labName } = this._pendingTest;

    if (id) {
      DB.updateLabTest(id, { name, category, rate, labName });
      App.toast(`Updated lab test "${name}"! ✅`, 'success');
    } else {
      DB.addLabTest({ name, category, rate, labName });
      App.toast(`Added lab test "${name}"! 🎉`, 'success');
    }

    App.closeModal();
    this.render();
  },

  deleteTest(id) {
    const t = (DB.getLabTests() || []).find(item => item.id === id);
    if (!t) return;
    if (confirm(`Are you sure you want to delete lab test "${t.name}"?`)) {
      DB.deleteLabTest(id);
      App.toast(`Deleted "${t.name}" 🗑️`, 'info');
      this.render();
    }
  }
};
