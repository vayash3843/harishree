'use strict';
/* ============================================================
   advicemaster.js — Extra Advice Master (Notepad & Alphabetical Diagnosis List)
   ============================================================ */

const AdviceMasterModule = {
  _selectedId: null,
  searchQuery: '',

  render() {
    const el = document.getElementById('module-advicemaster');
    if (!el) return;

    let advices = DB.getAdvices ? DB.getAdvices() : [];
    
    // Sort Alphabetically (A-Z) by Diagnosis Name
    advices.sort((a, b) => (a.diagnosisName || '').localeCompare(b.diagnosisName || '', undefined, { sensitivity: 'base' }));

    const q = this.searchQuery.toLowerCase().trim();
    let filtered = advices;
    if (q) {
      filtered = advices.filter(a =>
        a.diagnosisName && a.diagnosisName.toLowerCase().includes(q)
      );
      filtered.sort((a, b) => {
        const aStarts = (a.diagnosisName || '').toLowerCase().startsWith(q);
        const bStarts = (b.diagnosisName || '').toLowerCase().startsWith(q);
        if (aStarts && !bStarts) return -1;
        if (!aStarts && bStarts) return 1;
        return (a.diagnosisName || '').localeCompare(b.diagnosisName || '', undefined, { sensitivity: 'base' });
      });
    }

    // Selected diagnosis data
    const selectedItem = this._selectedId ? advices.find(a => a.id === this._selectedId) : null;
    const diagName = selectedItem ? selectedItem.diagnosisName : '';
    const adviceNotes = selectedItem ? selectedItem.adviceNotes : '';

    el.innerHTML = `
      <div class="page-header" style="margin-bottom:12px;">
        <div>
          <h1>💡 Extra Advice Master</h1>
          <div class="subtitle">Diagnosis-based Advice Notepad & Patient Instructions</div>
        </div>
      </div>

      <!-- ══ TOP BAR : Diagnosis Name Input Bar ══ -->
      <div class="card" style="padding:10px 12px;margin-bottom:10px;background:var(--bg-elevated);border:1px solid var(--border-strong);">
        <input type="text" class="form-control" id="adviceDiagNameInp" 
               value="${App.escHtml(diagName)}" 
               placeholder="" 
               style="font-size:14px;font-weight:800;color:var(--primary);height:38px;background:var(--bg-surface);">
      </div>

      <!-- ══ BLANK NOTEPAD SQUARE BOX : Advice Editor ══ -->
      <div class="card" style="padding:14px;margin-bottom:10px;background:#fefce8;border:2px solid #cbd5e1;box-shadow:inset 0 1px 3px rgba(0,0,0,0.05);">
        <textarea class="form-control" id="adviceNotesTextarea" 
                  style="width:100%;height:220px;font-size:13px;line-height:1.7;font-family:'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;font-weight:600;color:#1e293b;background:#ffffff;border:1.5px solid #cbd5e1;border-radius:4px;padding:12px;outline:none;resize:vertical;"
                  placeholder="">${App.escHtml(adviceNotes)}</textarea>
      </div>

      <!-- ══ BUTTONS ROW : Save, Add New, Delete, Exit ══ -->
      <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:14px;background:var(--bg-surface);padding:8px 12px;border:1px solid var(--border-strong);border-radius:var(--radius-md);">
        <div style="display:flex;align-items:center;gap:8px;">
          <button class="btn btn-primary" onclick="AdviceMasterModule.saveCurrentAdvice()" style="font-weight:800;background:var(--primary);color:#fff;min-width:110px;font-size:13px;">💾 Save</button>
          <button class="btn btn-success" onclick="AdviceMasterModule.addNewDiagnosis()" style="font-weight:700;background:var(--success);color:#fff;font-size:13px;">➕ Add New</button>
          <button class="btn btn-danger" onclick="AdviceMasterModule.deleteCurrentAdvice()" style="font-weight:700;font-size:13px;">🗑️ Delete</button>
        </div>
        <button class="btn btn-secondary" onclick="AdviceMasterModule.exitModule()" style="font-weight:700;font-size:13px;">✕ Exit</button>
      </div>

      <!-- ══ Search Input Bar ══ -->
      <div style="margin-bottom:10px;">
        <input type="text" class="form-control" id="adviceSearchInp" 
               value="${App.escHtml(this.searchQuery)}" 
               placeholder="Search diagnosis…" 
               autocomplete="off"
               style="height:34px;font-size:12px;font-weight:600;"
               oninput="AdviceMasterModule.onSearch(this.value)"
               onkeyup="AdviceMasterModule.onSearch(this.value)">
      </div>

      <!-- ══ DIAGNOSIS LIST TABLE ══ -->
      <div class="card" style="padding:0;">
        <div id="adviceAlphabeticalTableWrap"></div>
      </div>
    `;

    this._renderAlphabeticalTable(filtered);
  },

  onSearch(q) {
    this.searchQuery = q;
    const advices = DB.getAdvices ? DB.getAdvices() : [];
    
    const query = (q || '').toLowerCase().trim();
    let filtered = advices;
    if (query) {
      filtered = advices.filter(a =>
        a.diagnosisName && a.diagnosisName.toLowerCase().includes(query)
      );
      filtered.sort((a, b) => {
        const aStarts = (a.diagnosisName || '').toLowerCase().startsWith(query);
        const bStarts = (b.diagnosisName || '').toLowerCase().startsWith(query);
        if (aStarts && !bStarts) return -1;
        if (!aStarts && bStarts) return 1;
        return (a.diagnosisName || '').localeCompare(b.diagnosisName || '', undefined, { sensitivity: 'base' });
      });
    } else {
      filtered.sort((a, b) => (a.diagnosisName || '').localeCompare(b.diagnosisName || '', undefined, { sensitivity: 'base' }));
    }

    this._renderAlphabeticalTable(filtered);
  },

  _renderAlphabeticalTable(advices) {
    const wrap = document.getElementById('adviceAlphabeticalTableWrap');
    if (!wrap) return;

    if (advices.length === 0) {
      wrap.innerHTML = `
        <div class="table-wrapper">
          <table>
            <thead>
              <tr><th style="width:50px;">No</th><th>Diagnosis Name</th></tr>
            </thead>
            <tbody></tbody>
          </table>
        </div>
        <div style="padding:20px;text-align:center;color:var(--text-muted);font-style:italic;">No matching diagnosis found.</div>
      `;
      return;
    }

    const query = (this.searchQuery || '').toLowerCase().trim();

    wrap.innerHTML = `
      <div class="table-wrapper" style="max-height:280px;overflow-y:auto;">
        <table>
          <thead>
            <tr>
              <th style="width:50px;text-align:center;">No</th>
              <th>Diagnosis Name</th>
            </tr>
          </thead>
          <tbody>
            ${advices.map((a, idx) => {
              const isSelected = a.id === this._selectedId;
              const rowStyle = isSelected
                ? 'background:#a4c2e6 !important;color:#002060 !important;font-weight:800;'
                : 'cursor:pointer;';
              const textStyle = isSelected ? 'color:#002060 !important;' : 'color:var(--primary);';

              let displayName = App.escHtml(a.diagnosisName || '');
              if (query) {
                const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
                displayName = displayName.replace(regex, '<span style="background:#fef08a;color:#854d0e;padding:0 2px;border-radius:2px;font-weight:900;">$1</span>');
              }

              return `
                <tr style="${rowStyle}" 
                    onclick="AdviceMasterModule.selectDiagnosis('${a.id}')"
                    ondblclick="AdviceMasterModule.selectDiagnosis('${a.id}')">
                  <td style="text-align:center;font-weight:700;">${idx + 1}</td>
                  <td style="font-weight:800;${textStyle}">
                    ${displayName}
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
      <div style="padding:8px 16px;font-size:12px;color:var(--text-muted);border-top:1px solid var(--border);">
        Showing ${advices.length} diagnosis entry${advices.length !== 1 ? 's' : ''}
      </div>
    `;
  },

  /* ── Double-click or click selection handler ── */
  selectDiagnosis(id) {
    const a = (DB.getAdvices() || []).find(item => item.id === id);
    if (!a) return;

    this._selectedId = id;

    // Fill 1st Bar (Diagnosis Name)
    const nameInp = document.getElementById('adviceDiagNameInp');
    if (nameInp) nameInp.value = a.diagnosisName || '';

    // Fill Notepad Blank Square Box
    const notesTextarea = document.getElementById('adviceNotesTextarea');
    if (notesTextarea) notesTextarea.value = a.adviceNotes || '';

    // Re-render table selection highlight
    const advices = DB.getAdvices ? DB.getAdvices() : [];
    advices.sort((x, y) => (x.diagnosisName || '').localeCompare(y.diagnosisName || '', undefined, { sensitivity: 'base' }));
    
    const q = this.searchQuery.toLowerCase().trim();
    const filtered = q
      ? advices.filter(item =>
          (item.diagnosisName && item.diagnosisName.toLowerCase().includes(q)) ||
          (item.adviceNotes && item.adviceNotes.toLowerCase().includes(q))
        )
      : advices;

    this._renderAlphabeticalTable(filtered);
    App.toast(`Loaded "${a.diagnosisName}" into Notepad square box! 📝`, 'info', 1500);
  },

  /* ── Save Current Advice ── */
  saveCurrentAdvice() {
    const nameInp = document.getElementById('adviceDiagNameInp');
    const notesTextarea = document.getElementById('adviceNotesTextarea');

    const name = nameInp ? nameInp.value.trim() : '';
    const notes = notesTextarea ? notesTextarea.value : '';

    if (!name) {
      App.toast('Please enter a Diagnosis Name in the 1st bar', 'warning');
      return;
    }

    this._pendingName = name;
    this._pendingNotes = notes;

    const body = `
      <div style="padding:16px 8px;text-align:center;font-size:14px;font-weight:700;color:var(--text-primary);">
        Are you sure you want to save this extra advice template?
      </div>
    `;

    const footer = `
      <button class="btn btn-secondary" style="min-width:80px;font-weight:700;" onclick="App.closeModal()">No</button>
      <button class="btn btn-primary" style="min-width:80px;font-weight:800;background:var(--primary);color:#fff;" onclick="AdviceMasterModule._executeSaveAdvice()">Yes</button>
    `;

    App.openModal('❓ Confirmation Required', body, footer);
  },

  _executeSaveAdvice() {
    const name = this._pendingName;
    const notes = this._pendingNotes || '';
    if (!name) return;

    if (this._selectedId) {
      const existing = (DB.getAdvices() || []).find(a => a.id === this._selectedId);
      if (existing) {
        DB.updateAdvice(this._selectedId, { diagnosisName: name, adviceNotes: notes });
        App.toast(`Saved advice for "${name}"! 💾`, 'success', 2000);
      } else {
        const newA = DB.addAdvice({ diagnosisName: name, adviceNotes: notes, category: 'General' });
        this._selectedId = newA.id;
        App.toast(`Saved new diagnosis "${name}"! 💾`, 'success', 2000);
      }
    } else {
      const newA = DB.addAdvice({ diagnosisName: name, adviceNotes: notes, category: 'General' });
      this._selectedId = newA.id;
      App.toast(`Saved new diagnosis "${name}"! 💾`, 'success', 2000);
    }

    App.closeModal();
    this.render();
  },

  /* ── Add New Diagnosis ── */
  addNewDiagnosis() {
    this._selectedId = null;
    const nameInp = document.getElementById('adviceDiagNameInp');
    const notesTextarea = document.getElementById('adviceNotesTextarea');

    if (nameInp) {
      nameInp.value = '';
      nameInp.focus();
    }
    if (notesTextarea) notesTextarea.value = '';

    App.toast('Ready to add new diagnosis! Type Diagnosis Name in the 1st bar & notes in the Notepad box.', 'info', 2500);
  },

  /* ── Delete Current Diagnosis ── */
  deleteCurrentAdvice() {
    const nameInp = document.getElementById('adviceDiagNameInp');
    const name = nameInp ? nameInp.value.trim() : 'this diagnosis';

    if (!this._selectedId) {
      App.toast('No diagnosis selected to delete', 'warning');
      return;
    }

    if (confirm(`Are you sure you want to delete diagnosis "${name}" and its advice notes?`)) {
      DB.deleteAdvice(this._selectedId);
      this._selectedId = null;
      App.toast(`Deleted "${name}" 🗑️`, 'info');
      this.render();
    }
  },

  /* ── Exit Module ── */
  exitModule() {
    navigateTo('dashboard');
  }
};
