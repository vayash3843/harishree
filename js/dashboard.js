'use strict';
/* ============================================================
   dashboard.js — OPD-style dashboard (inspired by clinic desktop UI)
   ============================================================ */

const DashboardModule = {
  _filter: 'notdone',   // default to 'notdone' across all tabs (Doctor, InDoor, Report)
  _topTab: 'doctor',    // 'doctor' | 'indoor' | 'report' | 'pharmacy'
  _pharmacyTab: 'queue', // 'queue' | 'lowstock'
  _pharmacyFilter: 'all', // 'all' | 'pending' | 'dispensed'
  _searchMode: 'name',  // 'id' | 'name'
  _searchQ: '',
  _tokenBase: 1,

  _setTopTab(tab) {
    try {
      this._topTab = tab;
      this._filter = 'notdone';
      this.render();
    } catch (e) {
      console.error('[DashboardModule] _setTopTab error:', e);
      this._topTab = tab;
      const el = document.getElementById('module-dashboard');
      if (el) el.innerHTML = `<div style="padding:20px;color:#dc2626;font-weight:700;">Error loading ${tab} tab. Please refresh (Ctrl+F5).<br><small>${e.message}</small></div>`;
    }
  },

  _setPharmacyTab(tab) {
    this._pharmacyTab = tab;
    this.render();
  },

  _setPharmacyFilter(f) {
    this._pharmacyFilter = f;
    this.render();
  },

  _toggleMedDispensed(apptId, checked) {
    DB.updateAppointment(apptId, { dispensed: checked, medDone: checked });
    App.toast(checked ? 'Medicine marked as Dispensed! 💊' : 'Marked as Pending Dispense', 'info');
    this.render();
  },

  _toggleMedPaid(apptId) {
    const a = (DB.getAppointments() || []).find(x => String(x.id) === String(apptId)) || {};
    const curPaid = Boolean(a.rxPaid || a.medPaid);
    DB.updateAppointment(apptId, { rxPaid: !curPaid, medPaid: !curPaid });
    App.toast(!curPaid ? 'Medicine bill marked as Paid! 💰' : 'Marked as Unpaid', 'info');
    this.render();
  },

  render() {
    const el = document.getElementById('module-dashboard');
    if (!el) return;

    const curUser = (window.App && App.getCurrentUser) ? App.getCurrentUser() : null;
    const isPharmacist = curUser && (curUser.role || '').toLowerCase().includes('pharmacist');

    if (this._topTab === 'pharmacy' || (isPharmacist && this._topTab !== 'doctor' && this._topTab !== 'indoor' && this._topTab !== 'report')) {
      this._renderPharmacyDashboard(el);
      return;
    }

    const today = new Date().toISOString().split('T')[0];
    const allAppts = DB.getAppointments() || [];
    const todayAppts = allAppts.filter(a => a.date === today);
    const totalPatients = DB.getPatients().length;
    const done = todayAppts.filter(a => a.status === 'completed' || a.stage === 'Done').length;
    const pending = todayAppts.filter(a => a.status !== 'completed' && a.stage !== 'Done').length;
    const invoices = DB.getInvoices ? DB.getInvoices() : [];
    const todayRevenue = invoices.filter(i => i.date === today && i.paid !== false).reduce((s, i) => s + Number(i.total || i.amount || 0), 0);
    const indoorCount = allAppts.filter(a => a.indoor === true && a.status !== 'completed').length;
    const tab = this._topTab;

    const tabStyle = (t) => `padding:7px 18px;font-weight:700;font-size:12px;cursor:pointer;border:none;border-bottom:3px solid ${tab===t ? 'var(--primary)' : 'transparent'};background:none;color:${tab===t ? 'var(--primary)' : 'var(--text-muted)'};transition:all 0.18s;`;

    el.innerHTML = `
      <style>
        .dash-kpi { background:var(--bg-surface);border:1px solid var(--border);border-radius:14px;padding:16px 20px;display:flex;align-items:center;gap:14px;box-shadow:var(--shadow);transition:all 0.2s;cursor:default; }
        .dash-kpi:hover { transform:translateY(-2px);box-shadow:var(--shadow-lg); }
        .dash-kpi .kpi-icon { width:46px;height:46px;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0; }
        .dash-kpi .kpi-val { font-size:26px;font-weight:800;line-height:1;margin-bottom:2px; }
        .dash-kpi .kpi-label { font-size:11px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px; }
        .dash-tab-bar { display:flex;align-items:center;border-bottom:1px solid var(--border);margin-bottom:0;gap:2px;background:var(--bg-surface);border-radius:12px 12px 0 0;padding:0 16px; }
        .dash-tab-bar button:hover { color:var(--primary)!important; }
        .dash-panel { background:var(--bg-surface);border:1px solid var(--border);border-top:none;border-radius:0 0 14px 14px;overflow:hidden; }
        .dash-toolbar { display:flex;align-items:center;justify-content:space-between;padding:10px 14px;gap:10px;flex-wrap:wrap;border-bottom:1px solid var(--border);background:var(--bg-elevated); }
        .dash-search { display:flex;align-items:center;gap:6px;background:#fff;border:1px solid var(--border);border-radius:8px;padding:5px 10px;min-width:200px; }
        .dash-search input { border:none;outline:none;font-size:12px;flex:1;background:transparent; }
        .dash-quick-btn { background:var(--primary);color:#fff;border:none;border-radius:8px;padding:6px 14px;font-size:12px;font-weight:700;cursor:pointer;display:flex;align-items:center;gap:5px;transition:background 0.18s; }
        .dash-quick-btn:hover { background:var(--primary-dark); }
        .dash-quick-btn.sec { background:var(--bg-elevated);color:var(--text-primary);border:1px solid var(--border); }
        .dash-quick-btn.sec:hover { background:var(--bg-hover); }
        .status-pill { display:inline-flex;align-items:center;gap:3px;padding:2px 8px;border-radius:20px;font-size:10px;font-weight:700; }
        .pill-done { background:#dcfce7;color:#166534; }
        .pill-pending { background:#fef9c3;color:#854d0e; }
        .pill-indoor { background:#dbeafe;color:#1d4ed8; }
      </style>

      <!-- KPI Cards -->
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:14px;margin-bottom:18px;">
        <div class="dash-kpi">
          <div class="kpi-icon" style="background:#eff6ff;">📅</div>
          <div><div class="kpi-val" style="color:#1d4ed8;">${todayAppts.length}</div><div class="kpi-label">Today's OPD</div></div>
        </div>
        <div class="dash-kpi" onclick="DashboardModule._setFilter('done');DashboardModule._setTopTab('doctor')" style="cursor:pointer;">
          <div class="kpi-icon" style="background:#f0fdf4;">✅</div>
          <div><div class="kpi-val" style="color:#16a34a;">${done}</div><div class="kpi-label">Completed</div></div>
        </div>
        <div class="dash-kpi" onclick="DashboardModule._setFilter('notdone');DashboardModule._setTopTab('doctor')" style="cursor:pointer;">
          <div class="kpi-icon" style="background:#fefce8;">⏳</div>
          <div><div class="kpi-val" style="color:#ca8a04;">${pending}</div><div class="kpi-label">Waiting</div></div>
        </div>
        <div class="dash-kpi" onclick="DashboardModule._setTopTab('indoor')" style="cursor:pointer;">
          <div class="kpi-icon" style="background:#eff6ff;">🏥</div>
          <div><div class="kpi-val" style="color:#0284c7;">${indoorCount}</div><div class="kpi-label">Indoor Patients</div></div>
        </div>
        <div class="dash-kpi">
          <div class="kpi-icon" style="background:#f0fdf4;">💰</div>
          <div><div class="kpi-val" style="color:#15803d;">₹${todayRevenue.toFixed(0)}</div><div class="kpi-label">Today's Revenue</div></div>
        </div>
        <div class="dash-kpi">
          <div class="kpi-icon" style="background:#faf5ff;">👥</div>
          <div><div class="kpi-val" style="color:#7c3aed;">${totalPatients}</div><div class="kpi-label">Total Patients</div></div>
        </div>
      </div>

      <!-- Tabs + Table -->
      <div>
        <div class="dash-tab-bar">
          <button style="${tabStyle('doctor')}" onclick="DashboardModule._setTopTab('doctor')">🩺 Doctor OPD</button>
          <button style="${tabStyle('indoor')}" onclick="DashboardModule._setTopTab('indoor')">🏥 InDoor IPD</button>
          <button style="${tabStyle('report')}" onclick="DashboardModule._setTopTab('report')">🧪 Reports</button>
          <div style="margin-left:auto;display:flex;align-items:center;gap:8px;padding:6px 0;">
            <input type="date" id="opdDashDate" value="${today}" onchange="DashboardModule._refresh()" style="padding:4px 8px;font-size:12px;border:1px solid var(--border);border-radius:7px;background:var(--bg-elevated);color:var(--text-primary);font-weight:600;">
            <button class="dash-quick-btn sec" onclick="DashboardModule._refresh()">↺ Refresh</button>
            ${tab === 'report' ? `<button class="dash-quick-btn" style="background:#0891b2;" onclick="DashboardModule.openAddReportModal()">➕ Add Report</button>` : `<button class="dash-quick-btn" onclick="PatientsModule.openAddModal()">➕ New OPD</button>`}
          </div>
        </div>

        <div class="dash-panel">
          <!-- Toolbar -->
          <div class="dash-toolbar">
            <div style="display:flex;align-items:center;gap:8px;">
              ${tab !== 'report' ? `
              <span style="font-size:11px;font-weight:600;color:var(--text-secondary);">Filter:</span>
              <label style="display:flex;align-items:center;gap:4px;font-size:12px;font-weight:600;cursor:pointer;"><input type="radio" name="opdFilter" value="all" ${this._filter==='all'?'checked':''} onchange="DashboardModule._setFilter('all')"> All</label>
              <label style="display:flex;align-items:center;gap:4px;font-size:12px;font-weight:600;cursor:pointer;"><input type="radio" name="opdFilter" value="done" ${this._filter==='done'?'checked':''} onchange="DashboardModule._setFilter('done')"> Done</label>
              <label style="display:flex;align-items:center;gap:4px;font-size:12px;font-weight:600;cursor:pointer;"><input type="radio" name="opdFilter" value="notdone" ${this._filter==='notdone'?'checked':''} onchange="DashboardModule._setFilter('notdone')"> Pending</label>
              ` : `
              <span class="pill-done status-pill">✅ Completed Reports</span>
              `}
            </div>
            <div style="display:flex;align-items:center;gap:8px;">
              <label style="display:flex;align-items:center;gap:4px;font-size:11px;font-weight:600;cursor:pointer;"><input type="radio" name="searchMode" value="id" ${this._searchMode==='id'?'checked':''} onchange="DashboardModule._setSearchMode('id')"> By ID</label>
              <label style="display:flex;align-items:center;gap:4px;font-size:11px;font-weight:600;cursor:pointer;"><input type="radio" name="searchMode" value="name" ${this._searchMode==='name'?'checked':''} onchange="DashboardModule._setSearchMode('name')"> By Name</label>
              <div class="dash-search">
                <span style="color:var(--text-muted);">🔍</span>
                <input type="text" id="opdDashSearch" placeholder="Search patient…" value="${App.escHtml(this._searchQ)}" oninput="DashboardModule._onSearch(this.value)">
              </div>
              <button class="dash-quick-btn sec" style="padding:5px 10px;font-size:11px;" onclick="DashboardModule._clear()">✕ Clear</button>
            </div>
          </div>
          <!-- Table -->
          <div class="opd-table-wrap" id="opdDashTable"></div>
        </div>
      </div>
    `;

    this._renderTable();
  },

  _refresh() {
    this._searchQ = '';
    this._renderTable();
    this._renderSummary();
  },

  _clear() {
    this._searchQ = '';
    this._filter = 'notdone';
    document.querySelectorAll('input[name="opdFilter"]').forEach(r => r.checked = r.value === 'notdone');
    const si = document.getElementById('opdDashSearch');
    if (si) si.value = '';
    this._renderTable();
  },

  _setFilter(f) { this._filter = f; this._renderTable(); },
  _setSearchMode(m) { this._searchMode = m; this._renderTable(); },
  _onSearch(q) { this._searchQ = q; this._renderTable(); },

  _getDate() {
    const el = document.getElementById('opdDashDate');
    return el ? el.value : new Date().toISOString().split('T')[0];
  },

  _renderPharmacyDashboard(el) {
    const today = new Date().toISOString().split('T')[0];
    const allAppts = DB.getAppointments() || [];
    const todayAppts = allAppts.filter(a => !a.date || a.date === today);
    const allMeds = DB.getMedicines ? DB.getMedicines() : [];
    const lowStockMeds = allMeds.filter(m => Number(m.orqty || m.stock || 0) <= 20);

    const queue = [];
    todayAppts.forEach((a, idx) => {
      const p = DB.getPatient(a.patientId) || {};
      const patientRxs = (DB.getPrescriptions ? DB.getPrescriptions() : []).filter(r => String(r.patientId) === String(a.patientId));
      let medItems = [];
      if (a.rxItems && Array.isArray(a.rxItems) && a.rxItems.length > 0) {
        medItems = a.rxItems;
      } else if (p.savedRx && Array.isArray(p.savedRx) && p.savedRx.length > 0) {
        medItems = p.savedRx;
      } else if (patientRxs.length > 0) {
        const latestRx = patientRxs[patientRxs.length - 1];
        medItems = latestRx.medications || latestRx.items || [];
      }
      const rxAmt = medItems.reduce((sum, item) => sum + (Number(item.total) || (Number(item.qty || 1) * Number(item.rate || 10))), 0);
      const isPaid = a.rxPaid != null ? Boolean(a.rxPaid) : Boolean(a.medPaid);
      const isDispensed = Boolean(a.dispensed || a.medDone || (isPaid && a.status === 'completed'));
      
      const rawBillAmt = a.rxTotalAmt != null ? Number(a.rxTotalAmt) : (a.billAmt != null ? Number(a.billAmt) : (rxAmt > 0 ? rxAmt : 0));
      const billAmt = isNaN(rawBillAmt) ? 0 : rawBillAmt;
      const billNo = a.billNo || a.rxBillNo || a.invoiceNo || ('PHARM-' + String(a.id ? String(a.id).replace(/\D/g, '').slice(-4) : (1000 + (a.token || idx + 1))).padStart(4, '0'));

      queue.push({
        token: a.token || (idx + 1),
        apptId: a.id,
        patientId: a.patientId,
        patientName: a.patientName || p.name || 'Patient',
        phone: p.phone || a.phone || '—',
        time: a.time || '10:00 AM',
        drName: a.drName || 'DR. YASH VAGHANI',
        medItems,
        billNo,
        billAmt,
        rxAmt: billAmt,
        isPaid,
        isDispensed
      });
    });

    const totalRx = queue.length;
    const dispensedCount = queue.filter(q => q.isDispensed).length;
    const pendingDispense = totalRx - dispensedCount;
    const totalSalesToday = queue.reduce((s, q) => s + (Number(q.billAmt) || 0), 0);

    let filteredQueue = [...queue];
    if (this._pharmacyFilter === 'pending') filteredQueue = filteredQueue.filter(q => !q.isDispensed);
    else if (this._pharmacyFilter === 'dispensed') filteredQueue = filteredQueue.filter(q => q.isDispensed);
    if (this._searchQ && this._searchQ.trim()) {
      const q = this._searchQ.toLowerCase().trim();
      filteredQueue = filteredQueue.filter(item => item.patientName.toLowerCase().includes(q) || String(item.token).includes(q) || String(item.phone).includes(q) || String(item.billNo).toLowerCase().includes(q) || item.medItems.some(m => (m.name || '').toLowerCase().includes(q)));
    }
    const curTab = this._pharmacyTab || 'queue';
    const tabStyle = (t) => `padding:7px 18px;font-weight:700;font-size:12px;cursor:pointer;border:none;border-bottom:3px solid ${curTab === t ? 'var(--primary)' : 'transparent'};background:none;color:${curTab === t ? 'var(--primary)' : 'var(--text-muted)'};transition:all 0.18s;`;
    const ptab = this._topTab;
    const mainTabStyle = (t) => `padding:7px 18px;font-weight:700;font-size:12px;cursor:pointer;border:none;border-bottom:3px solid ${ptab === t ? 'var(--primary)' : 'transparent'};background:none;color:${ptab === t ? 'var(--primary)' : 'var(--text-muted)'};transition:all 0.18s;`;

    el.innerHTML = `
      <style>
        .pharm-kpi { background:var(--bg-surface);border:1px solid var(--border);border-radius:14px;padding:16px 20px;display:flex;align-items:center;gap:14px;box-shadow:var(--shadow);transition:all 0.2s; }
        .pharm-kpi:hover { transform:translateY(-2px);box-shadow:var(--shadow-lg); }
        .pharm-kpi .ki { width:46px;height:46px;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0; }
        .pharm-kpi .kv { font-size:26px;font-weight:800;line-height:1;margin-bottom:2px; }
        .pharm-kpi .kl { font-size:11px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px; }
        .ph-tab-bar { display:flex;align-items:center;border-bottom:1px solid var(--border);margin-bottom:0;gap:2px;background:var(--bg-surface);border-radius:12px 12px 0 0;padding:0 16px; }
        .ph-tab-bar button:hover { color:var(--primary)!important; }
        .ph-panel { background:var(--bg-surface);border:1px solid var(--border);border-top:none;border-radius:0 0 14px 14px;overflow:hidden; }
        .ph-toolbar { display:flex;align-items:center;justify-content:space-between;padding:10px 14px;gap:10px;flex-wrap:wrap;border-bottom:1px solid var(--border);background:var(--bg-elevated); }
        .ph-search { display:flex;align-items:center;gap:6px;background:#fff;border:1px solid var(--border);border-radius:8px;padding:5px 10px;min-width:200px; }
        .ph-search input { border:none;outline:none;font-size:12px;flex:1;background:transparent; }
        .ph-btn { border:none;border-radius:8px;padding:6px 14px;font-size:12px;font-weight:700;cursor:pointer;display:flex;align-items:center;gap:5px;transition:background 0.18s; }
        .ph-btn.primary { background:var(--primary);color:#fff; }
        .ph-btn.primary:hover { background:var(--primary-dark); }
        .ph-btn.sec { background:var(--bg-elevated);color:var(--text-primary);border:1px solid var(--border); }
        .ph-btn.sec:hover { background:var(--bg-hover); }
        .ph-btn.danger { background:#fef2f2;color:#dc2626;border:1px solid #fecaca; }
      </style>

      <!-- Main Tab Bar (switch to Doctor/IndOOR) -->
      <div class="ph-tab-bar" style="margin-bottom:16px;border-radius:12px;">
        <button style="${mainTabStyle('doctor')}" onclick="DashboardModule._setTopTab('doctor')">🩺 Doctor OPD</button>
        <button style="${mainTabStyle('indoor')}" onclick="DashboardModule._setTopTab('indoor')">🏥 InDoor IPD</button>
        <button style="${mainTabStyle('report')}" onclick="DashboardModule._setTopTab('report')">🧪 Reports</button>
        <button style="${mainTabStyle('pharmacy')}" onclick="DashboardModule._setTopTab('pharmacy')">💊 Pharmacy</button>
      </div>

      <!-- KPI Row -->
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:14px;margin-bottom:18px;">
        <div class="pharm-kpi">
          <div class="ki" style="background:#eff6ff;">📋</div>
          <div><div class="kv" style="color:#1d4ed8;">${totalRx}</div><div class="kl">Today's Rx</div></div>
        </div>
        <div class="pharm-kpi" onclick="DashboardModule._setPharmacyFilter('pending')" style="cursor:pointer;">
          <div class="ki" style="background:#fefce8;">⏳</div>
          <div><div class="kv" style="color:#ca8a04;">${pendingDispense}</div><div class="kl">Pending</div></div>
        </div>
        <div class="pharm-kpi" onclick="DashboardModule._setPharmacyFilter('dispensed')" style="cursor:pointer;">
          <div class="ki" style="background:#f0fdf4;">✅</div>
          <div><div class="kv" style="color:#16a34a;">${dispensedCount}</div><div class="kl">Dispensed</div></div>
        </div>
        <div class="pharm-kpi">
          <div class="ki" style="background:#f0fdf4;">💰</div>
          <div><div class="kv" style="color:#15803d;">₹${totalSalesToday.toFixed(0)}</div><div class="kl">Collected</div></div>
        </div>
        <div class="pharm-kpi" onclick="DashboardModule._setPharmacyTab('lowstock')" style="cursor:pointer;">
          <div class="ki" style="background:#fef2f2;">⚠️</div>
          <div><div class="kv" style="color:#dc2626;">${lowStockMeds.length}</div><div class="kl">Low Stock</div></div>
        </div>
        <div class="pharm-kpi" onclick="navigateTo('medicines')" style="cursor:pointer;">
          <div class="ki" style="background:#faf5ff;">💊</div>
          <div><div class="kv" style="color:#7c3aed;">${allMeds.length}</div><div class="kl">Medicines</div></div>
        </div>
      </div>
      <!-- ══ Pharmacy Queue / Low Stock Panel ══ -->
      <div>
        <div class="ph-tab-bar">
          <button style="${tabStyle('queue')}" onclick="DashboardModule._setPharmacyTab('queue')">💊 Prescriptions Queue <span style="background:var(--primary);color:#fff;border-radius:999px;padding:1px 7px;font-size:10px;margin-left:4px;">${totalRx}</span></button>
          <button style="${tabStyle('lowstock')}" onclick="DashboardModule._setPharmacyTab('lowstock')">⚠️ Low Stock <span style="background:#dc2626;color:#fff;border-radius:999px;padding:1px 7px;font-size:10px;margin-left:4px;">${lowStockMeds.length}</span></button>
          <div style="margin-left:auto;display:flex;align-items:center;gap:8px;padding:6px 0;">
            <input type="date" id="opdDashDate" value="${today}" onchange="DashboardModule.render()" style="padding:4px 8px;font-size:12px;border:1px solid var(--border);border-radius:7px;background:var(--bg-elevated);color:var(--text-primary);font-weight:600;">
            <button class="ph-btn primary" onclick="navigateTo('medicines')" style="font-size:11px;">📦 Medicine Master</button>
            <button class="ph-btn sec" onclick="navigateTo('billing')" style="font-size:11px;">🧾 Invoices</button>
          </div>
        </div>

        <div class="ph-panel">
          <div class="ph-toolbar">
            ${curTab === 'queue' ? `
            <div style="display:flex;align-items:center;gap:8px;">
              <span style="font-size:11px;font-weight:600;color:var(--text-secondary);">Filter:</span>
              <label style="display:flex;align-items:center;gap:4px;font-size:12px;font-weight:600;cursor:pointer;"><input type="radio" name="pharmFilter" value="all" ${this._pharmacyFilter === 'all' ? 'checked' : ''} onchange="DashboardModule._setPharmacyFilter('all')"> All</label>
              <label style="display:flex;align-items:center;gap:4px;font-size:12px;font-weight:600;cursor:pointer;"><input type="radio" name="pharmFilter" value="pending" ${this._pharmacyFilter === 'pending' ? 'checked' : ''} onchange="DashboardModule._setPharmacyFilter('pending')"> ⏳ Pending</label>
              <label style="display:flex;align-items:center;gap:4px;font-size:12px;font-weight:600;cursor:pointer;"><input type="radio" name="pharmFilter" value="dispensed" ${this._pharmacyFilter === 'dispensed' ? 'checked' : ''} onchange="DashboardModule._setPharmacyFilter('dispensed')"> ✅ Dispensed</label>
            </div>
            <div class="ph-search">
              <span style="color:var(--text-muted);">🔍</span>
              <input type="text" placeholder="Search patient, token, bill no…" value="${App.escHtml(this._searchQ || '')}" oninput="DashboardModule._searchQ = this.value; DashboardModule.render();">
            </div>` : `<span style="font-size:13px;font-weight:700;color:#dc2626;">⚠️ Medicines below reorder level — needs restocking</span><button class="ph-btn primary" onclick="navigateTo('medicines')">📦 Update Stock</button>`}
          </div>

          <!-- Table -->
          <div class="table-wrapper" style="overflow-x:auto;">
            ${curTab === 'queue' ? `
              <table class="opd-table" style="font-size:12px;">
                <thead>
                  <tr>
                    <th style="width:60px;">Token</th>
                    <th style="width:85px;">Time</th>
                    <th>Patient Name</th>
                    <th style="width:160px;text-align:center;">Bill No.</th>
                    <th style="width:140px;text-align:right;padding-right:20px;">Bill Amt</th>
                  </tr>
                </thead>
                <tbody>
                  ${filteredQueue.length === 0 ? `<tr><td colspan="5" style="text-align:center;padding:30px;color:var(--text-muted);font-size:13px;">No prescriptions in queue for this filter.</td></tr>` : filteredQueue.map(item => `
                    <tr style="cursor:pointer;" onclick="DashboardModule.openMedicineBillingModal('${item.patientId}','${item.apptId}')" title="Click to view/edit bill">
                      <td class="opd-td-center" style="background:#DBE7EE;color:#000;font-weight:800;">${item.token}</td>
                      <td class="opd-td-center" style="font-size:11px;font-weight:600;">${App.escHtml(item.time)}</td>
                      <td style="font-weight:800;color:var(--primary);">
                        <div>${App.escHtml(item.patientName)}</div>
                        <div style="font-size:10px;color:var(--text-muted);font-weight:600;">📞 ${App.escHtml(item.phone)}</div>
                      </td>
                      <td class="opd-td-center">
                        <span style="background:#eff6ff;color:#1d4ed8;border:1px solid #bfdbfe;padding:3px 10px;border-radius:4px;font-weight:800;font-family:monospace;letter-spacing:0.5px;">${App.escHtml(item.billNo)}</span>
                      </td>
                      <td style="text-align:right;font-weight:800;color:#0B4F26;font-size:13px;padding-right:20px;">
                        ₹${Number(item.billAmt || 0).toFixed(2)}
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            ` : `
              <table class="opd-table" style="font-size:12px;">
                <thead>
                  <tr>
                    <th style="width:40px;">#</th>
                    <th>Medicine Name</th>
                    <th>Generic</th>
                    <th style="width:60px;">Unit</th>
                    <th style="width:90px;">Stock</th>
                    <th style="width:70px;">Max Qty</th>
                    <th style="width:70px;">PTR</th>
                    <th style="width:70px;">MRP</th>
                    <th style="width:80px;">Dower</th>
                    <th style="width:90px;">Action</th>
                  </tr>
                </thead>
                <tbody>
                  ${lowStockMeds.length === 0 ? `<tr><td colspan="10" style="text-align:center;padding:30px;color:var(--text-muted);font-size:13px;">✅ All medicines have adequate stock!</td></tr>` : lowStockMeds.map((m, i) => `
                    <tr>
                      <td class="opd-td-center" style="font-weight:700;">${i + 1}</td>
                      <td style="font-weight:800;color:var(--primary);text-transform:uppercase;">${App.escHtml(m.name)}</td>
                      <td style="font-size:11px;color:var(--text-secondary);font-weight:600;">${App.escHtml(m.generic || '—')}</td>
                      <td class="opd-td-center" style="font-weight:700;">${App.escHtml(m.unit || 'TAB.')}</td>
                      <td class="opd-td-center"><span style="background:#FEE2E2;color:#991B1B;padding:2px 8px;border-radius:4px;font-weight:800;font-size:11px;border:1px solid #FCA5A5;">${m.orqty || m.stock || 0}</span></td>
                      <td class="opd-td-center" style="font-weight:600;">${m.maxQty || 50}</td>
                      <td class="opd-td-center" style="font-weight:700;">₹${Number(m.ptr || 0).toFixed(2)}</td>
                      <td class="opd-td-center" style="font-weight:800;color:#0B4F26;">₹${Number(m.mrppack || m.price || 0).toFixed(2)}</td>
                      <td class="opd-td-center" style="font-weight:700;color:#0369a1;">${App.escHtml(m.dower || m.stockDower || '—')}</td>
                      <td class="opd-td-center">
                        <button class="ph-btn primary" onclick="navigateTo('medicines')" style="font-size:11px;padding:4px 8px;">📦 Update</button>
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            `}
          </div>
        </div>
      </div>
    `;
  },


  _renderTable() {
    const el = document.getElementById('opdDashTable');
    if (!el) return;

    const date = this._getDate();
    const todayFmt = new Date().toLocaleDateString('en-GB');
    const patients = DB.getPatients();
    const invoices = DB.getInvoices();
    const settings = DB.getSettings();
    const drName = settings.doctorName || 'DR. YASH VAGHANI';

    // Build OPD rows from appointments
    let allAppts = DB.getAppointments() || [];
    let appts = [];

    if (this._topTab === 'indoor') {
      // Indoor tab: show all indoor patients
      appts = allAppts
        .filter(a => {
          const p = patients.find(pt => String(pt.id) === String(a.patientId)) || {};
          return a.indoor === true || a.type === 'Indoor' || p.indoor === true || Boolean(p.ipdWard);
        })
        .sort((a, b) => (a.time || '').localeCompare(b.time || ''));

      // InDoor tab filter: All = all IPD, Done = completed IPD, Not Done = ongoing IPD
      if (this._filter === 'done') appts = appts.filter(a => a.status === 'completed' || a.stage === 'Done');
      if (this._filter === 'notdone') appts = appts.filter(a => a.status !== 'completed' && a.stage !== 'Done');
    } else if (this._topTab === 'report') {
      // ═════════════════════════════════════════════════════════════════
      // 📊 REPORT TAB: Custom Lab & Investigation Reports Table
      // ═════════════════════════════════════════════════════════════════
      let repItems = this._getReportItems(date);

      // Search filtering
      if (this._searchQ.trim()) {
        const q = this._searchQ.toLowerCase();
        repItems = repItems.filter(r => {
          if (this._searchMode === 'id') return String(r.patientId).toLowerCase().includes(q);
          return (r.patientName || '').toLowerCase().includes(q) || (r.reportName || '').toLowerCase().includes(q) || (r.labName || '').toLowerCase().includes(q);
        });
      }

      // Filter: All | Done | Not Done
      if (this._filter === 'done') repItems = repItems.filter(r => r.done === true);
      if (this._filter === 'notdone') repItems = repItems.filter(r => r.done !== true);

      if (repItems.length === 0) {
        el.innerHTML = `
          <div class="table-wrapper">
            <table class="opd-table">
              <thead>
                <tr>
                  <th>#</th><th>Date</th><th>P.Id</th><th>Patient Name</th><th>Lab Name</th><th>Report Name</th><th>Done</th><th>Paid</th><th>Amt</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr><td colspan="10" style="text-align:center;padding:20px;color:#94a3b8;font-size:12px;">No reports found for this filter. Click <b>➕ Add Lab / Report</b> above to create a new report order.</td></tr>
              </tbody>
            </table>
          </div>
        `;
        return;
      }

      const repRows = repItems.map((r, i) => {
        const dateFmt = r.date ? (r.date.includes('-') ? r.date.split('-').reverse().join('/') : r.date) : todayFmt;
        const rowClass = r.done ? 'opd-row-done' : '';

        return `
          <tr class="${rowClass}" style="cursor:pointer;" onclick="DashboardModule.openPatientHistoryModal('${r.patientId}', null, null, 'tab2')">
            <td class="opd-td-center" style="background:#DBE7EE;color:#000000;font-weight:800;" onclick="DashboardModule.openPatientHistoryModal('${r.patientId}', null, null, 'tab2')">${i + 1}</td>
            <td class="opd-td-center" style="color:#004899;font-weight:800;" onclick="DashboardModule.openPatientHistoryModal('${r.patientId}', null, null, 'tab2')">${dateFmt}</td>
            <td class="opd-td-center" style="color:#004899;font-weight:700;" onclick="DashboardModule.openPatientHistoryModal('${r.patientId}', null, null, 'tab2')">${App.escHtml(String(r.patientId))}</td>
            <td style="font-weight:800;min-width:150px;color:#000000;" onclick="DashboardModule.openPatientHistoryModal('${r.patientId}', null, null, 'tab2')">
              <span style="color:#000000;cursor:pointer;">${App.escHtml(r.patientName)}</span>
            </td>
            <td style="font-weight:700;color:#0369a1;min-width:160px;">
              🏥 ${App.escHtml(r.labName || 'Main Parth Pathology')}
            </td>
            <td style="font-weight:800;color:#0f172a;min-width:200px;">
              🧪 ${App.escHtml(r.reportName)}
            </td>
            <td class="opd-td-center" onclick="event.stopPropagation()">
              <input type="checkbox" class="opd-check" ${r.done ? 'checked' : ''} title="${r.done ? 'Report Completed' : 'Mark as Done'}"
                     onchange="DashboardModule._toggleReportDone('${r.id}', this.checked)">
            </td>
            <td class="opd-td-center" onclick="event.stopPropagation();DashboardModule._togglePaid('${r.id}')">
              ${r.paid
            ? `<span style="background:#E2E8F0;color:#1E293B;padding:2px 6px;border-radius:3px;font-weight:700;font-size:11px;border:1px solid #CBD5E1;cursor:pointer;" title="Paid (Click to mark Unpaid)">Paid</span>`
            : `<span style="background:#FEE2E2;color:#991B1B;padding:2px 6px;border-radius:3px;font-weight:700;font-size:11px;border:1px solid #FCA5A5;cursor:pointer;" title="Unpaid (Click to mark Paid & set amount to 0)">Unpaid</span>`}
            </td>
            <td class="opd-td-center" style="background:#0B4F26 !important;color:#FFFFFF !important;font-weight:800;font-size:12px;cursor:pointer;" title="Click to edit billing amount" onclick="event.stopPropagation();DashboardModule.openPaymentModal('${r.patientId}','${r.id}','${r.amt || 150}')">
              ₹${r.paid ? 0 : (r.amt || 0)}
            </td>

            <td onclick="event.stopPropagation()">
              <div class="td-actions">
                <button class="btn btn-sm btn-secondary" onclick="event.stopPropagation();DashboardModule.openPatientHistoryModal('${r.patientId}', null, null, 'tab2')" title="View Patient Details & Investigations">👁️</button>
                <button class="btn btn-sm btn-primary" onclick="event.stopPropagation();DashboardModule._printReportSlip('${r.id}')" style="background:#0891b2;color:#fff;" title="Print Lab Order Slip">🖨️</button>
              </div>
            </td>
          </tr>
        `;
      });

      el.innerHTML = `
        <table class="opd-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Date</th>
              <th>P.Id</th>
              <th>Patient Name</th>
              <th>Lab Name</th>
              <th>Report Name</th>
              <th>Done</th>
              <th>Paid</th>
              <th>Amt</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${repRows.join('')}
          </tbody>
        </table>
      `;
      return;
    } else {
      // Doctor tab:
      // show today's appointments + ongoing indoor patients
      appts = allAppts
        .filter(a => a.date === date || (a.indoor === true && a.status !== 'completed'))
        .sort((a, b) => (a.time || '').localeCompare(b.time || ''));

      // In Doctor tab:
      // 'notdone' = only OPD pending patients (indoor patients move to Indoor Not Done list)
      // 'done'    = only OPD completed patients
      // 'all'     = all patients (both OPD & Indoor)
      if (this._filter === 'done') appts = appts.filter(a => !a.indoor && a.type !== 'Indoor' && (a.status === 'completed' || a.stage === 'Done'));
      if (this._filter === 'notdone') appts = appts.filter(a => !a.indoor && a.type !== 'Indoor' && a.status !== 'completed' && a.stage !== 'Done');
    }

    // Apply search
    if (this._searchQ.trim()) {
      const q = this._searchQ.toLowerCase();
      appts = appts.filter(a => {
        if (this._searchMode === 'id') {
          const opdVal = String(_opdNo(a)).toLowerCase();
          return (a.patientId || '').toLowerCase().includes(q) || opdVal.includes(q);
        }
        return (a.patientName || '').toLowerCase().includes(q);
      });
    }

    const isIndoorTab = this._topTab === 'indoor';

    if (appts.length === 0) {
      el.innerHTML = `
        <div class="table-wrapper">
          <table class="opd-table">
            <thead>
              <tr>
                <th>Token</th><th>Date</th><th>OPD No</th><th>P.Id</th><th>Patient Name</th><th>Dr.Name</th>${isIndoorTab ? '<th>Count</th>' : ''}<th>AMT</th><th>Paid</th><th>Done</th><th>InDoor</th><th>M-Amt</th><th>Time</th><th style="text-align:center;">Actions</th>
              </tr>
            </thead>
            <tbody></tbody>
          </table>
        </div>
      `;
      return;
    }

    // Build table rows with token numbers
    let token = this._tokenBase;
    const rows = appts.map(a => {
      const patient = patients.find(p => p.id === a.patientId) || {};
      const done = a.status === 'completed';
      const indoor = Boolean(a.indoor);
      const cancelled = a.status === 'cancelled';
      const t = token++;
      const opdNum = _opdNo(a);

      // Count and Bed Charges for Indoor
      const ipdDoneCount = a.ipdDoneCount || patient.ipdDoneCount || 1;
      const bedCharge = patient.bedChargePerDay != null ? Number(patient.bedChargePerDay) : (a.bedChargePerDay != null ? Number(a.bedChargePerDay) : 400);
      const indoorAmt = ipdDoneCount * bedCharge;

      // 1. General OPD / Consultation / Visit / Bed Fee (for AMT column)
      const invoice = invoices.find(i => String(i.patientId) === String(a.patientId) && String(i.appointmentId) === String(a.id))
        || invoices.find(i => String(i.patientId) === String(a.patientId) && i.createdAt && i.createdAt.startsWith(date));
      const opdFeeAmt = (indoor || isIndoorTab)
        ? indoorAmt
        : (a.fee != null ? Number(a.fee) : (invoice ? Number(invoice.total) : (a.amt != null ? Number(a.amt) : 100)));

      // 2. Prescription Medicine Total (for M-Amt column)
      const patientRxs = (DB.getPrescriptions ? DB.getPrescriptions() : []).filter(r => String(r.patientId) === String(a.patientId));
      const hasSavedRx = patient.savedRx && Array.isArray(patient.savedRx) && patient.savedRx.length > 0;

      let rxTotalAmt = 0;
      if (done) {
        if (hasSavedRx) {
          rxTotalAmt = patient.savedRx.reduce((sum, item) => sum + (Number(item.total) || 0), 0);
        } else if (patientRxs.length > 0) {
          const latestRx = patientRxs[patientRxs.length - 1];
          rxTotalAmt = Number(latestRx.total || latestRx.grandTotal || (latestRx.items ? latestRx.items.reduce((s, it) => s + (Number(it.total) || 0), 0) : 0));
        } else if (indoor) {
          rxTotalAmt = indoorAmt;
        } else {
          rxTotalAmt = 0;
        }
      }

      // 1. OPD Consultation Fee Paid Status (for AMT column & PAID column)
      const opdPaid = a.opdPaid != null ? Boolean(a.opdPaid) : (a.paid != null ? Boolean(a.paid) : (invoice ? invoice.status === 'paid' : false));

      // 2. Pharmacy / Medicine Bill Paid Status (strictly for M-AMT column)
      const medPaid = a.rxPaid != null ? Boolean(a.rxPaid) : (a.medPaid != null ? Boolean(a.medPaid) : false);
      const isMedPaid = medPaid && rxTotalAmt > 0;

      const payMode = a.paymentMode || (invoice ? invoice.paymentMode : '') || 'Cash';
      const apptDateFmt = a.date ? a.date.split('-').reverse().join('/') : todayFmt;

      // Row color: green = done, blue = indoor (IPD), red = cancelled, default = pending
      const rowClass = indoor ? 'opd-row-indoor' : (done ? 'opd-row-done' : (cancelled ? 'opd-row-cancelled' : ''));

      // Numeric Patient ID
      const shortId = a.patientId || '—';

      const openHistoryAction = isIndoorTab
        ? `DashboardModule.openIndoorModal('${a.patientId}', '${a.id}')`
        : `DashboardModule.openPatientHistoryModal('${a.patientId}', '${opdNum}', '${a.id}', 'tab1')`;
      const openRxAction = isIndoorTab
        ? `DashboardModule.openIndoorModal('${a.patientId}', '${a.id}')`
        : `DashboardModule.openPatientHistoryModal('${a.patientId}', '${opdNum}', '${a.id}', 'tab4')`;
      const openTitle = isIndoorTab
        ? 'Click to open IPD Clinical Record'
        : 'Click to open Patient History & Examination';
      const openRxTitle = isIndoorTab
        ? 'Click to open IPD Prescription'
        : 'Click to open Prescription (Rx)';

      return `
        <tr class="${rowClass}" data-patient-id="${a.patientId}" data-opd-no="${opdNum}" data-appt-id="${a.id}" style="cursor:pointer;${indoor ? 'background:#e0f2fe;' : ''}" title="${openTitle}">
          <td class="opd-td-center" style="background:#DBE7EE;color:#000000;font-weight:800;cursor:pointer;" onclick="event.stopPropagation();${openHistoryAction}" title="${openTitle}">${t}</td>
          <td class="opd-td-center" style="color:#004899;font-weight:800;cursor:pointer;" onclick="event.stopPropagation();${openHistoryAction}" title="${openTitle}">${apptDateFmt}</td>
          <td class="opd-td-center" style="color:#004899;font-weight:800;cursor:pointer;" onclick="event.stopPropagation();${openHistoryAction}" title="${openTitle}">${opdNum}</td>
          <td class="opd-td-center" style="color:#004899;font-weight:700;cursor:pointer;" onclick="event.stopPropagation();${openHistoryAction}" title="${openTitle}">${shortId}</td>
          <td style="font-weight:800;min-width:160px;color:#000000;cursor:pointer;" onclick="event.stopPropagation();${openHistoryAction}" title="${openTitle}">
            ${indoor ? `<span style="font-size:10px;background:#0891b2;color:#fff;border-radius:3px;padding:1px 5px;margin-right:4px;font-weight:800;cursor:pointer;" onclick="event.stopPropagation();DashboardModule.openIndoorModal('${a.patientId}','${a.id}')" title="Click to open IPD Record">IPD</span>` : ''}
            <span style="color:#000000;cursor:pointer;">${App.escHtml(a.patientName)}</span>
          </td>
          <td style="color:#000000;font-weight:600;">${App.escHtml(drName)}</td>
          ${isIndoorTab ? `<td class="opd-td-center" style="font-weight:700;color:#000000;" title="${ipdDoneCount} Time(s) Prescribed">${ipdDoneCount}</td>` : ''}
          <td class="opd-td-center" style="font-weight:800;font-size:12px;color:#000000;cursor:pointer;" title="OPD Consultation Amount (Click to edit)" onclick="event.stopPropagation();DashboardModule.openPaymentModal('${a.patientId}','${a.id}','${opdFeeAmt || 100}')">
            ${opdPaid ? 0 : (opdFeeAmt > 0 ? opdFeeAmt.toFixed(0) : '100')}
          </td>
          <td class="opd-td-center" onclick="event.stopPropagation();DashboardModule._togglePaid('${a.id}')">
            ${opdPaid
          ? `<span style="background:#E2E8F0;color:#1E293B;padding:2px 6px;border-radius:3px;font-weight:700;font-size:11px;border:1px solid #CBD5E1;cursor:pointer;" title="OPD Fee Paid (Click to mark Unpaid)">Paid</span>`
          : `<span style="background:#FEE2E2;color:#991B1B;padding:2px 6px;border-radius:3px;font-weight:700;font-size:11px;border:1px solid #FCA5A5;cursor:pointer;" title="OPD Fee Unpaid (Click to mark Paid & set amount to 0)">Unpaid</span>`}
          </td>

          <td class="opd-td-center" onclick="event.stopPropagation()">
            <input type="checkbox" class="opd-check" ${done ? 'checked' : ''} title="${done ? 'Completed' : 'Mark as done'}"
                   onchange="DashboardModule._toggleDone('${a.id}', this.checked)">
          </td>
          <td class="opd-td-center" onclick="event.stopPropagation()">
            <input type="checkbox" class="opd-check" ${indoor ? 'checked' : ''} title="${indoor ? 'Indoor Patient' : 'Mark as Indoor'}"
                   onchange="DashboardModule._toggleIndoor('${a.id}', this.checked)">
          </td>
          <td class="opd-td-center" style="${isMedPaid ? 'background:#0B4F26 !important;color:#FFFFFF !important;font-weight:800;' : 'color:#000000;font-weight:700;'}font-size:12px;cursor:pointer;" title="${isMedPaid ? `Medical Amount Paid: ₹${rxTotalAmt} (Click to view/edit medicine bill)` : 'Click to view / edit medicine billing & extra items'}" onclick="event.stopPropagation();DashboardModule.openMedicineBillingModal('${a.patientId}','${a.id}')">
            ${rxTotalAmt > 0 ? rxTotalAmt.toFixed(0) : '0'}
          </td>
          <td class="opd-td-center" style="color:#000000;font-weight:600;font-size:11px;">
            ${App.escHtml(a.time)}
          </td>
          <td class="opd-td-center" onclick="event.stopPropagation()">
            <div class="td-actions" style="display:flex;align-items:center;justify-content:center;">
              <button class="btn btn-sm btn-primary" onclick="${openRxAction}" title="${openRxTitle}" style="font-size:12px;padding:3px 8px;background:${isIndoorTab ? '#0891b2' : 'var(--primary)'};color:#fff;cursor:pointer;font-weight:700;">💊 Rx</button>
            </div>
          </td>
        </tr>
      `;
    });

    el.innerHTML = `
      <table class="opd-table">
        <thead>
          <tr>
            <th>Token</th>
            <th>Date</th>
            <th>OPD No</th>
            <th>P.Id</th>
            <th>Patient Name</th>
            <th>Dr.Name</th>
            ${isIndoorTab ? '<th>Count</th>' : ''}
            <th>AMT</th>
            <th>Paid</th>
            <th>Done</th>
            <th>InDoor</th>
            <th>M-Amt</th>
            <th>Time</th>
            <th style="text-align:center;">Actions</th>
          </tr>
        </thead>
        <tbody>
          ${rows.join('')}
        </tbody>
      </table>
    `;

    // Direct and Delegated double click listener on all rows
    el.querySelectorAll('tbody tr').forEach(tr => {
      tr.addEventListener('click', function (e) {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON' || e.target.closest('.td-actions')) return;
        el.querySelectorAll('tbody tr').forEach(r => r.classList.remove('selected-row'));
        this.classList.add('selected-row');
      });

      tr.addEventListener('dblclick', function (e) {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON' || e.target.closest('.td-actions')) return;
        const pid = this.getAttribute('data-patient-id');
        const opdNo = this.getAttribute('data-opd-no');
        const apptId = this.getAttribute('data-appt-id');
        if (pid) {
          DashboardModule.openPatientHistoryModal(pid, opdNo, apptId);
        }
      });
    });
  },

  /* 📊 Lab & Investigation Report Helper Methods */
  _getReportItems(filterDate) {
    const patients = DB.getPatients() || [];
    const visits = DB.getVisits() || [];
    const appts = DB.getAppointments() || [];
    const labTests = DB.getLabTests ? DB.getLabTests() || [] : [];
    const items = [];

    // Helper: get lab details from lab master by labName
    const getLabDetails = (lName) => {
      const lt = labTests.find(t => (t.labName || '').toLowerCase() === (lName || '').toLowerCase());
      return { labAddress: (lt && lt.labAddress) || '', labPhone: (lt && lt.labPhone) || '' };
    };

    // 1. Custom saved lab reports
    const savedReports = JSON.parse(localStorage.getItem('clinic_lab_reports') || '[]');
    savedReports.forEach(r => {
      const ldet = getLabDetails(r.labName);
      items.push({
        id: r.id,
        patientId: r.patientId,
        patientName: r.patientName || (patients.find(p => String(p.id) === String(r.patientId))?.name) || 'Patient',
        date: r.date || new Date().toISOString().split('T')[0],
        labName: r.labName || 'Main Parth Pathology',
        labAddress: r.labAddress || ldet.labAddress || '',
        labPhone: r.labPhone || ldet.labPhone || '',
        reportName: r.reportName || r.testName || 'Blood Test',
        done: Boolean(r.done || r.receive),
        paid: Boolean(r.paid),
        amt: Number(r.amt || 100),
        notes: r.notes || '',
        isCustom: true
      });
    });

    // 2. Extract from visit records (investigations, radiology, reports)
    visits.forEach(v => {
      const p = patients.find(pt => String(pt.id) === String(v.patientId)) || {};
      const pName = p.name || v.patientName || 'Patient';
      const vDate = v.date || (v.createdAt ? v.createdAt.split('T')[0] : new Date().toISOString().split('T')[0]);

      (v.investigations || []).forEach((inv, idx) => {
        items.push({
          id: `inv_${v.id}_${idx}`,
          visitId: v.id,
          patientId: v.patientId,
          patientName: pName,
          date: inv.date || vDate,
          labName: inv.labName || 'Main Parth Pathology',
          reportName: inv.investigation || 'Investigation',
          done: Boolean(inv.receive || inv.done),
          paid: Boolean(inv.pAmt > 0),
          amt: Number(inv.rs || inv.pAmt || 100),
          notes: ''
        });
      });

      (v.radiology || []).forEach((rad, idx) => {
        items.push({
          id: `rad_${v.id}_${idx}`,
          visitId: v.id,
          patientId: v.patientId,
          patientName: pName,
          date: vDate,
          labName: rad.labName || 'Parth X-Ray Lab',
          reportName: `${rad.category ? rad.category + ': ' : ''}${rad.radiology || 'X-Ray'}`,
          done: Boolean(rad.receive || rad.done),
          paid: true,
          amt: Number(rad.rs || 300),
          notes: ''
        });
      });

      (v.reports || []).forEach((rep, idx) => {
        items.push({
          id: `rep_${v.id}_${idx}`,
          visitId: v.id,
          patientId: v.patientId,
          patientName: pName,
          date: vDate,
          labName: rep.labName || 'Self Clinic Lab',
          reportName: rep.report || 'Lab Report',
          done: Boolean(rep.receive || rep.done),
          paid: false,
          amt: Number(rep.rs || 150),
          notes: ''
        });
      });
    });

    // 3. Extract from appointments marked with report
    appts.forEach(a => {
      if (a.hasReport || a.type === 'Report' || a.reportName) {
        items.push({
          id: `appt_${a.id}`,
          apptId: a.id,
          patientId: a.patientId,
          patientName: a.patientName,
          date: a.date,
          labName: a.labName || 'Main Parth Pathology',
          reportName: a.reportName || 'Diagnostic Report',
          done: Boolean(a.status === 'completed' || a.reportDone),
          paid: a.paid != null ? Boolean(a.paid) : true,
          amt: Number(a.amt || 200),
          notes: ''
        });
      }
    });

    // If items is empty, populate starter default sample lab reports for demonstration
    if (items.length === 0) {
      const todayIso = new Date().toISOString().split('T')[0];
      const starter = [
        { id: 'lr_1', patientId: '1', patientName: 'KAJALBEN', date: todayIso, labName: 'Main Parth Pathology', reportName: 'Blood Sugar (Fasting)', done: false, paid: false, amt: 100 },
        { id: 'lr_2', patientId: '2', patientName: 'MAMIBEN', date: todayIso, labName: 'Parth X-Ray Lab', reportName: 'CHEST PA VIEW (X-RAY)', done: true, paid: true, amt: 350 },
        { id: 'lr_3', patientId: '3', patientName: 'RAMESHBHAI', date: todayIso, labName: 'Shreeji Diagnostic Lab', reportName: 'CBC (Complete Blood Count)', done: false, paid: true, amt: 250 },
        { id: 'lr_4', patientId: '4', patientName: 'PRIYANKABEN', date: todayIso, labName: 'Self Clinic Lab', reportName: 'Lipid Profile & Serum Creatinine', done: true, paid: false, amt: 500 }
      ];
      localStorage.setItem('clinic_lab_reports', JSON.stringify(starter));
      return starter;
    }

    return items;
  },

  _toggleReportDone(repId, checked) {
    let savedReports = JSON.parse(localStorage.getItem('clinic_lab_reports') || '[]');
    const idx = savedReports.findIndex(r => String(r.id) === String(repId));
    if (idx >= 0) {
      savedReports[idx].done = checked;
      savedReports[idx].receive = checked;
      localStorage.setItem('clinic_lab_reports', JSON.stringify(savedReports));
    }

    if (String(repId).startsWith('appt_')) {
      const apptId = repId.replace('appt_', '');
      DB.updateAppointment(apptId, { reportDone: checked, status: checked ? 'completed' : 'scheduled' });
    }

    if (String(repId).startsWith('inv_') || String(repId).startsWith('rad_') || String(repId).startsWith('rep_')) {
      const parts = repId.split('_');
      const visitId = parts[1];
      const itemIdx = parseInt(parts[2], 10);
      const v = (DB.getVisits() || []).find(x => String(x.id) === String(visitId));
      if (v) {
        if (parts[0] === 'inv' && v.investigations && v.investigations[itemIdx]) v.investigations[itemIdx].receive = checked;
        if (parts[0] === 'rad' && v.radiology && v.radiology[itemIdx]) v.radiology[itemIdx].receive = checked;
        if (parts[0] === 'rep' && v.reports && v.reports[itemIdx]) v.reports[itemIdx].receive = checked;
        DB.updateVisit(visitId, v);
      }
    }

    App.toast(checked ? 'Report marked as Done / Received! ☑️' : 'Report marked as Pending! ⏳', 'info', 1500);
    this._renderTable();
  },

  openAddReportModal(prefillPatientId) {
    const patients = DB.getPatients() || [];
    const todayIso = new Date().toISOString().split('T')[0];

    const body = `
      <div style="font-family:sans-serif;font-size:12px;color:#1e293b;">
        <div style="display:flex;flex-direction:column;gap:12px;">
          <div>
            <label style="font-size:11px;font-weight:700;display:block;margin-bottom:3px;">Select Patient *</label>
            <select id="lr_patientId" class="form-control" style="font-size:12px;font-weight:700;height:32px;">
              <option value="">-- Choose Patient --</option>
              ${patients.map(p => `<option value="${p.id}" ${String(p.id) === String(prefillPatientId) ? 'selected' : ''}>${App.escHtml(p.name)} (ID: ${p.id}) - ${p.mobile || ''}</option>`).join('')}
            </select>
          </div>

          <div>
            <label style="font-size:11px;font-weight:700;display:block;margin-bottom:3px;">Lab Name *</label>
            <input id="lr_labName" list="lr_labList" class="form-control" value="Main Parth Pathology" placeholder="Select or type Lab name..." style="font-size:12px;font-weight:700;height:32px;">
            <datalist id="lr_labList">
              <option value="Main Parth Pathology">
              <option value="Parth X-Ray Lab">
              <option value="Shreeji Diagnostic Lab">
              <option value="Self Clinic Lab">
              <option value="Metropolis Lab">
              <option value="Anand Clinical Laboratory">
            </datalist>
          </div>

          <div>
            <label style="font-size:11px;font-weight:700;display:block;margin-bottom:3px;">Report / Investigation Name *</label>
            <input id="lr_reportName" list="lr_testList" class="form-control" placeholder="Search or type test name (e.g. CBC, Blood Sugar, X-Ray)..." style="font-size:12px;font-weight:700;height:32px;">
            <datalist id="lr_testList">
              <option value="Blood Sugar (Fasting)">
              <option value="Blood Sugar (PP)">
              <option value="CBC (Complete Blood Count)">
              <option value="Lipid Profile">
              <option value="Liver Function Test (LFT)">
              <option value="Renal Function Test (RFT)">
              <option value="Serum Creatinine">
              <option value="Serum Uric Acid">
              <option value="Thyroid Profile (T3, T4, TSH)">
              <option value="Urine Routine & Microscopic">
              <option value="Stool Routine">
              <option value="Widal Test">
              <option value="Dengue NS1 Antigen">
              <option value="Malaria Parasite (MP)">
              <option value="CHEST PA VIEW (X-RAY)">
              <option value="ECG (12 Lead)">
              <option value="USG Abdomen & Pelvis">
            </datalist>
          </div>

          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
            <div>
              <label style="font-size:11px;font-weight:700;display:block;margin-bottom:3px;">Date</label>
              <input id="lr_date" type="date" class="form-control" value="${todayIso}" style="font-size:12px;font-weight:700;height:32px;">
            </div>
            <div>
              <label style="font-size:11px;font-weight:700;display:block;margin-bottom:3px;">Charges / Amt (₹)</label>
              <input id="lr_amt" type="number" class="form-control" value="150" style="font-size:12px;font-weight:800;color:#0b4f26;height:32px;">
            </div>
          </div>

          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
            <div>
              <label style="font-size:11px;font-weight:700;display:block;margin-bottom:3px;">Report Status</label>
              <select id="lr_done" class="form-control" style="font-size:12px;font-weight:700;height:32px;">
                <option value="false">⏳ Pending</option>
                <option value="true">✅ Done / Received</option>
              </select>
            </div>
            <div>
              <label style="font-size:11px;font-weight:700;display:block;margin-bottom:3px;">Payment Status</label>
              <select id="lr_paid" class="form-control" style="font-size:12px;font-weight:700;height:32px;">
                <option value="false">❌ Unpaid</option>
                <option value="true">✅ Paid</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    `;

    const footer = `
      <div style="display:flex;justify-content:space-between;width:100%;align-items:center;">
        <button class="btn btn-secondary" onclick="App.closeModal()">✕ Cancel</button>
        <button class="btn btn-primary" onclick="DashboardModule._saveNewReport()" style="background:#16a34a;color:#fff;font-weight:700;">💾 Save Report</button>
      </div>
    `;

    App.openModal('📊 Add Lab / Investigation Report', body, footer, 'md');
  },

  _saveNewReport() {
    const pId = document.getElementById('lr_patientId')?.value;
    const labName = document.getElementById('lr_labName')?.value?.trim() || 'Main Parth Pathology';
    const repName = document.getElementById('lr_reportName')?.value?.trim();
    const date = document.getElementById('lr_date')?.value || new Date().toISOString().split('T')[0];
    const amt = Number(document.getElementById('lr_amt')?.value || 150);
    const done = document.getElementById('lr_done')?.value === 'true';
    const paid = document.getElementById('lr_paid')?.value === 'true';

    if (!pId) {
      App.toast('Please select a patient', 'error');
      return;
    }
    if (!repName) {
      App.toast('Please enter report/test name', 'error');
      return;
    }

    const p = DB.getPatient(pId) || {};
    const dateFormatted = date.includes('-') ? date.split('-').reverse().join('/') : date;

    // 1. Save to clinic_lab_reports
    let savedReports = JSON.parse(localStorage.getItem('clinic_lab_reports') || '[]');
    const newRep = {
      id: 'lr_' + Date.now(),
      patientId: String(pId),
      patientName: p.name || 'Patient',
      date,
      labName,
      reportName: repName,
      done,
      paid,
      amt
    };
    savedReports.unshift(newRep);
    localStorage.setItem('clinic_lab_reports', JSON.stringify(savedReports));

    // 2. Save directly into patient record (savedLab & savedReportList)
    const existingLab = Array.isArray(p.savedLab) ? [...p.savedLab] : [];
    existingLab.push({
      name: repName,
      investigation: repName,
      labName: labName,
      rs: amt,
      pAmt: paid ? amt : 0,
      receive: done,
      date: dateFormatted
    });

    const existingReports = Array.isArray(p.savedReportList) ? [...p.savedReportList] : [];
    existingReports.push({
      name: repName,
      report: repName,
      result: done ? 'Normal / Completed' : 'Pending',
      unit: '—',
      remark: `Lab: ${labName} | ₹${amt} (${paid ? 'Paid' : 'Unpaid'})`
    });

    DB.updatePatient(pId, {
      savedLab: existingLab,
      savedReportList: existingReports
    });

    // 3. Save into Visit record so it appears in all history logs
    if (DB.addVisit) {
      DB.addVisit({
        patientId: String(pId),
        patientName: p.name || 'Patient',
        date: date,
        diagnosis: 'Lab Report: ' + repName,
        investigations: [{ investigation: repName, labName: labName, rs: amt, pAmt: paid ? amt : 0, receive: done, date: dateFormatted }],
        reports: [{ report: repName, result: done ? 'Completed' : 'Pending', unit: '—', remark: labName }],
        labList: existingLab
      });
    }

    App.toast('Lab Report added & saved to Patient History! 📊✅', 'success', 2500);
    App.closeModal();
    this._renderTable();
  },

  _printReportSlip(repId) {
    const items = this._getReportItems();
    const r = items.find(x => String(x.id) === String(repId)) || {};
    const settings = DB.getSettings() || {};
    const p = DB.getPatient(r.patientId) || {};

    const dateFmt = r.date ? (r.date.includes('-') ? r.date.split('-').reverse().join('/') : r.date) : new Date().toLocaleDateString('en-GB');
    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

    const clinicName = (settings.clinicName || 'HARISHREE CLINIC').toUpperCase();
    const doctorName = settings.doctorName || 'DR. YASH VAGHANI';
    const clinicPh = settings.phone || '+91 98250 99887';
    const patName = (r.patientName || p.name || '—').toUpperCase();
    const patId = String(r.patientId || p.id || '—');
    const patMob = p.mobile || p.phone || r.mobile || '';
    const patGender = (p.gender || '').toUpperCase();
    const wtVal = p.weight || '';
    const ageStr = (p.dob && App.getAgeStr) ? App.getAgeStr(p.dob) : (p.age ? p.age + ' Year' : '');
    // Lab details for HEADER
    const labName = (r.labName || 'Main Parth Pathology').toUpperCase();
    const labAddress = r.labAddress || '';
    const labPhone = r.labPhone || '';
    const testName = r.reportName || 'Lab Investigation';
    const amt = parseFloat(r.amt || 0);

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Lab Investigation Slip</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&display=swap" rel="stylesheet">
  <style>
    * { box-sizing:border-box;margin:0;padding:0; }
    body { font-family:'Inter',Arial,sans-serif;font-size:12px;color:#000;background:#fff; }
    @page { size:A5 portrait;margin:0mm; }
    @media print { html,body { height:100%;margin:0;padding:0; } }
  </style>
</head>
<body style="padding:6mm 6mm 4mm 6mm;display:flex;flex-direction:column;gap:6mm;">

  <!-- ═══════ MAIN SLIP ═══════ -->
  <div style="border:1.5px solid #000;font-family:'Inter',Arial,sans-serif;min-height:510px;display:flex;flex-direction:column;justify-content:space-between;">
    <div>
      <!-- Header: LAB Details -->
      <div style="text-align:center;padding:8px 6px 4px 6px;border-bottom:1px solid #000;">
        <div style="font-size:20px;font-weight:900;color:#c00;letter-spacing:0.04em;">${App.escHtml(labName)}</div>
        ${labAddress ? `<div style="font-size:11px;font-weight:700;color:#800;margin-top:1px;">${App.escHtml(labAddress)}</div>` : ''}
        ${labPhone ? `<div style="font-size:11px;font-weight:700;color:#800;">${App.escHtml(labPhone)}</div>` : ''}
        <div style="font-size:13px;font-weight:800;color:#080;margin-top:3px;">Lab Investigation</div>
      </div>

      <!-- Date -->
      <div style="text-align:right;font-size:11px;font-weight:700;padding:4px 10px 0 10px;">
        Date : ${dateFmt}
      </div>

      <!-- Patient Details -->
      <div style="padding:4px 10px 6px 10px;font-size:11.5px;font-weight:700;line-height:1.7;border-bottom:1px solid #000;">
        <div><b>Patient ID :</b>&nbsp;&nbsp;&nbsp;${App.escHtml(patId)}</div>
        <div><b>Patient Name :</b>&nbsp;&nbsp;${App.escHtml(patName)}</div>
        <div><b>Mob No :</b>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;${App.escHtml(patMob)}</div>
        <div style="display:flex;gap:24px;">
          <span>Age : ${wtVal ? wtVal + 'Kg/ ' : ''}${ageStr}</span>
          <span>Sex : ${App.escHtml(patGender)}</span>
        </div>
      </div>

      <!-- Ref By Separate Box -->
      <div style="padding:4px 10px;font-size:11.5px;font-weight:700;border-bottom:1px solid #000;">
        <b>Ref By :</b>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;${App.escHtml(clinicName)} (${App.escHtml(doctorName)})
      </div>

      <!-- Test row (Expanded space) -->
      <div style="min-height:220px;">
        <table style="width:100%;border-collapse:collapse;">
          <tbody>
            <tr>
              <td style="padding:7px 8px;font-size:12px;font-weight:600;width:30px;">1</td>
              <td style="padding:7px 8px;font-size:12px;font-weight:700;">${App.escHtml(testName)}</td>
              <td style="padding:7px 8px;font-size:12px;font-weight:700;text-align:right;">${amt.toFixed(2)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div>
      <table style="width:100%;border-collapse:collapse;border-top:1px solid #000;">
        <tfoot>
          <tr>
            <td style="padding:6px 8px;font-size:12px;font-weight:800;text-align:right;">Total :</td>
            <td style="padding:6px 8px;font-size:12px;font-weight:800;text-align:right;width:80px;">${amt.toFixed(2)}</td>
          </tr>
        </tfoot>
      </table>

      <!-- Total / Paid / Due Boxes -->
      <div style="border-top:1px solid #000;padding:7px 10px;display:flex;align-items:center;gap:14px;flex-wrap:wrap;">
        <span style="font-size:11.5px;font-weight:800;">Total :</span>
        <span style="border:1.5px solid #000;padding:2px 10px;min-width:72px;font-size:12px;font-weight:700;display:inline-block;">${amt.toFixed(2)}</span>
        <span style="font-size:11.5px;font-weight:800;">Paid :</span>
        <span style="border:1.5px solid #000;padding:2px 10px;min-width:72px;font-size:12px;display:inline-block;">&nbsp;</span>
        <span style="font-size:11.5px;font-weight:800;">Due Amt :</span>
        <span style="border:1.5px solid #000;padding:2px 10px;min-width:72px;font-size:12px;display:inline-block;">&nbsp;</span>
      </div>

      <!-- Blood Sample / Sign -->
      <div style="padding:6px 10px 10px 10px;font-size:11.5px;font-weight:700;border-top:1px solid #000;">
        <div style="margin-bottom:18px;">Blood Sample Collected By :-</div>
        <div>Sign :-</div>
      </div>
    </div>
  </div>

  <!-- ═══════ TEAR-OFF RECEIPT ═══════ -->
  <div style="border:1.5px solid #000;font-family:'Inter',Arial,sans-serif;">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;padding:7px 10px 4px 10px;border-bottom:1px solid #000;">
      <div>
        <div style="font-size:14px;font-weight:900;">${App.escHtml(labName)}</div>
        <div style="font-size:11px;font-weight:700;">${App.escHtml(labPhone)}</div>
      </div>
      <div style="text-align:right;font-size:11px;font-weight:700;">
        <div>Date : ${dateFmt}</div>
        <div>Time : ${timeStr}</div>
      </div>
    </div>
    <div style="padding:5px 10px;font-size:11.5px;font-weight:700;line-height:1.7;border-bottom:1px solid #000;">
      <div><b>Patient Name :</b> ${App.escHtml(patId)},${App.escHtml(patName)}</div>
      <div><b>Mob No :</b>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;${App.escHtml(patMob)}</div>
    </div>
    <div style="padding:7px 10px;display:flex;align-items:center;gap:14px;flex-wrap:wrap;border-bottom:1px solid #000;">
      <span style="font-size:11.5px;font-weight:800;">Total :</span>
      <span style="border:1.5px solid #000;padding:2px 10px;min-width:72px;font-size:12px;font-weight:700;display:inline-block;">${amt.toFixed(2)}</span>
      <span style="font-size:11.5px;font-weight:800;">Paid :</span>
      <span style="border:1.5px solid #000;padding:2px 10px;min-width:72px;font-size:12px;display:inline-block;">&nbsp;</span>
      <span style="font-size:11.5px;font-weight:800;">Due Amt :</span>
      <span style="border:1.5px solid #000;padding:2px 10px;min-width:72px;font-size:12px;display:inline-block;">&nbsp;</span>
    </div>
    <div style="padding:6px 10px;font-size:12px;font-weight:600;">
      રિપોર્ટ લેવા આવો ત્યારે આ સ્લિપ ફરજિયાત સાથે લાવવી
    </div>
  </div>

  <script>window.onload = function() { setTimeout(function(){ window.print(); }, 300); };<\/script>
</body>
</html>`;

    const w = window.open('', '_blank', 'width=700,height=900');
    if (w) {
      w.document.write(html);
      w.document.close();
    } else {
      let iframe = document.getElementById('print-lab-slip-iframe');
      if (!iframe) {
        iframe = document.createElement('iframe');
        iframe.id = 'print-lab-slip-iframe';
        iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;';
        document.body.appendChild(iframe);
      }
      const doc = iframe.contentWindow.document;
      doc.open(); doc.write(html); doc.close();
      setTimeout(() => { iframe.contentWindow.focus(); iframe.contentWindow.print(); }, 400);
    }
  },

  /* 💳 Quick Payment & Billing Modal */
  openPaymentModal(patientId, apptId, defaultAmt) {
    const p = DB.getPatient(patientId) || {};
    const a = (DB.getAppointments() || []).find(x => String(x.id) === String(apptId)) || {};
    const invoices = DB.getInvoices() || [];
    const inv = invoices.find(i => String(i.patientId) === String(patientId) && String(i.appointmentId) === String(apptId))
      || invoices.find(i => String(i.patientId) === String(patientId))
      || {};

    const isPaid = curStatus === 'paid';
    const initAmt = Number(a.amt != null ? a.amt : (inv.total != null ? inv.total : (defaultAmt || 400)));
    const initCreditAmt = a.creditAmt != null ? Number(a.creditAmt) : (isPaid ? 0 : initAmt);
    const initPaidAmt = a.paidAmt != null ? Number(a.paidAmt) : (isPaid ? initAmt : 0);

    const body = `
      <div style="font-family:sans-serif;font-size:12px;color:#1e293b;padding:4px 0;">
        <!-- Patient Info Card -->
        <div style="background:#f0f9ff;border:1.5px solid #bae6fd;border-radius:6px;padding:10px 14px;margin-bottom:14px;display:grid;grid-template-columns:1fr 1fr;gap:8px 16px;">
          <div><span style="color:#64748b;font-weight:700;">Patient:</span> <b style="color:#0369a1;">${App.escHtml(p.name || a.patientName || '—')}</b></div>
          <div><span style="color:#64748b;font-weight:700;">Patient ID:</span> <b>${App.escHtml(String(patientId))}</b></div>
          <div><span style="color:#64748b;font-weight:700;">Type:</span> <b>${a.indoor ? '🏥 Indoor (IPD)' : '🩺 OPD Patient'}</b></div>
          <div><span style="color:#64748b;font-weight:700;">Mobile:</span> <b>${App.escHtml(p.mobile || p.phone || '—')}</b></div>
        </div>

        <!-- Editable Billing Amount & Payment Options -->
        <div style="display:flex;flex-direction:column;gap:14px;">
          <!-- Billing, Paid & Credit Amounts Grid -->
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;">
            <!-- Total Billing Amount -->
            <div>
              <label style="font-size:11px;font-weight:800;color:#0f172a;display:block;margin-bottom:4px;">
                💰 Total Bill (₹)
              </label>
              <div style="display:flex;align-items:center;gap:4px;">
                <span style="font-size:16px;font-weight:900;color:#0f172a;">₹</span>
                <input id="pay_billingAmt" type="number" step="1" value="${initAmt}" 
                       oninput="DashboardModule._calcPaymentCredit('total')"
                       style="font-size:16px;font-weight:900;color:#0b4f26;padding:6px 10px;border:2px solid #0b4f26;border-radius:4px;width:100%;background:#f0fdf4;" 
                       placeholder="Total">
              </div>
            </div>

            <!-- Paid / Received Amount -->
            <div>
              <label style="font-size:11px;font-weight:800;color:#16a34a;display:block;margin-bottom:4px;">
                💵 Paid / Received (₹)
              </label>
              <div style="display:flex;align-items:center;gap:4px;">
                <span style="font-size:16px;font-weight:900;color:#16a34a;">₹</span>
                <input id="pay_paidAmt" type="number" step="1" value="${initPaidAmt}" 
                       oninput="DashboardModule._calcPaymentCredit('paid')"
                       style="font-size:16px;font-weight:900;color:#15803d;padding:6px 10px;border:2px solid #16a34a;border-radius:4px;width:100%;background:#f0fdf4;" 
                       placeholder="Paid">
              </div>
            </div>

            <!-- Credit / Balance Amount -->
            <div>
              <label style="font-size:11px;font-weight:800;color:#dc2626;display:block;margin-bottom:4px;">
                ⚠️ Credit Amt (₹)
              </label>
              <div style="display:flex;align-items:center;gap:4px;">
                <span style="font-size:16px;font-weight:900;color:#dc2626;">₹</span>
                <input id="pay_creditAmt" type="number" step="1" value="${initCreditAmt}" 
                       oninput="DashboardModule._calcPaymentCredit('credit')"
                       style="font-size:16px;font-weight:900;color:#dc2626;padding:6px 10px;border:2px solid #dc2626;border-radius:4px;width:100%;background:#fef2f2;" 
                       placeholder="Credit">
              </div>
            </div>
          </div>

          <!-- Payment Mode Selection -->
          <div>
            <label style="font-size:11px;font-weight:800;color:#0f172a;display:block;margin-bottom:6px;">
              💳 Payment Mode
            </label>
            <div style="display:grid;grid-template-columns:repeat(4, 1fr);gap:8px;">
              <label style="display:flex;align-items:center;gap:6px;font-size:12px;font-weight:700;padding:8px 10px;border:1.5px solid #cbd5e1;border-radius:4px;cursor:pointer;background:#fff;">
                <input type="radio" name="pay_mode" value="Cash" ${curMode === 'Cash' ? 'checked' : ''} style="cursor:pointer;width:16px;height:16px;"> 💵 Cash
              </label>
              <label style="display:flex;align-items:center;gap:6px;font-size:12px;font-weight:700;padding:8px 10px;border:1.5px solid #cbd5e1;border-radius:4px;cursor:pointer;background:#fff;">
                <input type="radio" name="pay_mode" value="Bank / UPI" ${(curMode.includes('Bank') || curMode.includes('UPI')) ? 'checked' : ''} style="cursor:pointer;width:16px;height:16px;"> 🏦 Bank / UPI
              </label>
              <label style="display:flex;align-items:center;gap:6px;font-size:12px;font-weight:700;padding:8px 10px;border:1.5px solid #cbd5e1;border-radius:4px;cursor:pointer;background:#fff;">
                <input type="radio" name="pay_mode" value="Card" ${curMode === 'Card' ? 'checked' : ''} style="cursor:pointer;width:16px;height:16px;"> 💳 Card
              </label>
              <label style="display:flex;align-items:center;gap:6px;font-size:12px;font-weight:700;padding:8px 10px;border:1.5px solid #cbd5e1;border-radius:4px;cursor:pointer;background:#fff;">
                <input type="radio" name="pay_mode" value="Other" ${curMode === 'Other' ? 'checked' : ''} style="cursor:pointer;width:16px;height:16px;"> 📝 Other
              </label>
            </div>
          </div>

          <!-- Payment Status Selection -->
          <div>
            <label style="font-size:11px;font-weight:800;color:#0f172a;display:block;margin-bottom:6px;">
              📊 Payment Status
            </label>
            <div style="display:flex;gap:14px;">
              <label style="display:flex;align-items:center;gap:6px;font-size:12px;font-weight:800;padding:6px 14px;background:#dcfce7;border:1.5px solid #16a34a;border-radius:4px;cursor:pointer;color:#166534;">
                <input type="radio" name="pay_status" value="paid" ${curStatus === 'paid' ? 'checked' : ''} style="cursor:pointer;width:16px;height:16px;"> ✅ Paid
              </label>
              <label style="display:flex;align-items:center;gap:6px;font-size:12px;font-weight:800;padding:6px 14px;background:#fee2e2;border:1.5px solid #dc2626;border-radius:4px;cursor:pointer;color:#991b1b;">
                <input type="radio" name="pay_status" value="unpaid" ${curStatus === 'unpaid' ? 'checked' : ''} style="cursor:pointer;width:16px;height:16px;"> ❌ Unpaid
              </label>
            </div>
          </div>
        </div>
      </div>
    `;

    const footer = `
      <div style="display:flex;justify-content:space-between;width:100%;align-items:center;">
        <button class="btn btn-secondary" onclick="App.closeModal()">✕ Cancel</button>
        <div style="display:flex;gap:8px;">
          <button class="btn btn-primary" onclick="DashboardModule._savePayment('${patientId}','${apptId}', false)" style="background:#16a34a;color:#fff;font-weight:700;">💾 Save Payment</button>
          <button class="btn btn-primary" onclick="DashboardModule._savePayment('${patientId}','${apptId}', true)" style="background:#0891b2;color:#fff;font-weight:700;">🖨️ Save & Print Receipt</button>
        </div>
      </div>
    `;

    App.openModal('💳 Payment & Billing Details', body, footer, 'md');
  },

  _calcPaymentCredit(trigger = 'total') {
    const totalEl = document.getElementById('pay_billingAmt');
    const paidEl = document.getElementById('pay_paidAmt');
    const creditEl = document.getElementById('pay_creditAmt');
    if (!totalEl) return;

    const total = parseFloat(totalEl.value) || 0;

    if (trigger === 'credit') {
      const credit = parseFloat(creditEl?.value) || 0;
      const paid = Math.max(0, total - credit);
      if (paidEl) paidEl.value = paid > 0 ? paid.toFixed(0) : '0';
    } else {
      const paid = parseFloat(paidEl?.value) || 0;
      const credit = Math.max(0, total - paid);
      if (creditEl) creditEl.value = credit > 0 ? credit.toFixed(0) : '0';
    }

    const currentCredit = parseFloat(creditEl?.value) || 0;
    const currentPaid = parseFloat(paidEl?.value) || 0;
    const paidRadio = document.querySelector('input[name="pay_status"][value="paid"]');
    const unpaidRadio = document.querySelector('input[name="pay_status"][value="unpaid"]');

    if (currentCredit <= 0 && currentPaid > 0) {
      if (paidRadio) paidRadio.checked = true;
    } else if (currentPaid <= 0 && currentCredit > 0) {
      if (unpaidRadio) unpaidRadio.checked = true;
    }
  },

  _savePayment(patientId, apptId, doPrint) {
    const amtInp = document.getElementById('pay_billingAmt');
    const paidInp = document.getElementById('pay_paidAmt');
    const creditInp = document.getElementById('pay_creditAmt');

    const finalAmt = Number(amtInp ? amtInp.value : 0);
    const paidAmt = Number(paidInp ? paidInp.value : 0);
    const creditAmt = Number(creditInp ? creditInp.value : Math.max(0, finalAmt - paidAmt));

    const mode = document.querySelector('input[name="pay_mode"]:checked')?.value || 'Cash';
    const status = document.querySelector('input[name="pay_status"]:checked')?.value || (creditAmt <= 0 ? 'paid' : 'unpaid');
    const isPaid = status === 'paid' && creditAmt <= 0;

    // Update appointment
    DB.updateAppointment(apptId, {
      amt: finalAmt,
      paidAmt: paidAmt,
      creditAmt: creditAmt,
      paid: isPaid,
      paymentMode: mode,
      paymentStatus: status
    });

    // Update patient credit / pending balance
    if (creditAmt > 0) {
      DB.updatePatient(patientId, { prePending: creditAmt.toFixed(2) });
    }

    // Create or update invoice
    const invoices = DB.getInvoices() || [];
    const p = DB.getPatient(patientId) || {};
    const existingInv = invoices.find(i => String(i.patientId) === String(patientId) && String(i.appointmentId) === String(apptId))
      || invoices.find(i => String(i.patientId) === String(patientId));

    let invoiceId;
    if (existingInv && existingInv.id) {
      invoiceId = existingInv.id;
      DB.updateInvoice(existingInv.id, {
        total: finalAmt,
        paidAmt: paidAmt,
        creditAmt: creditAmt,
        status: status,
        paymentMode: mode,
        paidAt: isPaid ? new Date().toISOString() : null
      });
    } else {
      const newInv = DB.addInvoice({
        patientId,
        patientName: p.name || 'Patient',
        appointmentId: apptId,
        items: [{ desc: 'Consultation & Treatment', qty: 1, rate: finalAmt, amount: finalAmt }],
        total: finalAmt,
        paidAmt: paidAmt,
        creditAmt: creditAmt,
        status: status,
        paymentMode: mode,
        createdAt: new Date().toISOString(),
        paidAt: isPaid ? new Date().toISOString() : null
      });
      invoiceId = newInv ? newInv.id : null;
    }

    App.toast(`Payment saved! (Paid: ₹${paidAmt}, Credit Due: ₹${creditAmt}) 💰✅`, 'success', 2000);
    App.closeModal();
    this._renderTable();

    if (doPrint && invoiceId && typeof BillingModule !== 'undefined' && BillingModule.printInvoice) {
      BillingModule.printInvoice(invoiceId);
    }
  },

  _togglePaid(apptId) {
    const a = (DB.getAppointments() || []).find(x => String(x.id) === String(apptId)) || {};
    this.openPaymentModal(a.patientId, a.id, a.fee || a.amt || 100);
  },

  /* 💊 Pharmacy & Medicine Billing Modal (Prescription + Extra Purchased Items) */
  _activeMedBillItems: [],
  _activeMedBillPatientId: null,
  _activeMedBillApptId: null,

  _getMedType(item) {
    if (!item) return 'Tab';
    if (item.type) return item.type;
    if (item.method) {
      const m = String(item.method).toUpperCase();
      if (m.includes('TABLET') || m.includes('TAB')) return 'Tab';
      if (m.includes('SYRUP') || m.includes('SYP') || m.includes('LIQUID')) return 'Syp';
      if (m.includes('CAPSULE') || m.includes('CAP')) return 'Cap';
      if (m.includes('OINT') || m.includes('CREAM') || m.includes('GEL')) return 'Oint';
      if (m.includes('INJ')) return 'Inj';
      if (m.includes('DROP')) return 'Drop';
      if (m.includes('GHRITA') || m.includes('GHRIT')) return 'Ghrit';
      if (m.includes('KAVATH') || m.includes('KWATH')) return 'Kwath';
      if (m.includes('OIL') || m.includes('TAIL')) return 'Oil';
      if (m.includes('POWDER') || m.includes('CHURNA')) return 'Powder';
    }
    const name = String(item.name || '').toUpperCase();
    if (name.includes('SYP') || name.includes('SYRUP') || name.includes('LIQUID') || name.includes('TONIC') || name.includes('KID') || name.includes('SUSP')) return 'Syp';
    if (name.includes('CAP') || name.includes('CAPSULE')) return 'Cap';
    if (name.includes('OINT') || name.includes('CREAM') || name.includes('GEL')) return 'Oint';
    if (name.includes('INJ') || name.includes('INJECTION')) return 'Inj';
    if (name.includes('DROP') || name.includes('DROPS')) return 'Drop';
    if (name.includes('GHRITA') || name.includes('GHRIT')) return 'Ghrit';
    if (name.includes('KWATH') || name.includes('KAVATH')) return 'Kwath';
    if (name.includes('TAIL') || name.includes('OIL')) return 'Oil';
    if (name.includes('CHURNA') || name.includes('POWDER')) return 'Churna';
    if (name.includes('VATI') || name.includes('MALTI') || name.includes('GUGULU') || name.includes('RAS') || name.includes('TAB')) return 'Tab';
    return item.type || 'Tab';
  },

  openMedicineBillingModal(patientId, apptId) {
    const p = DB.getPatient(patientId) || {};
    const a = (DB.getAppointments() || []).find(x => String(x.id) === String(apptId)) || {};
    this._activeMedBillPatientId = patientId;
    this._activeMedBillApptId = apptId;

    // Load prescribed and extra items accurately from prescription
    const allMasterMeds = DB.getMedicines ? DB.getMedicines() : [];
    let items = [];

    const mapRxItem = (i) => {
      const medMatch = allMasterMeds.find(m => m.name.toLowerCase() === (i.name || '').trim().toLowerCase());
      const uStr = (i.unit || (medMatch ? medMatch.unit : '') || '').toUpperCase();
      const nameStr = (i.name || '').toUpperCase();
      const isTabOrCap = uStr.includes('TAB') || uStr.includes('CAP') || nameStr.includes('TAB') || nameStr.includes('CAP');

      let packCount = 1;
      if (medMatch && medMatch.packing) {
        const match = String(medMatch.packing).match(/(\d+)\s*$/);
        if (match) packCount = parseInt(match[1], 10) || 1;
      } else if (isTabOrCap) {
        packCount = 10;
      }

      let rateVal = Number(i.rate || i.price || 0);
      if (!rateVal && medMatch) {
        const mrp = parseFloat(medMatch.mrppack || medMatch.rate || medMatch.price || 30.00);
        rateVal = packCount > 1 ? (mrp / packCount) : mrp;
      }
      let mVal = i.m !== undefined && i.m !== null && i.m !== '' ? i.m : (medMatch && medMatch.m !== undefined ? medMatch.m : '');
      let aVal = i.a !== undefined && i.a !== null && i.a !== '' ? i.a : (medMatch && medMatch.a !== undefined ? medMatch.a : '');
      let nVal = i.n !== undefined && i.n !== null && i.n !== '' ? i.n : (medMatch && medMatch.n !== undefined ? medMatch.n : '');
      let sVal = i.s !== undefined && i.s !== null && i.s !== '' ? i.s : (medMatch && medMatch.s !== undefined ? medMatch.s : '');

      if (!mVal && !aVal && !nVal && !sVal && (i.dosage || (medMatch && medMatch.dosage))) {
        const dStr = i.dosage || medMatch.dosage;
        const match = String(dStr).match(/(\d+)-(\d+)-(\d+)(?:-(\d+))?/);
        if (match) {
          mVal = match[1] || '0';
          aVal = match[2] || '0';
          nVal = match[3] || '0';
          sVal = match[4] || '0';
        }
      }

      if (mVal === '' && aVal === '' && nVal === '' && sVal === '') {
        mVal = '1'; aVal = '0'; nVal = '1'; sVal = '0';
      }

      const dayVal = i.day || i.days || (i.duration ? parseInt(i.duration, 10) : '') || 3;
      let qtyVal = Number(i.qty || i.quantity || i.qnty || 0);
      if (!qtyVal || qtyVal <= 0) {
        const perDay = (Number(mVal) || 0) + (Number(aVal) || 0) + (Number(nVal) || 0) + (Number(sVal) || 0);
        qtyVal = Number(dayVal) * (perDay > 0 ? perDay : 2);
      }
      const totalVal = Number(i.total || (qtyVal * rateVal));

      const methodVal = i.method || i.remark || i.timing || (medMatch ? (medMatch.remark_guj || medMatch.remark || medMatch.method) : '') || 'જમ્યા પછી';
      const typeVal = i.type || i.unit || (medMatch ? medMatch.unit : '') || this._getMedType(i) || (isTabOrCap ? 'Tab' : 'Syp');

      return {
        name: i.name,
        type: typeVal,
        unit: typeVal,
        m: mVal,
        a: aVal,
        n: nVal,
        s: sVal,
        day: dayVal,
        qty: qtyVal,
        rate: rateVal,
        total: totalVal,
        method: methodVal,
        remark: methodVal,
        isExtra: Boolean(i.isExtra)
      };
    };

    if (a.rxItems && Array.isArray(a.rxItems) && a.rxItems.length > 0) {
      items = a.rxItems.map(mapRxItem);
    } else if (p.savedRx && Array.isArray(p.savedRx) && p.savedRx.length > 0) {
      items = p.savedRx.map(mapRxItem);
    } else {
      const patientRxs = (DB.getPrescriptions ? DB.getPrescriptions() : []).filter(r => String(r.patientId) === String(patientId));
      if (patientRxs.length > 0) {
        const latestRx = patientRxs[patientRxs.length - 1];
        const medList = latestRx.medications || latestRx.items || [];
        if (Array.isArray(medList)) {
          items = medList.map(mapRxItem);
        }
      }
    }

    this._activeMedBillItems = items;
    this._editingMedBillIndex = null;
    this._renderMedBillingModalDOM(p, a);
  },

  _renderMedBillingModalDOM(p, a) {
    const curStatus = a.rxPaid != null ? (a.rxPaid ? 'paid' : 'unpaid') : (a.paid != null ? (a.paid ? 'paid' : 'unpaid') : 'unpaid');
    const curMode = a.rxPaymentMode || p.rxPaymentMode || a.paymentMode || 'Cash';
    const curDiscount = a.discount != null ? a.discount : (p.discount || 0);
    const curBank = a.bankName || p.bankName || 'Medical Bank';
    const rxDate = a.date ? a.date.split('-').reverse().join('/') : new Date().toLocaleDateString('en-GB');

    const body = `
      <div style="font-family:sans-serif;font-size:12px;color:#1e293b;padding:2px 0;">
        <!-- Patient Banner -->
        <div style="background:#eff6ff;border:1.5px solid #bfdbfe;border-radius:4px;padding:4px 8px;margin-bottom:6px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:4px;">
          <div>
            <strong style="font-size:12px;color:#1e3a8a;">${App.escHtml(p.name || 'Walk-in Patient')}</strong>
            <span style="color:#64748b;font-size:11px;margin-left:6px;">(${p.age ? p.age + 'y' : ''} ${p.gender || ''})</span>
            <span style="background:#e0e7ff;color:#3730a3;font-size:10px;font-weight:700;padding:1px 5px;border-radius:3px;margin-left:6px;">OPD No: ${App.escHtml(p.opdNumber || p.patientId || p.id || '-')}</span>
          </div>
          <div style="display:flex;gap:10px;font-size:11px;font-weight:700;color:#1e40af;">
            <span>Bill No: <span style="color:#0f172a;font-family:monospace;font-size:12px;">${App.escHtml(a.id || ('BILL-' + Date.now().toString().slice(-6)))}</span></span>
            <span>Date: <span style="color:#0f172a;">${rxDate}</span></span>
          </div>
        </div>

        <!-- Main Content Area: 2-Column Grid (Left: :: Use :: & Search(Generic) : | Right: Top Entry & Items Table) -->
        <div style="display:grid;grid-template-columns:230px 1fr;gap:6px;margin-bottom:6px;box-sizing:border-box;">
          
          <!-- Left Column: :: Use :: & Search(Generic) : Boxes (Picture match) -->
          <div style="display:flex;flex-direction:column;gap:6px;height:calc(97vh - 200px);box-sizing:border-box;min-height:0;">
            
            <!-- Box 1: :: Use :: -->
            <div style="border:1.5px solid #7a9ec2;border-radius:2px;background:#f8fafc;padding:3px;flex:1;min-height:0;display:flex;flex-direction:column;box-sizing:border-box;">
              <div style="display:flex;align-items:center;gap:4px;margin-bottom:3px;flex-shrink:0;">
                <label style="font-size:11.5px;font-weight:800;color:#1d4ed8;white-space:nowrap;margin:0;letter-spacing:0.3px;">:: Use ::</label>
                <input class="form-control" id="medBill_useSearchInp" style="flex:1;font-size:11px;height:22px;padding:1px 4px;border:1.5px solid #7a9ec2;border-radius:2px;background:#fff;" placeholder="" oninput="DashboardModule._filterMedBillByUse(this.value)">
              </div>
              <div id="medBill_useList" style="border:1.5px solid #7a9ec2;background:#fff;border-radius:2px;flex:1;min-height:0;overflow-y:auto;font-size:11px;padding:2px;"></div>
            </div>

            <!-- Box 2: Search(Generic) : -->
            <div style="border:1.5px solid #7a9ec2;border-radius:2px;background:#f8fafc;padding:3px;flex:1;min-height:0;display:flex;flex-direction:column;box-sizing:border-box;">
              <div style="display:flex;align-items:center;gap:4px;margin-bottom:3px;flex-shrink:0;">
                <label style="font-size:11.5px;font-weight:800;color:#1d4ed8;white-space:nowrap;margin:0;letter-spacing:0.3px;">Search(Generic) :</label>
                <input class="form-control" id="medBill_genSearchInp" style="flex:1;font-size:11px;height:22px;padding:1px 4px;border:1.5px solid #7a9ec2;border-radius:2px;background:#fff;" placeholder="" oninput="DashboardModule._filterMedBillByGeneric(this.value)">
              </div>
              <div id="medBill_genList" style="border:1.5px solid #7a9ec2;background:#fff;border-radius:2px;flex:1;min-height:0;overflow-y:auto;font-size:11px;padding:2px;"></div>
            </div>

          </div>

          <!-- Right Column: Medicine Entry Form & Medicine Items Table -->
          <div style="display:flex;flex-direction:column;height:calc(97vh - 200px);box-sizing:border-box;min-height:0;">
            
            <!-- Medicine Entry Form Section -->
            <div style="background:#f0f7ff;border:1.5px solid #7a9ec2;border-radius:3px;padding:6px 8px;margin-bottom:6px;flex-shrink:0;">
              <!-- Top Row: Name, Stock, Unit, Day, Qnty, Rate, Total, Method, Add/Cancel -->
              <div style="display:flex;gap:5px;align-items:flex-end;flex-wrap:nowrap;">
                <div style="flex:3;min-width:160px;position:relative;">
                  <label style="font-size:10px;font-weight:700;display:block;margin-bottom:2px;">Medicine Name</label>
                  <div style="position:relative;display:flex;align-items:center;">
                    <input class="form-control" id="medBill_name" 
                           style="font-size:11px;height:24px;padding:2px 20px 2px 4px;font-weight:700;text-transform:uppercase;width:100%;" 
                           placeholder="Search medicine..." 
                           autocomplete="off" 
                           list="medBill_masterList"
                           oninput="DashboardModule._onMedBillMedChange(this.value)"
                           onchange="DashboardModule._onMedBillMedChange(this.value)">
                    <datalist id="medBill_masterList">
                      ${(DB.getMedicines ? DB.getMedicines() : []).map(m => {
                        const st = (m.orqty !== undefined && m.orqty !== null) ? Number(m.orqty) : (m.stock !== undefined ? Number(m.stock) : 0);
                        const isOut = st <= 0;
                        return `<option value="${App.escHtml(m.name)}">${App.escHtml(m.name)} ${isOut ? '[🔴 OUT OF STOCK]' : `(Stock: ${st})`}</option>`;
                      }).join('')}
                    </datalist>
                    <span style="position:absolute;right:5px;cursor:pointer;font-size:9px;color:#64748b;" onclick="document.getElementById('medBill_name').focus()">▼</span>
                  </div>
                </div>

                <div style="width:50px;">
                  <label style="font-size:10px;font-weight:700;display:block;margin-bottom:2px;text-align:center;">Stock</label>
                  <input class="form-control" id="medBill_stock" style="font-size:11px;height:24px;padding:2px 2px;text-align:center;background:#f8fafc;font-weight:800;border:1px solid #cbd5e1;border-radius:3px;" value="" readonly>
                </div>

                <div style="width:65px;">
                  <label style="font-size:10px;font-weight:700;display:block;margin-bottom:2px;">Unit</label>
                  <select class="form-control" id="medBill_unit" style="font-size:11px;height:24px;padding:1px 2px;font-weight:700;">
                    <option value="Tab.">Tab.</option>
                    <option value="Cap.">Cap.</option>
                    <option value="Syp.">Syp.</option>
                    <option value="Inj.">Inj.</option>
                    <option value="Oint.">Oint.</option>
                    <option value="Drop.">Drop.</option>
                    <option value="Ghrit.">Ghrit.</option>
                    <option value="Kwath.">Kwath.</option>
                    <option value="Oil">Oil</option>
                    <option value="Churna">Churna</option>
                    <option value="Sach.">Sach.</option>
                    <option value="Resp.">Resp.</option>
                    <option value="Lotion">Lotion</option>
                    <option value="Soap">Soap</option>
                    <option value="Cream">Cream</option>
                    <option value="Gel">Gel</option>
                    <option value="Supp.">Supp.</option>
                    <option value="Tube">Tube</option>
                    <option value="Vial">Vial</option>
                    <option value="Amp.">Amp.</option>
                    <option value="Pack">Pack</option>
                  </select>
                </div>

                <div style="width:28px;">
                  <label style="font-size:10px;font-weight:700;display:block;margin-bottom:2px;text-align:center;">M</label>
                  <input class="form-control" id="medBill_m" style="font-size:11px;height:24px;padding:2px 1px;text-align:center;font-weight:700;" value="1" oninput="DashboardModule._calcMedBillItemTotal(false)">
                </div>

                <div style="width:28px;">
                  <label style="font-size:10px;font-weight:700;display:block;margin-bottom:2px;text-align:center;">A</label>
                  <input class="form-control" id="medBill_a" style="font-size:11px;height:24px;padding:2px 1px;text-align:center;font-weight:700;" value="0" oninput="DashboardModule._calcMedBillItemTotal(false)">
                </div>

                <div style="width:28px;">
                  <label style="font-size:10px;font-weight:700;display:block;margin-bottom:2px;text-align:center;">N</label>
                  <input class="form-control" id="medBill_n" style="font-size:11px;height:24px;padding:2px 1px;text-align:center;font-weight:700;" value="1" oninput="DashboardModule._calcMedBillItemTotal(false)">
                </div>

                <div style="width:28px;">
                  <label style="font-size:10px;font-weight:700;display:block;margin-bottom:2px;text-align:center;">S</label>
                  <input class="form-control" id="medBill_s" style="font-size:11px;height:24px;padding:2px 1px;text-align:center;font-weight:700;" value="0" oninput="DashboardModule._calcMedBillItemTotal(false)">
                </div>

                <div style="width:45px;">
                  <label style="font-size:10px;font-weight:700;display:block;margin-bottom:2px;text-align:center;">Day</label>
                  <input class="form-control" id="medBill_day" style="font-size:11px;height:24px;padding:2px 2px;text-align:center;font-weight:700;" value="3" oninput="DashboardModule._calcMedBillItemTotal(false)">
                </div>

                <div style="width:55px;">
                  <label style="font-size:10px;font-weight:700;display:block;margin-bottom:2px;text-align:center;">Qnty</label>
                  <input class="form-control" id="medBill_qty" style="font-size:11px;height:24px;padding:2px 2px;text-align:center;font-weight:800;" value="6" oninput="DashboardModule._calcMedBillItemTotal(true)">
                </div>

                <div style="width:65px;">
                  <label style="font-size:10px;font-weight:700;display:block;margin-bottom:2px;text-align:right;">Rate</label>
                  <input class="form-control" id="medBill_rate" style="font-size:11px;height:24px;padding:2px 4px;text-align:right;font-weight:800;" value="" oninput="DashboardModule._calcMedBillItemTotal(true)">
                </div>

                <div style="width:75px;">
                  <label style="font-size:10px;font-weight:700;display:block;margin-bottom:2px;text-align:right;">Total</label>
                  <input class="form-control" id="medBill_total" style="font-size:11px;height:24px;padding:2px 4px;font-weight:900;text-align:right;color:#0b4f26;background:#f8fafc;" value="" readonly>
                </div>

                <div style="flex:2.2;min-width:140px;">
                  <label style="font-size:10px;font-weight:700;display:block;margin-bottom:2px;">Method (Gujarati)</label>
                  <select class="form-control" id="medBill_remark" style="font-size:11px;height:24px;padding:1px 4px;">
                    <option value="જમ્યા પછી">જમ્યા પછી</option>
                    <option value="સવારે ભૂખ્યા પેટે">સવારે ભૂખ્યા પેટે</option>
                    <option value="હળવા હાથે લગાવવી (Apply Gently)">હળવા હાથે લગાવવી (Apply Gently)</option>
                    <option value="દુખાવાની જગ્યાએ હળવા હાથે માલિશ કરવી">દુખાવાની જગ્યાએ હળવા હાથે માલિશ કરવી</option>
                    <option value="ચામડી પર ધીમેથી લગાવવી">ચામડી પર ધીમેથી લગાવવી</option>
                    <option value="દિવસમાં ૨ થી ૩ વાર લગાવવી">દિવસમાં ૨ થી ૩ વાર લગાવવી</option>
                    <option value="ઘા સાફ કરીને લગાવવી">ઘા સાફ કરીને લગાવવી</option>
                    <option value="ગરમ પાણીના શેક પછી લગાવવી">ગરમ પાણીના શેક પછી લગાવવી</option>
                    <option value="આંખમાં ૧-૧ ટીપું નાખવું">આંખમાં ૧-૧ ટીપું નાખવું</option>
                    <option value="કાનમાં ૨-૨ ટીપાં નાખવા">કાનમાં ૨-૨ ટીપાં નાખવા</option>
                    <option value="નાકમાં ૨-૨ ટીપાં નાખવા">નાકમાં ૨-૨ ટીપાં નાખવા</option>
                    <option value="નાસ લેવો / વરાળ લેવી">નાસ લેવો / વરાળ લેવી</option>
                    <option value="કોગળા કરવા / ગારગલ કરવા">કોગળા કરવા / ગારગલ કરવા</option>
                    <option value="જમ્યા પહેલા">જમ્યા પહેલા</option>
                    <option value="રાત્રે સૂતી વખતે">રાત્રે સૂતી વખતે</option>
                    <option value="જમ્યા પહેલા 60 મિનિટ">જમ્યા પહેલા 60 મિનિટ</option>
                    <option value="જમ્યા પછી દૂધમાં">જમ્યા પછી દૂધમાં</option>
                    <option value="હૂંફાળા પાણી સાથે">હૂંફાળા પાણી સાથે</option>
                    <option value="દૂધ સાથે લેવી">દૂધ સાથે લેવી</option>
                    <option value="મધ સાથે ચાટવું">મધ સાથે ચાટવું</option>
                    <option value="પાણીમાં ઓગાળીને પીવું">પાણીમાં ઓગાળીને પીવું</option>
                    <option value="ચાવીને khavii">ચાવીને ખાવી</option>
                    <option value="જીભ નીચે મૂકવી">જીભ નીચે મૂકવી</option>
                    <option value="દુખાવા વખતે">દુખાવા વખતે</option>
                    <option value="તાવ આવે ત્યારે જ લેવી">તાવ આવે ત્યારે જ લેવી</option>
                    <option value="જરૂર પડે ત્યારે (SOS)">જરૂર પડે ત્યારે (SOS)</option>
                  </select>
                </div>

                <div style="display:flex;flex-direction:column;gap:2px;">
                  <button class="win-act-btn" id="medBill_addBtn" style="padding:2px 10px;height:22px;font-size:10px;font-weight:bold;background:#1d4ed8;color:#fff;border:1px solid #1e40af;border-radius:3px;cursor:pointer;" onclick="DashboardModule._addExtraMedBillItem()">Add</button>
                  <button class="win-act-btn" style="padding:2px 6px;height:20px;font-size:10px;font-weight:bold;background:#e2e8f0;color:#334155;border:1px solid #cbd5e1;border-radius:3px;cursor:pointer;" onclick="DashboardModule._cancelMedBillItem()">Cancel</button>
                </div>
              </div>

              <!-- Sub Row: Type/Route Dropdown & Medicine Not Use Counter -->
              <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:5px;padding-top:4px;border-top:1px dashed #bfdbfe;">
                <span style="font-size:11px;font-weight:700;color:#16a34a;">🟩 Medicine Not Use : <span id="medBill_notUseCnt">0</span></span>
                <div style="display:flex;align-items:center;gap:6px;">
                  <label style="font-size:11px;font-weight:700;white-space:nowrap;margin:0;">Type / Route :</label>
                  <select class="form-control" id="medBill_method" style="font-size:11px;height:22px;width:150px;padding:1px 4px;font-weight:600;">
                    <option value="">-- Blank --</option>
                    <option value="TABLET">TABLET</option>
                    <option value="CAPSULE">CAPSULE</option>
                    <option value="INJECTION / IV">INJECTION / IV</option>
                    <option value="SYRUP / LIQUID">SYRUP / LIQUID</option>
                    <option value="AFTER FOOD">AFTER FOOD</option>
                    <option value="BEFORE FOOD">BEFORE FOOD</option>
                    <option value="AT BEDTIME">AT BEDTIME</option>
                  </select>
                </div>
              </div>
            </div>

            <!-- Medicine Items Table -->
            <div style="border:1.5px solid #94b8d7;border-radius:4px;overflow:hidden;background:#fff;flex:1;min-height:0;display:flex;flex-direction:column;">
              <div style="flex:1;overflow-y:auto;min-height:0;">
                <table class="win-table" style="font-size:11px;margin:0;width:100%;border-collapse:collapse;">
                  <thead>
                    <tr style="background:#b8d4e4;color:#0f172a;font-weight:800;border-bottom:1.5px solid #7098c2;position:sticky;top:0;z-index:2;">
                      <th style="width:30px;text-align:center;padding:5px 2px;">NO</th>
                      <th style="padding:5px 6px;text-align:left;">MEDICINE NAME (CLICK TO EDIT)</th>
                      <th style="width:28px;text-align:center;padding:5px 2px;">M</th>
                      <th style="width:28px;text-align:center;padding:5px 2px;">A</th>
                      <th style="width:28px;text-align:center;padding:5px 2px;">N</th>
                      <th style="width:28px;text-align:center;padding:5px 2px;">S</th>
                      <th style="width:45px;text-align:center;padding:5px 2px;">DAY</th>
                      <th style="width:55px;text-align:center;padding:5px 2px;">QNTY</th>
                      <th style="width:65px;text-align:right;padding:5px 4px;">RATE</th>
                      <th style="width:75px;text-align:right;padding:5px 4px;">TOTAL</th>
                      <th style="min-width:140px;padding:5px 6px;text-align:left;">METHOD</th>
                      <th style="width:75px;text-align:left;padding:5px 4px;">TYPE</th>
                      <th style="width:28px;text-align:center;padding:5px 2px;">✕</th>
                    </tr>
                  </thead>
                  <tbody id="medBillTbody"></tbody>
                </table>
              </div>
            </div>

          </div>

        </div>

        <!-- Payment & Financial Bar (Amt, Discount, Net Amt, Payment Mode, Which Bank) -->
        <div style="background:#f8fafc;border:1.5px solid #cbd5e1;border-radius:4px;padding:8px 12px;margin-bottom:4px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;">
          <!-- Left: Payment Mode & Which Bank Dropdown -->
          <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
            <div style="display:flex;align-items:center;gap:6px;">
              <span style="font-size:11px;font-weight:800;color:#0f172a;white-space:nowrap;">Payment :</span>
              <div style="display:flex;gap:6px;align-items:center;">
                <label style="display:flex;align-items:center;gap:4px;font-size:11px;font-weight:700;padding:3px 8px;border:1px solid #cbd5e1;border-radius:4px;cursor:pointer;background:#fff;">
                  <input type="radio" name="medPay_mode" value="Cash" ${curMode === 'Cash' ? 'checked' : ''} onchange="DashboardModule._onMedPayModeChange(this.value)"> 💵 Cash
                </label>
                <label style="display:flex;align-items:center;gap:4px;font-size:11px;font-weight:700;padding:3px 8px;border:1px solid #cbd5e1;border-radius:4px;cursor:pointer;background:#fff;">
                  <input type="radio" name="medPay_mode" value="Bank" ${(curMode === 'Bank' || curMode === 'UPI' || curMode === 'Bank / UPI' || curMode.includes('Bank')) ? 'checked' : ''} onchange="DashboardModule._onMedPayModeChange(this.value)"> 🏦 Bank
                </label>
                <label style="display:flex;align-items:center;gap:4px;font-size:11px;font-weight:700;padding:3px 8px;border:1px solid #cbd5e1;border-radius:4px;cursor:pointer;background:#fff;">
                  <input type="radio" name="medPay_mode" value="Card" ${curMode === 'Card' ? 'checked' : ''} onchange="DashboardModule._onMedPayModeChange(this.value)"> 💳 Card
                </label>
              </div>
            </div>

            <!-- Which Bank Dropdown (visible when Bank is chosen) -->
            <div id="medBill_bankWrap" style="display:${(curMode === 'Bank' || curMode === 'UPI' || curMode === 'Bank / UPI' || curMode.includes('Bank')) ? 'flex' : 'none'};align-items:center;gap:6px;">
              <label style="font-size:11px;font-weight:800;color:#1e40af;white-space:nowrap;margin:0;">Which Bank :</label>
              <select class="form-control" id="medBill_bankName" style="font-size:11px;height:24px;padding:1px 6px;font-weight:700;color:#1e40af;border:1.5px solid #93c5fd;border-radius:3px;background:#eff6ff;">
                ${['Medical Bank', 'Dr. Yash Bank', 'Harishree Bank', 'Other Bank'].map(b => `<option value="${b}" ${(curBank === b || (b.includes(curBank) && curBank.length > 2)) ? 'selected' : ''}>${b}</option>`).join('')}
              </select>
            </div>
          </div>

          <!-- Right: Amt, Discount, Net Amt -->
          <div style="display:flex;align-items:center;gap:8px;margin-left:auto;">
            <div style="display:flex;align-items:center;gap:4px;">
              <span style="font-size:11px;font-weight:800;color:#475569;white-space:nowrap;">Amt :</span>
              <input class="form-control" id="medBill_grossAmt" style="width:75px;height:24px;font-weight:800;text-align:right;font-size:11px;background:#f1f5f9;border:1px solid #cbd5e1;border-radius:3px;padding:1px 4px;" value="₹0.00" readonly>
            </div>
            <div style="display:flex;align-items:center;gap:4px;">
              <span style="font-size:11px;font-weight:800;color:#dc2626;white-space:nowrap;">Discount :</span>
              <input class="form-control" id="medBill_discount" type="number" min="0" step="1" value="${curDiscount || 0}" style="width:65px;height:24px;font-weight:800;text-align:right;font-size:11px;background:#fff;border:1px solid #cbd5e1;border-radius:3px;padding:1px 4px;" oninput="DashboardModule._calcMedBillNetAmt()">
            </div>
            <div style="display:flex;align-items:center;gap:4px;">
              <span style="font-size:11px;font-weight:800;color:#0b4f26;white-space:nowrap;">Net Amt :</span>
              <input class="form-control" id="medBill_netAmt" style="width:85px;height:24px;font-weight:900;text-align:right;font-size:12px;color:#0b4f26;background:#dcfce7;border:1.5px solid #16a34a;border-radius:3px;padding:1px 4px;" value="₹0.00" readonly>
            </div>
          </div>
        </div>
      </div>
    `;

    const footer = `
      <div style="display:flex;justify-content:space-between;width:100%;align-items:center;">
        <button class="btn btn-secondary" onclick="App.closeModal()" style="font-weight:700;">✕ Close</button>
        <div style="display:flex;gap:8px;">
          <button class="btn btn-primary" onclick="DashboardModule._saveMedBilling(false)" style="background:#16a34a;color:#fff;font-weight:800;padding:6px 16px;">💾 Save Bill</button>
          <button class="btn btn-primary" onclick="DashboardModule._saveMedBilling(true)" style="background:#0891b2;color:#fff;font-weight:800;padding:6px 16px;">🖨️ Save & Print Pharmacy Receipt</button>
        </div>
      </div>
    `;

    App.openModal('💊 Pharmacy Medicine Billing & Extra Items Invoice', body, footer, 'fullscreen');
    setTimeout(() => {
      this._onMedBillFollowupChange(3);
      this._renderMedBillingItemsTable();
      this._filterMedBillByUse('');
      this._filterMedBillByGeneric('');
      this._cancelMedBillItem();
    }, 40);
  },

  _filterMedBillByUse(query = '') {
    const listEl = document.getElementById('medBill_useList');
    if (!listEl) return;
    const q = (query || '').trim().toLowerCase();
    if (!q) {
      listEl.innerHTML = '';
      return;
    }

    const allMeds = (DB.getMedicines ? DB.getMedicines() : []).slice();
    allMeds.sort((a, b) => (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' }));

    const filtered = allMeds.filter(m => {
      const nameMatch = (m.name || '').toLowerCase().includes(q);
      const useMatch = (m.use || m.indication || m.method || m.type || '').toLowerCase().includes(q);
      const remMatch = (m.remark || m.remark_guj || '').toLowerCase().includes(q);
      return nameMatch || useMatch || remMatch;
    });

    if (filtered.length === 0) {
      listEl.innerHTML = '<div style="padding:10px 6px;text-align:center;color:#94a3b8;font-size:11px;font-style:italic;">No medicines match</div>';
      return;
    }

    listEl.innerHTML = filtered.map(m => {
      const st = (m.orqty !== undefined && m.orqty !== null) ? Number(m.orqty) : (m.stock !== undefined ? Number(m.stock) : 0);
      const isOut = st <= 0;
      return `
        <div style="padding:3px 6px;border-bottom:1px solid #f1f5f9;cursor:pointer;display:flex;justify-content:space-between;align-items:center;transition:background 0.1s;"
             onmouseover="this.style.background='#eff6ff'" 
             onmouseout="this.style.background='transparent'"
             onclick="DashboardModule._selectMedFromSidebar('${App.escHtml(m.name)}')"
             title="Click to select ${App.escHtml(m.name)}">
          <div style="font-weight:700;color:#0f172a;font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
            ${App.escHtml(m.name)}
          </div>
          <div style="display:flex;align-items:center;gap:3px;flex-shrink:0;">
            ${isOut ? '<span style="background:#fee2e2;color:#dc2626;font-size:8.5px;font-weight:900;padding:0 3px;border-radius:2px;">Out</span>' : ''}
            <span style="font-size:9.5px;color:#0284c7;font-weight:700;">${App.escHtml(m.unit || 'Tab')}</span>
          </div>
        </div>
      `;
    }).join('');
  },

  _filterMedBillByGeneric(query = '') {
    const listEl = document.getElementById('medBill_genList');
    if (!listEl) return;
    const q = (query || '').trim().toLowerCase();
    if (!q) {
      listEl.innerHTML = '';
      return;
    }

    const allMeds = (DB.getMedicines ? DB.getMedicines() : []).slice();
    allMeds.sort((a, b) => (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' }));

    const filtered = allMeds.filter(m => {
      const genMatch = (m.generic || '').toLowerCase().includes(q) || q.includes((m.generic || '').toLowerCase());
      const nameMatch = (m.name || '').toLowerCase().includes(q) || q.includes((m.name || '').toLowerCase());
      return (m.generic && genMatch) || nameMatch;
    });

    if (filtered.length === 0) {
      listEl.innerHTML = '<div style="padding:10px 6px;text-align:center;color:#94a3b8;font-size:11px;font-style:italic;">No brand medicines match</div>';
      return;
    }

    listEl.innerHTML = filtered.map(m => {
      const st = (m.orqty !== undefined && m.orqty !== null) ? Number(m.orqty) : (m.stock !== undefined ? Number(m.stock) : 0);
      const isOut = st <= 0;
      return `
        <div style="padding:4px 6px;border-bottom:1px solid #f1f5f9;cursor:pointer;display:flex;justify-content:space-between;align-items:center;transition:background 0.1s;"
             onmouseover="this.style.background='#eff6ff'" 
             onmouseout="this.style.background='transparent'"
             onclick="DashboardModule._selectMedFromSidebar('${App.escHtml(m.name)}')"
             title="Generic: ${App.escHtml(m.generic || m.name)}">
          <div style="font-weight:700;color:#0f172a;font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
            ${App.escHtml(m.name)}
          </div>
          <div style="display:flex;align-items:center;gap:3px;flex-shrink:0;">
            ${isOut ? '<span style="background:#fee2e2;color:#dc2626;font-size:8.5px;font-weight:900;padding:0 3px;border-radius:2px;">Out</span>' : ''}
            <span style="font-size:9.5px;color:#0284c7;font-weight:700;">${App.escHtml(m.unit || 'Tab')}</span>
          </div>
        </div>
      `;
    }).join('');
  },

  _selectMedFromSidebar(name) {
    const nameInp = document.getElementById('medBill_name');
    if (nameInp) {
      nameInp.value = name;
      this._onMedBillMedChange(name);
      App.toast(`Selected "${name}" from sidebar 💊`, 'info', 1200);
      const dayInp = document.getElementById('medBill_day');
      if (dayInp) dayInp.focus();
    }
  },

  _onMedPayModeChange(mode) {
    const wrap = document.getElementById('medBill_bankWrap');
    if (wrap) {
      wrap.style.display = (mode === 'Bank' || mode === 'UPI' || mode === 'Bank / UPI' || mode.includes('Bank')) ? 'flex' : 'none';
    }
    this._calcMedBillNetAmt();
  },

  _calcMedBillNetAmt() {
    let gross = 0;
    (this._activeMedBillItems || []).forEach(item => {
      gross += Number(item.qty || 1) * Number(item.rate || 0);
    });
    const discInp = document.getElementById('medBill_discount');
    const discount = Math.max(0, Number(discInp ? discInp.value : 0) || 0);
    let net = Math.max(0, gross - discount);

    const modeVal = document.querySelector('input[name="medPay_mode"]:checked')?.value || 'Cash';
    if (modeVal === 'Cash') {
      net = Math.round(net);
    }

    const grossEl = document.getElementById('medBill_grossAmt');
    const netEl = document.getElementById('medBill_netAmt');
    const tableAmtEl = document.getElementById('medBill_tableAmount');

    if (grossEl) grossEl.value = `₹${gross.toFixed(2)}`;
    if (netEl) netEl.value = `₹${net.toFixed(2)}`;
    if (tableAmtEl) tableAmtEl.value = `₹${gross.toFixed(2)}`;
  },

  _onMedBillMedChange(val) {
    if (!val) return;
    const allMeds = DB.getMedicines ? DB.getMedicines() : [];
    const med = allMeds.find(m => m.name.toLowerCase() === val.trim().toLowerCase());

    const stockInp = document.getElementById('medBill_stock');
    const genInp = document.getElementById('medBill_generic');
    const unitInp = document.getElementById('medBill_unit');
    const mInp = document.getElementById('medBill_m');
    const aInp = document.getElementById('medBill_a');
    const nInp = document.getElementById('medBill_n');
    const sInp = document.getElementById('medBill_s');
    const dayInp = document.getElementById('medBill_day');
    const rateInp = document.getElementById('medBill_rate');
    const remInp = document.getElementById('medBill_remark');
    const methInp = document.getElementById('medBill_method');

    if (med) {
      if (genInp) genInp.value = med.generic || '';

      // Direct auto-show generic and its brand medicines in bottom-left Search(Generic) box
      const genSearchInp = document.getElementById('medBill_genSearchInp');
      const genVal = med.generic || med.name || '';
      if (genSearchInp && genVal) {
        genSearchInp.value = genVal;
        this._filterMedBillByGeneric(genVal);
      }

      const st = (med.orqty !== undefined && med.orqty !== null) ? Number(med.orqty) : (med.stock !== undefined ? Number(med.stock) : 0);
      if (stockInp) {
        stockInp.value = st;
        if (st <= 0) {
          stockInp.style.background = '#fee2e2';
          stockInp.style.color = '#dc2626';
          stockInp.style.border = '1.5px solid #ef4444';
          stockInp.style.fontWeight = '900';
          stockInp.title = 'OUT OF STOCK!';
        } else {
          stockInp.style.background = '#f0fdf4';
          stockInp.style.color = '#15803d';
          stockInp.style.border = '1px solid #86efac';
          stockInp.style.fontWeight = '800';
          stockInp.title = `Stock available: ${st}`;
        }
      }

      if (unitInp && med.unit) unitInp.value = med.unit;

      let mVal = med.m !== undefined && med.m !== null && med.m !== '' ? String(med.m) : '1';
      let aVal = med.a !== undefined && med.a !== null && med.a !== '' ? String(med.a) : '0';
      let nVal = med.n !== undefined && med.n !== null && med.n !== '' ? String(med.n) : '1';
      let sVal = med.s !== undefined && med.s !== null && med.s !== '' ? String(med.s) : '0';

      if (mInp && !mInp.value) mInp.value = mVal;
      if (aInp && !aInp.value) aInp.value = aVal;
      if (nInp && !nInp.value) nInp.value = nVal;
      if (sInp && !sInp.value) sInp.value = sVal;

      if (dayInp && (!dayInp.value || dayInp.value === '0')) {
        const setTabDayInp = document.getElementById('medBill_setTabDayInp');
        dayInp.value = (setTabDayInp && setTabDayInp.value) ? setTabDayInp.value : '3';
      }

      // Calculate unit rate
      const uStr = (med.unit || '').toUpperCase();
      const nameStr = (med.name || '').toUpperCase();
      const isTabOrCap = uStr.includes('TAB') || uStr.includes('CAP') || nameStr.includes('TAB') || nameStr.includes('CAP');

      let packCount = 1;
      if (med.packing) {
        const match = String(med.packing).match(/(\d+)\s*$/);
        if (match) packCount = parseInt(match[1], 10) || 1;
      } else if (isTabOrCap) {
        packCount = 10;
      }

      const mrpPack = parseFloat(med.mrppack || med.rate || med.price || 30.00);
      const ratePerUnit = packCount > 1 ? (mrpPack / packCount) : mrpPack;
      if (rateInp) rateInp.value = ratePerUnit.toFixed(2);

      const defRemark = med.remark_guj || med.remark || 'જમ્યા પછી';
      if (remInp && defRemark) {
        for (let i = 0; i < remInp.options.length; i++) {
          if (remInp.options[i].value.includes(defRemark) || defRemark.includes(remInp.options[i].value)) {
            remInp.selectedIndex = i;
            break;
          }
        }
      }

      const defMethod = med.method || (isTabOrCap ? 'TABLET' : 'SYRUP / LIQUID');
      if (methInp && defMethod) {
        for (let i = 0; i < methInp.options.length; i++) {
          if (methInp.options[i].value === defMethod) {
            methInp.selectedIndex = i;
            break;
          }
        }
      }
    }

    this._calcMedBillItemTotal();
  },

  _loadMedBillItemToTop(idx) {
    if (!this._activeMedBillItems || !this._activeMedBillItems[idx]) return;
    const item = this._activeMedBillItems[idx];
    const allMeds = DB.getMedicines ? DB.getMedicines() : [];
    const med = allMeds.find(m => m.name.toLowerCase() === (item.name || '').trim().toLowerCase());

    const nameInp = document.getElementById('medBill_name');
    const stockInp = document.getElementById('medBill_stock');
    const unitInp = document.getElementById('medBill_unit');
    const mInp = document.getElementById('medBill_m');
    const aInp = document.getElementById('medBill_a');
    const nInp = document.getElementById('medBill_n');
    const sInp = document.getElementById('medBill_s');
    const dayInp = document.getElementById('medBill_day');
    const qtyInp = document.getElementById('medBill_qty');
    const rateInp = document.getElementById('medBill_rate');
    const totalInp = document.getElementById('medBill_total');
    const remInp = document.getElementById('medBill_remark');
    const methInp = document.getElementById('medBill_method');
    const addBtn = document.getElementById('medBill_addBtn');

    if (nameInp) nameInp.value = item.name || '';

    const stock = med ? ((med.orqty !== undefined && med.orqty !== null) ? Number(med.orqty) : (med.stock !== undefined ? Number(med.stock) : 0)) : (item.stock || 0);
    if (stockInp) {
      stockInp.value = stock;
      if (stock <= 0) {
        stockInp.style.background = '#fee2e2';
        stockInp.style.color = '#dc2626';
        stockInp.style.border = '1.5px solid #ef4444';
        stockInp.style.fontWeight = '900';
        stockInp.title = 'OUT OF STOCK!';
      } else {
        stockInp.style.background = '#f0fdf4';
        stockInp.style.color = '#15803d';
        stockInp.style.border = '1px solid #86efac';
        stockInp.style.fontWeight = '800';
        stockInp.title = `Stock available: ${stock}`;
      }
    }

    if (unitInp && (item.unit || item.type)) {
      unitInp.value = item.unit || item.type;
    }
    if (mInp) mInp.value = item.m !== undefined && item.m !== null && item.m !== '' ? item.m : '1';
    if (aInp) aInp.value = item.a !== undefined && item.a !== null && item.a !== '' ? item.a : '0';
    if (nInp) nInp.value = item.n !== undefined && item.n !== null && item.n !== '' ? item.n : '1';
    if (sInp) sInp.value = item.s !== undefined && item.s !== null && item.s !== '' ? item.s : '0';

    if (dayInp) dayInp.value = item.day || item.days || '3';
    if (qtyInp) qtyInp.value = item.qty || 6;
    if (rateInp) rateInp.value = item.rate || 0;
    if (totalInp) totalInp.value = `₹${((item.qty || 1) * (item.rate || 0)).toFixed(2)}`;

    if (remInp && (item.remark || item.method)) {
      const val = item.remark || item.method;
      for (let i = 0; i < remInp.options.length; i++) {
        if (remInp.options[i].value === val || remInp.options[i].value.includes(val) || val.includes(remInp.options[i].value)) {
          remInp.selectedIndex = i;
          break;
        }
      }
    }
    if (methInp && (item.method || item.type)) {
      for (let i = 0; i < methInp.options.length; i++) {
        if (methInp.options[i].value === (item.method || item.type)) {
          methInp.selectedIndex = i;
          break;
        }
      }
    }

    // Direct auto-show generic and its brand medicines in bottom-left Search(Generic) box
    const gen = (med && med.generic) ? med.generic : (item.generic || item.name || '');
    const genSearchInp = document.getElementById('medBill_genSearchInp');
    if (genSearchInp && gen) {
      genSearchInp.value = gen;
      this._filterMedBillByGeneric(gen);
    }

    this._editingMedBillIndex = idx;
    if (addBtn) {
      addBtn.textContent = 'Update';
      addBtn.style.background = '#059669';
    }
    App.toast(`Loaded "${item.name}" to top inputs! Edit values and click Update. 📝`, 'info', 1600);
    if (nameInp) nameInp.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  },

  _calcMedBillItemTotal(manualQty = false) {
    const mVal = Number(document.getElementById('medBill_m')?.value || 0);
    const aVal = Number(document.getElementById('medBill_a')?.value || 0);
    const nVal = Number(document.getElementById('medBill_n')?.value || 0);
    const sVal = Number(document.getElementById('medBill_s')?.value || 0);
    const dayVal = Number(document.getElementById('medBill_day')?.value || 3);
    const rateVal = Number(document.getElementById('medBill_rate')?.value || 0);
    const qtyInp = document.getElementById('medBill_qty');
    const totalInp = document.getElementById('medBill_total');

    let qty = 0;
    if (manualQty && qtyInp && qtyInp.value !== '') {
      qty = Number(qtyInp.value || 0);
    } else {
      const perDay = mVal + aVal + nVal + sVal;
      const effectivePerDay = perDay > 0 ? perDay : 2;
      const effectiveDay = dayVal > 0 ? dayVal : 1;
      qty = effectiveDay * effectivePerDay;
      if (qtyInp) qtyInp.value = qty > 0 ? qty : '1';
    }

    const total = qty * rateVal;
    if (totalInp) totalInp.value = total > 0 ? total.toFixed(2) : '0.00';
  },

  _onMedBillFollowupChange(numDays = 3) {
    const d = parseInt(numDays, 10) || 3;
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + d);

    const engDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayName = engDays[targetDate.getDay()];
    const dd = String(targetDate.getDate()).padStart(2, '0');
    const mm = String(targetDate.getMonth() + 1).padStart(2, '0');
    const yyyy = targetDate.getFullYear();

    const box = document.getElementById('medBill_followupDateBox');
    if (box) {
      box.value = `${dd}/${mm}/${yyyy} (${dayName})`;
    }
  },

  _setDayForOnlyTabletInMedBill() {
    const dayInp = document.getElementById('medBill_setTabDayInp');
    const dayVal = parseInt(dayInp ? dayInp.value : '', 10);
    if (isNaN(dayVal) || dayVal <= 0) {
      App.toast('Please enter a valid Day number', 'warning');
      return;
    }

    if (!this._activeMedBillItems || this._activeMedBillItems.length === 0) {
      App.toast('No medicines in table to update', 'info');
      return;
    }

    let count = 0;
    this._activeMedBillItems.forEach(item => {
      const uStr = (item.type || item.unit || item.method || '').toUpperCase();
      const nameStr = (item.name || '').toUpperCase();
      const isTab = uStr.includes('TAB') || uStr.includes('CAP') || nameStr.includes('TAB') || nameStr.includes('CAP');
      if (isTab) {
        item.day = dayVal;
        const perDay = (Number(item.m) || 0) + (Number(item.a) || 0) + (Number(item.n) || 0) + (Number(item.s) || 0);
        item.qty = dayVal * (perDay > 0 ? perDay : 2);
        item.total = item.qty * Number(item.rate || 0);
        count++;
      }
    });

    this._renderMedBillingItemsTable();
    App.toast(`Updated ${count} tablet/capsule items to ${dayVal} days! ✨`, 'success');
  },

  _renderMedBillingItemsTable() {
    const tbody = document.getElementById('medBillTbody');
    if (!tbody) return;

    const allMeds = DB.getMedicines ? DB.getMedicines() : [];
    let rxSubtotal = 0;
    let extraSubtotal = 0;

    if (!this._activeMedBillItems || this._activeMedBillItems.length === 0) {
      tbody.innerHTML = `<tr><td colspan="13" style="text-align:center;padding:16px;color:#64748b;font-style:italic;">No medicine items in this bill yet. Add medicines above.</td></tr>`;
    } else {
      tbody.innerHTML = this._activeMedBillItems.map((item, idx) => {
        const itemTotal = Number(item.qty || 1) * Number(item.rate || 0);
        item.total = itemTotal;
        const medType = this._getMedType(item);
        if (item.isExtra) {
          extraSubtotal += itemTotal;
        } else {
          rxSubtotal += itemTotal;
        }

        const medObj = allMeds.find(m => m.name.toLowerCase() === (item.name || '').trim().toLowerCase());
        const stock = medObj ? ((medObj.orqty !== undefined && medObj.orqty !== null) ? Number(medObj.orqty) : (medObj.stock !== undefined ? Number(medObj.stock) : 0)) : (item.stock != null ? Number(item.stock) : 100);
        const isOutOfStock = stock <= 0;

        const mVal = item.m !== undefined && item.m !== null && item.m !== '' ? item.m : '1';
        const aVal = item.a !== undefined && item.a !== null && item.a !== '' ? item.a : '0';
        const nVal = item.n !== undefined && item.n !== null && item.n !== '' ? item.n : '1';
        const sVal = item.s !== undefined && item.s !== null && item.s !== '' ? item.s : '0';

        return `
          <tr style="border-bottom:1px solid #e2e8f0;background:${idx % 2 === 0 ? '#fff' : '#f8fafc'};cursor:pointer;" 
              onclick="DashboardModule._loadMedBillItemToTop(${idx})"
              title="Click medicine to edit in top form">
            <td style="text-align:center;font-weight:700;padding:5px 2px;">${idx + 1}</td>
            <td style="font-weight:700;color:#0f172a;min-width:160px;padding:5px 6px;">
              <span style="color:#1d4ed8;font-weight:800;text-decoration:underline;">${App.escHtml(item.name)}</span>
              ${isOutOfStock ? '<span style="background:#fee2e2;color:#dc2626;border:1px solid #ef4444;font-size:9px;font-weight:900;padding:1px 5px;border-radius:3px;margin-left:6px;display:inline-block;">❌ OUT OF STOCK</span>' : ''}
            </td>
            <td style="text-align:center;font-weight:800;color:#1e40af;padding:2px;">${mVal}</td>
            <td style="text-align:center;font-weight:800;color:#1e40af;padding:2px;">${aVal}</td>
            <td style="text-align:center;font-weight:800;color:#1e40af;padding:2px;">${nVal}</td>
            <td style="text-align:center;font-weight:800;color:#1e40af;padding:2px;">${sVal}</td>
            <td style="text-align:center;font-weight:700;padding:2px;">${item.day || item.days || '3'}</td>
            <td style="text-align:center;padding:2px;" onclick="event.stopPropagation()">
              <input type="number" min="1" step="1" value="${item.qty || 1}" 
                     style="width:48px;height:22px;text-align:center;font-weight:800;border:1px solid #cbd5e1;border-radius:2px;padding:0;"
                     oninput="DashboardModule._updateMedBillItemQty(${idx}, this.value)">
            </td>
            <td style="text-align:right;padding:2px 4px;" onclick="event.stopPropagation()">
              <input type="number" min="0" step="0.5" value="${item.rate || 0}" 
                     style="width:58px;height:22px;text-align:right;font-weight:800;border:1px solid #cbd5e1;border-radius:2px;padding:0 2px;"
                     oninput="DashboardModule._updateMedBillItemRate(${idx}, this.value)">
            </td>
            <td style="text-align:right;font-weight:800;color:#0b4f26;font-size:11px;padding:2px 4px;">₹${itemTotal.toFixed(2)}</td>
            <td style="font-size:11px;color:#1e40af;font-weight:700;padding:2px 6px;">${App.escHtml(item.remark || item.method || 'જમ્યા પછી')}</td>
            <td style="font-size:10px;color:#0369a1;font-weight:700;padding:2px 4px;">${App.escHtml(item.type || medType || 'Tab')}</td>
            <td style="text-align:center;padding:2px;" onclick="event.stopPropagation()">
              <button style="border:none;background:transparent;color:#dc3545;font-weight:bold;cursor:pointer;font-size:12px;padding:0 2px;" onclick="DashboardModule._deleteMedBillItem(${idx})" title="Remove item">✕</button>
            </td>
          </tr>
        `;
      }).join('');
    }

    const grandTotal = rxSubtotal + extraSubtotal;
    const tableAmtEl = document.getElementById('medBill_tableAmount');
    const notUseCntEl = document.getElementById('medBill_notUseCnt');

    if (tableAmtEl) tableAmtEl.value = `₹${grandTotal.toFixed(2)}`;
    if (notUseCntEl) notUseCntEl.innerText = String(this._activeMedBillItems ? this._activeMedBillItems.filter(i => i.isExtra).length : 0);
    this._calcMedBillNetAmt();
  },

  _addExtraMedBillItem() {
    const nameInp = document.getElementById('medBill_name');
    const genInp = document.getElementById('medBill_generic');
    const unitInp = document.getElementById('medBill_unit');
    const mInp = document.getElementById('medBill_m');
    const aInp = document.getElementById('medBill_a');
    const nInp = document.getElementById('medBill_n');
    const sInp = document.getElementById('medBill_s');
    const dayInp = document.getElementById('medBill_day');
    const qtyInp = document.getElementById('medBill_qty');
    const rateInp = document.getElementById('medBill_rate');
    const remInp = document.getElementById('medBill_remark');
    const methInp = document.getElementById('medBill_method');

    const name = nameInp ? nameInp.value.trim() : '';
    if (!name) {
      App.toast('Please enter medicine name to add', 'warning', 1800);
      if (nameInp) nameInp.focus();
      return;
    }

    const generic = genInp ? genInp.value.trim() : '';
    const unit = unitInp ? unitInp.value : 'Tab.';
    const m = mInp ? mInp.value : '';
    const a = aInp ? aInp.value : '';
    const n = nInp ? nInp.value : '';
    const s = sInp ? sInp.value : '';
    const day = dayInp ? (Number(dayInp.value) || '') : '';
    const qty = Number(qtyInp ? qtyInp.value : 1) || 1;
    const rate = Number(rateInp ? rateInp.value : 0) || 0;
    const total = qty * rate;
    const remark = remInp ? remInp.value : '';
    const method = methInp ? methInp.value : '';

    if (!this._activeMedBillItems) this._activeMedBillItems = [];

    if (this._editingMedBillIndex != null && this._activeMedBillItems[this._editingMedBillIndex]) {
      const existing = this._activeMedBillItems[this._editingMedBillIndex];
      existing.name = name;
      existing.generic = generic;
      existing.type = unit;
      existing.unit = unit;
      existing.m = m;
      existing.a = a;
      existing.n = n;
      existing.s = s;
      existing.day = day;
      existing.qty = qty;
      existing.rate = rate;
      existing.total = total;
      existing.remark = remark;
      existing.method = method;
      App.toast(`Updated "${name}"! ✨`, 'success', 1800);
      this._editingMedBillIndex = null;
    } else {
      this._activeMedBillItems.push({
        name,
        generic,
        type: unit,
        unit,
        m,
        a,
        n,
        s,
        day,
        qty,
        rate,
        total,
        remark,
        method,
        isExtra: true
      });
      App.toast(`Added [${unit}] "${name}" (Qty: ${qty}) to medicine bill! ➕`, 'success', 1800);
    }

    this._cancelMedBillItem();
    this._renderMedBillingItemsTable();
  },

  _cancelMedBillItem() {
    this._editingMedBillIndex = null;
    const ids = ['medBill_name', 'medBill_generic', 'medBill_stock', 'medBill_m', 'medBill_a', 'medBill_n', 'medBill_s', 'medBill_day', 'medBill_qty', 'medBill_rate', 'medBill_total'];
    ids.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
    const stockInp = document.getElementById('medBill_stock');
    if (stockInp) {
      stockInp.style.background = '#f8fafc';
      stockInp.style.color = '#0f172a';
      stockInp.style.border = '1px solid #cbd5e1';
      stockInp.style.fontWeight = '800';
    }
    const remInp = document.getElementById('medBill_remark');
    if (remInp) remInp.selectedIndex = 0;
    const methInp = document.getElementById('medBill_method');
    if (methInp) methInp.selectedIndex = 0;
    const addBtn = document.getElementById('medBill_addBtn');
    if (addBtn) {
      addBtn.textContent = 'Add';
      addBtn.style.background = '#1d4ed8';
    }
    const nameInp = document.getElementById('medBill_name');
    if (nameInp) nameInp.focus();
  },

  _deleteMedBillItem(idx) {
    if (!this._activeMedBillItems || !this._activeMedBillItems[idx]) return;
    const item = this._activeMedBillItems.splice(idx, 1);
    this._renderMedBillingItemsTable();
    if (item[0]) App.toast(`Removed "${item[0].name}" from bill 🗑️`, 'info', 1600);
  },

  _updateMedBillItemQty(idx, val) {
    if (!this._activeMedBillItems || !this._activeMedBillItems[idx]) return;
    const q = Math.max(1, Number(val) || 1);
    this._activeMedBillItems[idx].qty = q;
    this._activeMedBillItems[idx].total = q * Number(this._activeMedBillItems[idx].rate || 0);
    this._renderMedBillingItemsTable();
  },

  _updateMedBillItemRate(idx, val) {
    if (!this._activeMedBillItems || !this._activeMedBillItems[idx]) return;
    const r = Math.max(0, Number(val) || 0);
    this._activeMedBillItems[idx].rate = r;
    this._activeMedBillItems[idx].total = Number(this._activeMedBillItems[idx].qty || 1) * r;
    this._renderMedBillingItemsTable();
  },

  _saveMedBilling(doPrint) {
    const patientId = this._activeMedBillPatientId;
    const apptId = this._activeMedBillApptId;
    const modeVal = document.querySelector('input[name="medPay_mode"]:checked')?.value || 'Cash';
    const bankName = (modeVal === 'Bank' || modeVal.includes('Bank')) ? (document.getElementById('medBill_bankName')?.value || 'Bank') : '';
    const mode = (modeVal === 'Bank' || modeVal.includes('Bank')) ? `Bank (${bankName})` : modeVal;
    const discInp = document.getElementById('medBill_discount');
    const discount = Math.max(0, Number(discInp ? discInp.value : 0) || 0);

    let grossAmt = 0;
    (this._activeMedBillItems || []).forEach(i => {
      grossAmt += Number(i.qty || 1) * Number(i.rate || 0);
    });
    let netAmt = Math.max(0, grossAmt - discount);
    if (modeVal === 'Cash') {
      netAmt = Math.round(netAmt);
    }
    const status = 'paid';
    const isPaid = true;

    // Update appointment with medicine items, netAmt, grossAmt, discount, paid status and payment mode
    if (apptId && DB.updateAppointment) {
      DB.updateAppointment(apptId, {
        rxItems: this._activeMedBillItems,
        rxTotalAmt: netAmt,
        billAmt: netAmt,
        grossAmt,
        discount,
        bankName,
        rxPaid: isPaid,
        medPaid: isPaid,
        rxPaymentMode: mode
      });
    }

    // Also update patient savedRx with full items list and payment details
    if (patientId && DB.updatePatient) {
      DB.updatePatient(patientId, {
        savedRx: this._activeMedBillItems,
        rxPaymentMode: mode,
        bankName,
        rxPaid: isPaid,
        medPaid: isPaid,
        rxTotalAmt: netAmt,
        discount
      });
    }

    // Create or update invoice in Invoices collection
    const p = DB.getPatient(patientId) || {};
    const invoices = (DB.getInvoices ? DB.getInvoices() : []) || [];
    const existingPharmInv = invoices.find(i => String(i.patientId) === String(patientId) && (i.type === 'Pharmacy' || (i.appointmentId && String(i.appointmentId) === String(apptId) && i.isPharmacy)));

    const invItems = (this._activeMedBillItems || []).map(it => ({
      desc: `${it.name} (${it.type || 'Tab'}) x ${it.qty}`,
      qty: it.qty,
      rate: it.rate,
      amount: it.total
    }));

    if (existingPharmInv && existingPharmInv.id) {
      DB.updateInvoice(existingPharmInv.id, {
        items: invItems.length > 0 ? invItems : [{ desc: 'Pharmacy Medicines', qty: 1, rate: netAmt, amount: netAmt }],
        total: netAmt,
        grossTotal: grossAmt,
        discount: discount,
        status: status,
        paymentMode: mode,
        paidAt: isPaid ? new Date().toISOString() : null
      });
    } else if (netAmt >= 0) {
      DB.addInvoice({
        patientId,
        patientName: p.name || 'Patient',
        appointmentId: apptId,
        type: 'Pharmacy',
        isPharmacy: true,
        items: invItems.length > 0 ? invItems : [{ desc: 'Pharmacy Medicines', qty: 1, rate: netAmt, amount: netAmt }],
        total: netAmt,
        grossTotal: grossAmt,
        discount: discount,
        status: status,
        paymentMode: mode,
        createdAt: new Date().toISOString(),
        paidAt: isPaid ? new Date().toISOString() : null
      });
    }

    App.toast(`Medicine bill saved as PAID (${mode}: ₹${netAmt.toFixed(0)})! 💊✅`, 'success', 2200);
    App.closeModal();
    this._renderTable();
    this._renderSummary();

    if (doPrint) {
      this._printPharmacyReceipt(patientId, apptId, grossAmt, discount, netAmt, mode, status, this._activeMedBillItems);
    }
  },

  _printPharmacyReceipt(patientId, apptId, grossAmt, discount, netAmt, mode, status, items) {
    const p = DB.getPatient(patientId) || {};
    const today = new Date().toLocaleDateString('en-GB');
    const invoiceNo = 'PHARM-' + (apptId ? String(apptId).slice(-5) : Math.floor(1000 + Math.random() * 9000));

    const itemRows = (items || []).map((item, idx) => {
      const q = item.qty || 1;
      const r = item.rate || 0;
      const t = q * r;
      const medType = this._getMedType(item);

      return `
        <tr>
          <td style="padding:5px 6px;border-bottom:1px dashed #ccc;text-align:center;">${idx + 1}</td>
          <td style="padding:5px 6px;border-bottom:1px dashed #ccc;font-weight:bold;">
            ${App.escHtml(item.name)}
          </td>
          <td style="padding:5px 6px;border-bottom:1px dashed #ccc;text-align:center;font-weight:bold;color:#1e293b;">${App.escHtml(medType)}</td>
          <td style="padding:5px 6px;border-bottom:1px dashed #ccc;text-align:center;">${q}</td>
          <td style="padding:5px 6px;border-bottom:1px dashed #ccc;text-align:right;">₹${Number(r).toFixed(2)}</td>
          <td style="padding:5px 6px;border-bottom:1px dashed #ccc;text-align:right;font-weight:bold;">₹${Number(t).toFixed(2)}</td>
        </tr>
      `;
    }).join('');

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Pharmacy Bill Receipt - ${App.escHtml(p.name || 'Patient')}</title>
  <style>
    body { font-family: monospace, sans-serif; margin: 20px; font-size: 13px; color: #000; }
    .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 8px; margin-bottom: 12px; }
    .title { font-size: 18px; font-weight: bold; }
    .meta { display: flex; justify-content: space-between; margin-bottom: 12px; font-size: 12px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
    th { border-bottom: 1.5px solid #000; border-top: 1.5px solid #000; padding: 5px 6px; text-align: left; font-size: 12px; }
    .total-box { border-top: 2px solid #000; padding-top: 6px; text-align: right; font-size: 13px; font-weight: bold; }
    @media print {
      body { margin: 0; padding: 10px; }
      @page { size: auto; margin: 5mm; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="title">HARISHREE CLINIC & PHARMACY</div>
    <div>DR. YASH VAGHANI | B.A.M.S., C.C.T.</div>
    <div style="font-size:11px;">Surat, Gujarat | Ph: +91 94286 19900</div>
    <div style="font-weight:bold;margin-top:4px;">*** PHARMACY MEDICINE BILL RECEIPT ***</div>
  </div>

  <div class="meta">
    <div>
      <div><b>Patient:</b> ${App.escHtml(p.name || 'Patient')}</div>
      <div><b>Pt ID:</b> #${App.escHtml(String(p.id || '—'))} | <b>Gender:</b> ${App.escHtml(p.gender || '—')}</div>
    </div>
    <div style="text-align:right;">
      <div><b>Bill No:</b> ${invoiceNo}</div>
      <div><b>Date:</b> ${today}</div>
      <div><b>Payment:</b> ${mode} (${status.toUpperCase()})</div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th style="width:30px;text-align:center;">#</th>
        <th>Medicine / Item Description</th>
        <th style="width:60px;text-align:center;">Type</th>
        <th style="width:50px;text-align:center;">Qty</th>
        <th style="width:80px;text-align:right;">Rate</th>
        <th style="width:90px;text-align:right;">Total</th>
      </tr>
    </thead>
    <tbody>
      ${itemRows}
    </tbody>
  </table>

  <div class="total-box">
    ${discount > 0 ? `<div>GROSS AMOUNT: ₹${Number(grossAmt).toFixed(2)}</div>` : ''}
    ${discount > 0 ? `<div style="color:#c00;">DISCOUNT: -₹${Number(discount).toFixed(2)}</div>` : ''}
    <div style="font-size:15px;font-weight:900;margin-top:2px;">NET AMOUNT: ₹${Number(netAmt).toFixed(2)}</div>
    <div style="font-size:12px;font-weight:normal;color:#333;margin-top:4px;">Payment Mode: <b>${mode}</b> (${status.toUpperCase()})</div>
  </div>

  <div style="text-align:center;margin-top:24px;font-size:11px;border-top:1px dashed #666;padding-top:8px;">
    Thank you for your visit! Get well soon! 🩺🌿
  </div>

  <script>
    window.onload = function() {
      setTimeout(function() { window.print(); }, 250);
    };
  <\/script>
</body>
</html>
    `;

    let pw = null;
    try { pw = window.open('', '_blank', 'width=700,height=850'); } catch (e) { }
    if (pw && !pw.closed) {
      pw.document.write(html);
      pw.document.close();
    }
  },

  _toggleDone(apptId, checked) {

    DB.updateAppointment(apptId, { status: checked ? 'completed' : 'scheduled' });
    App.toast(checked ? 'Marked as done' : 'Marked as pending', 'info', 1500);
    this._renderTable();
  },

  _toggleIndoor(apptId, checked) {
    const a = (DB.getAppointments() || []).find(x => String(x.id) === String(apptId)) || {};
    DB.updateAppointment(apptId, { indoor: checked, type: checked ? 'Indoor' : 'OPD' });
    if (a.patientId) {
      DB.updatePatient(a.patientId, { indoor: checked });
    }
    if (checked) {
      App.toast('Patient admitted to InDoor (IPD)! 🏥 Moving to Indoor section...', 'success', 2000);
      this._topTab = 'indoor';
      this._filter = 'notdone';
    } else {
      App.toast('Patient removed from Indoor (IPD)', 'info', 1500);
      this._topTab = 'doctor';
      this._filter = 'notdone';
    }
    this.render();
  },

  _activeIpdRx: [],
  _activeIpdPatientId: null,
  _activeIpdApptId: null,

  /* Open Indoor Prescription Modal for IPD patients (OPD-style medicine entry + 3-day admin chart) */
  openIndoorModal(patientId, apptId) {
    this._activeIpdPatientId = patientId;
    this._activeIpdApptId = apptId;

    const p = DB.getPatient(patientId) || {};
    const a = (DB.getAppointments() || []).find(x => String(x.id) === String(apptId) || String(x.patientId) === String(patientId)) || {};
    const settings = DB.getSettings() || {};
    const today = new Date().toLocaleDateString('en-GB').replace(/\//g, '/');
    const todayIso = new Date().toISOString().split('T')[0];
    const ageStr = App.getAgeStr ? App.getAgeStr(p.dob) : '—';
    const admitDate = p.admitDate || a.admitDate || a.date || todayIso;
    const bedCharge = p.bedChargePerDay != null ? Number(p.bedChargePerDay) : (a.bedChargePerDay != null ? Number(a.bedChargePerDay) : 400);

    // Calculate days (minimum 1 day)
    let ipdDays = 1;
    if (admitDate) {
      const d1 = new Date(admitDate.split('T')[0]);
      const d2 = new Date();
      const diff = Math.floor((d2 - d1) / (1000 * 60 * 60 * 24));
      ipdDays = Math.max(1, diff + 1);
    }
    // Reset medication chart, round, IV fluids, and editing state on open
    this._activeIpdRx = [];
    this._activeIpdIv = { dns: false, ns: false, rl: false };
    this._editingIpdRxIndex = null;

    // Medicines for autocomplete
    const medicines = DB.getMedicines ? DB.getMedicines() : [];

    const body = `
      <div style="font-family:sans-serif;font-size:12px;color:#1e293b;">
        <!-- Patient Demographics Header (Fully Editable) -->
        <div style="display:grid;grid-template-columns:repeat(4, 1fr);gap:8px 14px;margin-bottom:12px;padding:10px 14px;background:#f0f9ff;border:1.5px solid #bae6fd;border-radius:6px;align-items:center;">
          <div>
            <label style="font-size:10px;font-weight:700;color:#334155;display:block;margin-bottom:2px;">Patient Name</label>
            <input id="ipd_patientName" type="text" value="${App.escHtml(p.name || '')}" style="border:1px solid #cbd5e1;border-radius:3px;padding:3px 6px;width:100%;font-size:11px;font-weight:700;color:#0369a1;background:#fff;">
          </div>
          <div>
            <label style="font-size:10px;font-weight:700;color:#334155;display:block;margin-bottom:2px;">P.ID</label>
            <input id="ipd_patientId_disp" type="text" value="${App.escHtml(String(patientId))}" disabled style="border:1px solid #cbd5e1;border-radius:3px;padding:3px 6px;width:100%;font-size:11px;background:#e2e8f0;font-weight:700;color:#475569;">
          </div>
          <div>
            <label style="font-size:10px;font-weight:700;color:#334155;display:block;margin-bottom:2px;">Mobile (10 Digits)</label>
            <input id="ipd_mobile" type="text" maxlength="10" value="${App.escHtml(p.mobile || p.phone || '')}" style="border:1px solid #cbd5e1;border-radius:3px;padding:3px 6px;width:100%;font-size:11px;font-weight:700;color:#0f172a;background:#fff;">
          </div>
          <div>
            <label style="font-size:10px;font-weight:700;color:#334155;display:block;margin-bottom:2px;">Age & Gender</label>
            <div style="display:flex;gap:4px;">
              <input id="ipd_age" type="text" placeholder="Age" value="${App.escHtml(p.age || (App.getAgeStr ? App.getAgeStr(p.dob) : ''))}" style="border:1px solid #cbd5e1;border-radius:3px;padding:3px 4px;width:50px;font-size:11px;font-weight:700;">
              <select id="ipd_gender" style="border:1px solid #cbd5e1;border-radius:3px;padding:3px 4px;font-size:11px;font-weight:700;flex:1;">
                <option value="Male" ${p.gender === 'Male' ? 'selected' : ''}>Male</option>
                <option value="Female" ${p.gender === 'Female' ? 'selected' : ''}>Female</option>
                <option value="Other" ${p.gender === 'Other' ? 'selected' : ''}>Other</option>
              </select>
            </div>
          </div>
          <div>
            <label style="font-size:10px;font-weight:700;color:#334155;display:block;margin-bottom:2px;">Doctor</label>
            <input id="ipd_doctor" type="text" value="${App.escHtml(p.ipdDoctor || settings.doctorName || 'DR. YASH VAGHANI')}" style="border:1px solid #cbd5e1;border-radius:3px;padding:3px 6px;width:100%;font-size:11px;font-weight:700;color:#0f172a;background:#fff;">
          </div>
          <div>
            <label style="font-size:10px;font-weight:700;color:#334155;display:block;margin-bottom:2px;">Ward / Bed</label>
            <input id="ipd_ward" type="text" placeholder="General / Bed-1" value="${App.escHtml(p.ipdWard || '')}" style="border:1px solid #cbd5e1;border-radius:3px;padding:3px 6px;width:100%;font-size:11px;font-weight:700;color:#0f172a;background:#fff;">
          </div>
          <div>
            <label style="font-size:10px;font-weight:700;color:#334155;display:block;margin-bottom:2px;">Admit Date</label>
            <input id="ipd_admitDate" type="date" value="${admitDate ? admitDate.split('T')[0] : ''}" onchange="DashboardModule._calcIpdTotal()" style="border:1px solid #cbd5e1;border-radius:3px;padding:3px 6px;width:100%;font-size:11px;font-weight:700;background:#fff;">
          </div>
          <div>
            <label style="font-size:10px;font-weight:700;color:#334155;display:block;margin-bottom:2px;">Bed ₹/Day</label>
            <input id="ipd_bedCharge" type="number" value="${bedCharge}" oninput="DashboardModule._calcIpdTotal()" style="border:1px solid #cbd5e1;border-radius:3px;padding:3px 6px;width:100%;font-size:11px;font-weight:800;color:#16a34a;background:#fff;">
          </div>
        </div>

        <!-- OPD-Style Medicine Prescription Entry Bar -->
        <div style="background:#f8fafc;padding:10px 12px;border-radius:6px;border:1.5px solid #cbd5e1;margin-bottom:12px;">
          <!-- Top Row: Quick IV Fluids + Add Last IPD Rx Button -->
          <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;margin-bottom:8px;padding-bottom:8px;border-bottom:1px dashed #cbd5e1;">
            <div style="display:flex;align-items:center;gap:12px;background:#e0f2fe;padding:4px 14px;border-radius:4px;border:1.5px solid #0284c7;">
              <span style="font-size:11px;font-weight:900;color:#0369a1;">💧 QUICK IV FLUIDS:</span>
              <label style="display:flex;align-items:center;gap:6px;font-size:12px;font-weight:800;color:#0f172a;cursor:pointer;background:#fff;padding:2px 8px;border-radius:3px;border:1px solid #bae6fd;">
                <input type="checkbox" id="ipd_quick_dns" onchange="DashboardModule._toggleQuickIv('dns', this.checked)" style="cursor:pointer;width:16px;height:16px;"> DNS
              </label>
              <label style="display:flex;align-items:center;gap:6px;font-size:12px;font-weight:800;color:#0f172a;cursor:pointer;background:#fff;padding:2px 8px;border-radius:3px;border:1px solid #bae6fd;">
                <input type="checkbox" id="ipd_quick_ns" onchange="DashboardModule._toggleQuickIv('ns', this.checked)" style="cursor:pointer;width:16px;height:16px;"> NS
              </label>
              <label style="display:flex;align-items:center;gap:6px;font-size:12px;font-weight:800;color:#0f172a;cursor:pointer;background:#fff;padding:2px 8px;border-radius:3px;border:1px solid #bae6fd;">
                <input type="checkbox" id="ipd_quick_rl" onchange="DashboardModule._toggleQuickIv('rl', this.checked)" style="cursor:pointer;width:16px;height:16px;"> RL
              </label>
            </div>

            <div>
              <button type="button" class="btn btn-sm" onclick="DashboardModule._loadLastIpdRx('${patientId}')" style="font-size:11px;padding:5px 14px;font-weight:800;background:#0891b2;color:#fff;border:none;border-radius:4px;cursor:pointer;box-shadow:0 1px 2px rgba(0,0,0,0.1);" title="Load last prescription for this patient">📋 Add Last IPD Prescription</button>
            </div>
          </div>

          <!-- Bottom Row: Medicine Input Fields -->
          <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:flex-end;">
            <div style="flex:3;min-width:240px;">
              <label style="font-size:10px;font-weight:700;display:block;margin-bottom:2px;">Medicine Name</label>
              <input id="ipdMedNameInp" list="ipdMedDatalist" class="form-control" placeholder="Search or type medicine..." style="font-size:11px;height:28px;padding:2px 6px;font-weight:700;width:100%;" autocomplete="off">
              <datalist id="ipdMedDatalist">
                ${medicines.map(m => `<option value="${App.escHtml(m.name || m)}">${App.escHtml(m.name || m)}</option>`).join('')}
                <option value="Inj. Pantoprazole 40mg IV">
                <option value="Inj. Ceftriaxone 1gm IV">
                <option value="Inj. Ondansetron 4mg IV">
                <option value="Inj. Paracetamol 100ml IV">
                <option value="Inj. Tramadol 50mg IV">
                <option value="Inj. Diclofenac 75mg IM">
                <option value="IV Fluid RL 500ml">
                <option value="IV Fluid NS 500ml">
                <option value="IV Fluid DNS 500ml">
                <option value="Tab. Paracetamol 650mg">
                <option value="Tab. Pantoprazole DSR">
                <option value="Tab. Amoxiclav 625mg">
                <option value="Tab. Aceclofenac + Paracetamol">
                <option value="Tab. Cefixime 200mg">
                <option value="Syp. Sucralfate 200ml">
              </datalist>
            </div>
            <div style="width:80px;">
              <label style="font-size:10px;font-weight:700;display:block;margin-bottom:2px;">Unit</label>
              <select id="ipdMedUnit" class="form-control" style="font-size:11px;height:28px;padding:2px 4px;">
                <option value="INJ.">INJ.</option>
                <option value="TAB.">TAB.</option>
                <option value="CAP.">CAP.</option>
                <option value="SYP.">SYP.</option>
                <option value="IV FLUID">IV FLUID</option>
                <option value="DROPS">DROPS</option>
                <option value="SACHET">SACHET</option>
              </select>
            </div>

            <div style="width:70px;">
              <label style="font-size:10px;font-weight:700;display:block;margin-bottom:2px;">Qty</label>
              <input id="ipdMedQty" style="font-size:11px;height:26px;width:100%;padding:2px;text-align:center;font-weight:700;border:1px solid #cbd5e1;border-radius:2px;" value="1">
            </div>
            <div style="display:flex;gap:4px;">
              <button id="ipdMedAddBtn" class="btn btn-sm btn-primary" onclick="DashboardModule._addIpdRxFromForm()" style="padding:4px 14px;font-weight:700;background:#0891b2;color:#fff;">➕ Add</button>
              <button id="ipdMedCancelEditBtn" class="btn btn-sm btn-secondary" onclick="DashboardModule._cancelIpdRxEdit()" style="display:none;padding:4px 8px;font-weight:700;">Cancel</button>
            </div>
          </div>
        </div>

        <!-- Medication List Table (3-Day Administration Chart only appears in Print) -->
        <div style="margin-bottom:4px;font-weight:800;font-size:11px;color:#334155;text-transform:uppercase;display:flex;align-items:center;justify-content:space-between;">
          <span>📋 Prescribed Medication List</span>
          <span style="font-size:10px;font-weight:600;color:#64748b;text-transform:none;">💡 Double-click any medicine row to edit &bull; 3-Day Admin Grid is on Printout</span>
        </div>
        <div style="overflow-x:auto;max-height:360px;overflow-y:auto;border:1.5px solid #0f172a;border-radius:4px;">
          <table style="width:100%;border-collapse:collapse;font-size:11px;text-align:left;">
            <thead>
              <tr style="background:#0f172a;color:#fff;">
                <th style="border:1px solid #334155;padding:6px 4px;width:35px;text-align:center;">#</th>
                <th style="border:1px solid #334155;padding:6px 12px;min-width:280px;">Medicine Name</th>
                <th style="border:1px solid #334155;padding:6px 6px;width:90px;text-align:center;">Unit</th>
                <th style="border:1px solid #334155;padding:6px 6px;width:80px;text-align:center;">Qty</th>
                <th style="border:1px solid #334155;padding:6px 4px;width:50px;text-align:center;">Action</th>
              </tr>
            </thead>
            <tbody id="ipdRxTableBody">
              <!-- Dynamically populated -->
            </tbody>
          </table>
        </div>
      </div>
    `;

    const curRound = '';

    const footer = `
      <div style="display:flex;justify-content:space-between;align-items:center;width:100%;flex-wrap:wrap;gap:10px;">
        <div style="display:flex;align-items:center;gap:12px;background:#f0f9ff;padding:5px 14px;border-radius:4px;border:1px solid #bae6fd;">
          <span style="font-weight:800;font-size:12px;color:#0369a1;">Round:</span>
          <label style="display:flex;align-items:center;gap:5px;font-size:12px;font-weight:700;color:#0f172a;cursor:pointer;">
            <input type="radio" name="ipd_round" value="morning" ${curRound === 'morning' ? 'checked' : ''} style="cursor:pointer;width:15px;height:15px;"> 🌅 Morning Round
          </label>
          <label style="display:flex;align-items:center;gap:5px;font-size:12px;font-weight:700;color:#0f172a;cursor:pointer;">
            <input type="radio" name="ipd_round" value="evening" ${curRound === 'evening' ? 'checked' : ''} style="cursor:pointer;width:15px;height:15px;"> 🌇 Evening Round
          </label>
        </div>
        <div style="display:flex;gap:8px;">
          <button class="btn btn-secondary" onclick="App.closeModal()">✕ Close</button>
          <button class="btn btn-primary" onclick="DashboardModule._printIndoor('${patientId}','${apptId}')" style="background:#0891b2;color:#fff;">🖨️ Print IPD Sheet</button>
          <button class="btn btn-success" onclick="DashboardModule._saveIndoor('${patientId}','${apptId}')" style="background:#16a34a;color:#fff;">💾 Save IPD</button>
        </div>
      </div>
    `;

    App.openModal('🏥 Indoor (IPD) Patient Record', body, footer, 'xl');
    this._renderIpdRxTable();
  },

  _activeIpdIv: { dns: false, ns: false, rl: false },

  _loadLastIpdRx(patientId) {
    const p = DB.getPatient(patientId) || {};
    if (!this._activeIpdIv) this._activeIpdIv = { dns: false, ns: false, rl: false };

    const parseAndSet = (rawItems) => {
      const meds = [];
      (rawItems || []).forEach(m => {
        const nm = String(m.name || m.medicineName || m || '').trim();
        const nmU = nm.toUpperCase();
        if (nmU.includes('DNS')) {
          this._activeIpdIv.dns = true;
        } else if (nmU.includes('NS') && !nmU.includes('DNS')) {
          this._activeIpdIv.ns = true;
        } else if (nmU.includes('RL')) {
          this._activeIpdIv.rl = true;
        } else if (!nmU.includes('IV FLUID')) {
          meds.push({
            name: nm,
            unit: m.unit || (m.dosageForm ? m.dosageForm.toUpperCase() : 'TAB.'),
            qty: String(m.qty || m.quantity || 1),
            d0_am: false,
            d0_pm: false
          });
        }
      });
      this._activeIpdRx = meds;
      this._renderIpdRxTable();
    };

    // 1. Check patient's saved IPD prescription items
    if (Array.isArray(p.ipdRxItems) && p.ipdRxItems.length > 0) {
      if (p.ipdIvFluids) this._activeIpdIv = { ...p.ipdIvFluids };
      parseAndSet(p.ipdRxItems);
      App.toast(`Loaded prescription & IV fluids! 📋✅`, 'success', 2000);
      return;
    }

    // 2. Check previous appointments for this patient
    const prevAppts = (DB.getAppointments() || []).filter(x => String(x.patientId) === String(patientId) && x.id !== this._activeIpdApptId);
    for (const pa of prevAppts) {
      if (Array.isArray(pa.ipdRxItems) && pa.ipdRxItems.length > 0) {
        if (pa.ipdIvFluids) this._activeIpdIv = { ...pa.ipdIvFluids };
        parseAndSet(pa.ipdRxItems);
        App.toast(`Loaded prescription & IV fluids from previous entry! 📋✅`, 'success', 2000);
        return;
      }
    }

    // 3. Check regular OPD prescriptions for this patient
    const rxs = (DB.getPrescriptions() || []).filter(r => String(r.patientId) === String(patientId));
    if (rxs.length > 0) {
      const lastRx = rxs[rxs.length - 1];
      const items = lastRx.items || lastRx.medicines || [];
      if (items.length > 0) {
        parseAndSet(items);
        App.toast(`Loaded prescription from last OPD visit! 📋✅`, 'success', 2000);
        return;
      }
    }

    // 4. Default standard IPD starter set
    this._activeIpdIv = { dns: false, ns: false, rl: true };
    this._activeIpdRx = [
      { name: 'Inj. Pantoprazole 40mg IV', unit: 'INJ.', qty: '1', d0_am: false, d0_pm: false },
      { name: 'Inj. Paracetamol 100ml IV', unit: 'INJ.', qty: '1', d0_am: false, d0_pm: false }
    ];
    this._renderIpdRxTable();
    App.toast('Loaded standard IPD prescription template! 📋✅', 'info', 2000);
  },

  _toggleQuickIv(type, isChecked) {
    if (!this._activeIpdIv) this._activeIpdIv = { dns: false, ns: false, rl: false };
    this._activeIpdIv[type] = isChecked;
    // Remove any accidental IV fluids from medicine list
    this._activeIpdRx = (this._activeIpdRx || []).filter(x => !String(x.name || '').toUpperCase().includes('IV FLUID'));
    this._renderIpdRxTable();
  },

  _editingIpdRxIndex: null,

  _editIpdRxItem(idx) {
    const item = this._activeIpdRx[idx];
    if (!item) return;
    this._editingIpdRxIndex = idx;

    const nameInp = document.getElementById('ipdMedNameInp');
    const unitInp = document.getElementById('ipdMedUnit');
    const qtyInp = document.getElementById('ipdMedQty');
    const btn = document.getElementById('ipdMedAddBtn');
    const cancelBtn = document.getElementById('ipdMedCancelEditBtn');

    if (nameInp) { nameInp.value = item.name || ''; nameInp.focus(); }
    if (unitInp) unitInp.value = item.unit || 'TAB.';
    if (qtyInp) qtyInp.value = item.qty != null ? item.qty : '1';
    if (btn) {
      btn.innerText = '💾 Update';
      btn.style.background = '#16a34a';
    }
    if (cancelBtn) cancelBtn.style.display = 'inline-block';

    App.toast(`Editing "${item.name}". Update details and click Save.`, 'info', 1800);
    this._renderIpdRxTable();
  },

  _cancelIpdRxEdit() {
    this._editingIpdRxIndex = null;
    const nameInp = document.getElementById('ipdMedNameInp');
    const btn = document.getElementById('ipdMedAddBtn');
    const cancelBtn = document.getElementById('ipdMedCancelEditBtn');
    if (nameInp) nameInp.value = '';
    if (btn) {
      btn.innerText = '➕ Add';
      btn.style.background = '#0891b2';
    }
    if (cancelBtn) cancelBtn.style.display = 'none';
    this._renderIpdRxTable();
  },

  _addIpdRxFromForm() {
    const nameInp = document.getElementById('ipdMedNameInp');
    const name = nameInp ? nameInp.value.trim() : '';
    if (!name) {
      App.toast('Please enter or select a medicine name', 'error');
      if (nameInp) nameInp.focus();
      return;
    }

    const unit = document.getElementById('ipdMedUnit')?.value || 'TAB.';
    const qty = document.getElementById('ipdMedQty')?.value || '1';

    if (this._editingIpdRxIndex !== null && this._editingIpdRxIndex >= 0 && this._activeIpdRx[this._editingIpdRxIndex]) {
      const prev = this._activeIpdRx[this._editingIpdRxIndex];
      this._activeIpdRx[this._editingIpdRxIndex] = {
        ...prev,
        name, unit, qty
      };
      this._editingIpdRxIndex = null;
      App.toast('Medicine updated! ✅', 'success', 1500);
    } else {
      this._activeIpdRx.push({
        name, unit, qty,
        d0_am: false, d0_pm: false
      });
      App.toast('Medicine added! ➕', 'success', 1500);
    }

    if (nameInp) { nameInp.value = ''; nameInp.focus(); }
    const btn = document.getElementById('ipdMedAddBtn');
    const cancelBtn = document.getElementById('ipdMedCancelEditBtn');
    if (btn) {
      btn.innerText = '➕ Add';
      btn.style.background = '#0891b2';
    }
    if (cancelBtn) cancelBtn.style.display = 'none';

    this._renderIpdRxTable();
  },

  _removeIpdRxItem(idx) {
    if (this._editingIpdRxIndex === idx) {
      this._cancelIpdRxEdit();
    }
    this._activeIpdRx.splice(idx, 1);
    this._renderIpdRxTable();
  },

  _onIpdCheckChange(idx, field, val) {
    if (this._activeIpdRx[idx]) {
      this._activeIpdRx[idx][field] = val;
    }
  },

  _renderIpdRxTable() {
    const tbody = document.getElementById('ipdRxTableBody');
    if (!tbody) return;

    // Sync quick IV fluid checkboxes
    const chkDns = document.getElementById('ipd_quick_dns');
    const chkNs = document.getElementById('ipd_quick_ns');
    const chkRl = document.getElementById('ipd_quick_rl');
    if (chkDns) chkDns.checked = Boolean(this._activeIpdIv?.dns);
    if (chkNs) chkNs.checked = Boolean(this._activeIpdIv?.ns);
    if (chkRl) chkRl.checked = Boolean(this._activeIpdIv?.rl);

    if (!this._activeIpdRx || this._activeIpdRx.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:16px;color:#94a3b8;font-size:12px;">No medicines added. Use the form above or click "Add Last IPD Prescription".</td></tr>`;
      return;
    }

    tbody.innerHTML = this._activeIpdRx.map((item, i) => {
      const isEditing = this._editingIpdRxIndex === i;
      const rowBg = isEditing ? '#fef9c3' : (i % 2 === 0 ? '#fff' : '#f8fafc');

      return `
        <tr ondblclick="DashboardModule._editIpdRxItem(${i})" title="Double-click to edit this medicine" style="border-bottom:1px solid #e2e8f0;background:${rowBg};cursor:pointer;${isEditing ? 'border-left:4px solid #eab308;' : ''}">
          <td style="text-align:center;font-weight:700;color:#64748b;padding:6px 4px;">${i + 1}</td>
          <td style="padding:6px 12px;font-weight:700;color:#0f172a;">
            <div>${App.escHtml(item.name)} ${isEditing ? '<span style="font-size:9px;background:#eab308;color:#000;padding:1px 4px;border-radius:2px;font-weight:800;margin-left:4px;">EDITING</span>' : ''}</div>
          </td>
          <td style="text-align:center;font-weight:700;color:#475569;padding:6px 4px;font-size:11px;">${App.escHtml(item.unit || 'TAB.')}</td>
          <td style="text-align:center;font-weight:800;color:#059669;padding:6px 4px;font-size:12px;">${App.escHtml(String(item.qty || 1))}</td>
          <td style="text-align:center;padding:6px 4px;" onclick="event.stopPropagation()">
            <button onclick="DashboardModule._removeIpdRxItem(${i})" style="border:none;background:#fee2e2;color:#ef4444;border-radius:3px;cursor:pointer;padding:2px 8px;font-size:11px;font-weight:700;" title="Delete">✕</button>
          </td>
        </tr>
      `;
    }).join('');
  },

  _calcIpdTotal() {
    const admitInp = document.getElementById('ipd_admitDate')?.value;
    const rateInp = Number(document.getElementById('ipd_bedCharge')?.value || 400);
    const calcEl = document.getElementById('ipd_days_calc');
    if (!calcEl) return;
    let days = 1;
    if (admitInp) {
      const d1 = new Date(admitInp.split('T')[0]);
      const d2 = new Date();
      const diff = Math.floor((d2 - d1) / (1000 * 60 * 60 * 24));
      days = Math.max(1, diff + 1);
    }
    const tot = days * rateInp;
    calcEl.innerText = `${days} Day(s) (min 1 day) × ₹${rateInp} = ₹${tot}`;
  },

  _saveIndoor(patientId, apptId) {
    const roundVal = document.querySelector('input[name="ipd_round"]:checked')?.value || '';
    if (!roundVal) {
      App.toast('Please select a Round (🌅 Morning Round or 🌇 Evening Round) before saving! ⚠️', 'error', 3000);
      const roundContainer = document.querySelector('input[name="ipd_round"]')?.closest('div');
      if (roundContainer) {
        roundContainer.style.border = '2px solid #ef4444';
        roundContainer.style.background = '#fef2f2';
        setTimeout(() => {
          if (roundContainer) {
            roundContainer.style.border = '1px solid #bae6fd';
            roundContainer.style.background = '#f0f9ff';
          }
        }, 3000);
      }
      return false;
    }

    const name = document.getElementById('ipd_patientName')?.value?.trim() || '';
    const mobile = document.getElementById('ipd_mobile')?.value?.trim() || '';
    const age = document.getElementById('ipd_age')?.value?.trim() || '';
    const gender = document.getElementById('ipd_gender')?.value || 'Male';
    const doctor = document.getElementById('ipd_doctor')?.value?.trim() || '';
    const ward = document.getElementById('ipd_ward')?.value || '';
    const admitDate = document.getElementById('ipd_admitDate')?.value || '';
    const bedCharge = Number(document.getElementById('ipd_bedCharge')?.value || 400);
    const morningRound = roundVal === 'morning';
    const eveningRound = roundVal === 'evening';

    const p = DB.getPatient(patientId) || {};
    const a = (DB.getAppointments() || []).find(x => String(x.id) === String(apptId)) || {};
    const newIpdDoneCount = (Number(a.ipdDoneCount || p.ipdDoneCount || 0)) + 1;
    const newAmt = newIpdDoneCount * bedCharge;

    const items = this._activeIpdRx || [];
    const ipdRxList = items.map(item => item.name);
    const ipdChecks = {};
    items.forEach((item, i) => {
      if (item.d0_am) ipdChecks[`${i}_d0_am`] = true;
      if (item.d0_pm) ipdChecks[`${i}_d0_pm`] = true;
    });

    const updateObj = {
      admitDate,
      bedChargePerDay: bedCharge,
      ipdWard: ward,
      ipdDoctor: doctor,
      ipdRound: roundVal,
      ipdMorningRound: morningRound,
      ipdEveningRound: eveningRound,
      ipdIvFluids: this._activeIpdIv || { dns: false, ns: false, rl: false },
      ipdDoneCount: newIpdDoneCount,
      ipdRxItems: items,
      ipdRxList,
      ipdChecks
    };
    if (name) updateObj.name = name;
    if (mobile) { updateObj.mobile = mobile; updateObj.phone = mobile; }
    if (age) updateObj.age = age;
    if (gender) updateObj.gender = gender;

    DB.updatePatient(patientId, updateObj);
    DB.updateAppointment(apptId, {
      patientName: name || undefined,
      indoor: true,
      type: 'Indoor',
      ward,
      admitDate,
      bedChargePerDay: bedCharge,
      ipdDoneCount: newIpdDoneCount,
      amt: newAmt
    });

    // Reset medication chart, round, prescription inputs, quantity, unit
    this._activeIpdRx = [];
    this._activeIpdIv = { dns: false, ns: false, rl: false };
    this._editingIpdRxIndex = null;
    const nameInp = document.getElementById('ipdMedNameInp');
    const unitInp = document.getElementById('ipdMedUnit');
    const qtyInp = document.getElementById('ipdMedQty');
    if (nameInp) nameInp.value = '';
    if (unitInp) unitInp.value = 'TAB.';
    if (qtyInp) qtyInp.value = '1';
    document.querySelectorAll('input[name="ipd_round"]').forEach(r => { r.checked = false; });
    const chkDns = document.getElementById('ipd_quick_dns');
    const chkNs = document.getElementById('ipd_quick_ns');
    const chkRl = document.getElementById('ipd_quick_rl');
    if (chkDns) chkDns.checked = false;
    if (chkNs) chkNs.checked = false;
    if (chkRl) chkRl.checked = false;

    App.toast('IPD prescription saved! Count & Charges updated! 🏥✅', 'success', 2000);
    App.closeModal();
    this._renderTable();
  },

  _printIndoor(patientId, apptId) {
    if (this._saveIndoor(patientId, apptId) === false) {
      return;
    }
    const p = DB.getPatient(patientId) || {};
    const settings = DB.getSettings() || {};
    const today = new Date().toLocaleDateString('en-GB');
    const ageStr = App.getAgeStr ? App.getAgeStr(p.dob) : '—';

    const ward = p.ipdWard || '—';
    const admitDate = p.admitDate || '';
    const bedCharge = p.bedChargePerDay || 400;
    let ipdDays = 1;
    if (admitDate) {
      const d1 = new Date(admitDate.split('T')[0]);
      const d2 = new Date();
      const diff = Math.floor((d2 - d1) / (1000 * 60 * 60 * 24));
      ipdDays = Math.max(1, diff + 1);
    }
    const totalBedAmt = ipdDays * bedCharge;

    // 3 dates
    const d0 = new Date();
    const d1p = new Date(d0); d1p.setDate(d1p.getDate() + 1);
    const d2p = new Date(d0); d2p.setDate(d2p.getDate() + 2);
    const fmtS = (d) => d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });

    // Filter out IV fluids from medicine table rows
    const items = (p.ipdRxItems || []).filter(x => {
      const nm = (x.name || '').toUpperCase();
      return !nm.includes('IV FLUID') && !['DNS', 'NS', 'RL'].includes(nm);
    });

    // Build print rx rows (padded up to 15 rows count)
    let printRxRows = '';
    for (let i = 0; i < 15; i++) {
      const item = items[i];
      if (item) {
        const amTick = item.d0_am ? '☑' : '☐';
        const pmTick = item.d0_pm ? '☑' : '☐';
        printRxRows += `<tr>
          <td style="border:1px solid #000;padding:2px 4px;text-align:center;font-weight:700;height:19px;">${i + 1}</td>
          <td style="border:1px solid #000;padding:2px 6px;font-weight:700;">${App.escHtml(item.name)}</td>
          <td style="border:1px solid #000;padding:2px 4px;text-align:center;font-size:9px;font-weight:700;">${App.escHtml(item.unit || 'TAB.')}</td>
          <td style="border:1px solid #000;padding:2px 4px;text-align:center;font-weight:700;">${App.escHtml(String(item.qty || 1))}</td>
          <td style="border:1px solid #000;padding:2px 4px;text-align:center;font-weight:700;font-size:13px;">${amTick}</td>
          <td style="border:1px solid #000;padding:2px 4px;text-align:center;font-weight:700;font-size:13px;">${pmTick}</td>
          <td style="border:1px solid #000;padding:2px 4px;text-align:center;">&nbsp;</td>
          <td style="border:1px solid #000;padding:2px 4px;text-align:center;">&nbsp;</td>
          <td style="border:1px solid #000;padding:2px 4px;text-align:center;">&nbsp;</td>
          <td style="border:1px solid #000;padding:2px 4px;text-align:center;">&nbsp;</td>
        </tr>`;
      } else {
        // Blank row padding up to 15 count
        printRxRows += `<tr>
          <td style="border:1px solid #000;padding:2px 4px;text-align:center;font-weight:700;color:#555;height:19px;">${i + 1}</td>
          <td style="border:1px solid #000;padding:2px 6px;">&nbsp;</td>
          <td style="border:1px solid #000;padding:2px 4px;text-align:center;">&nbsp;</td>
          <td style="border:1px solid #000;padding:2px 4px;text-align:center;">&nbsp;</td>
          <td style="border:1px solid #000;padding:2px 4px;text-align:center;">&nbsp;</td>
          <td style="border:1px solid #000;padding:2px 4px;text-align:center;">&nbsp;</td>
          <td style="border:1px solid #000;padding:2px 4px;text-align:center;">&nbsp;</td>
          <td style="border:1px solid #000;padding:2px 4px;text-align:center;">&nbsp;</td>
          <td style="border:1px solid #000;padding:2px 4px;text-align:center;">&nbsp;</td>
          <td style="border:1px solid #000;padding:2px 4px;text-align:center;">&nbsp;</td>
        </tr>`;
      }
    }

    const iv = p.ipdIvFluids || this._activeIpdIv || {};
    const hasDns = Boolean(iv.dns);
    const hasNs = Boolean(iv.ns);
    const hasRl = Boolean(iv.rl);

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>INDOOR REPORT - ${p.name || ''}</title>
  <style>
    * { box-sizing:border-box;margin:0;padding:0; }
    body { font-family:Arial,sans-serif;font-size:11px;color:#000;background:#fff;padding:6mm 6mm; }
    .report-heading { text-align:center;font-size:13px;font-weight:900;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:6px;border-bottom:2px solid #000;padding-bottom:3px; }
    .info-grid { display:grid;grid-template-columns:1fr 1fr;gap:3px 14px;border:1.5px solid #000;padding:5px 10px;border-radius:2px;margin-bottom:6px; }
    .info-grid div { font-size:10px;font-weight:700; }
    .iv-box { display:flex;align-items:center;gap:24px;border:1.5px solid #000;padding:4px 12px;border-radius:2px;margin-bottom:6px;font-size:10px;font-weight:700; }
    .rx-table { width:100%;border-collapse:collapse;margin-bottom:6px; }
    .rx-table th { font-size:9px;font-weight:800;text-transform:uppercase; }
    .rx-table td { font-size:10px; }
    @media print { @page { size:A5 portrait;margin:0mm; } body { padding:4mm 4mm; } }
  </style>
</head>
<body>
  <div class="report-heading">:: INDOOR REPORT ::</div>

  <div class="info-grid">
    <div>Patient : <span>${App.escHtml(p.name || '—')}</span></div>
    <div>P.ID : <span>${App.escHtml(String(patientId))}</span></div>
    <div>Age / Gender : <span>${ageStr} / ${App.escHtml(p.gender || '—')}</span></div>
    <div>Mobile : <span>${App.escHtml(p.mobile || p.phone || '—')}</span></div>
    <div>Doctor : <span>${App.escHtml(settings.doctorName || '—')}</span></div>
    <div>Admit Date : <span>${admitDate ? admitDate.split('-').reverse().join('/') : today}</span></div>
  </div>

  <div class="iv-box">
    <span style="font-weight:900;">IV FLUIDS:</span>
    <span style="display:inline-flex;align-items:center;gap:5px;font-size:11px;">${hasDns ? '☑' : '☐'} DNS</span>
    <span style="display:inline-flex;align-items:center;gap:5px;font-size:11px;">${hasNs ? '☑' : '☐'} NS</span>
    <span style="display:inline-flex;align-items:center;gap:5px;font-size:11px;">${hasRl ? '☑' : '☐'} RL</span>
  </div>

  <table class="rx-table">
    <thead>
      <tr style="background:#000;color:#fff;">
        <th rowspan="2" style="border:1px solid #000;padding:3px;width:24px;">#</th>
        <th rowspan="2" style="border:1px solid #000;padding:3px 6px;text-align:left;min-width:140px;">Medicine Name</th>
        <th rowspan="2" style="border:1px solid #000;padding:3px;width:45px;">Unit</th>
        <th rowspan="2" style="border:1px solid #000;padding:3px;width:35px;">Qty</th>
        <th colspan="2" style="border:1px solid #000;padding:2px;text-align:center;">${fmtS(d0)}</th>
        <th colspan="2" style="border:1px solid #000;padding:2px;text-align:center;">${fmtS(d1p)}</th>
        <th colspan="2" style="border:1px solid #000;padding:2px;text-align:center;">${fmtS(d2p)}</th>
      </tr>
      <tr style="background:#333;color:#fff;font-size:8px;">
        <th style="border:1px solid #000;padding:2px;text-align:center;width:28px;">AM</th>
        <th style="border:1px solid #000;padding:2px;text-align:center;width:28px;">PM</th>
        <th style="border:1px solid #000;padding:2px;text-align:center;width:28px;">AM</th>
        <th style="border:1px solid #000;padding:2px;text-align:center;width:28px;">PM</th>
        <th style="border:1px solid #000;padding:2px;text-align:center;width:28px;">AM</th>
        <th style="border:1px solid #000;padding:2px;text-align:center;width:28px;">PM</th>
      </tr>
    </thead>
    <tbody>
      ${printRxRows}
    </tbody>
  </table>

  <script>window.onload=function(){setTimeout(function(){window.print();},300);};<\/script>
</body>
</html>`;

    let pw = null;
    try { pw = window.open('', '_blank', 'width=850,height=950'); } catch (e) { }
    if (pw && !pw.closed) { pw.document.write(html); pw.document.close(); }
    App.closeModal();
    this._renderTable();
  },

  _renderSummary() {
    if (this._topTab !== 'doctor') return;
    const el = document.getElementById('opdDashSummary');
    if (!el) return;

    const date = this._getDate();
    const appts = DB.getAppointments().filter(a => a.date === date);
    const invoices = DB.getInvoices() || [];
    const opdEntries = (DB.getOpdEntries ? DB.getOpdEntries() : []).filter(e => e.date === date);
    const patients = DB.getPatients() || [];

    const total = appts.length;
    const done = appts.filter(a => a.status === 'completed').length;
    const pending = appts.filter(a => a.status === 'scheduled').length;
    const cancelled = appts.filter(a => a.status === 'cancelled').length;

    // Calculate Reception OPD Collection (Cash vs Online/UPI)
    let cashCollected = 0;
    let onlineCollected = 0;
    let outstanding = 0;

    const countedApptIds = new Set();

    appts.forEach(a => {
      const isPaid = a.opdPaid != null ? Boolean(a.opdPaid) : (a.paid != null ? Boolean(a.paid) : false);
      const fee = Number(a.originalFee || a.fee || (a.amt && Number(a.amt) > 0 ? a.amt : null) || 100);

      if (isPaid) {
        countedApptIds.add(String(a.id));
        const inv = invoices.find(i => String(i.patientId) === String(a.patientId) && String(i.appointmentId) === String(a.id));
        const mode = String(a.paymentMode || a.payMode || (inv ? inv.paymentMode : '') || 'Cash').toLowerCase();

        if (mode.includes('upi') || mode.includes('bank') || mode.includes('online') || mode.includes('card') || mode.includes('qr')) {
          onlineCollected += fee;
        } else {
          cashCollected += fee;
        }
      } else if (a.status !== 'cancelled') {
        outstanding += fee;
      }
    });

    // Also include any standalone reception OPD entries for today
    opdEntries.forEach(e => {
      if (!e.appointmentId || !countedApptIds.has(String(e.appointmentId))) {
        const amt = Number(e.amount || 100);
        const mode = String(e.payMode || e.paymentMode || 'Cash').toLowerCase();
        if (mode.includes('upi') || mode.includes('bank') || mode.includes('online') || mode.includes('card') || mode.includes('qr')) {
          onlineCollected += amt;
        } else {
          cashCollected += amt;
        }
      }
    });

    const totalCollected = cashCollected + onlineCollected;

    el.innerHTML = `
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:var(--gap-sm);padding:var(--gap-sm) 0;">
        <div class="opd-summary-item teal">
          <div class="opd-sum-val">${total}</div>
          <div class="opd-sum-label">Total OPD</div>
        </div>
        <div class="opd-summary-item green">
          <div class="opd-sum-val">${done}</div>
          <div class="opd-sum-label">Completed</div>
        </div>
        <div class="opd-summary-item amber">
          <div class="opd-sum-val">${pending}</div>
          <div class="opd-sum-label">Pending</div>
        </div>
        <div class="opd-summary-item red">
          <div class="opd-sum-val">${cancelled}</div>
          <div class="opd-sum-label">Cancelled</div>
        </div>
        <div class="opd-summary-item indigo">
          <div class="opd-sum-val">${patients.length}</div>
          <div class="opd-sum-label">Total Patients</div>
        </div>
        <div class="opd-summary-item green" style="cursor:pointer;border:1.5px solid #86efac;background:#f0fdf4;" onclick="DashboardModule.openCollectedTodayModal()" title="Click to view Cash vs Online breakdown & patient collection details">
          <div class="opd-sum-val" style="color:#16a34a;">₹${totalCollected.toFixed(0)}</div>
          <div class="opd-sum-label" style="font-weight:800;color:#166534;">Collected Today 🔍</div>
        </div>
        <div class="opd-summary-item amber" style="cursor:pointer;border:1.5px solid #fde68a;background:#fffbeb;" onclick="DashboardModule.openOutstandingModal()" title="Click to view Outstanding / Unpaid patient breakdown & collect payments">
          <div class="opd-sum-val" style="color:#d97706;">₹${outstanding.toFixed(0)}</div>
          <div class="opd-sum-label" style="font-weight:800;color:#92400e;">Outstanding 🔍</div>
        </div>
      </div>
    `;
  },

  /* ⚠️ Today's Outstanding / Unpaid OPD Breakdown Modal */
  openOutstandingModal() {
    try {
      const date = this._getDate();
      const appts = DB.getAppointments().filter(a => a.date === date);
      const unpaidList = [];
      let totalOutstanding = 0;

      appts.forEach((a, idx) => {
        const isPaid = a.opdPaid != null ? Boolean(a.opdPaid) : (a.paid != null ? Boolean(a.paid) : false);
        const fee = Number(a.originalFee || a.fee || (a.amt && Number(a.amt) > 0 ? a.amt : null) || 100);

        if (!isPaid && a.status !== 'cancelled') {
          totalOutstanding += fee;
          unpaidList.push({
            id: a.id,
            token: typeof _opdNo === 'function' ? _opdNo(a) : (idx + 1),
            patientId: a.patientId,
            patientName: a.patientName || 'Patient',
            fee: fee,
            time: a.time || '—',
            drName: a.doctorName || 'DR. YASH VAGHANI'
          });
        }
      });

      const body = `
      <div style="font-family:sans-serif;font-size:12px;color:#1e293b;padding:2px 0;">
        <!-- Top Stats Banner -->
        <div style="display:grid;grid-template-columns:1.5fr 1fr;gap:10px;margin-bottom:14px;">
          <div style="background:#fffbeb;border:1.5px solid #fde68a;border-radius:6px;padding:10px 14px;text-align:center;">
            <div style="font-size:11px;font-weight:800;color:#92400e;text-transform:uppercase;">⚠️ Total Outstanding / Unpaid Fee</div>
            <div style="font-size:22px;font-weight:900;color:#d97706;margin-top:2px;">₹${totalOutstanding.toFixed(0)}</div>
          </div>
          <div style="background:#fef2f2;border:1.5px solid #fecaca;border-radius:6px;padding:10px 14px;text-align:center;">
            <div style="font-size:11px;font-weight:800;color:#991b1b;text-transform:uppercase;">👥 Unpaid Patients Count</div>
            <div style="font-size:22px;font-weight:900;color:#dc2626;margin-top:2px;">${unpaidList.length}</div>
          </div>
        </div>

        <!-- Unpaid List Table -->
        <div style="border:1.5px solid #cbd5e1;border-radius:6px;overflow:hidden;margin-bottom:8px;">
          <div style="background:#f1f5f9;padding:6px 10px;font-weight:800;font-size:11px;color:#0f172a;border-bottom:1px solid #cbd5e1;display:flex;justify-content:space-between;align-items:center;">
            <span>⚠️ Today's Outstanding / Unpaid Patients (${unpaidList.length})</span>
            <span style="color:#64748b;">Date: ${date.split('-').reverse().join('/')}</span>
          </div>
          <div style="max-height:280px;overflow-y:auto;">
            <table class="win-table" style="font-size:11px;margin:0;width:100%;">
              <thead>
                <tr style="background:#f8fafc;">
                  <th style="width:40px;text-align:center;">Token</th>
                  <th style="width:50px;text-align:center;">Pt ID</th>
                  <th>Patient Name</th>
                  <th style="width:75px;text-align:center;">Time</th>
                  <th style="width:85px;text-align:right;">Pending Amt</th>
                  <th style="width:100px;text-align:center;">Actions</th>
                </tr>
              </thead>
              <tbody>
                ${unpaidList.length === 0 ? `<tr><td colspan="6" style="text-align:center;padding:16px;color:#16a34a;font-weight:700;">🎉 All OPD fees for today are fully paid! No outstanding balance.</td></tr>` : unpaidList.map(p => `
                  <tr style="border-bottom:1px solid #e2e8f0;">
                    <td style="text-align:center;font-weight:800;color:#004899;">${App.escHtml(String(p.token))}</td>
                    <td style="text-align:center;font-weight:700;">#${App.escHtml(String(p.patientId))}</td>
                    <td style="font-weight:700;color:#0f172a;">${App.escHtml(p.patientName)}</td>
                    <td style="text-align:center;color:#64748b;font-weight:600;">${App.escHtml(p.time)}</td>
                    <td style="text-align:right;font-weight:900;color:#dc2626;font-size:12px;">₹${p.fee.toFixed(2)}</td>
                    <td style="text-align:center;">
                      <button class="btn btn-sm btn-success" style="padding:2px 8px;font-size:10.5px;font-weight:800;" onclick="App.closeModal();DashboardModule.openPaymentModal('${p.patientId}','${p.id}','${p.fee}')" title="Collect Payment">💵 Collect</button>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
              ${unpaidList.length > 0 ? `
              <tfoot>
                <tr style="background:#f8fafc;font-weight:900;border-top:1.5px solid #cbd5e1;">
                  <td colspan="4" style="text-align:right;padding:6px 10px;font-size:12px;">Total Outstanding:</td>
                  <td style="text-align:right;padding:6px 10px;color:#dc2626;font-size:13px;">₹${totalOutstanding.toFixed(2)}</td>
                  <td></td>
                </tr>
              </tfoot>
              ` : ''}
            </table>
          </div>
        </div>
      </div>
      `;

      const footer = `
      <div style="display:flex;justify-content:space-between;width:100%;align-items:center;">
        <button class="btn btn-secondary" onclick="App.closeModal()" style="font-weight:700;">✕ Close</button>
        <button class="btn btn-primary" onclick="navigateTo('billing');App.closeModal();" style="background:#d97706;border-color:#b45309;color:#fff;font-weight:800;padding:6px 16px;">💳 View Billing Module</button>
      </div>
      `;

      App.openModal('⚠️ Today\'s Outstanding / Unpaid OPD Breakdown', body, footer, 'lg');
    } catch (e) {
      console.error(e);
      App.toast('Error opening outstanding details: ' + e.message, 'error');
    }
  },

  /* 💰 Today's Reception OPD Collection Breakdown Modal */
  openCollectedTodayModal() {
    try {
      const date = this._getDate();
      const appts = DB.getAppointments().filter(a => a.date === date);
      const invoices = DB.getInvoices() || [];
      const opdEntries = (DB.getOpdEntries ? DB.getOpdEntries() : []).filter(e => e.date === date);

      let cashCollected = 0;
      let onlineCollected = 0;
      const paidList = [];
      const countedApptIds = new Set();

      appts.forEach((a, idx) => {
        const isPaid = a.opdPaid != null ? Boolean(a.opdPaid) : (a.paid != null ? Boolean(a.paid) : false);
        const fee = Number(a.originalFee || a.fee || (a.amt && Number(a.amt) > 0 ? a.amt : null) || 100);

        if (isPaid) {
          countedApptIds.add(String(a.id));
          const inv = invoices.find(i => String(i.patientId) === String(a.patientId) && String(i.appointmentId) === String(a.id));
          const rawMode = a.paymentMode || a.payMode || (inv ? inv.paymentMode : '') || 'Cash';
          const modeLower = String(rawMode).toLowerCase();
          const isOnline = modeLower.includes('upi') || modeLower.includes('bank') || modeLower.includes('online') || modeLower.includes('card') || modeLower.includes('qr');

          if (isOnline) {
            onlineCollected += fee;
          } else {
            cashCollected += fee;
          }

          paidList.push({
            token: typeof _opdNo === 'function' ? _opdNo(a) : (idx + 1),
            patientId: a.patientId,
            patientName: a.patientName,
            fee: fee,
            mode: isOnline ? 'UPI / Online' : 'Cash',
            time: a.time || '—',
            drName: a.doctorName || 'DR. YASH VAGHANI',
            isOnline: isOnline
          });
        }
      });

      // Standalone entries
      opdEntries.forEach((e, idx) => {
        if (!e.appointmentId || !countedApptIds.has(String(e.appointmentId))) {
          const amt = Number(e.amount || 100);
          const rawMode = e.payMode || e.paymentMode || 'Cash';
          const modeLower = String(rawMode).toLowerCase();
          const isOnline = modeLower.includes('upi') || modeLower.includes('bank') || modeLower.includes('online') || modeLower.includes('card') || modeLower.includes('qr');

          if (isOnline) {
            onlineCollected += amt;
          } else {
            cashCollected += amt;
          }

          paidList.push({
            token: e.opdNo || `OPD-${idx + 1}`,
            patientId: e.patientId || '—',
            patientName: e.patientName || 'Walk-in Patient',
            fee: amt,
            mode: isOnline ? 'UPI / Online' : 'Cash',
            time: e.time || (e.createdAt ? new Date(e.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'),
            drName: e.doctorName || 'DR. YASH VAGHANI',
            isOnline: isOnline
          });
        }
      });

      const totalCollected = cashCollected + onlineCollected;

      const body = `
      <div style="font-family:sans-serif;font-size:12px;color:#1e293b;padding:2px 0;">
        <!-- Top Stats Breakdown -->
        <div style="display:grid;grid-template-columns:1.2fr 1fr 1fr;gap:10px;margin-bottom:14px;">
          <div style="background:#f0fdf4;border:1.5px solid #86efac;border-radius:6px;padding:10px 14px;text-align:center;">
            <div style="font-size:11px;font-weight:800;color:#166534;text-transform:uppercase;">💰 Total Reception Collection</div>
            <div style="font-size:22px;font-weight:900;color:#15803d;margin-top:2px;">₹${totalCollected.toFixed(0)}</div>
          </div>
          <div style="background:#ecfdf5;border:1.5px solid #a7f3d0;border-radius:6px;padding:10px 14px;text-align:center;">
            <div style="font-size:11px;font-weight:800;color:#047857;text-transform:uppercase;">💵 Cash Collection</div>
            <div style="font-size:22px;font-weight:900;color:#059669;margin-top:2px;">₹${cashCollected.toFixed(0)}</div>
          </div>
          <div style="background:#eff6ff;border:1.5px solid #bfdbfe;border-radius:6px;padding:10px 14px;text-align:center;">
            <div style="font-size:11px;font-weight:800;color:#1e40af;text-transform:uppercase;">📱 Online / UPI Collection</div>
            <div style="font-size:22px;font-weight:900;color:#2563eb;margin-top:2px;">₹${onlineCollected.toFixed(0)}</div>
          </div>
        </div>

        <!-- Collection Table -->
        <div style="border:1.5px solid #cbd5e1;border-radius:6px;overflow:hidden;margin-bottom:8px;">
          <div style="background:#f1f5f9;padding:6px 10px;font-weight:800;font-size:11px;color:#0f172a;border-bottom:1px solid #cbd5e1;display:flex;justify-content:space-between;">
            <span>📋 Today's Reception OPD Paid Patients (${paidList.length})</span>
            <span style="color:#64748b;">Date: ${date.split('-').reverse().join('/')}</span>
          </div>
          <div style="max-height:260px;overflow-y:auto;">
            <table class="win-table" style="font-size:11px;margin:0;width:100%;">
              <thead>
                <tr style="background:#f8fafc;">
                  <th style="width:40px;text-align:center;">Token</th>
                  <th style="width:50px;text-align:center;">Pt ID</th>
                  <th>Patient Name</th>
                  <th style="width:85px;text-align:center;">Mode</th>
                  <th style="width:70px;text-align:center;">Time</th>
                  <th style="width:80px;text-align:right;">Amount</th>
                </tr>
              </thead>
              <tbody>
                ${paidList.length === 0 ? `<tr><td colspan="6" style="text-align:center;padding:14px;color:#64748b;font-style:italic;">No payments collected today yet.</td></tr>` : paidList.map(p => `
                  <tr style="border-bottom:1px solid #e2e8f0;">
                    <td style="text-align:center;font-weight:800;color:#004899;">${App.escHtml(String(p.token))}</td>
                    <td style="text-align:center;font-weight:700;">#${App.escHtml(String(p.patientId))}</td>
                    <td style="font-weight:700;color:#0f172a;">${App.escHtml(p.patientName)}</td>
                    <td style="text-align:center;">
                      <span style="font-size:10px;font-weight:800;padding:2px 6px;border-radius:3px;${p.isOnline ? 'background:#dbeafe;color:#1e40af;border:1px solid #bfdbfe;' : 'background:#dcfce7;color:#166534;border:1px solid #bbf7d0;'}">
                        ${p.isOnline ? '📱 Online/UPI' : '💵 Cash'}
                      </span>
                    </td>
                    <td style="text-align:center;color:#64748b;font-weight:600;">${App.escHtml(p.time)}</td>
                    <td style="text-align:right;font-weight:800;color:#15803d;font-size:12px;">₹${p.fee.toFixed(2)}</td>
                  </tr>
                `).join('')}
              </tbody>
              ${paidList.length > 0 ? `
              <tfoot>
                <tr style="background:#f8fafc;font-weight:900;border-top:1.5px solid #cbd5e1;">
                  <td colspan="5" style="text-align:right;padding:6px 10px;font-size:12px;">Total Collected:</td>
                  <td style="text-align:right;padding:6px 10px;color:#15803d;font-size:13px;">₹${totalCollected.toFixed(2)}</td>
                </tr>
              </tfoot>
              ` : ''}
            </table>
          </div>
        </div>
      </div>
    `;

      const footer = `
      <div style="display:flex;justify-content:space-between;width:100%;align-items:center;">
        <button class="btn btn-secondary" onclick="App.closeModal()" style="font-weight:700;">✕ Close</button>
        <button class="btn btn-primary" onclick="navigateTo('opd');App.closeModal();" style="background:#0891b2;color:#fff;font-weight:800;padding:6px 16px;">🏥 View All OPD Collections</button>
      </div>
    `;

      App.openModal('💰 Today\'s Reception OPD Collection Breakdown', body, footer, 'lg');
    } catch (e) {
      console.error(e);
      App.toast('Error opening collection details: ' + e.message, 'error');
    }
  },

  /* ── Patient History Entry Modal (Exact Desktop Software Match) ── */
  openPatientHistoryModal(patientId, opdNoStr, apptId, initialTab = 'tab1') {
    this._setupModalKeyListeners();
    this._initialHistoryTab = initialTab;
    const strId = String(patientId || '1');
    const p = DB.getPatient(strId) || (DB.getPatients() || [])[0] || { id: strId, name: 'VIPULBHAI NANUBHAI DOBARIYA', dob: '1985-01-01', gender: 'Male', phone: '9428619900' };

    const isSamePatient = String(this._activePatientId) === strId;

    if (!isSamePatient) {
      this._complaintsList = p.savedComplaints && Array.isArray(p.savedComplaints) ? [...p.savedComplaints] : [];
      this._examList = p.savedExam && Array.isArray(p.savedExam) ? [...p.savedExam] : [];
      this._diagList = []; // Default blank: start fresh without pre-filling diagnosis before consultation!
      this._procList = []; // Default blank: start fresh unless doctor adds procedure
      this._rxList = []; // Default blank: start fresh unless doctor clicks 'Add Last OPD Prescription'
      this._labList = (p.savedLab && Array.isArray(p.savedLab)) ? p.savedLab.map(l => ({
        inv: l.inv || l.name || l.investigation || l.reportName || 'Lab Test',
        name: l.name || l.inv || l.investigation || l.reportName || 'Lab Test',
        lab: l.lab || l.labName || 'Main Parth Pathology',
        labName: l.lab || l.labName || 'Main Parth Pathology',
        rs: l.rs || l.amt || 100,
        receive: Boolean(l.receive || l.done),
        done: Boolean(l.receive || l.done),
        date: l.date || ''
      })) : [];
      this._radioList = p.savedRadio && Array.isArray(p.savedRadio) ? [...p.savedRadio] : [];
      this._reportList = p.savedReportList && Array.isArray(p.savedReportList) ? [...p.savedReportList] : [];
    } else {
      if ((!this._complaintsList || this._complaintsList.length === 0) && p.savedComplaints) this._complaintsList = [...p.savedComplaints];
      if ((!this._examList || this._examList.length === 0) && p.savedExam) this._examList = [...p.savedExam];
      if (!this._diagList) this._diagList = [];
      if (!this._procList) this._procList = [];
      if (!this._rxList) this._rxList = [];
      if ((!this._labList || this._labList.length === 0) && p.savedLab) {
        this._labList = p.savedLab.map(l => ({
          inv: l.inv || l.name || l.investigation || l.reportName || 'Lab Test',
          name: l.name || l.inv || l.investigation || l.reportName || 'Lab Test',
          lab: l.lab || l.labName || 'Main Parth Pathology',
          labName: l.lab || l.labName || 'Main Parth Pathology',
          rs: l.rs || l.amt || 100,
          receive: Boolean(l.receive || l.done),
          done: Boolean(l.receive || l.done),
          date: l.date || ''
        }));
      }
      if ((!this._radioList || this._radioList.length === 0) && p.savedRadio) this._radioList = [...p.savedRadio];
      if ((!this._reportList || this._reportList.length === 0) && p.savedReportList) this._reportList = [...p.savedReportList];
    }

    // Sync any ordered lab reports for this patient into this._labList & this._reportList
    const allLabReports = JSON.parse(localStorage.getItem('clinic_lab_reports') || '[]');
    const patientLabReports = allLabReports.filter(r => String(r.patientId) === strId);
    patientLabReports.forEach(r => {
      const existsInLab = (this._labList || []).some(l => (l.name === r.reportName || l.inv === r.reportName || l.investigation === r.reportName) && (l.lab === r.labName || l.labName === r.labName));
      if (!existsInLab) {
        if (!this._labList) this._labList = [];
        this._labList.push({
          inv: r.reportName,
          name: r.reportName,
          investigation: r.reportName,
          lab: r.labName || 'Main Parth Pathology',
          labName: r.labName || 'Main Parth Pathology',
          rs: r.amt || 100,
          pAmt: r.paid ? (r.amt || 100) : 0,
          receive: Boolean(r.done || r.receive),
          done: Boolean(r.done || r.receive),
          date: r.date ? (r.date.includes('-') ? r.date.split('-').reverse().join('/') : r.date) : ''
        });
      }
      const existsInRep = (this._reportList || []).some(rp => (rp.name === r.reportName || rp.report === r.reportName || rp.rep === r.reportName));
      if (!existsInRep) {
        if (!this._reportList) this._reportList = [];
        this._reportList.push({
          rep: r.reportName,
          name: r.reportName,
          report: r.reportName,
          res: r.done ? 'Normal / Completed' : 'Pending',
          result: r.done ? 'Normal / Completed' : 'Pending',
          unit: '—',
          rem: `Lab: ${r.labName || 'Main Parth Pathology'} | ₹${r.amt || 100}`
        });
      }
    });

    this._selectedComplainIndex = null;
    this._selectedExamIndex = null;
    this._selectedDiagIndex = null;
    this._selectedProcIndex = null;
    this._selectedRxIndex = null;

    const visits = DB.getVisits().filter(v => String(v.patientId) === strId);
    const rxs = DB.getPrescriptions().filter(r => String(r.patientId) === strId);
    const invs = DB.getInvoices().filter(i => String(i.patientId) === strId);

    const paidInv = invs.find(i => i.status === 'paid');
    const unpaidInv = invs.find(i => i.status === 'unpaid');

    const charges = DB.getCharges() || [];
    const groupCategories = [...new Set(charges.map(c => c.category || c.name))];
    if (!groupCategories.includes('GP-1')) groupCategories.unshift('GP-1');
    if (!groupCategories.includes('GP-2')) groupCategories.unshift('GP-2');

    // Find appointment if available
    const appt = apptId
      ? (DB.getAppointments().find(a => String(a.id) === String(apptId)) || null)
      : (DB.getAppointments().find(a => String(a.patientId) === strId) || null);
    const activeCaseType = p.caseType || (appt ? appt.caseType : '') || (charges[0] ? charges[0].name : 'NEW OPD CONSULTATION');
    const matchedCharge = charges.find(c => String(c.name).toUpperCase() === String(activeCaseType).toUpperCase()) || charges[0] || { amount: 100 };
    const chargeAmt = matchedCharge ? (matchedCharge.amount || 100) : 100;
    const activeGroup = p.group || matchedCharge.category || 'GP-2';

    const paidAmt = paidInv ? paidInv.total : 0;
    const pendingAmt = unpaidInv ? unpaidInv.total : 0;

    const latestVisit = visits.length > 0 ? visits[visits.length - 1] : {};
    const vitals = latestVisit.vitals || {};
    const todayStr = new Date().toLocaleDateString('en-GB');
    const currentDiagStr = (this._diagList && this._diagList.length > 0)
      ? this._diagList.map(d => d.name || d.diag).filter(Boolean).join(', ')
      : '';

    const body = `
      <!-- Title & Control Bar -->
      <div class="win-title-bar">
        <div>
          <button class="win-act-btn" style="padding:2px 8px;font-size:11px;font-weight:800;" onclick="DashboardModule._navigateVisit(-1)" title="Previous Visit Date">&lt;&lt;</button>
          <button class="win-act-btn" style="padding:2px 8px;font-size:11px;font-weight:800;" onclick="DashboardModule._navigateVisit(1)" title="Next Visit Date">&gt;&gt;</button>
        </div>
        <div style="font-weight:800;font-size:13px;letter-spacing:0.5px;">Patient History Entry</div>
        <div>
          <button class="win-act-btn" style="padding:2px 8px;font-size:11px;font-weight:700;" onclick="DashboardModule.openPreviousPatientDataHistoryModal()">Previous Patient Data History</button>
          <button class="win-act-btn" style="padding:2px 8px;font-size:11px;font-weight:700;" onclick="DashboardModule._showAllHistoryModal()">All History</button>
        </div>
      </div>

      <!-- Fields Grid Row 1-3 -->
      <div class="win-fields-grid">
        <div class="win-field-item">
          <label>Patient ID :</label>
          <input value="${p.id || '1'}">
        </div>
        <div class="win-field-item">
          <label>OPD No :</label>
          <input value="${opdNoStr || '47369'}">
        </div>
        <div class="win-field-item" style="grid-column: span 2;">
          <label>Patient :</label>
          <input value="${App.escHtml(p.name)}" style="font-weight:700;">
        </div>
        <div class="win-field-item">
          <label>Sex :</label>
          <select><option>${App.escHtml(p.gender || 'MALE').toUpperCase()}</option></select>
        </div>
        <div class="win-field-item">
          <label>Group :</label>
          <select id="winHeaderGroup" onchange="DashboardModule._onHistoryGroupChange(this.value)">
            ${groupCategories.map(g => `<option value="${App.escHtml(g)}" ${String(g).toUpperCase() === String(activeGroup).toUpperCase() ? 'selected' : ''}>${App.escHtml(g)}</option>`).join('')}
          </select>
        </div>
        <div class="win-field-item">
          <button class="win-act-btn" style="padding:2px 8px;font-size:10px;background:var(--success);color:#fff;" onclick="PatientsModule.openAddModal('${p.id || ''}')">Patient Entry</button>
        </div>

        <div class="win-field-item" style="grid-column: span 2;">
          <label>Complaints :</label>
          <input id="winHeaderComplaints" value="${App.escHtml(p.savedComplaintsHeader || '')}" placeholder="">
        </div>
        <div class="win-field-item">
          <label>Weight :</label>
          <input id="winHeaderWeight" value="${p.weight ? p.weight + (String(p.weight).toLowerCase().includes('kg') ? '' : ' Kg') : (vitals.weight ? vitals.weight + (String(vitals.weight).toLowerCase().includes('kg') ? '' : ' Kg') : '64.2 Kg')}" placeholder="e.g. 64 Kg">
        </div>
        <div class="win-field-item">
          <label>Age :</label>
          <input id="winHeaderAge" readonly value="${App.formatAge(p.dob)}" placeholder="Age">
        </div>
        <div class="win-field-item">
          <label>BMI :</label>
          <input id="winHeaderBmi" value="0">
        </div>
        <div class="win-field-item">
          <input value="${todayStr}">
        </div>
        <div class="win-field-item" style="grid-column: span 2;">
          <label>Diagnosis :</label>
          <input id="winHeaderDiagnosis" value="${App.escHtml(currentDiagStr)}" placeholder="" oninput="DashboardModule._onHeaderDiagnosisInput(this.value)">
        </div>

        <div class="win-field-item">
          <label>Case :</label>
          <select id="winHeaderCaseType" onchange="DashboardModule._onHistoryCaseTypeChange(this.value)">
            ${charges.map(c => `<option value="${App.escHtml(c.name)}" ${String(c.name).toUpperCase() === String(activeCaseType).toUpperCase() ? 'selected' : ''}>${App.escHtml(c.name)}</option>`).join('')}
          </select>
        </div>
        <div class="win-field-item">
          <label>File Rs :</label>
          <input id="winHeaderFileRs" value="${chargeAmt}">
        </div>
        <div class="win-field-item">
          <label>Net Amt :</label>
          <input id="winHeaderNetAmt" value="${chargeAmt}" style="font-weight:700;color:var(--primary);">
        </div>
        <div class="win-field-item">
          <label>Paid :</label>
          <input value="${paidAmt}" style="font-weight:700;color:var(--success);">
        </div>
        <div class="win-field-item">
          <label>Pending :</label>
          <input value="${pendingAmt}" style="color:var(--warning);">
        </div>
        <div class="win-field-item">
          <button class="win-act-btn" style="padding:2px 6px;font-size:10px;">Paid</button>
        </div>
        <div class="win-field-item">
          <label>Pre Pending :</label>
          <input value="0.00">
          <button class="win-act-btn" style="padding:2px 4px;font-size:10px;">View</button>
        </div>
        <div class="win-field-item" style="grid-column: span 2;">
          <label>Mob No :</label>
          <input maxlength="10" placeholder="10-digit mobile number" value="${App.escHtml((p.phone || '').replace(/\D/g, '').slice(0, 10))}" oninput="this.value=this.value.replace(/\D/g,'').slice(0,10)">
        </div>
      </div>

      <!-- Colored Multi-Tab Header Bar -->
      <div class="win-tab-colored-bar">
        <button class="win-ctab t-green active" id="tabBtn1" onclick="DashboardModule._switchWinTab('tab1')">History & Examination</button>
        <button class="win-ctab t-yellow"        id="tabBtn2" onclick="DashboardModule._switchWinTab('tab2')">Investigation & Report</button>
        <button class="win-ctab t-pink"          id="tabBtn3" onclick="DashboardModule._switchWinTab('tab3')">Diagnosis & Procedure</button>
        <button class="win-ctab t-blue"          id="tabBtn4" onclick="DashboardModule._switchWinTab('tab4')">Out Side Prescription</button>
        <button class="win-ctab t-red"           id="tabBtn5" onclick="DashboardModule._switchWinTab('tab5')">Extra Advise</button>
      </div>

      <!-- Tab Content Panels (Switchable) -->
      <div id="winTabPanels">

        <!-- Tab 1 Panel (History & Examination - DEFAULT ACTIVE TAB) -->
        <div id="winPanelTab1" class="win-panels-grid">
          
          <!-- Panel 1: Complaints & History (Exact Image Match) -->
          <div class="win-panel-box">
            <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;">
              <button class="win-act-btn" style="padding:2px 8px;font-size:10px;" onclick="DashboardModule._addLastComplaints()">Add Last Complains</button>
            </div>

            <div style="display:flex;gap:4px;margin-bottom:6px;align-items:flex-end;">
              <div style="flex:3;position:relative;" id="winCompSearchWrap">
                <label style="font-size:10px;font-weight:700;">Complains</label>
                <div style="position:relative;display:flex;align-items:center;">
                  <input class="form-control" id="winCompSearchInp" 
                         style="font-size:11px;height:26px;padding:2px 22px 2px 6px;font-weight:700;text-transform:uppercase;width:100%;" 
                         placeholder="" 
                         autocomplete="off"
                         onfocus="DashboardModule._openGenericDropdown('winCompDropdownList', 'winCompSearchInp', DashboardModule._filterCompDropdown)"
                         onkeydown="DashboardModule._onGenericKeyDown(event, 'winCompDropdownList', 'winCompSearchInp', 'winCompSel', DashboardModule._selectCompFromSearch)">
                  <span onclick="DashboardModule._toggleGenericDropdown('winCompDropdownList', 'winCompSearchInp', DashboardModule._filterCompDropdown)" 
                        style="position:absolute;right:6px;cursor:pointer;font-size:10px;user-select:none;color:var(--text-muted);padding:2px;" 
                        title="Click to toggle complaints list">▼</span>
                </div>
                <select id="winCompSel" style="display:none;">
                  <option value="">-- Select --</option>
                  <option value="Fever with chills">Fever with chills</option>
                  <option value="Epigastric pain & fullness">Epigastric pain & fullness</option>
                  <option value="Joint pain & stiffness">Joint pain & stiffness</option>
                  <option value="Headache & Dizziness">Headache & Dizziness</option>
                  <option value="Cough & Cold">Cough & Cold</option>
                  <option value="Abdominal Pain">Abdominal Pain</option>
                  <option value="Vomiting & Nausea">Vomiting & Nausea</option>
                  <option value="General Weakness & Fatigue">General Weakness & Fatigue</option>
                </select>
                <div id="winCompDropdownList" class="typeahead-dropdown-list" style="display:none;position:absolute;top:100%;left:0;right:0;z-index:9999;max-height:220px;overflow-y:auto;background:var(--bg-surface);border:1px solid var(--border-strong);box-shadow:0 8px 24px rgba(0,0,0,0.18);border-radius:4px;margin-top:2px;"></div>
              </div>
              <div style="width:75px;">
                <label style="font-size:10px;font-weight:700;">Days</label>
                <input class="form-control" id="winCompDays" 
                       style="font-size:11px;height:26px;padding:2px 6px;text-align:center;font-weight:700;" 
                       placeholder="e.g. 2"
                       onblur="DashboardModule._formatCompDays(this)"
                       onkeydown="if(event.key==='Enter'){DashboardModule._formatCompDays(this);DashboardModule._addComplaint();}">
              </div>
              <div style="flex:2;">
                <label style="font-size:10px;font-weight:700;">Remark</label>
                <input class="form-control" id="winCompRemark" style="font-size:11px;height:26px;padding:2px 6px;" placeholder="" onkeydown="if(event.key==='Enter'){DashboardModule._addComplaint();}">
              </div>
              <div style="display:flex;flex-direction:column;gap:2px;">
                <button class="win-act-btn" style="padding:2px 8px;font-size:10px;background:var(--primary);color:#fff;" onclick="DashboardModule._addComplaint()">Add</button>
                <button class="win-act-btn" style="padding:2px 4px;font-size:10px;" onclick="DashboardModule._cancelComplaint()">Cancel</button>
              </div>
            </div>

            <div class="table-wrapper" style="max-height:160px;overflow-y:auto;">
              <table class="win-table" style="font-size:11px;">
                <thead><tr><th style="width:30px;text-align:center;">No</th><th>History/Complain</th><th style="width:70px;text-align:center;">Days</th><th>Remark</th><th style="width:28px;text-align:center;">✕</th></tr></thead>
                <tbody id="winCompTbody"></tbody>
              </table>
            </div>
          </div>

          <!-- Panel 2: Physical Examination (Exact Image Match with Add & Cancel) -->
          <div class="win-panel-box">
            <div style="display:flex;gap:4px;margin-bottom:6px;">
              <div style="flex:2;position:relative;" id="winExamSearchWrap">
                <label style="font-size:10px;font-weight:700;">Examination</label>
                <div style="position:relative;display:flex;align-items:center;">
                  <input class="form-control" id="winExamSearchInp" 
                         style="font-size:11px;height:26px;padding:2px 22px 2px 6px;font-weight:700;text-transform:uppercase;width:100%;" 
                         placeholder="" 
                         autocomplete="off"
                         onfocus="DashboardModule._openGenericDropdown('winExamDropdownList', 'winExamSearchInp', DashboardModule._filterExamDropdown)"
                         onkeydown="DashboardModule._onGenericKeyDown(event, 'winExamDropdownList', 'winExamSearchInp', 'winExamSel', DashboardModule._selectExamFromSearch)">
                  <span onclick="DashboardModule._toggleGenericDropdown('winExamDropdownList', 'winExamSearchInp', DashboardModule._filterExamDropdown)" 
                        style="position:absolute;right:6px;cursor:pointer;font-size:10px;user-select:none;color:var(--text-muted);padding:2px;" 
                        title="Click to toggle examination list">▼</span>
                </div>
                <select id="winExamSel" style="display:none;">
                  <option value="">-- Select --</option>
                  <option value="BP">BP</option>
                  <option value="RBS">RBS</option>
                </select>
                <div id="winExamDropdownList" class="typeahead-dropdown-list" style="display:none;position:absolute;top:100%;left:0;right:0;z-index:9999;max-height:220px;overflow-y:auto;background:var(--bg-surface);border:1px solid var(--border-strong);box-shadow:0 8px 24px rgba(0,0,0,0.18);border-radius:4px;margin-top:2px;"></div>
              </div>
              <div style="flex:1.5;">
                <label style="font-size:10px;font-weight:700;">Result</label>
                <input class="form-control" id="winExamRes" style="font-size:11px;height:26px;padding:2px 6px;" value="" placeholder="">
              </div>
              <div style="display:flex;flex-direction:column;gap:2px;">
                <button class="win-act-btn" style="padding:2px 8px;font-size:10px;background:var(--primary);color:#fff;" onclick="DashboardModule._addExam()">Add</button>
                <button class="win-act-btn" style="padding:2px 4px;font-size:10px;" onclick="DashboardModule._cancelExam()">Cancel</button>
              </div>
            </div>

            <div class="table-wrapper" style="max-height:180px;overflow-y:auto;">
              <table class="win-table" style="font-size:11px;">
                <thead><tr><th>No</th><th>Examination</th><th>Result</th><th>Unit</th></tr></thead>
                <tbody id="winExamTbody"></tbody>
              </table>
            </div>
          </div>

          <!-- Panel 3: Suffering / Chronic Illness (Exact Image 2 Match - Read-Only) -->
          <div class="win-panel-box">
            <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;">
              <label style="font-size:11px;font-weight:800;white-space:nowrap;">Sufering :</label>
              <input class="form-control" id="winSufferingDisplayInp" style="font-size:11px;height:24px;flex:1;font-weight:700;background:var(--bg-surface);color:var(--text-primary);" readonly value="${App.escHtml(p.suffering || '')}">
            </div>
            <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;">
              <label style="font-size:11px;font-weight:800;white-space:nowrap;">Since :</label>
              <input class="form-control" id="winSinceDisplayInp" style="font-size:11px;height:24px;flex:1;font-weight:700;background:var(--bg-surface);color:var(--text-primary);" readonly value="${App.escHtml(p.since || '')}">
            </div>

            <div style="border:1px solid var(--border-strong);background:var(--bg-surface);padding:8px;height:140px;overflow-y:auto;font-size:11px;font-weight:600;line-height:1.6;white-space:pre-line;color:var(--text-primary);" id="winSufferingList">
              ${App.escHtml(p.historyNotes || '')}
            </div>
          </div>

        </div>

        <!-- Tab 2 Panel (Investigation & Report) -->
        <div id="winPanelTab2" class="win-panels-grid" style="display:none;">
          <!-- Left Box: Investigation & Lab -->
          <div class="win-panel-box">
            <div style="display:flex;gap:4px;margin-bottom:4px;">
              <div style="flex:1;">
                <label style="font-size:10px;font-weight:700;">Investigation</label>
                <select class="form-control" id="winLabInp" style="font-size:11px;height:28px;padding:2px 4px;">
                  <option value="">-- Select --</option>
                  <option>Blood Sugar (Fasting)</option>
                  <option>CBC (Complete Blood Count)</option>
                  <option>Lipid Profile</option>
                  <option>Liver Function Test (LFT)</option>
                  <option>Renal Function Test (RFT)</option>
                </select>
              </div>
              <div style="flex:1;">
                <label style="font-size:10px;font-weight:700;">Lab Name</label>
                <select class="form-control" id="winLabNameInp" style="font-size:11px;height:28px;padding:2px 4px;">
                  <option value="">-- Select --</option>
                  <option>Main Parth Pathology</option>
                  <option>City Clinical Lab</option>
                </select>
              </div>
              <div style="display:flex;flex-direction:column;gap:2px;">
                <button class="win-act-btn" style="padding:2px 8px;font-size:10px;background:var(--primary);color:#fff;" onclick="DashboardModule._addLabTest()">Add</button>
                <button class="win-act-btn" style="padding:2px 4px;font-size:10px;" onclick="DashboardModule._cancelLabTest()">Cancel</button>
              </div>
            </div>
            <div class="table-wrapper" style="max-height:170px;overflow-y:auto;">
              <table class="win-table" style="font-size:11px;">
                <thead><tr><th>INVESTIGATION</th><th>LAB NAME</th><th>RS</th><th>RECIVE</th><th>DATE</th><th style="width:28px;"></th></tr></thead>
                <tbody id="winLabTbody"></tbody>
              </table>
            </div>
            <div id="winLabTotalAmt" style="text-align:right;font-size:11px;font-weight:700;margin-top:4px;">Amount : 0</div>
          </div>

          <!-- Middle Box: Radiology & Category -->
          <div class="win-panel-box">
            <div style="display:flex;gap:4px;margin-bottom:4px;">
              <div style="flex:1;">
                <label style="font-size:10px;font-weight:700;">Catagory</label>
                <select class="form-control" id="winRadioCatInp" style="font-size:11px;height:28px;padding:2px 4px;">
                  <option value="">-- Select --</option>
                  <option>X-RAY</option>
                  <option>USG (Ultrasonography)</option>
                  <option>CT Scan</option>
                  <option>MRI Scan</option>
                </select>
              </div>
              <div style="flex:1;">
                <label style="font-size:10px;font-weight:700;">Radiology</label>
                <select class="form-control" id="winRadioInp" style="font-size:11px;height:28px;padding:2px 4px;">
                  <option value="">-- Select --</option>
                  <option>CHEST X-RAY PA VIEW</option>
                  <option>USG Abdomen & Pelvis</option>
                </select>
              </div>
              <div style="flex:1;">
                <label style="font-size:10px;font-weight:700;">Lab Name</label>
                <select class="form-control" id="winRadioLabInp" style="font-size:11px;height:28px;padding:2px 4px;">
                  <option value="">-- Select --</option>
                  <option>Parth X-Ray Lab</option>
                  <option>City Imaging Center</option>
                </select>
              </div>
              <div style="display:flex;flex-direction:column;gap:2px;">
                <button class="win-act-btn" style="padding:2px 8px;font-size:10px;background:var(--primary);color:#fff;" onclick="DashboardModule._addRadioTest()">Add</button>
                <button class="win-act-btn" style="padding:2px 4px;font-size:10px;" onclick="DashboardModule._cancelRadioTest()">Cancel</button>
              </div>
            </div>
            <div class="table-wrapper" style="max-height:170px;overflow-y:auto;">
              <table class="win-table" style="font-size:11px;">
                <thead><tr><th>No</th><th>Catagory</th><th>Radiology</th><th>Lab Name</th><th>Recive</th></tr></thead>
                <tbody id="winRadioTbody"></tbody>
              </table>
            </div>
          </div>

          <!-- Right Box: Report & Remarks / Attachment -->
          <div class="win-panel-box">
            <div style="display:flex;gap:4px;margin-bottom:4px;">
              <div style="flex:1;"><label style="font-size:10px;font-weight:700;">Report</label><input class="form-control" id="winReportInp" style="font-size:11px;height:26px;" placeholder=""></div>
              <div style="flex:1;"><label style="font-size:10px;font-weight:700;">Result</label><input class="form-control" id="winReportResInp" style="font-size:11px;height:26px;" placeholder=""></div>
              <div style="flex:1;"><label style="font-size:10px;font-weight:700;">Remark</label><input class="form-control" id="winReportRemInp" style="font-size:11px;height:26px;" placeholder=""></div>
            </div>
            <div class="table-wrapper" style="max-height:100px;overflow-y:auto;margin-bottom:4px;">
              <table class="win-table" style="font-size:11px;">
                <thead><tr><th>No</th><th>Report</th><th>Result</th><th>Unit</th><th>Remark</th></tr></thead>
                <tbody id="winReportTbody"></tbody>
              </table>
            </div>
            <!-- Image Attachment Box -->
            <div style="border:1px dashed var(--border-strong);padding:8px;text-align:center;background:var(--bg-surface);display:flex;align-items:center;justify-content:space-between;">
              <span style="font-size:11px;color:var(--text-muted);">📷 Attach Clinical Image / Scan</span>
              <div style="display:flex;gap:2px;">
                <button class="win-act-btn" style="padding:2px 6px;font-size:10px;">Browse</button>
                <button class="win-act-btn" style="padding:2px 6px;font-size:10px;">Clear</button>
                <button class="win-act-btn" style="padding:2px 6px;font-size:10px;background:var(--primary);color:#fff;" onclick="DashboardModule._addReportTest()">Add</button>
              </div>
            </div>
          </div>
        </div>

        <!-- Tab 3 Panel (Diagnosis & Procedure - Exact Image Match) -->
        <div id="winPanelTab3" class="win-panels-grid" style="display:none;grid-template-columns:1fr 2fr;">
          
          <!-- Panel 1: Diagnosis (Left Box) -->
          <div class="win-panel-box">
            <div style="display:flex;align-items:center;justify-content:space-between;gap:6px;margin-bottom:6px;">
              <button class="win-act-btn" style="padding:2px 6px;font-size:10px;" onclick="DashboardModule._addLastDiagnosis()">+ Last Diagnosis</button>
              <label class="opd-radio" style="font-size:10px;font-weight:700;"><input type="checkbox" id="chkNotPrintAdvice"> Not Print Advice</label>
            </div>

            <div style="display:flex;gap:4px;margin-bottom:6px;align-items:flex-end;">
              <div style="flex:1;position:relative;" id="winDiagSearchWrap">
                <label style="font-size:10px;font-weight:700;">Diagnosis</label>
                <div style="position:relative;display:flex;align-items:center;">
                  <input class="form-control" id="winDiagSearchInp" 
                         style="font-size:11px;height:26px;padding:2px 22px 2px 6px;font-weight:700;text-transform:uppercase;width:100%;" 
                         placeholder="" 
                         autocomplete="off"
                         onfocus="DashboardModule._openGenericDropdown('winDiagDropdownList', 'winDiagSearchInp', DashboardModule._filterDiagDropdown)"
                         onkeydown="DashboardModule._onGenericKeyDown(event, 'winDiagDropdownList', 'winDiagSearchInp', 'winDiagSel', DashboardModule._selectDiagFromSearch)">
                  <span onclick="DashboardModule._toggleGenericDropdown('winDiagDropdownList', 'winDiagSearchInp', DashboardModule._filterDiagDropdown)" 
                        style="position:absolute;right:6px;cursor:pointer;font-size:10px;user-select:none;color:var(--text-muted);padding:2px;" 
                        title="Click to toggle diagnosis list">▼</span>
                </div>
                <select id="winDiagSel" style="display:none;">
                  <option value="">-- Select --</option>
                  <option value="Acute Gastroenteritis">Acute Gastroenteritis</option>
                  <option value="Hypertension Stage 1">Hypertension Stage 1</option>
                  <option value="Type 2 Diabetes Mellitus">Type 2 Diabetes Mellitus</option>
                  <option value="Upper Respiratory Tract Infection">Upper Respiratory Tract Infection</option>
                  <option value="Epigastritis / APD">Epigastritis / APD</option>
                  <option value="Lumbar Spondylosis">Lumbar Spondylosis</option>
                  <option value="Allergic Rhinitis">Allergic Rhinitis</option>
                </select>
                <div id="winDiagDropdownList" class="typeahead-dropdown-list" style="display:none;position:absolute;top:100%;left:0;right:0;z-index:9999;max-height:220px;overflow-y:auto;background:var(--bg-surface);border:1px solid var(--border-strong);box-shadow:0 8px 24px rgba(0,0,0,0.18);border-radius:4px;margin-top:2px;"></div>
              </div>
              <div style="display:flex;flex-direction:column;gap:2px;">
                <button class="win-act-btn" style="padding:2px 8px;font-size:10px;background:var(--primary);color:#fff;" onclick="DashboardModule._addDiagnosis()">Add</button>
                <button class="win-act-btn" style="padding:2px 4px;font-size:10px;" onclick="DashboardModule._cancelDiagnosis()">Cancel</button>
              </div>
            </div>

            <div class="table-wrapper" style="max-height:180px;overflow-y:auto;">
              <table class="win-table" style="font-size:11px;">
                <thead><tr><th>NO</th><th>DIAGNOSIS</th><th style="width:28px;"></th></tr></thead>
                <tbody id="winDiagTbody">
                  <!-- Rendered dynamically -->
                </tbody>
              </table>
            </div>
          </div>

          <!-- Panel 2: Procedure (Right Box) -->
          <div class="win-panel-box">
            <div style="display:flex;gap:4px;margin-bottom:6px;align-items:flex-end;">
              <div style="flex:2;position:relative;" id="winProcSearchWrap">
                <label style="font-size:10px;font-weight:700;">Procedure Name</label>
                <div style="position:relative;display:flex;align-items:center;">
                  <input class="form-control" id="winProcSearchInp" 
                         style="font-size:11px;height:26px;padding:2px 22px 2px 6px;font-weight:700;text-transform:uppercase;width:100%;" 
                         placeholder="" 
                         autocomplete="off"
                         onfocus="DashboardModule._openGenericDropdown('winProcDropdownList', 'winProcSearchInp', DashboardModule._filterProcDropdown)"
                         onkeydown="DashboardModule._onGenericKeyDown(event, 'winProcDropdownList', 'winProcSearchInp', 'winProcSel', DashboardModule._selectProcFromSearch)">
                  <span onclick="DashboardModule._toggleGenericDropdown('winProcDropdownList', 'winProcSearchInp', DashboardModule._filterProcDropdown)" 
                        style="position:absolute;right:6px;cursor:pointer;font-size:10px;user-select:none;color:var(--text-muted);padding:2px;" 
                        title="Click to toggle procedure list">▼</span>
                </div>
                <select id="winProcSel" style="display:none;" onchange="DashboardModule._onProcChange(this.value)">
                  <option value="">-- Select --</option>
                  <option value="Minor Surgical Dressing" data-rate="150">Minor Surgical Dressing</option>
                  <option value="ECG / Cardiac Screening" data-rate="250">ECG / Cardiac Screening</option>
                  <option value="IV Injection Administration" data-rate="100">IV Injection Administration</option>
                  <option value="Nebulization Therapy" data-rate="120">Nebulization Therapy</option>
                  <option value="Punchkarma Therapy" data-rate="350">Punchkarma Therapy</option>
                  <option value="Joint Injection" data-rate="300">Joint Injection</option>
                </select>
                <div id="winProcDropdownList" class="typeahead-dropdown-list" style="display:none;position:absolute;top:100%;left:0;right:0;z-index:9999;max-height:220px;overflow-y:auto;background:var(--bg-surface);border:1px solid var(--border-strong);box-shadow:0 8px 24px rgba(0,0,0,0.18);border-radius:4px;margin-top:2px;"></div>
              </div>
              <div style="width:50px;">
                <label style="font-size:10px;font-weight:700;">Qnty</label>
                <input class="form-control" id="winProcQty" style="font-size:11px;height:26px;padding:2px 4px;text-align:center;" value="" oninput="DashboardModule._calcProcTotal()">
              </div>
              <div style="width:65px;">
                <label style="font-size:10px;font-weight:700;">Rate</label>
                <input class="form-control" id="winProcRate" style="font-size:11px;height:26px;padding:2px 4px;" value="" oninput="DashboardModule._calcProcTotal()">
              </div>
              <div style="width:65px;">
                <label style="font-size:10px;font-weight:700;">Total</label>
                <input class="form-control" id="winProcTotal" style="font-size:11px;height:26px;padding:2px 4px;font-weight:700;color:var(--primary);" value="" readonly>
              </div>
              <div style="flex:1;">
                <label style="font-size:10px;font-weight:700;">Remark</label>
                <input class="form-control" id="winProcRemark" style="font-size:11px;height:26px;padding:2px 4px;" placeholder="">
              </div>
              <div style="display:flex;flex-direction:column;gap:2px;">
                <button class="win-act-btn" style="padding:2px 8px;font-size:10px;background:var(--primary);color:#fff;" onclick="DashboardModule._addProcedure()">Add</button>
                <button class="win-act-btn" style="padding:2px 4px;font-size:10px;" onclick="DashboardModule._cancelProcedure()">Cancel</button>
              </div>
            </div>

            <div class="table-wrapper" style="max-height:160px;overflow-y:auto;">
              <table class="win-table" style="font-size:11px;">
                <thead><tr><th>No</th><th>Procedure Name</th><th>Qnty</th><th>Rate</th><th>Total</th><th>Remark</th></tr></thead>
                <tbody id="winProcTbody">
                  <!-- Rendered dynamically -->
                </tbody>
              </table>
            </div>

            <div style="text-align:right;font-size:12px;font-weight:800;margin-top:6px;color:var(--primary);">
              Amount : <input class="form-control" id="winProcGrandTotal" style="display:inline-block;width:90px;height:24px;font-weight:800;text-align:right;font-size:12px;color:var(--primary);" value="₹150" readonly>
            </div>
          </div>

        </div>

        <!-- Tab 4 Panel (Out Side Prescription - Exact Desktop Software Image Match) -->
        <div id="winPanelTab4" class="win-panels-grid" style="display:none;grid-template-columns:220px 1fr;gap:6px;height:100%;box-sizing:border-box;">
          
          <!-- Left Column: Search by Use & Search by Generic -->
          <div style="display:flex;flex-direction:column;gap:4px;height:100%;min-height:0;box-sizing:border-box;">
            <!-- Box 1: :: Use :: -->
            <div class="win-panel-box" style="padding:4px;flex:1;min-height:0;display:flex;flex-direction:column;box-sizing:border-box;">
              <div style="display:flex;align-items:center;gap:4px;margin-bottom:2px;flex-shrink:0;">
                <label style="font-size:10px;font-weight:800;color:var(--primary);white-space:nowrap;">:: Use ::</label>
                <input class="form-control" id="winRxUseSearch" style="font-size:10.5px;height:22px;padding:1px 4px;" placeholder="" oninput="DashboardModule._filterRxByUse(this.value)">
              </div>
              <div id="winRxUseList" style="border:1px solid var(--border-strong);background:var(--bg-surface);flex:1;min-height:0;overflow-y:auto;font-size:11px;padding:2px;"></div>
            </div>

            <!-- Box 2: Search(Generic) : -->
            <div class="win-panel-box" style="padding:4px;flex:1;min-height:0;display:flex;flex-direction:column;box-sizing:border-box;">
              <div style="display:flex;align-items:center;gap:4px;margin-bottom:2px;flex-shrink:0;">
                <label style="font-size:10px;font-weight:800;color:var(--primary);white-space:nowrap;">Search(Generic) :</label>
                <input class="form-control" id="winRxGenSearch" style="font-size:10.5px;height:22px;padding:1px 4px;" placeholder="" oninput="DashboardModule._filterRxByGeneric(this.value)">
              </div>
              <div id="winRxGenList" style="border:1px solid var(--border-strong);background:var(--bg-surface);flex:1;min-height:0;overflow-y:auto;font-size:11px;padding:2px;"></div>
            </div>
          </div>

          <!-- Right Column: Main Prescription Entry Panel -->
          <div class="win-panel-box" style="padding:6px;height:100%;min-height:0;display:flex;flex-direction:column;box-sizing:border-box;">
            <!-- Header Row: Add Last OPD Prescription, Template Dropdown -->
            <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:8px;">
              <button class="win-act-btn" style="padding:2px 8px;font-size:11px;background:var(--primary);color:#fff;" onclick="DashboardModule._addLastOpdPrescription()">Add Last OPD Prescription</button>
              <div style="display:flex;align-items:center;gap:6px;">
                <label style="font-size:11px;font-weight:700;white-space:nowrap;">Tamplate Name :</label>
                <select class="form-control" id="winRxTemplateSel" style="font-size:11px;height:26px;width:180px;" onchange="DashboardModule._applyRxTemplate(this.value)">
                  <option value="">Select Template</option>
                  <option value="fever">Fever & Cold Routine</option>
                  <option value="acidity">APD & Gastritis Kit</option>
                  <option value="pain">Joint Pain & Stiffness</option>
                </select>
                <button class="win-act-btn" style="padding:2px 8px;font-size:11px;">Tamplate</button>
              </div>
            </div>

            <!-- Medicine Form Entry Grid Row -->
            <div style="background:var(--bg-surface);padding:8px;border-radius:var(--radius-sm);border:1px solid var(--border-strong);margin-bottom:8px;">
              <div style="display:flex;gap:4px;flex-wrap:wrap;align-items:flex-end;margin-bottom:6px;">
                <div style="flex:2;min-width:180px;position:relative;" id="winRxMedSearchWrap">
                  <label style="font-size:10px;font-weight:700;">Medicine Name</label>
                  <div style="position:relative;display:flex;align-items:center;">
                    <input class="form-control" id="winRxMedSearchInp" 
                           style="font-size:11px;height:26px;padding:2px 22px 2px 6px;font-weight:700;text-transform:uppercase;width:100%;" 
                           placeholder="" 
                           autocomplete="off"
                           onfocus="DashboardModule._openMedDropdown()"
                           oninput="DashboardModule._onMedSearchInput(this.value)"
                           onkeydown="DashboardModule._onMedSearchKeyDown(event)">
                    <span onclick="DashboardModule._toggleMedDropdown()" 
                          style="position:absolute;right:6px;cursor:pointer;font-size:10px;user-select:none;color:var(--text-muted);padding:2px;" 
                          title="Click to toggle medicine dropdown list">▼</span>
                  </div>
                  <select id="winRxMedSel" style="display:none;" onchange="DashboardModule._onRxMedChange(this.value)">
                    <option value="">-- Select Medicine --</option>
                  </select>
                  <div id="winRxMedDropdownList" 
                       style="display:none;position:absolute;top:100%;left:0;right:0;z-index:9999;max-height:220px;overflow-y:auto;background:var(--bg-surface);border:1px solid var(--border-strong);box-shadow:0 8px 24px rgba(0,0,0,0.18);border-radius:4px;margin-top:2px;">
                  </div>
                </div>
                <div style="width:45px;">
                  <label style="font-size:10px;font-weight:700;">Stock</label>
                  <input class="form-control" id="winRxStock" style="font-size:11px;height:26px;padding:2px 4px;text-align:center;" value="" readonly>
                </div>
                <div style="width:65px;">
                  <label style="font-size:10px;font-weight:700;">Unit</label>
                  <select class="form-control" id="winRxUnit" style="font-size:11px;height:26px;padding:2px 2px;">
                    <option value="Tab.">Tab.</option>
                    <option value="Cap.">Cap.</option>
                    <option value="Syp.">Syp.</option>
                    <option value="Inj.">Inj.</option>
                    <option value="Oint.">Oint.</option>
                    <option value="Drop.">Drop.</option>
                    <option value="Ghrit.">Ghrit.</option>
                    <option value="Kwath.">Kwath.</option>
                    <option value="Oil">Oil</option>
                    <option value="Churna">Churna</option>
                    <option value="Sach.">Sach.</option>
                    <option value="Resp.">Resp.</option>
                    <option value="Lotion">Lotion</option>
                    <option value="Soap">Soap</option>
                    <option value="Cream">Cream</option>
                    <option value="Gel">Gel</option>
                    <option value="Supp.">Supp.</option>
                    <option value="Tube">Tube</option>
                    <option value="Vial">Vial</option>
                    <option value="Amp.">Amp.</option>
                    <option value="Pack">Pack</option>
                  </select>
                </div>
                
                <!-- M A N S Dosage Boxes -->
                <div style="display:flex;gap:2px;align-items:center;text-align:center;">
                  <div style="display:flex;flex-direction:column;align-items:center;">
                    <span style="font-size:9px;font-weight:800;">M</span>
                    <input class="form-control" id="winRxM" style="font-size:11px;height:24px;width:24px;padding:1px;text-align:center;" value="" oninput="DashboardModule._calcRxItemTotal(false)">
                  </div>
                  <div style="display:flex;flex-direction:column;align-items:center;">
                    <span style="font-size:9px;font-weight:800;">A</span>
                    <input class="form-control" id="winRxA" style="font-size:11px;height:24px;width:24px;padding:1px;text-align:center;" value="" oninput="DashboardModule._calcRxItemTotal(false)">
                  </div>
                  <div style="display:flex;flex-direction:column;gap:0;align-items:center;">
                    <span style="font-size:9px;font-weight:800;">N</span>
                    <input class="form-control" id="winRxN" style="font-size:11px;height:24px;width:24px;padding:1px;text-align:center;" value="" oninput="DashboardModule._calcRxItemTotal(false)">
                  </div>
                  <div style="display:flex;flex-direction:column;align-items:center;">
                    <span style="font-size:9px;font-weight:800;">S</span>
                    <input class="form-control" id="winRxS" style="font-size:11px;height:24px;width:24px;padding:1px;text-align:center;" value="" oninput="DashboardModule._calcRxItemTotal(false)">
                  </div>
                </div>

                <div style="width:40px;">
                  <label style="font-size:10px;font-weight:700;">Day</label>
                  <input class="form-control" id="winRxDay" style="font-size:11px;height:26px;padding:2px 4px;text-align:center;" value="" oninput="DashboardModule._calcRxItemTotal(false)">
                </div>
                <div style="width:50px;">
                  <label style="font-size:10px;font-weight:700;">Qnty</label>
                  <input class="form-control" id="winRxQnty" style="font-size:11px;height:26px;padding:2px 4px;text-align:center;font-weight:700;" value="" oninput="DashboardModule._calcRxItemTotal(true)">
                </div>
                <div style="width:55px;">
                  <label style="font-size:10px;font-weight:700;">Rate</label>
                  <input class="form-control" id="winRxRate" style="font-size:11px;height:26px;padding:2px 4px;" value="" oninput="DashboardModule._calcRxItemTotal(true)">
                </div>
                <div style="width:65px;">
                  <label style="font-size:10px;font-weight:700;">Total</label>
                  <input class="form-control" id="winRxTotal" style="font-size:11px;height:26px;padding:2px 4px;font-weight:700;color:var(--primary);" value="" readonly>
                </div>
                <div style="flex:1;min-width:130px;">
                  <label style="font-size:10px;font-weight:700;">Method (Gujarati)</label>
                  <select class="form-control" id="winRxRemark" style="font-size:11px;height:26px;padding:2px 4px;">
                    <option value="">-- Blank --</option>
                    <option value="હળવા હાથે લગાવવી (Apply Gently)">હળવા હાથે લગાવવી (Apply Gently)</option>
                    <option value="દુખાવાની જગ્યાએ હળવા હાથે માલિશ કરવી (Gentle Massage on Pain Area)">દુખાવાની જગ્યાએ હળવા હાથે માલિશ કરવી (Gentle Massage)</option>
                    <option value="ચામડી પર ધીમેથી લગાવવી (Apply Gently on Skin)">ચામડી પર ધીમેથી લગાવવી (Apply Gently on Skin)</option>
                    <option value="દિવસમાં ૨ થી ૩ વાર લગાવવી (Apply 2-3 Times Daily)">દિવસમાં ૨ થી ૩ વાર લગાવવી (Apply 2-3 Times Daily)</option>
                    <option value="ઘા સાફ કરીને લગાવવી (Clean Wound & Apply)">ઘા સાફ કરીને લગાવવી (Clean Wound & Apply)</option>
                    <option value="ગરમ પાણીના શેક પછી લગાવવી (Apply After Warm Fomentation)">ગરમ પાણીના શેક પછી લગાવવી (Apply After Fomentation)</option>
                    <option value="આંખમાં ૧-૧ ટીપું નાખવું (Put 1-1 Drop in Eye)">આંખમાં ૧-૧ ટીપું નાખવું (Put 1-1 Drop in Eye)</option>
                    <option value="કાનમાં ૨-૨ ટીપાં નાખવા (Put 2-2 Drops in Ear)">કાનમાં ૨-૨ ટીપાં નાખવા (Put 2-2 Drops in Ear)</option>
                    <option value="નાકમાં ૨-૨ ટીપાં નાખવા (Put 2-2 Drops in Nose)">નાકમાં ૨-૨ ટીપાં નાખવા (Put 2-2 Drops in Nose)</option>
                    <option value="નાસ લેવો / વરાળ લેવી (Steam Inhalation)">નાસ લેવો / વરાળ લેવી (Steam Inhalation)</option>
                    <option value="કોગળા કરવા / ગારગલ કરવા (Gargle / Mouth Wash)">કોગળા કરવા / ગારગલ કરવા (Gargle / Mouth Wash)</option>
                    <option value="જમ્યા પછી (After Food)">જમ્યા પછી (After Food)</option>
                    <option value="જમ્યા પહેલા (Before Food)">જમ્યા પહેલા (Before Food)</option>
                    <option value="સવારે ભૂખ્યા પેટે (Morning Empty Stomach)">સવારે ભૂખ્યા પેટે (Morning Empty Stomach)</option>
                    <option value="રાત્રે સૂતી વખતે (At Bedtime)">રાત્રે સૂતી વખતે (At Bedtime)</option>
                    <option value="જમ્યા પહેલા 60 મિનિટ (60 Min Before Food)">જમ્યા પહેલા 60 મિનિટ (60 Min Before Food)</option>
                    <option value="જમ્યા પછી દૂધમાં (With Milk After Food)">જમ્યા પછી દૂધમાં (With Milk After Food)</option>
                    <option value="હૂંફાળા પાણી સાથે (With Warm Water)">હૂંફાળા પાણી સાથે (With Warm Water)</option>
                    <option value="દૂધ સાથે લેવી (Take with Milk)">દૂધ સાથે લેવી (Take with Milk)</option>
                    <option value="મધ સાથે ચાટવું (Lick with Honey)">મધ સાથે ચાટવું (Lick with Honey)</option>
                    <option value="પાણીમાં ઓગાળીને પીવું (Dissolve in Water & Drink)">પાણીમાં ઓગાળીને પીવું (Dissolve in Water & Drink)</option>
                    <option value="ચાવીને ખાવી (Chewable Tablet)">ચાવીને ખાવી (Chewable Tablet)</option>
                    <option value="જીભ નીચે મૂકવી (Keep Under Tongue)">જીભ નીચે મૂકવી (Keep Under Tongue)</option>
                    <option value="દુખાવા વખતે (When Having Pain)">દુખાવા વખતે (When Having Pain)</option>
                    <option value="તાવ આવે ત્યારે જ લેવી (Take Only When Fever)">તાવ આવે ત્યારે જ લેવી (Take Only When Fever)</option>
                    <option value="જરૂર પડે ત્યારે (As Needed / SOS)">જરૂર પડે ત્યારે (As Needed / SOS)</option>
                  </select>
                </div>
                <div style="display:flex;flex-direction:column;gap:2px;">
                  <button class="win-act-btn" style="padding:2px 8px;font-size:10px;background:var(--primary);color:#fff;" onclick="DashboardModule._addRxMedicine()">Add</button>
                  <button class="win-act-btn" style="padding:2px 4px;font-size:10px;" onclick="DashboardModule._cancelRxMedicine()">Cancel</button>
                </div>
              </div>

              <!-- Sub Row: Method Dropdown & Medicine Not Use Counter -->
              <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:4px;">
                <span style="font-size:11px;font-weight:700;color:var(--success);">🟩 Medicine Not Use : <span id="winRxNotUseCnt">0</span></span>
                <div style="display:flex;align-items:center;gap:6px;">
                  <label style="font-size:11px;font-weight:700;white-space:nowrap;">Type / Route :</label>
                  <select class="form-control" id="winRxMethod" style="font-size:11px;height:24px;width:160px;">
                    <option value="">-- Blank --</option>
                    <option value="TABLET">TABLET</option>
                    <option value="CAPSULE">CAPSULE</option>
                    <option value="INJECTION / IV">INJECTION / IV</option>
                    <option value="SYRUP / LIQUID">SYRUP / LIQUID</option>
                    <option value="AFTER FOOD">AFTER FOOD</option>
                    <option value="BEFORE FOOD">BEFORE FOOD</option>
                    <option value="AT BEDTIME">AT BEDTIME</option>
                  </select>
                </div>
              </div>
            </div>

            <!-- Prescription Items Table -->
            <!-- Prescription Items Table -->
            <div class="table-wrapper" style="flex:1 1 auto;min-height:140px;max-height:220px;overflow-y:auto;margin-bottom:4px;background:var(--bg-surface);border:1px solid var(--border-strong);">
              <table class="win-table" style="font-size:11px;">
                <thead><tr><th>No</th><th>Medicine Name</th><th>M</th><th>A</th><th>N</th><th>S</th><th>Day</th><th>Qnty</th><th>Rate</th><th>Total</th><th>Method</th><th>Type</th></tr></thead>
                <tbody id="winRxTbody">
                  <!-- Rendered dynamically -->
                </tbody>
              </table>
            </div>

            <!-- Bottom Controls Row: Day for Tablet, Followup Day, Date Display, Amount (Always Visible, Pinned Right Below Table) -->
            <div style="flex-shrink:0;margin-top:auto;display:flex;align-items:center;justify-content:space-between;gap:6px;background:#f4f4f4;padding:4px 8px;border:1px solid #7f9db9;font-size:11px;box-sizing:border-box;flex-wrap:nowrap;border-radius:0;">
              <div style="display:flex;align-items:center;gap:6px;">
                <!-- Day & Set Day For Only Tablet Medicine -->
                <span style="font-weight:bold;color:#000;font-size:11px;white-space:nowrap;">Day :</span>
                <input class="form-control" id="winRxSetTabDayInp" style="width:48px;height:22px;text-align:center;font-weight:bold;background:#fff;border:1px solid #7f9db9;border-radius:0;padding:1px 2px;font-size:11px;" onkeydown="if(event.key==='Enter'){DashboardModule._setDayForOnlyTabletMedicine();}">
                <button class="win-act-btn" style="background:#a4c2e6;color:#000;font-weight:bold;padding:1px 8px;height:22px;font-size:11px;border:1px solid #7098c2;border-radius:0;white-space:nowrap;cursor:pointer;" onclick="DashboardModule._setDayForOnlyTabletMedicine()" title="Click to update Day and Qty for all Tablet medicines in prescription">Set Day For Only Tablet Medicine</button>

                <!-- Followup Day & Date -->
                <label style="font-weight:bold;color:#000;margin-left:10px;display:flex;align-items:center;gap:4px;white-space:nowrap;cursor:pointer;"><input type="checkbox" id="winRxUseFollowupDay" checked style="margin:0;cursor:pointer;"> Use Followup Day</label>
                <input class="form-control" id="winRxFollowupDaysInp" style="width:45px;height:22px;text-align:center;font-weight:bold;background:#fff;border:1px solid #7f9db9;border-radius:0;padding:1px 2px;font-size:11px;" value="" oninput="DashboardModule._onFollowupDaysChange(this.value)">
                <input class="form-control" id="winRxFollowupDateBox" style="width:220px;height:22px;text-align:center;font-weight:bold;color:#000;background:#fff;border:1px solid #7f9db9;border-radius:0;padding:1px 4px;font-size:11px;" value="" readonly title="Calculated Follow-Up Date">
              </div>
              <div style="font-weight:bold;color:#000;display:flex;align-items:center;gap:4px;white-space:nowrap;">
                Amount : <input class="form-control" id="winRxGrandTotal" style="display:inline-block;width:95px;height:22px;font-weight:bold;text-align:right;font-size:12px;color:#000;background:#fff;border:1px solid #7f9db9;border-radius:0;padding:1px 4px;" value="₹0.00" readonly>
              </div>
            </div>

          </div>

        </div>

        <!-- Tab 5 Panel (Extra Advise - Clean Full Width Diagnosis List) -->
        <div id="winPanelTab5" style="display:none;">
          <div class="win-panel-box" style="padding:10px;">
            <!-- Header bar -->
            <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:10px;">
              <div style="font-size:12px;font-weight:800;color:var(--primary);">🩺 Extra Advice Diagnoses Catalog</div>
              <div style="display:flex;align-items:center;gap:8px;flex:1;max-width:400px;">
                <input class="form-control" id="winTab5SearchInp" 
                       style="font-size:11px;height:26px;width:100%;font-weight:700;" 
                       placeholder="Search diagnosis (type any letters)..." 
                       autocomplete="off"
                       oninput="DashboardModule._filterTab5AdviceList(this.value)"
                       onkeyup="DashboardModule._filterTab5AdviceList(this.value)"
                       onpaste="setTimeout(() => DashboardModule._filterTab5AdviceList(this.value), 10)"
                       onkeydown="if(event.key==='Enter'){DashboardModule._onTab5SearchEnter(this.value);}">
                <button class="win-act-btn" style="padding:4px 10px;font-size:11px;background:var(--primary);color:#fff;white-space:nowrap;" onclick="navigateTo('advicemaster')" title="Open Extra Advice Master to manage diagnoses">➕ Manage Master</button>
              </div>
            </div>

            <!-- Full Width Table -->
            <div class="table-wrapper" style="max-height:260px;overflow-y:auto;">
              <table class="win-table" style="font-size:11px;">
                <thead>
                  <tr>
                    <th style="width:50px;text-align:center;">No</th>
                    <th>Diagnosis Name</th>
                    <th style="width:160px;text-align:center;">Action</th>
                  </tr>
                </thead>
                <tbody id="winTab5AdviceDiagList"></tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    `;

    const footer = `
      <div style="display:flex;align-items:center;justify-content:flex-end;gap:10px;width:100%;">
        <button class="btn btn-primary" onclick="DashboardModule._saveOnly('${App.escHtml(p.name)}')" style="font-weight:800;background:var(--primary);color:#fff;min-width:100px;padding:6px 18px;font-size:13px;">💾 Save</button>
        <button class="btn btn-success" id="winBtnSaveAndPrint" onclick="DashboardModule._saveAndPrint('${App.escHtml(p.name)}')" style="font-weight:800;background:var(--success);color:#fff;min-width:120px;padding:6px 18px;font-size:13px;">🖨️ Save & Print</button>
        <button class="btn btn-secondary" onclick="App.closeModal()" style="font-weight:700;min-width:90px;padding:6px 16px;font-size:13px;">✕ Exit</button>
      </div>
    `;

    this._activePatientId = p.id;
    this._activePatientName = p.name;
    this._activeApptId = apptId || (appt ? appt.id : null);
    App.openModal(`Patient History Entry — ${p.name}`, body, footer, 'xl');
    setTimeout(() => {
      this._populateRxMedDropdown();
      this._populateDiagDropdown();
      this._renderComplaintsTable();
      this._renderExamTable();
      this._renderDiagTable();
      this._renderProcTable();
      this._renderRxTable();
      this._renderLabTable();
      this._renderRadioTable();
      this._renderReportTable();
      this._updateFollowupDateBox();
      this._switchWinTab(this._initialHistoryTab || 'tab1');
    }, 50);
  },

  _medSearchFocusIdx: -1,
  _medTypedBuffer: '',
  _medBufferTimer: null,

  _populateRxMedDropdown() {
    const sel = document.getElementById('winRxMedSel');
    if (!sel) return;
    const meds = DB.getMedicines ? DB.getMedicines() : [];
    meds.sort((a, b) => (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' }));
    sel.innerHTML = '<option value="">-- Select Medicine --</option>' +
      meds.map(m => `<option value="${App.escHtml(m.name)}">${App.escHtml(m.name)}</option>`).join('');
  },

  _populateDiagDropdown() {
    const sel = document.getElementById('winDiagSel');
    if (!sel) return;
    const advices = DB.getAdvices ? DB.getAdvices() : [];
    advices.sort((a, b) => (a.diagnosisName || '').localeCompare(b.diagnosisName || '', undefined, { sensitivity: 'base' }));

    let html = '<option value="">-- Select --</option>';
    advices.forEach(a => {
      if (a.diagnosisName) {
        html += `<option value="${App.escHtml(a.diagnosisName)}">${App.escHtml(a.diagnosisName)}</option>`;
      }
    });
    sel.innerHTML = html;
  },

  _toggleMedDropdown() {
    const dropdown = document.getElementById('winRxMedDropdownList');
    if (dropdown) {
      if (dropdown.style.display === 'block') {
        this._closeMedDropdown();
      } else {
        this._openMedDropdown();
        document.getElementById('winRxMedSearchInp')?.focus();
      }
    }
  },

  _openMedDropdown() {
    const dropdown = document.getElementById('winRxMedDropdownList');
    if (dropdown) {
      const searchInp = document.getElementById('winRxMedSearchInp');
      this._filterMedDropdown(this._medTypedBuffer || '');
      dropdown.style.display = 'block';
    }
  },

  _closeMedDropdown() {
    const dropdown = document.getElementById('winRxMedDropdownList');
    if (dropdown) dropdown.style.display = 'none';
    this._medSearchFocusIdx = -1;
  },

  _onMedSearchInput(query) {
    // Keep input field empty while typing so typed text is hidden
    const searchInp = document.getElementById('winRxMedSearchInp');
    const sel = document.getElementById('winRxMedSel');
    if (searchInp && (!sel || !sel.value || sel.value !== searchInp.value)) {
      if (query && query !== searchInp.getAttribute('data-selected')) {
        this._medTypedBuffer = query;
        searchInp.value = searchInp.getAttribute('data-selected') || '';
        this._triggerMedSearchBuffer(query);
      }
    }
  },

  _triggerMedSearchBuffer(typedStr) {
    const dropdown = document.getElementById('winRxMedDropdownList');
    if (dropdown) dropdown.style.display = 'block';

    this._filterMedDropdown(typedStr);

    // Reset buffer after 1.5 seconds of inactivity, but DO NOT reset dropdown list!
    if (this._medBufferTimer) clearTimeout(this._medBufferTimer);
    this._medBufferTimer = setTimeout(() => {
      this._medTypedBuffer = '';
    }, 1500);
  },

  _filterMedDropdown(query = '') {
    const dropdown = document.getElementById('winRxMedDropdownList');
    if (!dropdown) return;

    const allMeds = DB.getMedicines ? DB.getMedicines() : [];
    allMeds.sort((a, b) => (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' }));
    const q = query.trim().toLowerCase();

    const filtered = q
      ? allMeds.filter(m => m.name.toLowerCase().includes(q) || (m.generic && m.generic.toLowerCase().includes(q)))
      : allMeds;

    this._medSearchFocusIdx = filtered.length > 0 ? 0 : -1;

    if (filtered.length === 0) {
      dropdown.innerHTML = `<div style="padding:8px 10px;font-size:11px;color:var(--text-muted);font-style:italic;">No medicine matching "${App.escHtml(query)}"</div>`;
      return;
    }

    dropdown.innerHTML = filtered.map((m, idx) => {
      const isFocused = idx === this._medSearchFocusIdx;
      const bg = isFocused ? 'background:#a4c2e6;color:#002060;' : '';

      return `
        <div class="rx-med-opt-item" data-idx="${idx}" data-name="${App.escHtml(m.name)}"
             style="padding:6px 10px;font-size:11px;font-weight:700;cursor:pointer;border-bottom:1px solid var(--border);${bg}"
             onmouseenter="DashboardModule._setMedItemFocus(${idx})"
             onclick="DashboardModule._selectMedFromSearch('${App.escHtml(m.name)}')">
          <span style="text-transform:uppercase;">💊 ${App.escHtml(m.name)}</span>
        </div>
      `;
    }).join('');
  },

  _setMedItemFocus(idx) {
    this._medSearchFocusIdx = idx;
    const items = document.querySelectorAll('.rx-med-opt-item');
    items.forEach((el, i) => {
      if (i === idx) {
        el.style.background = '#a4c2e6';
        el.style.color = '#002060';
      } else {
        el.style.background = '';
        el.style.color = 'var(--text-primary)';
      }
    });
  },

  _onMedSearchKeyDown(e) {
    const dropdown = document.getElementById('winRxMedDropdownList');
    const items = document.querySelectorAll('.rx-med-opt-item');
    const searchInp = document.getElementById('winRxMedSearchInp');

    // Handle single printable characters (typeahead buffer)
    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      this._medTypedBuffer += e.key;
      this._triggerMedSearchBuffer(this._medTypedBuffer);
      return;
    }

    if (e.key === 'Backspace') {
      e.preventDefault();
      if (this._medTypedBuffer.length > 0) {
        this._medTypedBuffer = this._medTypedBuffer.slice(0, -1);
        this._triggerMedSearchBuffer(this._medTypedBuffer);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (dropdown && dropdown.style.display === 'none') {
        dropdown.style.display = 'block';
      }
      if (items.length > 0) {
        this._medSearchFocusIdx = (this._medSearchFocusIdx + 1) % items.length;
        this._setMedItemFocus(this._medSearchFocusIdx);
        items[this._medSearchFocusIdx]?.scrollIntoView({ block: 'nearest' });
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (items.length > 0) {
        this._medSearchFocusIdx = (this._medSearchFocusIdx - 1 + items.length) % items.length;
        this._setMedItemFocus(this._medSearchFocusIdx);
        items[this._medSearchFocusIdx]?.scrollIntoView({ block: 'nearest' });
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (items.length > 0 && this._medSearchFocusIdx >= 0 && items[this._medSearchFocusIdx]) {
        const medName = items[this._medSearchFocusIdx].getAttribute('data-name');
        if (medName) this._selectMedFromSearch(medName);
      }
    } else if (e.key === 'Escape') {
      this._closeMedDropdown();
    }
  },

  _selectMedFromSearch(medName) {
    this._medTypedBuffer = '';
    if (this._medBufferTimer) {
      clearTimeout(this._medBufferTimer);
      this._medBufferTimer = null;
    }
    const searchInp = document.getElementById('winRxMedSearchInp');
    const sel = document.getElementById('winRxMedSel');
    if (searchInp) {
      searchInp.value = medName;
      searchInp.setAttribute('data-selected', medName);
    }
    if (sel) sel.value = medName;
    this._closeMedDropdown();
    this._onRxMedChange(medName);
  },

  _rxList: [],
  _selectedRxIndex: null,
  _highlightedRxIndex: null,

  _onRxMedChange(val) {
    const searchInp = document.getElementById('winRxMedSearchInp');
    if (searchInp && val) {
      searchInp.value = val;
      searchInp.setAttribute('data-selected', val);
    }
    const stockInp = document.getElementById('winRxStock');
    const unitInp = document.getElementById('winRxUnit');
    const mInp = document.getElementById('winRxM');
    const aInp = document.getElementById('winRxA');
    const nInp = document.getElementById('winRxN');
    const sInp = document.getElementById('winRxS');
    const dayInp = document.getElementById('winRxDay');
    const qtyInp = document.getElementById('winRxQnty');
    const rateInp = document.getElementById('winRxRate');
    const totalInp = document.getElementById('winRxTotal');
    const remInp = document.getElementById('winRxRemark');
    const methInp = document.getElementById('winRxMethod');
    const genContainer = document.getElementById('winRxGenList');

    if (!val) {
      if (stockInp) stockInp.value = '';
      if (unitInp) unitInp.value = '';
      if (mInp) mInp.value = '';
      if (aInp) aInp.value = '';
      if (nInp) nInp.value = '';
      if (sInp) sInp.value = '';
      if (dayInp) dayInp.value = '';
      if (qtyInp) qtyInp.value = '';
      if (rateInp) rateInp.value = '';
      if (totalInp) totalInp.value = '';
      if (remInp) remInp.value = '';
      if (methInp) methInp.value = '';
      if (genContainer) genContainer.innerHTML = '';
      return;
    }

    const allMeds = DB.getMedicines ? DB.getMedicines() : [];
    const med = allMeds.find(m => m.name.toLowerCase() === val.toLowerCase());

    if (med) {
      if (stockInp) stockInp.value = med.orqty || 100;
      if (unitInp) unitInp.value = med.unit || 'TAB.';

      // Pre-fill default M-A-N-S dosage from medicine data
      let mVal = med.m !== undefined && med.m !== null ? String(med.m) : '';
      let aVal = med.a !== undefined && med.a !== null ? String(med.a) : '';
      let nVal = med.n !== undefined && med.n !== null ? String(med.n) : '';
      let sVal = med.s !== undefined && med.s !== null ? String(med.s) : '';

      if (!mVal && !aVal && !nVal && !sVal && med.dosage) {
        const dosageMatch = String(med.dosage).match(/(\d+)-(\d+)-(\d+)(?:-(\d+))?/);
        if (dosageMatch) {
          mVal = dosageMatch[1] || '0';
          aVal = dosageMatch[2] || '0';
          nVal = dosageMatch[3] || '0';
          sVal = dosageMatch[4] || '0';
        }
      }

      if (!mVal && !aVal && !nVal && !sVal) {
        mVal = '1'; aVal = '0'; nVal = '1'; sVal = '0';
      }

      if (mInp) mInp.value = mVal;
      if (aInp) aInp.value = aVal;
      if (nInp) nInp.value = nVal;
      if (sInp) sInp.value = sVal;

      // Pre-fill default Remark (Gujarati) and Method
      const defRemark = med.remark_guj || med.remark || 'જમ્યા પછી';
      if (remInp) {
        let setRem = false;
        for (let i = 0; i < remInp.options.length; i++) {
          if (remInp.options[i].value === defRemark) {
            remInp.selectedIndex = i;
            setRem = true;
            break;
          }
        }
        if (!setRem && remInp.options.length > 2) remInp.selectedIndex = 2;
      }

      const defMethod = med.method || (med.unit === 'CAP.' ? 'CAPSULE' : med.unit === 'SYP' ? 'SYRUP' : med.unit === 'INJ.' ? 'INJECTION' : 'TABLET');
      if (methInp) {
        let setMeth = false;
        for (let i = 0; i < methInp.options.length; i++) {
          if (methInp.options[i].value === defMethod) {
            methInp.selectedIndex = i;
            setMeth = true;
            break;
          }
        }
        if (!setMeth && methInp.options.length > 1) methInp.selectedIndex = 1;
      }

      // Default Day: if day is empty or 0, default to setTabDayInp or followupDaysInp (fallback 3)
      if (dayInp && (!dayInp.value || dayInp.value === '0')) {
        const followupDaysInp = document.getElementById('winRxFollowupDaysInp');
        const setTabDayInp = document.getElementById('winRxSetTabDayInp');
        dayInp.value = (setTabDayInp && setTabDayInp.value)
          ? setTabDayInp.value
          : ((followupDaysInp && followupDaysInp.value) ? followupDaysInp.value : '3');
      }

      // Calculate rate per unit/piece from pack MRP (Pack MRP / Pack Count)
      const uStr = (med.unit || '').toUpperCase();
      const nameStr = (med.name || '').toUpperCase();
      const isTabOrCap = uStr.includes('TAB') || uStr.includes('CAP') || nameStr.includes('TAB') || nameStr.includes('CAP');

      let packCount = 1;
      if (med.packing) {
        const match = String(med.packing).match(/(\d+)\s*$/);
        if (match) packCount = parseInt(match[1], 10) || 1;
      } else if (isTabOrCap) {
        packCount = 10;
      } else {
        packCount = 1;
      }
      if (packCount <= 0) packCount = 1;

      const mrpPack = parseFloat(med.mrppack || med.price || 30.00);
      const ratePerUnit = mrpPack / packCount;

      if (rateInp) rateInp.value = ratePerUnit.toFixed(2);

      if (genContainer) {
        const sameGenericMeds = med.generic
          ? allMeds.filter(m => m.generic && m.generic.toLowerCase().trim() === med.generic.toLowerCase().trim())
          : [med];

        genContainer.innerHTML = `
          <div style="padding:6px;background:var(--bg-surface);border:1px solid var(--border-strong);border-radius:var(--radius-sm);">
            <div style="font-size:10px;color:var(--text-muted);font-weight:700;">Generic Composition:</div>
            <div style="font-size:11px;font-weight:800;color:var(--primary);margin-top:2px;margin-bottom:6px;">${App.escHtml(med.generic || val)}</div>
            <div style="font-size:10px;color:var(--text-secondary);font-weight:700;border-top:1px dashed var(--border-strong);padding-top:4px;">Same Generic Brands (${sameGenericMeds.length}):</div>
            <div style="max-height:85px;overflow-y:auto;margin-top:2px;">
              ${sameGenericMeds.map(m => {
          const mu = (m.unit || '').toUpperCase();
          const mn = (m.name || '').toUpperCase();
          const mIsTab = mu.includes('TAB') || mn.includes('TAB');
          const mIsCap = mu.includes('CAP') || mn.includes('CAP');
          const mIsSyp = mu.includes('SYP') || mn.includes('SYP') || mn.includes('SYRUP');
          const mIsInj = mu.includes('INJ') || mn.includes('INJ');

          let pCount = 1;
          if (m.packing) {
            const match = String(m.packing).match(/(\d+)\s*$/);
            if (match) pCount = parseInt(match[1], 10) || 1;
          } else if (mIsTab || mIsCap) {
            pCount = 10;
          } else {
            pCount = 1;
          }
          if (pCount <= 0) pCount = 1;

          const unitRate = ((m.mrppack || m.price || 30) / pCount).toFixed(2);
          const unitLabel = mIsTab ? '/tab' : (mIsCap ? '/cap' : (mIsSyp ? '/syp' : (mIsInj ? '/inj' : '/piece')));

          return `
                  <div style="padding:2px 4px;font-size:11px;font-weight:700;color:${m.name === med.name ? 'var(--primary)' : 'var(--text-primary)'};cursor:pointer;display:flex;justify-content:space-between;align-items:center;"
                       onclick="DashboardModule._selectMedFromList('${App.escHtml(m.name)}')" title="Click to select brand ${App.escHtml(m.name)}">
                    <span>💊 ${App.escHtml(m.name)}</span>
                    <span style="font-size:10px;color:var(--text-muted);">₹${unitRate}${unitLabel}</span>
                  </div>
                `;
        }).join('')}
            </div>
          </div>
        `;
      }
    } else {
      if (stockInp) stockInp.value = '';
      if (rateInp) rateInp.value = '';
      if (genContainer) genContainer.innerHTML = '';
    }
    this._calcRxItemTotal();
  },

  _calcRxItemTotal(manualQty = false) {
    const mVal = document.getElementById('winRxM')?.value;
    const aVal = document.getElementById('winRxA')?.value;
    const nVal = document.getElementById('winRxN')?.value;
    const sVal = document.getElementById('winRxS')?.value;
    const dayVal = document.getElementById('winRxDay')?.value;
    const rateVal = document.getElementById('winRxRate')?.value;

    const qtyInp = document.getElementById('winRxQnty');
    const totalInp = document.getElementById('winRxTotal');

    const rate = Number(rateVal || 0);

    let qty = 0;
    if (manualQty && qtyInp && qtyInp.value !== '') {
      qty = Number(qtyInp.value || 0);
    } else {
      const m = Number(mVal || 0);
      const a = Number(aVal || 0);
      const n = Number(nVal || 0);
      const s = Number(sVal || 0);
      const day = Number(dayVal || 0);

      if (mVal === '' && aVal === '' && nVal === '' && sVal === '' && dayVal === '') {
        if (qtyInp) qtyInp.value = '';
        if (totalInp) totalInp.value = '';
        return;
      }

      const dailyDoses = (m + a + n + s) > 0 ? (m + a + n + s) : 1;
      const effectiveDay = day > 0 ? day : 1;
      qty = dailyDoses * effectiveDay;
      if (qtyInp) qtyInp.value = qty > 0 ? qty.toFixed(2) : '1.00';
    }

    const total = qty * rate;
    if (totalInp) totalInp.value = total > 0 ? total.toFixed(2) : '0.00';
  },

  /* Set Day & Recalculate Qty + Total For All Tablet & Capsule Medicines */
  _setDayForOnlyTabletMedicine() {
    const dayInp = document.getElementById('winRxSetTabDayInp');
    const dayVal = parseInt(dayInp ? dayInp.value : '', 10);
    if (isNaN(dayVal) || dayVal <= 0) {
      App.toast('Please enter day number in the Day box (e.g. 5, 10, 15) ⚠️', 'warning', 2000);
      dayInp?.focus();
      return;
    }

    if (!this._rxList || this._rxList.length === 0) {
      App.toast('No medicines in prescription table to update.', 'info', 1800);
      return;
    }

    let updatedCount = 0;
    this._rxList.forEach(item => {
      const medType = this._getMedType ? this._getMedType(item) : 'Tab';
      const mMethod = String(item.method || '').toUpperCase();
      const mUnit = String(item.unit || '').toUpperCase();
      const mName = String(item.name || '').toUpperCase();
      const isOralSolid = (medType === 'Tab' || medType === 'Cap') ||
        mMethod.includes('TABLET') || mMethod.includes('CAPSULE') ||
        mUnit.includes('TAB') || mUnit.includes('CAP') ||
        mName.includes('CAP') || mName.includes('TAB');

      if (isOralSolid) {
        item.day = dayVal;
        const m = Number(item.m || 0);
        const a = Number(item.a || 0);
        const n = Number(item.n || 0);
        const s = Number(item.s || 0);
        const dailyDose = (m + a + n + s) > 0 ? (m + a + n + s) : 1;
        const qnty = dailyDose * dayVal;
        item.qty = qnty;
        item.qnty = qnty;
        const rate = Number(item.rate || 0);
        item.total = qnty * rate;
        updatedCount++;
      }
    });

    this._renderRxTable();
    App.toast(`Set Day = ${dayVal} for ${updatedCount} Tablet/Capsule medicine(s)! 💊✨`, 'success', 2200);
  },

  _renderRxTable() {
    const tbody = document.getElementById('winRxTbody');
    const grandInp = document.getElementById('winRxGrandTotal');
    if (!tbody) return;

    if (!this._rxList || this._rxList.length === 0) {
      tbody.innerHTML = '';
      if (grandInp) grandInp.value = `₹0.00`;
      return;
    }

    let grand = 0;
    tbody.innerHTML = this._rxList.map((item, idx) => {
      const m = Number(item.m || 0);
      const a = Number(item.a || 0);
      const n = Number(item.n || 0);
      const s = Number(item.s || 0);
      const day = Number(item.day || 0);
      const dailyDose = (m + a + n + s) > 0 ? (m + a + n + s) : 1;

      let qVal = Number(item.qty !== undefined && item.qty !== null ? item.qty : (item.qnty || 0));
      // Auto-heal 0.00 quantity so it never shows 0 when day/dosage exists!
      if (qVal <= 0 && day > 0) {
        qVal = dailyDose * day;
        item.qty = qVal;
        item.qnty = qVal;
      }
      const rVal = Number(item.rate || 0);
      let tVal = Number(item.total !== undefined && item.total !== null ? item.total : (qVal * rVal));
      if (tVal <= 0 && qVal > 0 && rVal > 0) {
        tVal = qVal * rVal;
        item.total = tVal;
      }
      grand += tVal;

      const isSelected = this._highlightedRxIndex === idx;
      const rowStyle = isSelected
        ? 'background:#a4c2e6 !important;color:#002060 !important;font-weight:700;'
        : '';
      const cellColor = isSelected ? 'color:#002060 !important;' : 'color:var(--text-primary);';

      return `
        <tr style="cursor:pointer;${rowStyle}" onclick="DashboardModule._highlightRxRow(${idx})" ondblclick="DashboardModule._selectRxRow(${idx})" title="Single click to select | Double click to edit | Click ❌ to delete">
          <td style="text-align:center;${cellColor}">${idx + 1}</td>
          <td style="font-weight:800;text-transform:uppercase;${cellColor}">${App.escHtml(item.name)}</td>
          <td style="text-align:center;${cellColor}">${item.m}</td>
          <td style="text-align:center;${cellColor}">${item.a}</td>
          <td style="text-align:center;${cellColor}">${item.n}</td>
          <td style="text-align:center;${cellColor}">${item.s}</td>
          <td style="text-align:center;${cellColor}">${item.day}</td>
          <td style="text-align:right;font-weight:700;${cellColor}">${qVal.toFixed(2)}</td>
          <td style="text-align:right;${cellColor}">${rVal.toFixed(2)}</td>
          <td style="text-align:right;font-weight:800;${cellColor}">${tVal.toFixed(2)}</td>
          <td style="font-weight:600;${cellColor}">${App.escHtml(item.remark || '')}</td>
          <td style="${cellColor}">${App.escHtml(item.method || '')}</td>
          <td style="text-align:center;width:28px;">
            <button style="border:none;background:transparent;color:#dc3545;font-weight:bold;cursor:pointer;font-size:12px;padding:0 4px;" onclick="event.stopPropagation(); DashboardModule._deleteRxRow(${idx})" title="Delete medicine">✕</button>
          </td>
        </tr>
      `;
    }).join('');

    if (grandInp) grandInp.value = `₹${grand.toFixed(2)}`;
  },

  _highlightRxRow(idx) {
    this._highlightRxIndex = idx;
    this._renderRxTable();
    const item = this._rxList[idx];
    if (item) {
      App.toast(`Selected "${item.name}". Press [Delete] key on keyboard to remove!`, 'info', 1800);
    }
  },

  _deleteHighlightedRxRow() {
    if (this._highlightRxIndex !== null && this._highlightRxIndex !== undefined && this._rxList[this._highlightRxIndex]) {
      const removed = this._rxList.splice(this._highlightRxIndex, 1);
      this._highlightRxIndex = null;
      this._selectedRxIndex = null;
      this._renderRxTable();
      App.toast(`Deleted "${removed[0]?.name}" from prescription 🗑️`, 'info', 1800);
    }
  },

  _selectRxRow(idx) {
    const item = this._rxList[idx];
    if (!item) return;
    this._selectedRxIndex = idx;
    this._highlightRxIndex = idx;

    const searchInp = document.getElementById('winRxMedSearchInp');
    if (searchInp) searchInp.value = item.name;

    const sel = document.getElementById('winRxMedSel');
    if (sel) {
      let exists = false;
      for (let i = 0; i < sel.options.length; i++) {
        if (sel.options[i].value === item.name) {
          sel.selectedIndex = i;
          exists = true;
          break;
        }
      }
      if (!exists) sel.add(new Option(item.name, item.name, true, true));
    }

    if (document.getElementById('winRxM')) document.getElementById('winRxM').value = item.m;
    if (document.getElementById('winRxA')) document.getElementById('winRxA').value = item.a;
    if (document.getElementById('winRxN')) document.getElementById('winRxN').value = item.n;
    if (document.getElementById('winRxS')) document.getElementById('winRxS').value = item.s;
    if (document.getElementById('winRxDay')) document.getElementById('winRxDay').value = item.day;
    if (document.getElementById('winRxQnty')) document.getElementById('winRxQnty').value = Number(item.qty).toFixed(2);
    if (document.getElementById('winRxRate')) document.getElementById('winRxRate').value = Number(item.rate).toFixed(2);
    if (document.getElementById('winRxTotal')) document.getElementById('winRxTotal').value = Number(item.total).toFixed(2);
    if (document.getElementById('winRxRemark')) document.getElementById('winRxRemark').value = item.remark || '';
    if (document.getElementById('winRxMethod')) document.getElementById('winRxMethod').value = item.method || '';

    this._renderRxTable();
    App.toast(`Loaded "${item.name}" into top form! Edit and click Add to update.`, 'info', 2000);
  },

  _resetRxFormRow() {
    this._selectedRxIndex = null;
    this._highlightRxIndex = null;
    this._medTypedBuffer = '';
    this._closeMedDropdown();

    const searchInp = document.getElementById('winRxMedSearchInp');
    if (searchInp) {
      searchInp.value = '';
      searchInp.removeAttribute('data-selected');
    }

    const sel = document.getElementById('winRxMedSel');
    if (sel) sel.value = '';

    if (document.getElementById('winRxStock')) document.getElementById('winRxStock').value = '';
    if (document.getElementById('winRxUnit')) document.getElementById('winRxUnit').value = '';
    if (document.getElementById('winRxM')) document.getElementById('winRxM').value = '';
    if (document.getElementById('winRxA')) document.getElementById('winRxA').value = '';
    if (document.getElementById('winRxN')) document.getElementById('winRxN').value = '';
    if (document.getElementById('winRxS')) document.getElementById('winRxS').value = '';
    if (document.getElementById('winRxDay')) document.getElementById('winRxDay').value = '';
    if (document.getElementById('winRxQnty')) document.getElementById('winRxQnty').value = '';
    if (document.getElementById('winRxRate')) document.getElementById('winRxRate').value = '0.00';
    if (document.getElementById('winRxTotal')) document.getElementById('winRxTotal').value = '0.00';
    if (document.getElementById('winRxRemark')) document.getElementById('winRxRemark').value = '';
    if (document.getElementById('winRxMethod')) document.getElementById('winRxMethod').value = '';

    const genContainer = document.getElementById('winRxGenList');
    if (genContainer) genContainer.innerHTML = '';
  },

  _addRxMedicine() {
    const sel = document.getElementById('winRxMedSel');
    const name = sel ? sel.value : '';
    if (!name) {
      App.toast('Please select a Medicine Name', 'warning');
      const searchInp = document.getElementById('winRxMedSearchInp');
      if (searchInp) searchInp.focus();
      return;
    }

    const m = document.getElementById('winRxM')?.value || '1';
    const a = document.getElementById('winRxA')?.value || '0';
    const n = document.getElementById('winRxN')?.value || '1';
    const s = document.getElementById('winRxS')?.value || '0';
    const mNum = Number(m) || 0;
    const aNum = Number(a) || 0;
    const nNum = Number(n) || 0;
    const sNum = Number(s) || 0;
    const defaultDay = Number(document.getElementById('winRxSetTabDayInp')?.value || 3);
    const day = Number(document.getElementById('winRxDay')?.value || defaultDay || 3);
    const dailyDoses = (mNum + aNum + nNum + sNum) > 0 ? (mNum + aNum + nNum + sNum) : 1;

    let qty = Number(document.getElementById('winRxQnty')?.value || 0);
    if (qty <= 0) {
      qty = dailyDoses * (day > 0 ? day : 1);
    }
    const rate = Number(document.getElementById('winRxRate')?.value || 0);
    let total = Number(document.getElementById('winRxTotal')?.value || 0);
    if (total <= 0) {
      total = qty * rate;
    }
    const remark = document.getElementById('winRxRemark')?.value || 'જમ્યા પછી (After Food)';
    const method = document.getElementById('winRxMethod')?.value || 'TABLET';

    if (this._selectedRxIndex !== null) {
      this._rxList[this._selectedRxIndex] = { name, m, a, n, s, day, qty, rate, total, remark, method };
      App.toast(`Updated medicine #${this._selectedRxIndex + 1}`, 'success');
      this._selectedRxIndex = null;
    } else {
      this._rxList.push({ name, m, a, n, s, day, qty, rate, total, remark, method });
      App.toast(`Added "${name}" (₹${total.toFixed(2)}) to prescription!`, 'success');
    }

    /* Entire Row Reset after adding medicine */
    this._resetRxFormRow();
    this._renderRxTable();

    // 🎯 Refocus automatically on Medicine Name input for rapid, flawless typing!
    setTimeout(() => {
      const searchInp = document.getElementById('winRxMedSearchInp');
      if (searchInp) {
        searchInp.value = '';
        searchInp.removeAttribute('data-selected');
        searchInp.focus();
      }
    }, 20);
  },

  _cancelRxMedicine() {
    if (this._selectedRxIndex !== null) {
      const removed = this._rxList.splice(this._selectedRxIndex, 1);
      App.toast(`Removed "${removed[0]?.name}" from prescription`, 'info');
    }
    this._resetRxFormRow();
    this._renderRxTable();
    setTimeout(() => {
      const searchInp = document.getElementById('winRxMedSearchInp');
      if (searchInp) {
        searchInp.value = '';
        searchInp.removeAttribute('data-selected');
        searchInp.focus();
      }
    }, 20);
  },

  _selectMedFromList(medName) {
    const searchInp = document.getElementById('winRxMedSearchInp');
    if (searchInp) {
      searchInp.value = medName;
      searchInp.setAttribute('data-selected', medName);
    }
    const sel = document.getElementById('winRxMedSel');
    if (sel) {
      let exists = false;
      for (let i = 0; i < sel.options.length; i++) {
        if (sel.options[i].value === medName) {
          sel.selectedIndex = i;
          exists = true;
          break;
        }
      }
      if (!exists) {
        sel.add(new Option(medName, medName, true, true));
      }
    }
    this._onRxMedChange(medName);
    App.toast(`Selected ${medName} into prescription entry!`, 'info', 1500);
  },

  _applySetDayToTable() {
    const followupDays = Number(document.getElementById('winRxFollowupDaysInp')?.value || document.getElementById('winRxDay')?.value || 5);
    this._rxList.forEach(item => {
      if (item.method === 'TABLET' || item.method === 'CAPSULE') {
        item.day = followupDays;
        const totalDosesDay = (Number(item.m) || 0) + (Number(item.a) || 0) + (Number(item.n) || 0) + (Number(item.s) || 0);
        item.qty = (totalDosesDay > 0 ? totalDosesDay : 2) * followupDays;
        item.total = item.qty * item.rate;
      }
    });
    App.toast(`Set ${followupDays} days for all tablet/capsule medicines`, 'success');
    this._renderRxTable();
  },

  _calcFollowupDateStr(numDays = 3) {
    const engDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const gujDays = ['રવિવાર', 'સોમવાર', 'મંગળવાર', 'બુધવાર', 'ગુરુવાર', 'શુક્રવાર', 'શનિવાર'];

    const d = new Date();
    d.setDate(d.getDate() + (Number(numDays) || 0));

    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();

    const dayIdx = d.getDay();
    const engDay = engDays[dayIdx];
    const gujDay = gujDays[dayIdx];

    return `${dd}/${mm}/${yyyy} ${engDay}`;
  },

  _updateFollowupDateBox() {
    const daysInp = document.getElementById('winRxFollowupDaysInp');
    const dateBox = document.getElementById('winRxFollowupDateBox');
    if (dateBox) {
      const rawVal = daysInp ? daysInp.value.trim() : '';
      if (!rawVal) {
        dateBox.value = '';
      } else {
        const days = parseInt(rawVal, 10) || 0;
        dateBox.value = this._calcFollowupDateStr(days);
      }
    }
  },

  _onFollowupDaysChange(val) {
    this._updateFollowupDateBox();
  },

  _addLastOpdPrescription() {
    const pId = this._activePatientId;
    const p = DB.getPatient ? DB.getPatient(pId) : null;
    const allRx = DB.getPrescriptions ? DB.getPrescriptions() : [];
    const patientRxList = allRx.filter(r => String(r.patientId) === String(pId));

    if (patientRxList.length > 0) {
      const lastRx = patientRxList[patientRxList.length - 1];
      if (lastRx.medications && lastRx.medications.length > 0) {
        this._rxList = lastRx.medications.map(m => ({ ...m }));
        App.toast(`Loaded last OPD prescription for ${this._activePatientName || 'Patient'}`, 'success');
        this._renderRxTable();
        return;
      }
    } else if (p && p.savedRx && Array.isArray(p.savedRx) && p.savedRx.length > 0) {
      this._rxList = p.savedRx.map(m => ({ ...m }));
      App.toast(`Loaded last OPD prescription for ${this._activePatientName || 'Patient'}`, 'success');
      this._renderRxTable();
      return;
    }

    // Default fallback
    this._rxList = [
      { name: 'PARACETAMOL 650MG', m: '1', a: '1', n: '1', s: '0', day: 3, qty: 9, rate: 20.00, total: 180.00, remark: 'જમ્યા પછી (After Food)', method: 'TABLET' },
      { name: 'PAN 40MG', m: '1', a: '0', n: '0', s: '0', day: 5, qty: 5, rate: 45.00, total: 225.00, remark: 'સવારે ભૂખ્યા પેટે (Morning Empty Stomach)', method: 'TABLET' }
    ];
    App.toast('Loaded sample prescription template', 'info');
    this._renderRxTable();
  },

  _applyRxTemplate(val) {
    if (val === 'fever') {
      this._rxList = [
        { name: 'PARACETAMOL 650MG', m: '1', a: '0', n: '1', s: '0', day: 5, qty: 10, rate: 20.00, total: 200.00, remark: 'After Food', method: 'TABLET' },
        { name: 'ALERID 10MG', m: '0', a: '0', n: '1', s: '0', day: 5, qty: 5, rate: 15.00, total: 75.00, remark: 'At Bedtime', method: 'TABLET' },
      ];
    } else if (val === 'acidity') {
      this._rxList = [
        { name: 'PAN 40MG', m: '1', a: '0', n: '0', s: '0', day: 7, qty: 7, rate: 45.00, total: 315.00, remark: 'Before Breakfast', method: 'TABLET' },
      ];
    } else if (val === 'pain') {
      this._rxList = [
        { name: 'COMBIFLAM TAB', m: '1', a: '0', n: '1', s: '0', day: 5, qty: 10, rate: 25.00, total: 250.00, remark: 'After Food', method: 'TABLET' },
      ];
    }
    App.toast('Prescription template applied', 'info');
    this._renderRxTable();
  },

  _filterRxByUse(val) {
    const container = document.getElementById('winRxUseList');
    if (!container) return;
    if (!val || !val.trim()) {
      container.innerHTML = '';
      return;
    }
    const items = [
      { name: 'Paracetamol (Fever / Pain)', val: 'PARACETAMOL 650MG' },
      { name: 'Pan 40 (Acidity / APD)', val: 'PAN 40MG' },
      { name: 'Alerid 10mg (Allergy / Cold)', val: 'ALERID 10MG' },
      { name: 'Azithral 500 (Infection)', val: 'AZITHRAL 500MG' },
      { name: 'Combiflam (Joint Pain)', val: 'COMBIFLAM TAB' },
    ].filter(i => i.name.toLowerCase().includes(val.toLowerCase().trim()));

    container.innerHTML = items.length > 0
      ? items.map(i => `<div style="padding:2px 4px;cursor:pointer;" onclick="DashboardModule._selectMedFromList('${i.val}')">${i.name}</div>`).join('')
      : `<div style="color:var(--text-muted);font-style:italic;padding:4px;">No matching medicine use</div>`;
  },

  _filterRxByGeneric(val) {
    const container = document.getElementById('winRxGenList');
    if (!container) return;
    if (!val || !val.trim()) {
      container.innerHTML = '';
      return;
    }
    const q = val.toLowerCase().trim();
    const allMeds = DB.getMedicines ? DB.getMedicines() : [];
    const matches = allMeds.filter(m => m.generic && m.generic.toLowerCase().includes(q));

    if (matches.length === 0) {
      container.innerHTML = `<div style="color:var(--text-muted);font-style:italic;padding:4px;font-size:11px;">No matching generic name</div>`;
      return;
    }

    container.innerHTML = matches.map(m => `
      <div style="padding:4px;border-bottom:1px solid var(--border-subtle);cursor:pointer;" onclick="DashboardModule._selectMedFromList('${App.escHtml(m.name)}')">
        <div style="font-weight:800;color:var(--primary);font-size:11px;">💊 ${App.escHtml(m.name)}</div>
        <div style="font-size:10px;color:var(--text-secondary);">${App.escHtml(m.generic)}</div>
      </div>
    `).join('');
  },

  _diagList: [],
  _selectedDiagIndex: null,

  _procList: [],
  _selectedProcIndex: null,

  _onHeaderDiagnosisInput(val) {
    if (!val || !val.trim()) {
      this._diagList = [];
    } else {
      this._diagList = [{ name: val.trim(), print: true }];
    }
    const tbody = document.getElementById('winDiagTbody');
    if (tbody) {
      tbody.innerHTML = this._diagList.map((item, idx) => `
        <tr style="cursor:pointer;" onclick="DashboardModule._selectDiagRow(${idx})" title="Click to select | Click ❌ to delete">
          <td style="text-align:center;">${idx + 1}</td>
          <td style="font-weight:700;">${App.escHtml(item.name)}</td>
          <td style="text-align:center;width:28px;">
            <button style="border:none;background:transparent;color:#dc3545;font-weight:bold;cursor:pointer;font-size:12px;padding:0 4px;" onclick="event.stopPropagation(); DashboardModule._deleteDiagRow(${idx})" title="Delete diagnosis">✕</button>
          </td>
        </tr>
      `).join('');
    }
  },

  _renderDiagTable() {
    const tbody = document.getElementById('winDiagTbody');
    if (!tbody) return;
    tbody.innerHTML = this._diagList.map((item, idx) => {
      const isSelected = this._selectedDiagIndex === idx;
      const rowStyle = isSelected ? 'background:#a4c2e6 !important;color:#002060 !important;font-weight:700;' : '';
      const textStyle = isSelected ? 'color:#002060 !important;' : '';
      return `
        <tr style="cursor:pointer;${rowStyle}" onclick="DashboardModule._selectDiagRow(${idx})" title="Click to select | Click ❌ to delete">
          <td style="text-align:center;${textStyle}">${idx + 1}</td>
          <td style="font-weight:700;${textStyle}">${App.escHtml(item.name)}</td>
          <td style="text-align:center;width:28px;">
            <button style="border:none;background:transparent;color:#dc3545;font-weight:bold;cursor:pointer;font-size:12px;padding:0 4px;" onclick="event.stopPropagation(); DashboardModule._deleteDiagRow(${idx})" title="Delete diagnosis">✕</button>
          </td>
        </tr>
      `;
    }).join('');

    const headerDiagInp = document.getElementById('winHeaderDiagnosis');
    if (headerDiagInp) {
      headerDiagInp.value = (this._diagList && this._diagList.length > 0)
        ? this._diagList.map(d => d.name || d.diag).filter(Boolean).join(', ')
        : '';
    }
  },

  _addDiagnosis() {
    const sel = document.getElementById('winDiagSel');
    const searchInp = document.getElementById('winDiagSearchInp');
    const name = (searchInp && searchInp.value) ? searchInp.value.trim() : (sel ? sel.value : '');
    if (!name) return;

    if (this._selectedDiagIndex !== null) {
      this._diagList[this._selectedDiagIndex] = { name, print: true };
      App.toast(`Updated diagnosis #${this._selectedDiagIndex + 1}`, 'success');
      this._selectedDiagIndex = null;
    } else {
      this._diagList.push({ name, print: true });
      App.toast(`Added "${name}" to diagnosis!`, 'success');
    }

    if (searchInp) searchInp.value = '';
    if (sel) sel.value = '';
    this._selectedDiagIndex = null;
    this._renderDiagTable();
  },

  _selectDiagRow(idx) {
    const item = this._diagList[idx];
    if (!item) return;
    this._selectedDiagIndex = idx;
    this._selectedComplainIndex = null;
    this._selectedExamIndex = null;
    this._selectedProcIndex = null;
    this._selectedRxIndex = null;

    const searchInp = document.getElementById('winDiagSearchInp');
    const sel = document.getElementById('winDiagSel');
    if (searchInp) searchInp.value = item.name;
    if (sel) sel.value = item.name;

    this._renderComplaintsTable();
    this._renderExamTable();
    this._renderDiagTable();
    this._renderProcTable();
    this._renderRxTable();
    App.toast(`Selected "${item.name}". Press DELETE key to remove.`, 'info', 1800);
  },

  _cancelDiagnosis() {
    if (this._selectedDiagIndex !== null) {
      const removed = this._diagList.splice(this._selectedDiagIndex, 1);
      App.toast(`Removed "${removed[0]?.name}" from diagnosis`, 'info');
      this._selectedDiagIndex = null;
    }
    const searchInp = document.getElementById('winDiagSearchInp');
    const sel = document.getElementById('winDiagSel');
    if (searchInp) searchInp.value = '';
    if (sel) sel.value = '';
    this._renderDiagTable();
  },

  _addLastDiagnosis() {
    const pId = this._activePatientId;
    const p = DB.getPatient ? DB.getPatient(pId) : null;
    const allVisits = DB.getVisits ? DB.getVisits() : [];
    const patientVisits = allVisits.filter(v => String(v.patientId) === String(pId) && v.diagnosis);

    let lastDiag = '';
    if (patientVisits.length > 0) {
      lastDiag = patientVisits[patientVisits.length - 1].diagnosis;
    } else if (p && p.savedDiag && p.savedDiag.length > 0) {
      lastDiag = p.savedDiag[0].name || p.savedDiag[0].diag;
    } else if (p && p.diagnosis) {
      lastDiag = p.diagnosis;
    }

    if (lastDiag) {
      this._diagList.push({ name: lastDiag, print: true });
      App.toast(`Loaded last diagnosis: "${lastDiag}"`, 'success');
    } else {
      App.toast('No previous diagnosis found for this patient.', 'warning');
    }
    this._renderDiagTable();
  },

  _onProcChange(val) {
    const sel = document.getElementById('winProcSel');
    const opt = sel ? sel.options[sel.selectedIndex] : null;
    const rate = opt ? (opt.dataset.rate || 150) : 150;
    const rateInp = document.getElementById('winProcRate');
    if (rateInp) rateInp.value = rate;
    this._calcProcTotal();
  },

  _calcProcTotal() {
    const qty = Number(document.getElementById('winProcQty')?.value || 1);
    const rate = Number(document.getElementById('winProcRate')?.value || 0);
    const totalInp = document.getElementById('winProcTotal');
    if (totalInp) totalInp.value = qty * rate;
  },

  _renderProcTable() {
    const tbody = document.getElementById('winProcTbody');
    const grandInp = document.getElementById('winProcGrandTotal');
    if (!tbody) return;

    let grand = 0;
    tbody.innerHTML = this._procList.map((item, idx) => {
      grand += Number(item.total || 0);
      const isSelected = this._selectedProcIndex === idx;
      const rowStyle = isSelected ? 'background:#a4c2e6 !important;color:#002060 !important;font-weight:700;' : '';
      const textStyle = isSelected ? 'color:#002060 !important;' : '';
      return `
        <tr style="cursor:pointer;${rowStyle}" onclick="DashboardModule._selectProcRow(${idx})" title="Click to select | Click ❌ to delete">
          <td style="text-align:center;${textStyle}">${idx + 1}</td>
          <td style="font-weight:700;${textStyle}">${App.escHtml(item.name)}</td>
          <td style="text-align:center;${textStyle}">${item.qty}</td>
          <td style="${textStyle}">₹${item.rate}</td>
          <td style="font-weight:800;${isSelected ? 'color:#002060 !important;' : 'color:var(--primary);'}">₹${item.total}</td>
          <td style="${isSelected ? 'color:#002060 !important;' : 'color:var(--text-muted);'}">${App.escHtml(item.remark || '—')}</td>
          <td style="text-align:center;width:28px;">
            <button style="border:none;background:transparent;color:#dc3545;font-weight:bold;cursor:pointer;font-size:12px;padding:0 4px;" onclick="event.stopPropagation(); DashboardModule._deleteProcRow(${idx})" title="Delete procedure">✕</button>
          </td>
        </tr>
      `;
    }).join('');

    if (grandInp) grandInp.value = `₹${grand}`;
  },

  _addProcedure() {
    const sel = document.getElementById('winProcSel');
    const searchInp = document.getElementById('winProcSearchInp');
    const name = (searchInp && searchInp.value) ? searchInp.value.trim() : (sel ? sel.value : '');
    const qty = Number(document.getElementById('winProcQty')?.value || 1);
    const rate = Number(document.getElementById('winProcRate')?.value || 0);
    const total = qty * rate;
    const remark = document.getElementById('winProcRemark')?.value.trim() || '';

    if (!name) return;

    if (this._selectedProcIndex !== null) {
      this._procList[this._selectedProcIndex] = { name, qty, rate, total, remark };
      App.toast(`Updated procedure #${this._selectedProcIndex + 1}`, 'success');
      this._selectedProcIndex = null;
    } else {
      this._procList.push({ name, qty, rate, total, remark });
      App.toast(`Added "${name}" (₹${total}) to procedures!`, 'success');
    }

    if (searchInp) searchInp.value = '';
    if (sel) sel.value = '';
    if (document.getElementById('winProcQty')) document.getElementById('winProcQty').value = '';
    if (document.getElementById('winProcRate')) document.getElementById('winProcRate').value = '';
    if (document.getElementById('winProcTotal')) document.getElementById('winProcTotal').value = '';
    if (document.getElementById('winProcRemark')) document.getElementById('winProcRemark').value = '';
    this._selectedProcIndex = null;
    this._renderProcTable();
  },

  _selectProcRow(idx) {
    const item = this._procList[idx];
    if (!item) return;
    this._selectedProcIndex = idx;
    this._selectedComplainIndex = null;
    this._selectedExamIndex = null;
    this._selectedDiagIndex = null;
    this._selectedRxIndex = null;

    const searchInp = document.getElementById('winProcSearchInp');
    const sel = document.getElementById('winProcSel');
    const qtyInp = document.getElementById('winProcQty');
    const rateInp = document.getElementById('winProcRate');
    const totalInp = document.getElementById('winProcTotal');
    const remarkInp = document.getElementById('winProcRemark');

    if (searchInp) searchInp.value = item.name;
    if (sel) sel.value = item.name;
    if (qtyInp) qtyInp.value = item.qty;
    if (rateInp) rateInp.value = item.rate;
    if (totalInp) totalInp.value = item.total;
    if (remarkInp) remarkInp.value = item.remark || '';

    this._renderComplaintsTable();
    this._renderExamTable();
    this._renderDiagTable();
    this._renderProcTable();
    this._renderRxTable();
    App.toast(`Selected "${item.name}". Press DELETE key to remove.`, 'info', 1800);
  },

  _cancelProcedure() {
    this._selectedProcIndex = null;
    const searchInp = document.getElementById('winProcSearchInp');
    const sel = document.getElementById('winProcSel');
    const qtyInp = document.getElementById('winProcQty');
    const rateInp = document.getElementById('winProcRate');
    const totalInp = document.getElementById('winProcTotal');
    const remarkInp = document.getElementById('winProcRemark');

    if (searchInp) searchInp.value = '';
    if (sel) sel.value = '';
    if (qtyInp) qtyInp.value = '';
    if (rateInp) rateInp.value = '';
    if (totalInp) totalInp.value = '';
    if (remarkInp) remarkInp.value = '';
    this._renderProcTable();
  },

  _genericTypedBuffer: '',
  _genericBufferTimer: null,
  _genericFocusIdx: -1,

  _toggleGenericDropdown(listId, searchInpId, filterFn) {
    const dropdown = document.getElementById(listId);
    if (dropdown) {
      if (dropdown.style.display === 'block') {
        dropdown.style.display = 'none';
      } else {
        filterFn.call(this, '');
        dropdown.style.display = 'block';
        document.getElementById(searchInpId)?.focus();
      }
    }
  },

  _openGenericDropdown(listId, searchInpId, filterFn) {
    const dropdown = document.getElementById(listId);
    if (dropdown) {
      filterFn.call(this, this._genericTypedBuffer || '');
      dropdown.style.display = 'block';
    }
  },

  _filterOptionsDropdown(listId, selId, query, selectFnName) {
    const dropdown = document.getElementById(listId);
    const sel = document.getElementById(selId);
    if (!dropdown || !sel) return;

    const opts = Array.from(sel.options).filter(o => o.value).map(o => ({ value: o.value, text: o.text }));
    opts.sort((a, b) => a.text.localeCompare(b.text, undefined, { sensitivity: 'base' }));

    const q = (query || '').trim().toLowerCase();
    const filtered = q ? opts.filter(o => o.text.toLowerCase().includes(q)) : opts;

    this._genericFocusIdx = filtered.length > 0 ? 0 : -1;

    if (filtered.length === 0) {
      dropdown.innerHTML = `<div style="padding:6px 8px;font-size:11px;color:var(--text-muted);font-style:italic;">No item matching "${App.escHtml(query)}"</div>`;
      return;
    }

    dropdown.innerHTML = filtered.map((o, idx) => {
      const isFocused = idx === this._genericFocusIdx;
      const bg = isFocused ? 'background:#a4c2e6;color:#002060;' : '';
      return `
        <div class="gen-opt-item" data-idx="${idx}" data-val="${App.escHtml(o.value)}"
             style="padding:6px 10px;font-size:11px;font-weight:700;cursor:pointer;border-bottom:1px solid var(--border);${bg}"
             onmouseenter="DashboardModule._setGenericItemFocus(this, ${idx})"
             onclick="DashboardModule.${selectFnName}('${App.escHtml(o.value)}')">
          <span>${App.escHtml(o.text)}</span>
        </div>
      `;
    }).join('');
  },

  _setGenericItemFocus(el, idx) {
    this._genericFocusIdx = idx;
    const parent = el.closest('.typeahead-dropdown-list') || (el && el.parentElement);
    if (parent) {
      parent.querySelectorAll('.gen-opt-item').forEach((item, i) => {
        if (i === idx) {
          item.style.background = '#a4c2e6';
          item.style.color = '#002060';
        } else {
          item.style.background = '';
          item.style.color = '#000000';
        }
      });
    }
  },

  _onGenericKeyDown(e, listId, searchInpId, selId, selectFn) {
    const dropdown = document.getElementById(listId);
    const items = dropdown ? dropdown.querySelectorAll('.gen-opt-item') : [];

    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      this._genericTypedBuffer += e.key;
      if (dropdown) dropdown.style.display = 'block';

      if (selId === 'winCompSel') this._filterCompDropdown(this._genericTypedBuffer);
      else if (selId === 'winExamSel') this._filterExamDropdown(this._genericTypedBuffer);
      else if (selId === 'winDiagSel') this._filterDiagDropdown(this._genericTypedBuffer);
      else if (selId === 'winProcSel') this._filterProcDropdown(this._genericTypedBuffer);

      if (this._genericBufferTimer) clearTimeout(this._genericBufferTimer);
      this._genericBufferTimer = setTimeout(() => {
        this._genericTypedBuffer = '';
      }, 1500);
      return;
    }

    if (e.key === 'Backspace') {
      e.preventDefault();
      if (this._genericTypedBuffer.length > 0) {
        this._genericTypedBuffer = this._genericTypedBuffer.slice(0, -1);
        if (selId === 'winCompSel') this._filterCompDropdown(this._genericTypedBuffer);
        else if (selId === 'winExamSel') this._filterExamDropdown(this._genericTypedBuffer);
        else if (selId === 'winDiagSel') this._filterDiagDropdown(this._genericTypedBuffer);
        else if (selId === 'winProcSel') this._filterProcDropdown(this._genericTypedBuffer);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (dropdown && dropdown.style.display === 'none') dropdown.style.display = 'block';
      if (items.length > 0) {
        this._genericFocusIdx = (this._genericFocusIdx + 1) % items.length;
        this._setGenericItemFocus(items[this._genericFocusIdx], this._genericFocusIdx);
        items[this._genericFocusIdx]?.scrollIntoView({ block: 'nearest' });
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (items.length > 0) {
        this._genericFocusIdx = (this._genericFocusIdx - 1 + items.length) % items.length;
        this._setGenericItemFocus(items[this._genericFocusIdx], this._genericFocusIdx);
        items[this._genericFocusIdx]?.scrollIntoView({ block: 'nearest' });
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (items.length > 0 && this._genericFocusIdx >= 0 && items[this._genericFocusIdx]) {
        const val = items[this._genericFocusIdx].getAttribute('data-val');
        if (val) selectFn.call(this, val);
      }
    } else if (e.key === 'Escape') {
      if (dropdown) dropdown.style.display = 'none';
    }
  },

  _filterCompDropdown(q) { this._filterOptionsDropdown('winCompDropdownList', 'winCompSel', q, '_selectCompFromSearch'); },
  _selectCompFromSearch(val) {
    const inp = document.getElementById('winCompSearchInp');
    const sel = document.getElementById('winCompSel');
    if (inp) inp.value = val;
    if (sel) sel.value = val;
    const dropdown = document.getElementById('winCompDropdownList');
    if (dropdown) dropdown.style.display = 'none';
    this._genericTypedBuffer = '';
  },

  _filterExamDropdown(q) { this._filterOptionsDropdown('winExamDropdownList', 'winExamSel', q, '_selectExamFromSearch'); },
  _selectExamFromSearch(val) {
    const inp = document.getElementById('winExamSearchInp');
    const sel = document.getElementById('winExamSel');
    if (inp) inp.value = val;
    if (sel) sel.value = val;
    const dropdown = document.getElementById('winExamDropdownList');
    if (dropdown) dropdown.style.display = 'none';
    this._genericTypedBuffer = '';
  },

  _filterDiagDropdown(q) { this._filterOptionsDropdown('winDiagDropdownList', 'winDiagSel', q, '_selectDiagFromSearch'); },
  _selectDiagFromSearch(val) {
    const inp = document.getElementById('winDiagSearchInp');
    const sel = document.getElementById('winDiagSel');
    if (inp) inp.value = val;
    if (sel) sel.value = val;
    const dropdown = document.getElementById('winDiagDropdownList');
    if (dropdown) dropdown.style.display = 'none';
    this._genericTypedBuffer = '';
  },

  _filterProcDropdown(q) { this._filterOptionsDropdown('winProcDropdownList', 'winProcSel', q, '_selectProcFromSearch'); },
  _selectProcFromSearch(val) {
    const inp = document.getElementById('winProcSearchInp');
    const sel = document.getElementById('winProcSel');
    if (inp) inp.value = val;
    if (sel) sel.value = val;
    const dropdown = document.getElementById('winProcDropdownList');
    if (dropdown) dropdown.style.display = 'none';
    this._genericTypedBuffer = '';
    this._onProcChange(val);
  },

  _complaintsList: [],
  _selectedComplainIndex: null,

  _examList: [],
  _selectedExamIndex: null,

  _deleteComplaintRow(idx) {
    if (!this._complaintsList || !this._complaintsList[idx]) return;
    const removed = this._complaintsList.splice(idx, 1);
    this._selectedComplainIndex = null;
    const searchInp = document.getElementById('winCompSearchInp');
    const sel = document.getElementById('winCompSel');
    const remarkInp = document.getElementById('winCompRemark');
    if (searchInp) searchInp.value = '';
    if (sel) sel.value = '';
    if (remarkInp) remarkInp.value = '';
    this._renderComplaintsTable();
    if (removed[0]) App.toast(`Deleted complaint "${removed[0].name}" 🗑️`, 'info', 1800);
  },

  _deleteExamRow(idx) {
    if (!this._examList || !this._examList[idx]) return;
    const removed = this._examList.splice(idx, 1);
    this._selectedExamIndex = null;
    const searchInp = document.getElementById('winExamSearchInp');
    const sel = document.getElementById('winExamSel');
    const resInp = document.getElementById('winExamRes');
    if (searchInp) searchInp.value = '';
    if (sel) sel.value = '';
    if (resInp) resInp.value = '';
    this._renderExamTable();
    if (removed[0]) App.toast(`Deleted examination "${removed[0].name}" 🗑️`, 'info', 1800);
  },

  _deleteDiagRow(idx) {
    if (!this._diagList || !this._diagList[idx]) return;
    const removed = this._diagList.splice(idx, 1);
    this._selectedDiagIndex = null;
    const searchInp = document.getElementById('winDiagSearchInp');
    const sel = document.getElementById('winDiagSel');
    if (searchInp) searchInp.value = '';
    if (sel) sel.value = '';
    this._renderDiagTable();
    if (removed[0]) App.toast(`Deleted diagnosis "${removed[0].name}" 🗑️`, 'info', 1800);
  },

  _deleteProcRow(idx) {
    if (!this._procList || !this._procList[idx]) return;
    const removed = this._procList.splice(idx, 1);
    this._selectedProcIndex = null;
    const searchInp = document.getElementById('winProcSearchInp');
    const sel = document.getElementById('winProcSel');
    const qtyInp = document.getElementById('winProcQty');
    const rateInp = document.getElementById('winProcRate');
    const totalInp = document.getElementById('winProcTotal');
    const remarkInp = document.getElementById('winProcRemark');
    if (searchInp) searchInp.value = '';
    if (sel) sel.value = '';
    if (qtyInp) qtyInp.value = '';
    if (rateInp) rateInp.value = '';
    if (totalInp) totalInp.value = '';
    if (remarkInp) remarkInp.value = '';
    this._renderProcTable();
    if (removed[0]) App.toast(`Deleted procedure "${removed[0].name}" 🗑️`, 'info', 1800);
  },

  _deleteRxRow(idx) {
    if (!this._rxList || !this._rxList[idx]) return;
    const removed = this._rxList.splice(idx, 1);
    this._selectedRxIndex = null;
    this._highlightRxIndex = null;
    this._renderRxTable();
    if (removed[0]) App.toast(`Deleted medicine "${removed[0].name}" 🗑️`, 'info', 1800);
  },

  _formatCompDays(el) {
    if (!el) return;
    const val = el.value.trim();
    if (!val) return;
    const pureNumMatch = val.match(/^(\d+)(\s*days?)?$/i);
    if (pureNumMatch) {
      const num = parseInt(pureNumMatch[1], 10);
      el.value = `${num} ${num === 1 ? 'Day' : 'Days'}`;
    }
  },

  _renderComplaintsTable() {
    const tbody = document.getElementById('winCompTbody');
    if (!tbody) return;
    if (!this._complaintsList || this._complaintsList.length === 0) {
      tbody.innerHTML = '';
      return;
    }
    tbody.innerHTML = this._complaintsList.map((item, idx) => {
      const isSelected = this._selectedComplainIndex === idx;
      const rowStyle = isSelected ? 'background:#a4c2e6 !important;color:#002060 !important;font-weight:700;' : '';
      const textStyle = isSelected ? 'color:#002060 !important;' : '';
      return `
        <tr style="cursor:pointer;${rowStyle}" onclick="DashboardModule._selectComplaintRow(${idx})" title="Click to select | Click ❌ to delete">
          <td style="text-align:center;${textStyle}">${idx + 1}</td>
          <td style="font-weight:700;${textStyle}">${App.escHtml(item.name)}</td>
          <td style="text-align:center;font-weight:700;${isSelected ? 'color:#002060 !important;' : 'color:var(--primary);'}">${App.escHtml(item.days || item.duration || '—')}</td>
          <td style="${isSelected ? 'color:#002060 !important;' : 'color:var(--text-secondary);'}">${App.escHtml(item.remark || '—')}</td>
          <td style="text-align:center;width:28px;">
            <button style="border:none;background:transparent;color:#dc3545;font-weight:bold;cursor:pointer;font-size:12px;padding:0 4px;" onclick="event.stopPropagation(); DashboardModule._deleteComplaintRow(${idx})" title="Delete complaint">✕</button>
          </td>
        </tr>
      `;
    }).join('');
  },

  _modalKeyListenerAttached: false,
  _setupModalKeyListeners() {
    if (this._modalKeyListenerAttached) return;
    this._modalKeyListenerAttached = true;

    const handleKeyDelete = (e) => {
      const modal = document.getElementById('modal');
      if (!modal || (!modal.classList.contains('active') && modal.style.display === 'none')) return;

      const keyName = (e.key || '').toLowerCase();
      const isDeleteKey = (keyName === 'delete' || keyName === 'del' || e.code === 'Delete' || e.keyCode === 46 || e.keyCode === 110);
      const isBackspaceKey = (keyName === 'backspace' || e.code === 'Backspace' || e.keyCode === 8);

      const activeEl = document.activeElement;
      const isInput = activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.tagName === 'SELECT');

      if (isDeleteKey || (isBackspaceKey && !isInput)) {
        if (DashboardModule._selectedComplainIndex !== null && DashboardModule._selectedComplainIndex !== undefined) {
          e.preventDefault();
          e.stopPropagation();
          DashboardModule._deleteComplaintRow(DashboardModule._selectedComplainIndex);
          return;
        }

        if (DashboardModule._selectedExamIndex !== null && DashboardModule._selectedExamIndex !== undefined) {
          e.preventDefault();
          e.stopPropagation();
          DashboardModule._deleteExamRow(DashboardModule._selectedExamIndex);
          return;
        }

        if (DashboardModule._selectedDiagIndex !== null && DashboardModule._selectedDiagIndex !== undefined) {
          e.preventDefault();
          e.stopPropagation();
          DashboardModule._deleteDiagRow(DashboardModule._selectedDiagIndex);
          return;
        }

        if (DashboardModule._selectedProcIndex !== null && DashboardModule._selectedProcIndex !== undefined) {
          e.preventDefault();
          e.stopPropagation();
          DashboardModule._deleteProcRow(DashboardModule._selectedProcIndex);
          return;
        }

        const rxIdx = DashboardModule._selectedRxIndex !== null ? DashboardModule._selectedRxIndex : DashboardModule._highlightRxIndex;
        if (rxIdx !== null && rxIdx !== undefined) {
          e.preventDefault();
          e.stopPropagation();
          DashboardModule._deleteRxRow(rxIdx);
          return;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDelete, true);
    document.addEventListener('keydown', handleKeyDelete, true);
  },

  _addComplaint() {
    const sel = document.getElementById('winCompSel');
    const searchInp = document.getElementById('winCompSearchInp');
    const daysInp = document.getElementById('winCompDays');
    const remarkInp = document.getElementById('winCompRemark');

    const name = (searchInp && searchInp.value) ? searchInp.value.trim() : (sel ? sel.value : '');
    let days = daysInp ? daysInp.value.trim() : '';
    let remark = remarkInp ? remarkInp.value.trim() : '';

    if (!name) { App.toast('Please select or type a complaint', 'warning'); return; }

    if (days !== '') {
      const pureNumMatch = days.match(/^(\d+)(\s*days?)?$/i);
      if (pureNumMatch) {
        const num = parseInt(pureNumMatch[1], 10);
        days = `${num} ${num === 1 ? 'Day' : 'Days'}`;
      }
    }

    if (this._selectedComplainIndex !== null && this._selectedComplainIndex !== undefined) {
      this._complaintsList[this._selectedComplainIndex] = { name, days, remark };
      App.toast(`Updated complaint #${this._selectedComplainIndex + 1}`, 'success');
      this._selectedComplainIndex = null;
    } else {
      this._complaintsList.push({ name, days, remark });
      App.toast(`Added "${name}" to complaints table!`, 'success');
    }

    if (searchInp) searchInp.value = '';
    if (sel) sel.value = '';
    if (daysInp) daysInp.value = '';
    if (remarkInp) remarkInp.value = '';
    this._selectedComplainIndex = null;
    this._renderComplaintsTable();
  },

  _selectComplaintRow(idx) {
    const item = this._complaintsList[idx];
    if (!item) return;
    this._selectedComplainIndex = idx;
    this._selectedExamIndex = null;
    this._selectedDiagIndex = null;
    this._selectedProcIndex = null;
    this._selectedRxIndex = null;

    const searchInp = document.getElementById('winCompSearchInp');
    const sel = document.getElementById('winCompSel');
    const daysInp = document.getElementById('winCompDays');
    const remarkInp = document.getElementById('winCompRemark');

    if (searchInp) searchInp.value = item.name;
    if (sel) sel.value = item.name;
    if (daysInp) daysInp.value = item.days || item.duration || '';
    if (remarkInp) remarkInp.value = item.remark || '';

    this._renderComplaintsTable();
    this._renderExamTable();
    this._renderDiagTable();
    this._renderProcTable();
    this._renderRxTable();
    App.toast(`Selected "${item.name}". Press DELETE key or click Cancel to remove.`, 'info', 1800);
  },

  _cancelComplaint() {
    const searchInp = document.getElementById('winCompSearchInp');
    const sel = document.getElementById('winCompSel');
    const daysInp = document.getElementById('winCompDays');
    const remarkInp = document.getElementById('winCompRemark');
    if (searchInp) searchInp.value = '';
    if (sel) sel.value = '';
    if (daysInp) daysInp.value = '';
    if (remarkInp) remarkInp.value = '';
    this._selectedComplainIndex = null;
    this._renderComplaintsTable();
  },

  _labList: [],
  _radioList: [],
  _reportList: [],

  _addLabTest() {
    const labInp = document.getElementById('winLabInp');
    const labNameInp = document.getElementById('winLabNameInp');
    const inv = labInp ? labInp.value : '';
    const lab = labNameInp ? labNameInp.value : '';
    if (!inv) { App.toast('Please select an investigation', 'warning'); return; }
    const today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' });
    this._labList.push({ inv, lab: lab || 'Main Parth Pathology', rs: 100, recive: '-', date: today });
    if (labInp) labInp.value = '';
    if (labNameInp) labNameInp.value = '';
    this._renderLabTable();
    App.toast(`Added investigation "${inv}"`, 'success');
  },

  _cancelLabTest() {
    const labInp = document.getElementById('winLabInp');
    const labNameInp = document.getElementById('winLabNameInp');
    if (labInp) labInp.value = '';
    if (labNameInp) labNameInp.value = '';
  },

  _renderLabTable() {
    const tbody = document.getElementById('winLabTbody');
    const amtEl = document.getElementById('winLabTotalAmt');
    if (!tbody) return;

    if (!this._labList || this._labList.length === 0) {
      tbody.innerHTML = '';
      if (amtEl) amtEl.innerText = 'Amount : 0';
      return;
    }

    let totalAmt = 0;
    tbody.innerHTML = this._labList.map((item, idx) => {
      const rsVal = Number(item.rs || item.amt || 0);
      totalAmt += rsVal;
      const invName = item.inv || item.name || item.investigation || item.reportName || 'Lab Test';
      const labName = item.lab || item.labName || 'Main Parth Pathology';
      const reciveStatus = (item.receive || item.done) ? 'Done' : '-';
      const dateStr = item.date || '';

      return `
        <tr>
          <td style="font-weight:700;">${App.escHtml(invName)}</td>
          <td>${App.escHtml(labName)}</td>
          <td>${rsVal}</td>
          <td style="text-align:center;font-weight:700;color:${reciveStatus === 'Done' ? '#16a34a' : 'inherit'};">${reciveStatus}</td>
          <td>${App.escHtml(dateStr)}</td>
          <td style="text-align:center;width:28px;">
            <button style="border:none;background:transparent;color:#dc3545;font-weight:bold;cursor:pointer;font-size:12px;padding:0 4px;" onclick="DashboardModule._labList.splice(${idx},1);DashboardModule._renderLabTable();" title="Delete">✕</button>
          </td>
        </tr>
      `;
    }).join('');

    if (amtEl) amtEl.innerText = `Amount : ${totalAmt}`;
  },

  _addRadioTest() {
    const catInp = document.getElementById('winRadioCatInp');
    const radInp = document.getElementById('winRadioInp');
    const labInp = document.getElementById('winRadioLabInp');
    const cat = catInp ? catInp.value : '';
    const rad = radInp ? radInp.value : '';
    const lab = labInp ? labInp.value : '';
    if (!rad) { App.toast('Please select a radiology test', 'warning'); return; }
    this._radioList.push({ cat: cat || 'X-RAY', rad, lab: lab || 'Parth X-Ray Lab', recive: '-' });
    if (catInp) catInp.value = '';
    if (radInp) radInp.value = '';
    if (labInp) labInp.value = '';
    this._renderRadioTable();
    App.toast(`Added radiology "${rad}"`, 'success');
  },

  _cancelRadioTest() {
    const catInp = document.getElementById('winRadioCatInp');
    const radInp = document.getElementById('winRadioInp');
    const labInp = document.getElementById('winRadioLabInp');
    if (catInp) catInp.value = '';
    if (radInp) radInp.value = '';
    if (labInp) labInp.value = '';
  },

  _renderRadioTable() {
    const tbody = document.getElementById('winRadioTbody');
    if (!tbody) return;
    if (!this._radioList || this._radioList.length === 0) {
      tbody.innerHTML = '';
      return;
    }
    tbody.innerHTML = this._radioList.map((item, idx) => `
      <tr>
        <td>${idx + 1}</td>
        <td>${App.escHtml(item.cat)}</td>
        <td>${App.escHtml(item.rad)}</td>
        <td>${App.escHtml(item.lab)}</td>
        <td style="text-align:center;">-</td>
        <td style="text-align:center;width:28px;">
          <button style="border:none;background:transparent;color:#dc3545;font-weight:bold;cursor:pointer;font-size:12px;padding:0 4px;" onclick="DashboardModule._radioList.splice(${idx},1);DashboardModule._renderRadioTable();" title="Delete">✕</button>
        </td>
      </tr>
    `).join('');
  },

  _addReportTest() {
    const repInp = document.getElementById('winReportInp');
    const resInp = document.getElementById('winReportResInp');
    const remInp = document.getElementById('winReportRemInp');
    const rep = repInp ? repInp.value.trim() : '';
    const res = resInp ? resInp.value.trim() : '';
    const rem = remInp ? remInp.value.trim() : '';
    if (!rep) { App.toast('Please enter report name', 'warning'); return; }
    this._reportList.push({ rep, res, unit: 'g/dL', rem: rem || 'Normal' });
    if (repInp) repInp.value = '';
    if (resInp) resInp.value = '';
    if (remInp) remInp.value = '';
    this._renderReportTable();
    App.toast(`Added report "${rep}"`, 'success');
  },

  _renderReportTable() {
    const tbody = document.getElementById('winReportTbody');
    if (!tbody) return;
    if (!this._reportList || this._reportList.length === 0) {
      tbody.innerHTML = '';
      return;
    }
    tbody.innerHTML = this._reportList.map((item, idx) => `
      <tr>
        <td>${idx + 1}</td>
        <td>${App.escHtml(item.rep || item.name || item.report || '')}</td>
        <td>${App.escHtml(item.res || item.result || '-')}</td>
        <td>${App.escHtml(item.unit || '-')}</td>
        <td>${App.escHtml(item.rem || item.remark || '')}</td>
        <td style="text-align:center;width:28px;">
          <button style="border:none;background:transparent;color:#dc3545;font-weight:bold;cursor:pointer;font-size:12px;padding:0 4px;" onclick="DashboardModule._reportList.splice(${idx},1);DashboardModule._renderReportTable();" title="Delete">✕</button>
        </td>
      </tr>
    `).join('');
  },

  _cancelComplaint() {
    if (this._selectedComplainIndex !== null && this._complaintsList[this._selectedComplainIndex]) {
      const removed = this._complaintsList.splice(this._selectedComplainIndex, 1);
      App.toast(`Deleted complaint "${removed[0]?.name}" 🗑️`, 'info', 1500);
      this._selectedComplainIndex = null;
    }
    const searchInp = document.getElementById('winCompSearchInp');
    const sel = document.getElementById('winCompSel');
    const remarkInp = document.getElementById('winCompRemark');
    if (searchInp) searchInp.value = '';
    if (sel) sel.value = '';
    if (remarkInp) remarkInp.value = '';
    this._renderComplaintsTable();
  },

  _onHistoryCaseTypeChange(caseTypeName) {
    const charges = DB.getCharges() || [];
    const ch = charges.find(c => c.name === caseTypeName);
    if (ch) {
      const fileRsEl = document.getElementById('winHeaderFileRs');
      const netAmtEl = document.getElementById('winHeaderNetAmt');
      if (fileRsEl) fileRsEl.value = ch.amount || 100;
      if (netAmtEl) netAmtEl.value = ch.amount || 100;
      if (ch.category && document.getElementById('winHeaderGroup')) {
        document.getElementById('winHeaderGroup').value = ch.category;
      }
    }
  },

  _onHistoryGroupChange(groupCategory) {
    const charges = DB.getCharges() || [];
    const matched = charges.find(c => (c.category === groupCategory) || (c.name === groupCategory));
    if (matched && document.getElementById('winHeaderCaseType')) {
      document.getElementById('winHeaderCaseType').value = matched.name;
      this._onHistoryCaseTypeChange(matched.name);
    }
  },

  _addLastComplaints() {
    this._complaintsList.push({ name: 'Headache & Dizziness', remark: 'Off and on since yesterday' });
    App.toast('Loaded last complaints', 'info');
    this._renderComplaintsTable();
  },

  _applyComplaintTemplate(val) {
    if (val === 'fever') {
      this._complaintsList = [
        { name: 'Fever with chills', remark: 'High grade for 3 days' },
        { name: 'Cough & Cold', remark: 'Dry cough with throat irritation' },
      ];
    } else if (val === 'htn') {
      this._complaintsList = [
        { name: 'Headache & Dizziness', remark: 'Occipital headache in morning' },
      ];
    } else if (val === 'dm') {
      this._complaintsList = [
        { name: 'Epigastric pain & fullness', remark: 'Mild post-prandial discomfort' },
      ];
    }
    App.toast('Template applied', 'info');
    this._renderComplaintsTable();
  },

  _renderExamTable() {
    const tbody = document.getElementById('winExamTbody');
    if (!tbody) return;
    if (!this._examList || this._examList.length === 0) {
      tbody.innerHTML = '';
      return;
    }
    tbody.innerHTML = this._examList.map((item, idx) => {
      const isSelected = this._selectedExamIndex === idx;
      const rowStyle = isSelected ? 'background:#a4c2e6 !important;color:#002060 !important;font-weight:700;' : '';
      const textStyle = isSelected ? 'color:#002060 !important;' : '';
      return `
        <tr style="cursor:pointer;${rowStyle}" onclick="DashboardModule._selectExamRow(${idx})" title="Click to select | Click ❌ to delete">
          <td style="text-align:center;${textStyle}">${idx + 1}</td>
          <td style="font-weight:700;${textStyle}">${App.escHtml(item.name)}</td>
          <td style="${textStyle}">${App.escHtml(item.result || '—')}</td>
          <td style="${isSelected ? 'color:#002060 !important;' : 'color:var(--text-muted);'}">${App.escHtml(item.unit || '—')}</td>
          <td style="text-align:center;width:28px;">
            <button style="border:none;background:transparent;color:#dc3545;font-weight:bold;cursor:pointer;font-size:12px;padding:0 4px;" onclick="event.stopPropagation(); DashboardModule._deleteExamRow(${idx})" title="Delete examination">✕</button>
          </td>
        </tr>
      `;
    }).join('');
  },

  /* ── Visit Date Navigation (<< Previous Visit | >> Next Visit) ── */
  _navigateVisit(direction) {
    if (!this._activePatientId) return;

    const patientVisits = (DB.getVisits() || []).filter(v => v.patientId === this._activePatientId);
    if (patientVisits.length === 0) {
      App.toast('No previous visit records found for this patient', 'info');
      return;
    }

    if (this._activePatientVisitIndex === undefined || this._activePatientVisitIndex === null) {
      this._activePatientVisitIndex = patientVisits.length - 1;
    }

    const newIdx = this._activePatientVisitIndex + direction;
    if (newIdx < 0) {
      App.toast('Already showing earliest visit record for this patient', 'warning');
      return;
    }
    if (newIdx >= patientVisits.length) {
      App.toast('Already showing latest visit record for this patient', 'warning');
      return;
    }

    this._activePatientVisitIndex = newIdx;
    const targetVisit = patientVisits[newIdx];

    if (targetVisit.complaints) this._complaintsList = [...targetVisit.complaints];
    if (targetVisit.diagnosis) this._diagList = [...targetVisit.diagnosis];
    if (targetVisit.prescription) this._rxList = [...targetVisit.prescription];

    this._renderComplaintsTable();
    this._renderExamTable();
    this._renderDiagTable();
    this._renderProcTable();
    this._renderRxTable();

    App.toast(`Loaded Visit Date: ${targetVisit.date || 'Visit #' + (newIdx + 1)} (${newIdx + 1} of ${patientVisits.length}) 📅`, 'info', 2200);
  },

  /* ── Previous Patient Data History Modal ── */
  openPreviousPatientDataHistoryModal() {
    const pId = this._activePatientId;
    const p = (DB.getPatients() || []).find(item => item.id === pId) || { name: 'Patient' };

    const ageStr = App.getAgeStr ? App.getAgeStr(p.dob) : '32 Yrs';

    const body = `
      <div style="padding:4px 8px;">
        <!-- Demographic Summary Header -->
        <div style="background:var(--bg-elevated);border:1px solid var(--border-strong);padding:10px 14px;border-radius:6px;margin-bottom:14px;display:flex;flex-wrap:wrap;gap:14px;font-size:12px;font-weight:700;">
          <div><span style="color:var(--text-muted);">Patient ID:</span> <strong style="color:var(--primary);">${p.id || '1'}</strong></div>
          <div><span style="color:var(--text-muted);">Name:</span> <strong>${App.escHtml(p.name || '')}</strong></div>
          <div><span style="color:var(--text-muted);">Mobile:</span> <strong>${App.escHtml(p.phone || '—')}</strong></div>
          <div><span style="color:var(--text-muted);">Sex/Age:</span> <strong>${App.escHtml(p.gender || 'MALE')} / ${ageStr}</strong></div>
          <div><span style="color:var(--text-muted);">Blood Group:</span> <strong>${App.escHtml(p.bloodGroup || '—')}</strong></div>
        </div>

        <!-- Suffering Bar -->
        <div style="margin-bottom:12px;">
          <label style="font-size:11px;font-weight:800;margin-bottom:4px;display:block;color:var(--text-primary);">Suffering :</label>
          <input type="text" class="form-control" id="prevHistSufferingInp" value="${App.escHtml(p.suffering || '')}" placeholder="e.g. Hypertension, Acid Reflux, Asthma…" style="font-size:13px;font-weight:700;height:34px;" autofocus>
        </div>

        <!-- Since Bar -->
        <div style="margin-bottom:12px;">
          <label style="font-size:11px;font-weight:800;margin-bottom:4px;display:block;color:var(--text-primary);">Since :</label>
          <input type="text" class="form-control" id="prevHistSinceInp" value="${App.escHtml(p.since || '')}" placeholder="e.g. 2 Years, 6 Months…" style="font-size:13px;font-weight:700;height:34px;">
        </div>

        <!-- Blank Notepad Square Box -->
        <div>
          <label style="font-size:11px;font-weight:800;margin-bottom:4px;display:block;color:var(--text-primary);">Patient Past History Notes :</label>
          <textarea class="form-control" id="prevHistNotesTextarea" style="width:100%;height:180px;font-size:13px;line-height:1.6;font-family:'Segoe UI', sans-serif;font-weight:600;padding:12px;outline:none;resize:vertical;" placeholder="Type detailed patient history notes, previous treatments, family history, drug allergies...">${App.escHtml(p.historyNotes || '')}</textarea>
        </div>
      </div>
    `;

    const footer = `
      <button class="btn btn-secondary" onclick="DashboardModule.openPatientHistoryModal('${pId}')">✕ Cancel</button>
      <button class="btn btn-primary" style="font-weight:800;background:var(--primary);color:#fff;" onclick="DashboardModule._confirmSavePreviousPatientHistory()">💾 Save</button>
    `;

    App.openModal(`📋 Previous Patient Data History — ${App.escHtml(p.name || '')}`, body, footer, true);
  },

  _confirmSavePreviousPatientHistory() {
    const suffering = document.getElementById('prevHistSufferingInp')?.value.trim() || '';
    const since = document.getElementById('prevHistSinceInp')?.value.trim() || '';
    const historyNotes = document.getElementById('prevHistNotesTextarea')?.value || '';

    this._pendingSuffering = suffering;
    this._pendingSince = since;
    this._pendingHistoryNotes = historyNotes;

    // Confirmation Popup Modal with Yes / No
    const body = `
      <div style="padding:16px 8px;text-align:center;font-size:14px;font-weight:700;color:var(--text-primary);">
        Are you sure you want to save this patient history data?
      </div>
    `;

    const footer = `
      <button class="btn btn-secondary" style="min-width:80px;font-weight:700;" onclick="DashboardModule.openPreviousPatientDataHistoryModal()">No</button>
      <button class="btn btn-primary" style="min-width:80px;font-weight:800;background:var(--primary);color:#fff;" onclick="DashboardModule._executeSavePreviousPatientHistory()">Yes</button>
    `;

    App.openModal('❓ Confirmation Required', body, footer);
  },

  _executeSavePreviousPatientHistory() {
    const pId = this._activePatientId;
    if (!pId) return;

    DB.updatePatient(pId, {
      suffering: this._pendingSuffering || '',
      since: this._pendingSince || '',
      historyNotes: this._pendingHistoryNotes || ''
    });

    // Re-open Patient History Entry modal so user returns directly to Patient History Entry!
    this.openPatientHistoryModal(pId);
    App.toast('Patient history data saved successfully! ✅', 'success', 2500);
  },

  /* ── All History Modal (Patient Historical Timeline & Follow-up Clinical Visit Details) ── */
  _showAllHistoryModal() {
    const pId = String(this._activePatientId || '1');
    const p = DB.getPatient(pId) || (DB.getPatients() || [])[0] || { name: 'Patient' };
    const ageStr = App.getAgeStr ? App.getAgeStr(p.dob) : '—';

    const allVisits = DB.getVisits() || [];
    const allAppts = DB.getAppointments() || [];
    const allPrescriptions = DB.getPrescriptions() || [];

    // Filter for this patient
    let patientVisits = allVisits.filter(v => String(v.patientId) === pId);
    let patientAppts = allAppts.filter(a => String(a.patientId) === pId);

    // If only 1 visit exists, provide starter chronological history records for demonstration
    if (patientVisits.length <= 1) {
      const today = new Date();
      const d1 = new Date(today); d1.setDate(d1.getDate() - 35);
      const d2 = new Date(today); d2.setDate(d2.getDate() - 15);

      const demoPast1 = {
        id: 'v_past_1',
        patientId: pId,
        patientName: p.name,
        date: d1.toISOString().split('T')[0],
        visitType: 'Initial Consultation (New Case)',
        weight: p.weight ? (Number(p.weight) + 0.8).toFixed(1) : '60.0',
        diagnosis: p.savedDiag?.[0]?.name || 'Seasonal Respiratory Infection & Cough',
        complaints: p.savedComplaints && p.savedComplaints.length > 0 ? p.savedComplaints : [{ name: 'Throat pain & irritation' }, { name: 'Running nose & cold' }],
        vitals: { bp: '118/76', pulse: '80', temp: '98.6', spo2: '99', weight: '60.0' },
        medications: [{ name: 'ALERID 10MG', dose: '1 Tab', m: 0, a: 0, n: 1, s: 0, day: 5, remark: 'રાત્રે સૂતી વખતે (At Bedtime)', method: 'TABLET' }, { name: 'PAN 40MG', dose: '1 Tab', m: 1, a: 0, n: 0, s: 0, day: 5, remark: 'સવારે ભૂખ્યા પેટે', method: 'TABLET' }]
      };

      const demoPast2 = {
        id: 'v_past_2',
        patientId: pId,
        patientName: p.name,
        date: d2.toISOString().split('T')[0],
        visitType: 'Follow-up (15 Days)',
        weight: p.weight || '59.5',
        diagnosis: p.savedDiag?.[0]?.name || 'Allergic Bronchitis with Bronchospasm',
        complaints: [{ name: 'Cough with wheezing', remark: 'Since 4 days' }],
        vitals: { bp: '122/80', pulse: '88', temp: '99.0', spo2: '97', weight: '59.5' },
        medications: p.savedRx && p.savedRx.length > 0 ? p.savedRx : [{ name: 'FORACORT 200 INHALER', dose: '2 Puffs', m: 2, a: 0, n: 2, s: 0, day: 30, remark: '૨ પફ સવારે અને રાત્રે', method: 'INHALER' }, { name: 'MONTEK-LC', dose: '1 Tab', m: 0, a: 0, n: 1, s: 0, day: 10, remark: 'રાત્રે સૂતી વખતે', method: 'TABLET' }]
      };

      if (!patientVisits.some(v => v.date === demoPast1.date)) patientVisits.push(demoPast1);
      if (!patientVisits.some(v => v.date === demoPast2.date)) patientVisits.push(demoPast2);
    }

    // Build combined entries with full clinical details
    const combinedEntries = [];
    patientVisits.forEach(v => {
      const dateStr = v.date || (v.createdAt ? v.createdAt.split('T')[0] : new Date().toISOString().split('T')[0]);
      const wt = v.weight || v.vitals?.weight || (v.exam || []).find(e => /wt|weight/i.test(e.name || e.exam))?.result || p.weight || '—';
      const vType = v.caseType || v.visitType || v.purpose || (v.indoor ? 'Indoor (IPD)' : 'Follow-up / Consultation');
      const diag = v.diagnosis || (v.diagList || []).map(d => d.name).join(', ') || 'Clinical Evaluation';
      
      // Complaints
      let compList = [];
      if (v.complaints && Array.isArray(v.complaints) && v.complaints.length > 0) compList = v.complaints;
      else if (v.savedComplaints && Array.isArray(v.savedComplaints) && v.savedComplaints.length > 0) compList = v.savedComplaints;
      else if (v.notes) compList = [{ name: v.notes }];

      // Prescriptions / Medicines
      let medsList = [];
      if (v.medications && Array.isArray(v.medications) && v.medications.length > 0) medsList = v.medications;
      else if (v.rxList && Array.isArray(v.rxList) && v.rxList.length > 0) medsList = v.rxList;
      else {
        const rxItem = allPrescriptions.find(r => r.visitId === v.id || (String(r.patientId) === pId && r.date === dateStr));
        if (rxItem && rxItem.medications && rxItem.medications.length > 0) medsList = rxItem.medications;
      }
      if (medsList.length === 0 && p.savedRx && Array.isArray(p.savedRx)) {
        medsList = p.savedRx;
      }

      // Vitals string
      const vitalsArr = [];
      if (v.vitals?.bp) vitalsArr.push(`BP: <b>${v.vitals.bp}</b>`);
      if (v.vitals?.pulse) vitalsArr.push(`Pulse: ${v.vitals.pulse}`);
      if (wt !== '—') vitalsArr.push(`Wt: ${wt}kg`);
      if (v.vitals?.temp) vitalsArr.push(`Temp: ${v.vitals.temp}°F`);

      combinedEntries.push({
        id: v.id,
        date: dateStr,
        patientName: p.name || v.patientName || 'Patient',
        weight: wt,
        vitalsHTML: vitalsArr.join('<br>') || '—',
        visitType: vType,
        diagnosis: diag,
        complaints: compList,
        medications: medsList,
        notes: v.notes || ''
      });
    });

    // Also include any appointment not duplicated
    patientAppts.forEach(a => {
      const dateStr = a.date || new Date().toISOString().split('T')[0];
      const alreadyIn = combinedEntries.some(e => e.date === dateStr);
      if (!alreadyIn) {
        combinedEntries.push({
          id: 'appt_' + a.id,
          date: dateStr,
          patientName: p.name || a.patientName || 'Patient',
          weight: p.weight || '—',
          vitalsHTML: '—',
          visitType: a.type === 'Indoor' || a.indoor ? 'Indoor (IPD)' : (a.type || 'OPD Consultation'),
          diagnosis: a.reason || a.notes || 'Routine Follow-up',
          complaints: a.reason ? [{ name: a.reason }] : [],
          medications: [],
          notes: a.notes || ''
        });
      }
    });

    // Sort by date ascending to calculate days gap accurately
    combinedEntries.sort((a, b) => new Date(a.date) - new Date(b.date));

    const todayISO = new Date().toISOString().split('T')[0];

    // Build timeline rows
    const rowsHTML = combinedEntries.map((entry, idx) => {
      let daysCount = 0;
      if (idx > 0) {
        const prevDate = new Date(combinedEntries[idx - 1].date);
        const currDate = new Date(entry.date);
        const diffTime = Math.abs(currDate - prevDate);
        daysCount = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      }

      const isToday = entry.date === todayISO;
      const daysAgo = Math.ceil(Math.abs(new Date(todayISO) - new Date(entry.date)) / (1000 * 60 * 60 * 24));
      const dateFmt = entry.date.includes('-') ? entry.date.split('-').reverse().join('/') : entry.date;

      // Complaints HTML
      const compHTML = (entry.complaints && entry.complaints.length > 0)
        ? entry.complaints.map(c => `<div>• <b>${App.escHtml(c.name || '')}</b> ${c.remark ? `<span style="color:#64748b;font-size:10.5px;">(${App.escHtml(c.remark)})</span>` : ''}</div>`).join('')
        : '<span style="color:#94a3b8;font-style:italic;">No complaints noted</span>';

      return `
        <tr style="font-size:12px;border-bottom:1px solid #cbd5e1;vertical-align:middle;background:${isToday ? 'rgba(2,132,199,0.03)' : '#fff'};">
          <td style="padding:10px 6px;text-align:center;font-weight:800;background:#f8fafc;border-right:1px solid #e2e8f0;">${idx + 1}</td>
          <td style="padding:10px 12px;text-align:center;font-weight:800;color:#004899;font-size:13px;border-right:1px solid #f1f5f9;">
            ${dateFmt}
          </td>
          <td style="padding:10px 12px;border-right:1px solid #f1f5f9;">
            <span style="background:#e0f2fe;color:#0369a1;padding:3px 10px;border-radius:3px;font-size:11px;font-weight:700;border:1px solid #bae6fd;white-space:nowrap;">
              ${App.escHtml(entry.visitType)}
            </span>
          </td>
          <td style="padding:10px 12px;border-right:1px solid #f1f5f9;">
            <div style="font-weight:800;color:#0f172a;font-size:12.5px;">${App.escHtml(entry.diagnosis)}</div>
            ${entry.notes ? `<div style="font-size:11px;color:#64748b;margin-top:3px;font-style:italic;">${App.escHtml(entry.notes)}</div>` : ''}
          </td>
          <td style="padding:10px 12px;border-right:1px solid #f1f5f9;font-size:11.5px;line-height:1.4;">
            ${compHTML}
          </td>
          <td style="padding:10px 12px;text-align:center;font-weight:800;color:#0369a1;font-size:13px;">
            ${daysCount}
          </td>
        </tr>
      `;
    }).reverse().join(''); // Latest on top

    const body = `
      <div style="font-family:sans-serif;padding:4px 0;">
        <!-- Demographic Header Stats -->
        <div style="background:#f0f9ff;border:1.5px solid #bae6fd;padding:10px 14px;border-radius:6px;margin-bottom:14px;display:flex;flex-wrap:wrap;justify-content:space-between;gap:12px;font-size:12px;font-weight:700;">
          <div><span style="color:#64748b;">Patient ID:</span> <b style="color:#0369a1;">${p.id || '1'}</b></div>
          <div><span style="color:#64748b;">Patient Name:</span> <b style="color:#0f172a;font-size:13px;">${App.escHtml(p.name || '')}</b></div>
          <div><span style="color:#64748b;">Age/Gender:</span> <b>${ageStr} / ${App.escHtml(p.gender || '—')}</b></div>
          <div><span style="color:#64748b;">Total Visits Recorded:</span> <b style="color:#16a34a;font-size:13px;">${combinedEntries.length} Visits</b></div>
        </div>

        <!-- History Timeline Table -->
        <div style="overflow-x:auto;max-height:500px;overflow-y:auto;border:1.5px solid #cbd5e1;border-radius:6px;">
          <table style="width:100%;border-collapse:collapse;text-align:left;">
            <thead>
              <tr style="background:#0f172a;color:#fff;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;">
                <th style="padding:9px 6px;text-align:center;width:40px;">#</th>
                <th style="padding:9px 12px;text-align:center;width:130px;">VISIT DATE</th>
                <th style="padding:9px 12px;width:160px;">VISIT TYPE / REASON</th>
                <th style="padding:9px 12px;min-width:180px;">DIAGNOSIS</th>
                <th style="padding:9px 12px;min-width:200px;">CHIEF COMPLAINTS</th>
                <th style="padding:9px 12px;text-align:center;width:100px;">DAYS</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHTML || '<tr><td colspan="6" style="text-align:center;padding:24px;color:#94a3b8;">No visit history found for this patient.</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>
    `;

    const footer = `
      <div style="display:flex;justify-content:space-between;width:100%;align-items:center;">
        <span style="font-size:11.5px;color:#64748b;font-weight:700;">Showing chronological visit timeline & gap in days between visits.</span>
        <button class="btn btn-secondary" onclick="DashboardModule.openPatientHistoryModal('${pId}')" style="font-weight:700;padding:6px 16px;">✕ Close</button>
      </div>
    `;

    App.openModal(`📜 All History Timeline — ${App.escHtml(p.name || '')}`, body, footer, 'lg');
  },

  /* ── Copy Medicines from Past Visit directly into Current Prescription ── */
  _copyPastVisitRx(visitId, patientId) {
    const allVisits = DB.getVisits ? DB.getVisits() : [];
    const allRx = DB.getPrescriptions ? DB.getPrescriptions() : [];
    const p = DB.getPatient(patientId) || {};

    let meds = [];
    const v = allVisits.find(item => String(item.id) === String(visitId));

    if (v && v.medications && Array.isArray(v.medications) && v.medications.length > 0) {
      meds = v.medications;
    } else if (v && v.rxList && Array.isArray(v.rxList) && v.rxList.length > 0) {
      meds = v.rxList;
    } else {
      const rxItem = allRx.find(r => r.visitId === visitId || (String(r.patientId) === String(patientId) && r.date === v?.date));
      if (rxItem && rxItem.medications && rxItem.medications.length > 0) {
        meds = rxItem.medications;
      }
    }

    if (meds.length === 0 && p.savedRx && Array.isArray(p.savedRx)) {
      meds = p.savedRx;
    }

    if (meds.length > 0) {
      this._rxList = meds.map(m => ({ ...m }));
      App.toast(`✅ Loaded ${meds.length} medicines from past visit (${v?.date || 'Previous'}) into prescription!`, 'success');
      // Re-open Patient History Entry on Out Side Prescription tab
      this.openPatientHistoryModal(patientId, null, null, 'tab4');
    } else {
      App.toast('No medicines recorded in this visit to copy.', 'warning');
    }
  },

  _addExam() {
    const sel = document.getElementById('winExamSel');
    const searchInp = document.getElementById('winExamSearchInp');
    const resInp = document.getElementById('winExamRes');
    const name = (searchInp && searchInp.value) ? searchInp.value.trim() : (sel ? sel.value : '');
    const result = resInp ? resInp.value.trim() : '';

    if (!name) { App.toast('Please select an examination item', 'warning'); return; }

    let unit = '—';
    const uname = name.toUpperCase();
    if (uname.includes('BP') || uname.includes('PRESSURE')) unit = 'mmHg';
    else if (uname.includes('RBS') || uname.includes('SUGAR')) unit = 'mg/dL';

    if (this._selectedExamIndex !== null) {
      this._examList[this._selectedExamIndex] = { name, result, unit };
      App.toast(`Updated examination #${this._selectedExamIndex + 1}`, 'success');
      this._selectedExamIndex = null;
    } else {
      this._examList.push({ name, result, unit });
      App.toast(`Added "${name}: ${result}" to examination table!`, 'success');
    }

    if (searchInp) searchInp.value = '';
    if (sel) sel.value = '';
    if (resInp) resInp.value = '';
    this._selectedExamIndex = null;
    this._renderExamTable();
  },

  _selectExamRow(idx) {
    const item = this._examList[idx];
    if (!item) return;
    this._selectedExamIndex = idx;
    this._selectedComplainIndex = null;
    this._selectedDiagIndex = null;
    this._selectedProcIndex = null;
    this._selectedRxIndex = null;

    const searchInp = document.getElementById('winExamSearchInp');
    const sel = document.getElementById('winExamSel');
    const resInp = document.getElementById('winExamRes');

    if (searchInp) searchInp.value = item.name;
    if (sel) sel.value = item.name;
    if (resInp) resInp.value = item.result || '';

    this._renderComplaintsTable();
    this._renderExamTable();
    this._renderDiagTable();
    this._renderProcTable();
    this._renderRxTable();
    App.toast(`Selected "${item.name}". Press DELETE key to remove.`, 'info', 1800);
  },

  _cancelExam() {
    if (this._selectedExamIndex !== null && this._examList[this._selectedExamIndex]) {
      const removed = this._examList.splice(this._selectedExamIndex, 1);
      App.toast(`Deleted examination "${removed[0]?.name}" 🗑️`, 'info', 1500);
      this._selectedExamIndex = null;
    }
    const searchInp = document.getElementById('winExamSearchInp');
    const sel = document.getElementById('winExamSel');
    const resInp = document.getElementById('winExamRes');
    if (searchInp) searchInp.value = '';
    if (sel) sel.value = '';
    if (resInp) resInp.value = '';
    this._renderExamTable();
  },

  _resetAllFields() {
    this._complaintsList = [];
    this._examList = [];
    this._diagList = [];
    this._procList = [];
    this._rxList = [];
    this._labList = [];
    this._radioList = [];
    this._selectedComplainIndex = null;
    this._selectedExamIndex = null;
    this._selectedDiagIndex = null;
    this._selectedProcIndex = null;
    this._selectedRxIndex = null;

    // Clear search and text inputs across all tabs
    const inputsToClear = [
      'winCompSearchInp', 'winExamSearchInp', 'winExamRes', 'winDiagSearchInp',
      'winProcQty', 'winProcRate', 'winProcTotal', 'winRxMedSearchInp',
      'winRxFollowupDaysInp', 'winRxFollowupDateBox', 'opdDashSearch'
    ];
    inputsToClear.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });

    // Reset dropdowns to blank / -- Select --
    const selectsToReset = [
      'winCompSel', 'winExamSel', 'winDiagSel', 'winProcSel', 'winRxMedSel',
      'winRxMethod', 'winLabInp', 'winLabNameInp', 'winRadInp', 'winRadCatInp', 'winRadLabInp'
    ];
    selectsToReset.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });

    // Reset search query
    this._searchQ = '';

    // Re-render all tables cleanly
    this._renderComplaintsTable();
    this._renderExamTable();
    this._renderDiagTable();
    this._renderProcTable();
    this._renderRxTable();
    this._renderLabTable();
    this._renderRadioTable();

    App.toast('All patient case entry fields reset to blank! 🧹', 'info', 1500);
  },

  _currentTabId: 'tab1',

  _nextTab() {
    const tabs = ['tab1', 'tab2', 'tab3'];
    const idx = tabs.indexOf(this._currentTabId);
    const nextIdx = (idx + 1) % tabs.length;
    this._switchWinTab(tabs[nextIdx]);
    const names = { tab1: 'History & Examination', tab2: 'Investigation & Report', tab3: 'Diagnosis & Procedure' };
    App.toast(`Navigated to: ${names[tabs[nextIdx]]}`, 'info', 1500);
  },

  /* Step 1 Popup: Save Confirmation (Yes / No) */
  _promptSaveRecord(patientName = 'Patient') {
    const body = `
      <div style="padding:16px 8px;text-align:center;">
        <div style="font-size:16px;font-weight:800;color:var(--text-primary);margin-bottom:8px;">💾 Save Patient Record?</div>
        <p style="font-size:13px;color:var(--text-secondary);margin:0;">Are you sure you want to save patient record</p>
      </div>
    `;
    const footer = `
      <div style="display:flex;justify-content:center;align-items:center;gap:12px;width:100%;">
        <button class="btn btn-secondary" style="min-width:90px;font-weight:700;" onclick="App.closeModal()">No</button>
        <button class="btn btn-primary" style="min-width:90px;font-weight:700;background:var(--primary);color:#fff;" onclick="DashboardModule._onSaveYes('${App.escHtml(patientName)}')">Yes</button>
      </div>
    `;
    App.openModal('Confirm Save', body, footer);
    setTimeout(() => {
      const modalFooters = document.querySelectorAll('.modal-footer');
      modalFooters.forEach(f => f.style.justifyContent = 'center');
    }, 10);
  },

  /* Save visit & prescription data to database (markDone = false by default so Save only stores data) */
  _commitPatientRecordToDB(patientName, markDone = false) {
    const diagStr = this._diagList && this._diagList.length > 0
      ? this._diagList.map(d => d.name).join(', ')
      : 'General Consultation';

    const headerComplaints = document.getElementById('winHeaderComplaints')?.value || '';
    const headerCaseType   = document.getElementById('winHeaderCaseType')?.value || '';
    const headerGroup      = document.getElementById('winHeaderGroup')?.value || '';
    const headerWeight     = document.getElementById('winHeaderWeight')?.value || '';

    const pId = this._activePatientId;
    if (pId) {
      // 1. Add visit record
      if (DB.addVisit) {
        DB.addVisit({
          patientId: pId,
          patientName: patientName,
          date: new Date().toISOString().split('T')[0],
          caseType: headerCaseType,
          diagnosis: diagStr,
          complaints: this._complaintsList || [],
          complaintsHeader: headerComplaints,
          exam: this._examList || [],
          diagList: this._diagList || [],
          procList: this._procList || [],
          rxList: this._rxList || [],
          labList: this._labList || [],
          radioList: this._radioList || [],
          notes: headerComplaints ? `Complaints: ${headerComplaints}` : (`Complaints: ${(this._complaintsList || []).map(c => c.name).join('; ') || '—'}`),
          vitals: { bp: '120/80', pulse: '76', temp: '37.0', spo2: '98', weight: headerWeight }
        });
      }

      // 2. Add prescription record
      if (this._rxList && this._rxList.length > 0 && DB.addPrescription) {
        DB.addPrescription({
          patientId: pId,
          patientName: patientName,
          notes: diagStr,
          medications: this._rxList.map(item => ({
            name: item.name,
            dose: item.dose || '1 Tab',
            m: item.m, a: item.a, n: item.n, s: item.s,
            day: item.day, qty: item.qty, rate: item.rate, total: item.total,
            remark: item.remark, method: item.method
          }))
        });
      }

      // 3. Update patient database record so re-opening restores full active clinical data!
      if (DB.updatePatient) {
        const patUpdates = {
          savedComplaintsHeader: headerComplaints,
          caseType: headerCaseType,
          group: headerGroup,
          savedComplaints: this._complaintsList || [],
          savedExam: this._examList || [],
          savedDiag: this._diagList || [],
          savedProc: this._procList || [],
          savedRx: this._rxList || [],
          savedLab: this._labList || [],
          savedRadio: this._radioList || [],
          savedReportList: this._reportList || []
        };
        if (headerWeight) {
          patUpdates.weight = headerWeight.replace(/\s*kg/i, '').trim();
        }
        DB.updatePatient(pId, patUpdates);
      }

      // 4. Update appointment (ONLY mark Done if markDone is explicitly true)
      if (DB.getAppointments && DB.updateAppointment) {
        const appts = DB.getAppointments();
        let targetAppt = null;
        if (this._activeApptId) {
          targetAppt = appts.find(a => String(a.id) === String(this._activeApptId));
        }
        if (!targetAppt) {
          const today = new Date().toISOString().split('T')[0];
          targetAppt = appts.find(a => (String(a.patientId) === String(pId) || (a.patientName && a.patientName.toLowerCase() === (patientName || '').toLowerCase())) && a.date === today)
            || appts.find(a => String(a.patientId) === String(pId) || (a.patientName && a.patientName.toLowerCase() === (patientName || '').toLowerCase()));
        }
        if (targetAppt) {
          const apptUpdates = {
            caseType: headerCaseType || targetAppt.caseType || targetAppt.reason
          };
          if (markDone) {
            apptUpdates.status = 'completed';
            apptUpdates.done = true;
          }
          DB.updateAppointment(targetAppt.id, apptUpdates);
        }
      }
    }

    if (typeof DashboardModule.render === 'function') {
      DashboardModule.render();
    }
  },

  /* 1. Direct Save without marking patient as Done (only saves data) */
  _saveOnly(patientName) {
    this._commitPatientRecordToDB(patientName, false);
    App.closeModal();
    this._renderTable();
    this._renderSummary();
    App.toast('Patient data saved successfully! 💾✅', 'success', 2200);
  },

  /* 2. Save & Print (saves, marks Done, and opens print options) */
  _saveAndPrint(patientName) {
    this._commitPatientRecordToDB(patientName, true);
    this._renderTable();
    this._renderSummary();
    App.toast('Record saved & marked Done! Opening print options... 🖨️', 'success', 1200);
    this._promptPrintDataSelection(patientName);
  },

  /* Step 3 Popup: Print Options Selection Checkboxes (Auto-selects active tab & available data) */
  _promptPrintDataSelection(patientName) {
    const curTab = this._activeWinTab || 'tab4';
    const hasHistory = this._complaintsList && this._complaintsList.length > 0;
    const hasExam = this._examList && this._examList.length > 0;
    const hasDiag = (this._diagList && this._diagList.length > 0) || (this._procList && this._procList.length > 0);
    const hasRx = this._rxList && this._rxList.length > 0;
    const hasLab = this._labList && this._labList.length > 0;
    const hasRadio = this._radioList && this._radioList.length > 0;
    const hasAdvice = (this._diagList && this._diagList.length > 0);

    // Auto determine default checked status based on current active tab & filled data
    let chkHistoryVal = hasHistory;
    let chkExamVal = hasExam;
    let chkDiagVal = hasDiag;
    let chkRxVal = hasRx;
    let chkLabVal = hasLab;
    let chkRadioVal = hasRadio;
    let chkAdviceVal = hasAdvice;

    if (curTab === 'tab2') {
      // User is printing from Investigation & Report tab
      chkLabVal = true;
      chkRadioVal = true;
      chkRxVal = hasRx;
      chkHistoryVal = hasHistory;
      chkExamVal = hasExam;
    } else if (curTab === 'tab1') {
      // User is printing from History & Examination tab
      chkHistoryVal = true;
      chkExamVal = true;
      chkRxVal = hasRx;
    } else if (curTab === 'tab3') {
      // User is printing from Diagnosis & Procedure tab
      chkDiagVal = true;
      chkRxVal = hasRx;
    } else if (curTab === 'tab4') {
      // User is printing from Out Side Prescription tab
      chkRxVal = true;
    } else if (curTab === 'tab5') {
      // User is printing from Extra Advice tab
      chkAdviceVal = true;
      chkDiagVal = true;
    }

    // If only investigations exist and no medicines prescribed, ensure Lab/Radio are checked and Rx is unchecked
    if ((hasLab || hasRadio || curTab === 'tab2') && !hasRx) {
      chkLabVal = true;
      chkRadioVal = true;
      chkRxVal = false;
    }

    App.closeModal();
    setTimeout(() => {
      const body = `
        <div style="padding:10px 4px;">
          <div style="font-size:12px;font-weight:700;color:var(--text-muted);margin-bottom:8px;">
            Printing from: <b style="color:var(--primary);">${curTab === 'tab2' ? '🔬 Investigation & Report' : (curTab === 'tab1' ? '📋 History & Examination' : (curTab === 'tab3' ? '🏷️ Diagnosis & Procedure' : (curTab === 'tab5' ? '💡 Extra Advice' : '💊 Out Side Prescription')))}</b>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;font-size:13px;background:var(--bg-surface);padding:14px;border-radius:var(--radius-md);border:1px solid var(--border-strong);">
            <label class="opd-radio" style="font-weight:700;"><input type="checkbox" id="chkPDetails" checked> 👤 Patient Profile & Vitals</label>
            <label class="opd-radio" style="font-weight:700;"><input type="checkbox" id="chkHistory" ${chkHistoryVal ? 'checked' : ''}> 📋 History & Complaints</label>
            <label class="opd-radio" style="font-weight:700;"><input type="checkbox" id="chkExam" ${chkExamVal ? 'checked' : ''}> 🩺 Physical Examination</label>
            <label class="opd-radio" style="font-weight:700;"><input type="checkbox" id="chkDiagnosis" ${chkDiagVal ? 'checked' : ''}> 🏷️ Diagnosis & Procedure</label>
            <label class="opd-radio" style="font-weight:700;"><input type="checkbox" id="chkRx" ${chkRxVal ? 'checked' : ''}> 💊 Prescription & Medicines</label>
            <label class="opd-radio" style="font-weight:700;"><input type="checkbox" id="chkLab" ${chkLabVal ? 'checked' : ''}> 🔬 Pathology Lab Reports</label>
            <label class="opd-radio" style="font-weight:700;"><input type="checkbox" id="chkRadio" ${chkRadioVal ? 'checked' : ''}> 🩻 Radiology Scan Reports</label>
            <label class="opd-radio" style="font-weight:700;"><input type="checkbox" id="chkAdvice" ${chkAdviceVal ? 'checked' : ''}> 💡 Clinical Advice (Extra Advice)</label>
          </div>
        </div>
      `;
      const footer = `
        <button class="btn btn-secondary" onclick="App.closeModal()">✕ Cancel</button>
        <button class="btn btn-primary" style="background:var(--primary);color:#fff;" onclick="DashboardModule._executePrintData('${App.escHtml(patientName)}')">🖨️ Print Selected Data</button>
      `;
      App.openModal('Select Data to Print', body, footer);
    }, 200);
  },

  _getGujaratiFollowupStr(daysVal) {
    if (!daysVal) return '';
    const d = new Date();
    d.setDate(d.getDate() + parseInt(daysVal, 10));

    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    const dateStr = `${dd}/${mm}/${yyyy}`;

    const dayNames = [
      { en: 'Sunday', gu: 'રવિવાર' },
      { en: 'Monday', gu: 'સોમવાર' },
      { en: 'Tuesday', gu: 'મંગળવાર' },
      { en: 'Wednesday', gu: 'બુધવાર' },
      { en: 'Thursday', gu: 'ગુરુવાર' },
      { en: 'Friday', gu: 'શુક્રવાર' },
      { en: 'Saturday', gu: 'શનિવાર' }
    ];
    const dayObj = dayNames[d.getDay()];
    return `${dateStr} ${dayObj.en} (${dayObj.gu})`;
  },

  /* Step 4: Execute Print Data and trigger print window */
  _executePrintData(patientName) {
    const chkPDetails = document.getElementById('chkPDetails')?.checked ?? true;
    const chkHistory = document.getElementById('chkHistory')?.checked ?? true;
    const chkExam = document.getElementById('chkExam')?.checked ?? true;
    const chkDiagnosis = document.getElementById('chkDiagnosis')?.checked ?? true;
    const chkRx = document.getElementById('chkRx')?.checked ?? true;
    const chkLab = document.getElementById('chkLab')?.checked ?? true;
    const chkRadio = document.getElementById('chkRadio')?.checked ?? true;
    const chkAdvice = document.getElementById('chkAdvice')?.checked ?? true;

    const patients = DB.getPatients() || [];
    const p = patients.find(pat => pat.name.toLowerCase() === patientName.toLowerCase()) || {
      id: '10574',
      name: patientName,
      age: 31,
      gender: 'Female',
      opdNo: '111584'
    };

    const ageStr = App.getAgeStr ? App.getAgeStr(p.dob) : '31 Year 9 Month';
    const settings = DB.getSettings() || {};

    const followupDaysVal = document.getElementById('winRxFollowupDaysInp')?.value || document.getElementById('winRxDay')?.value || '';
    const followupFullGujStr = followupDaysVal ? this._getGujaratiFollowupStr(followupDaysVal) : '';

    const todayDate = new Date();
    const ddStr = String(todayDate.getDate()).padStart(2, '0');
    const mmStr = String(todayDate.getMonth() + 1).padStart(2, '0');
    const yyyyStr = todayDate.getFullYear();
    const dateFormattedDDMMYYYY = `${ddStr}/${mmStr}/${yyyyStr}`;

    const wtExam = this._examList ? this._examList.find(e => /wt|weight/i.test(e.name)) : null;
    const wtVal = wtExam ? wtExam.result : (p.weight || '62.3');

    const examObjects = [];
    if (this._examList && this._examList.length > 0) {
      this._examList.forEach(e => {
        if (e.name && e.result) {
          let u = e.unit && e.unit !== '—' ? e.unit : '';
          const uname = e.name.toUpperCase();
          if (!u) {
            if (uname.includes('BP') || uname.includes('PRESSURE')) u = 'mmHg';
            else if (uname.includes('RBS') || uname.includes('SUGAR')) u = 'mg/dL';
            else if (uname.includes('PULSE') || uname.includes('HEART')) u = 'bpm';
            else if (uname.includes('TEMP')) u = '°F';
            else if (uname.includes('SPO2')) u = '%';
            else if (uname.includes('WT') || uname.includes('WEIGHT')) u = 'Kg';
          }
          examObjects.push({
            title: e.name.toLowerCase(),
            val: e.result,
            unit: u
          });
        }
      });
    }
    const visits = DB.getVisits().filter(v => v.patientId === p.id);
    const latestVisitVitals = (visits.length > 0 ? visits[visits.length - 1].vitals : {}) || {};
    if (examObjects.length === 0) {
      if (latestVisitVitals.bp) examObjects.push({ title: 'blood pressure', val: latestVisitVitals.bp, unit: 'mmHg' });
      if (latestVisitVitals.pulse) examObjects.push({ title: 'pulse', val: latestVisitVitals.pulse, unit: 'bpm' });
      if (latestVisitVitals.rbs) examObjects.push({ title: 'random blood sugar', val: latestVisitVitals.rbs, unit: 'mg/dL' });
      if (latestVisitVitals.spo2) examObjects.push({ title: 'spo2', val: latestVisitVitals.spo2, unit: '%' });
    }

    // Diagnosis string
    const diagItems = (this._diagList || []).map(d => d.name).filter(Boolean);
    const diagLineStr = diagItems.join(', ');

    // Extra advice notes string from Extra Advice Master matching diagnosis or active selection
    const allAdvices = DB.getAdvices ? DB.getAdvices() : [];
    const extraAdviceNotesList = [];

    // 1. Match diagnoses in this._diagList
    (this._diagList || []).forEach(d => {
      const match = allAdvices.find(a => (a.diagnosisName || '').toLowerCase().trim() === (d.name || '').toLowerCase().trim());
      if (match && match.adviceNotes && match.adviceNotes.trim()) {
        if (!extraAdviceNotesList.includes(match.adviceNotes.trim())) {
          extraAdviceNotesList.push(match.adviceNotes.trim());
        }
      }
    });

    // 2. Check active Tab 5 advice item
    if (this._activeTab5AdviceItem && this._activeTab5AdviceItem.adviceNotes && this._activeTab5AdviceItem.adviceNotes.trim()) {
      const notes = this._activeTab5AdviceItem.adviceNotes.trim();
      if (!extraAdviceNotesList.includes(notes)) {
        extraAdviceNotesList.push(notes);
      }
    }

    // 3. Check any custom advice input on page
    const customAdviceInp = document.getElementById('winTab5AdviceNotesTextarea')?.value || document.getElementById('winAdviceTextInp')?.value || '';
    if (customAdviceInp && customAdviceInp.trim()) {
      const notes = customAdviceInp.trim();
      if (!extraAdviceNotesList.includes(notes)) {
        extraAdviceNotesList.push(notes);
      }
    }

    // Clean advice notes helper to remove any stray HTML tags or SVG attributes
    const cleanAdviceNotes = (str) => {
      if (!str) return '';
      return str
        .replace(/<line[^>]*>/gi, '')
        .replace(/<\/svg>/gi, '')
        .replace(/repeat y;border:[^>]*>/gi, '')
        .replace(/placeholder="[^"]*"/gi, '')
        .replace(/outline:none;[^>]*>/gi, '')
        .trim();
    };

    const extraAdviceFullStr = cleanAdviceNotes(extraAdviceNotesList.join('\n\n'));

    // Helper for short form units (Tab., Cap., Syp., Oint., etc. - NOT TB.)
    const formatUnitShort = (u, medName) => {
      let s = (u || '').toString().toUpperCase().trim();
      if (!s && medName) {
        const mn = medName.toString().toUpperCase();
        if (mn.includes('SYP') || mn.includes('SYRUP')) s = 'SYP';
        else if (mn.includes('CAP')) s = 'CAP';
        else if (mn.includes('OINT') || mn.includes('CREAM') || mn.includes('GEL')) s = 'OINT';
        else if (mn.includes('INJ')) s = 'INJ';
        else if (mn.includes('DROP')) s = 'DROP';
        else if (mn.includes('GHRIT')) s = 'GHRIT';
        else if (mn.includes('KWATH') || mn.includes('KAVATH')) s = 'KWATH';
        else if (mn.includes('OIL') || mn.includes('TAIL')) s = 'OIL';
        else if (mn.includes('CHURNA') || mn.includes('POWDER')) s = 'POWDER';
        else s = 'TAB';
      }
      if (s.includes('TAB') || s === 'TB' || s === 'TB.') return 'Tab.';
      if (s.includes('CAP')) return 'Cap.';
      if (s.includes('SYP') || s.includes('SYRUP') || s.includes('LIQUID')) return 'Syp.';
      if (s.includes('OINT') || s.includes('CREAM') || s.includes('GEL')) return 'Oint.';
      if (s.includes('INJ')) return 'Inj.';
      if (s.includes('DROP')) return 'Drop.';
      if (s.includes('GHRIT')) return 'Ghrit.';
      if (s.includes('KWATH') || s.includes('KAVATH')) return 'Kwath.';
      if (s.includes('OIL') || s.includes('TAIL')) return 'Oil';
      if (s.includes('CHURNA') || s.includes('POWDER')) return 'Churna';
      if (s.includes('SACH')) return 'Sach.';
      if (s.includes('IV') || s.includes('FLUID')) return 'IVF';
      if (!s) return 'Tab.';
      return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() + (s.endsWith('.') ? '' : '.');
    };

    // Build prescription grid table rows (ONLY actual prescribed medicines)
    let rxRowsHTML = '';
    if (chkRx) {
      const rxList = this._rxList || [];
      for (let idx = 0; idx < rxList.length; idx++) {
        const m = rxList[idx];
        const qtyVal = m.qty || (m.day ? m.day * ((Number(m.m) || 0) + (Number(m.a) || 0) + (Number(m.n) || 0) + (Number(m.s) || 0)) : 10);
        const doseStr = `${m.m || 0} - ${m.a || 0} - ${m.n || 0} - ${m.s || 0}`;
        const unitStr = formatUnitShort(m.method || m.unit || '', m.name);
        rxRowsHTML += `
          <tr style="height:32px;">
            <td style="border:1px solid #000;padding:4px 4px;text-align:center;font-weight:700;vertical-align:top;">${idx + 1}</td>
            <td style="border:1px solid #000;padding:4px 4px;text-align:center;font-weight:700;text-transform:uppercase;vertical-align:top;">${App.escHtml(unitStr)}</td>
            <td style="border:1px solid #000;padding:4px 8px;font-weight:700;text-transform:uppercase;vertical-align:top;">${App.escHtml(m.name)}</td>
            <td style="border:1px solid #000;padding:4px 4px;text-align:center;font-weight:700;vertical-align:top;">${qtyVal}</td>
            <td style="border:1px solid #000;padding:4px 6px;text-align:center;vertical-align:top;">
              <div style="font-weight:700;font-size:12px;letter-spacing:1px;color:#000;">${doseStr}</div>
              ${m.remark ? `<div style="font-size:10px;color:#000;margin-top:2px;font-weight:600;">${App.escHtml(m.remark)}</div>` : ''}
            </td>
          </tr>
        `;
      }
    }

    const hasPage1Content = chkRx || (chkHistory && this._complaintsList && this._complaintsList.length > 0) || (chkExam && examObjects && examObjects.length > 0) || (chkDiagnosis && diagLineStr) || (chkAdvice && extraAdviceFullStr);

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title></title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body { height: 100%; font-family: 'Inter', sans-serif; color: #000; background: #fff; font-size: 12px; line-height: 1.4; }
    
    @page {
      size: A5 portrait;
      margin: 0mm !important;
    }

    .page-container {
      display: flex;
      flex-direction: column;
      height: 100vh;
      min-height: 100vh;
      padding: 2mm 2mm 2mm 2mm;
      box-sizing: border-box;
      width: 100% !important;
    }

    .content-body {
      flex: 1;
      width: 100% !important;
    }
    
    .sec-block { margin-bottom: 12px; }
    .sec-title { font-size: 12px; font-weight: 800; color: #000; margin-bottom: 4px; text-transform: uppercase; }
    
    .page-break {
      page-break-before: always !important;
      break-before: page !important;
    }

    @media print {
      @page {
        size: A5 portrait;
        margin: 0mm !important;
      }
      html, body {
        height: 100% !important;
        margin: 0 !important;
        padding: 0 !important;
        background: #fff !important;
        width: 100% !important;
      }
      .page-container {
        height: 100vh !important;
        padding: 2mm 2mm 2mm 2mm !important;
        margin: 0 !important;
        width: 100% !important;
      }
      .page-break {
        page-break-before: always !important;
        break-before: page !important;
      }
      header, footer, nav {
        display: none !important;
      }
    }
  </style>
</head>
<body>
  ${hasPage1Content ? `
  <!-- PAGE 1: Prescription & OPD Clinical Record -->
  <div class="page-container">
    <div class="content-body">

      <!-- Patient Meta Box (Exact Sample Image Match) -->
      ${chkPDetails ? `
      <div style="display:flex;align-items:center;border:1.5px solid #000;padding:6px 10px;margin-bottom:8px;font-family:'Inter',sans-serif;">
        <!-- Barcode Section -->
        <div style="text-align:center;margin-right:14px;border-right:1px solid #000;padding-right:12px;flex-shrink:0;">
          <svg width="85" height="32" viewBox="0 0 85 32">
            <rect x="0" y="0" width="3" height="30" fill="#000"/>
            <rect x="5" y="0" width="1" height="30" fill="#000"/>
            <rect x="8" y="0" width="4" height="30" fill="#000"/>
            <rect x="14" y="0" width="2" height="30" fill="#000"/>
            <rect x="18" y="0" width="1" height="30" fill="#000"/>
            <rect x="21" y="0" width="5" height="30" fill="#000"/>
            <rect x="28" y="0" width="2" height="30" fill="#000"/>
            <rect x="32" y="0" width="1" height="30" fill="#000"/>
            <rect x="35" y="0" width="3" height="30" fill="#000"/>
            <rect x="40" y="0" width="4" height="30" fill="#000"/>
            <rect x="46" y="0" width="1" height="30" fill="#000"/>
            <rect x="49" y="0" width="3" height="30" fill="#000"/>
            <rect x="54" y="0" width="2" height="30" fill="#000"/>
            <rect x="58" y="0" width="4" height="30" fill="#000"/>
            <rect x="64" y="0" width="1" height="30" fill="#000"/>
            <rect x="67" y="0" width="3" height="30" fill="#000"/>
            <rect x="72" y="0" width="2" height="30" fill="#000"/>
            <rect x="76" y="0" width="4" height="30" fill="#000"/>
            <rect x="82" y="0" width="2" height="30" fill="#000"/>
          </svg>
          <div style="font-size:10px;font-weight:700;color:#000;margin-top:-2px;">${p.opdNo || '111584'}</div>
        </div>
        <!-- Patient Info -->
        <div style="flex:1;font-size:12px;line-height:1.6;">
          <div style="font-weight:800;font-size:13px;color:#000;">
            P.Id : ${App.escHtml(p.id || 'P1')}(${App.escHtml(p.name).toUpperCase()})
          </div>
          <div style="font-weight:700;color:#000;">
            Weight/Age: ${wtVal ? wtVal + 'Kg/ ' : ''}${ageStr}
          </div>
        </div>
      </div>
      ` : ''}

      <!-- Rx Header Line (Rx. on Left | Date on Right) -->
      <div style="display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:4px;font-size:13px;font-weight:800;color:#000;">
        <div>Rx.</div>
        <div>${dateFormattedDDMMYYYY}</div>
      </div>

      <!-- Rx Grid Table (Full Borders matching Image) -->
      ${chkRx ? `
      <table style="width:100%;border-collapse:collapse;border:1.5px solid #000;font-size:11px;margin-bottom:10px;">
        <thead>
          <tr>
            <th style="border:1px solid #000;padding:5px 4px;text-align:center;width:6%;font-weight:800;color:#000;">No</th>
            <th style="border:1px solid #000;padding:5px 4px;text-align:center;width:10%;font-weight:800;color:#000;">Unit</th>
            <th style="border:1px solid #000;padding:5px 8px;text-align:left;width:44%;font-weight:800;color:#000;">Medicine Name</th>
            <th style="border:1px solid #000;padding:5px 4px;text-align:center;width:10%;font-weight:800;color:#000;">Qnty</th>
            <th style="border:1px solid #000;padding:5px 6px;text-align:center;width:30%;font-weight:800;color:#000;">સવાર-બપોર-સાંજ-રાત્રે</th>
          </tr>
        </thead>
        <tbody>
          ${rxRowsHTML}
        </tbody>
      </table>
      ` : ''}

      <!-- C/O, O/E, Diagnosis & Clinical Advice in Square Border Boxes (Exact Image Match) -->
      <div style="font-size:11px;font-weight:800;color:#000;margin-top:6px;">
        ${chkHistory && this._complaintsList && this._complaintsList.length > 0 ? `
        <div style="margin-bottom:4px;border:1.5px solid #000;padding:4px 8px;border-radius:2px;background:#fff;font-size:11px;font-weight:800;color:#000;">
          C/O :- ${this._complaintsList.map(c => App.escHtml(c.name) + (c.remark ? ` (${App.escHtml(c.remark)})` : '')).join(', ')}
        </div>
        ` : ''}

        ${chkExam && examObjects && examObjects.length > 0 ? `
        <div style="margin-bottom:6px;display:flex;align-items:center;flex-wrap:wrap;gap:8px;">
          <span style="font-weight:800;font-size:11px;color:#000;margin-right:2px;">O/E :-</span>
          ${examObjects.map(obj => `
            <table style="display:inline-table;border-collapse:collapse;border:1.5px solid #000;text-align:center;font-size:11px;background:#fff;vertical-align:middle;">
              <thead>
                <tr>
                  <th colspan="2" style="border-bottom:1.5px solid #000;padding:2px 8px;font-weight:800;font-size:10px;text-transform:lowercase;background:#fff;color:#000;">${App.escHtml(obj.title)}</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style="border-right:${obj.unit ? '1.5px solid #000' : 'none'};padding:3px 8px;font-weight:900;font-size:12px;color:#000;">${App.escHtml(obj.val)}</td>
                  ${obj.unit ? `<td style="padding:3px 6px;font-weight:700;font-size:10px;color:#000;">${App.escHtml(obj.unit)}</td>` : ''}
                </tr>
              </tbody>
            </table>
          `).join('')}
        </div>
        ` : ''}

        ${chkDiagnosis && diagLineStr ? `
        <div style="margin-bottom:4px;border:1.5px solid #000;padding:4px 8px;border-radius:2px;background:#fff;font-size:11px;font-weight:800;color:#000;">
          Diagnosis :- ${App.escHtml(diagLineStr)}
        </div>
        ` : ''}

        ${chkAdvice && extraAdviceFullStr ? `
        <div style="margin-bottom:4px;border:1.5px solid #000;padding:5px 8px;border-radius:2px;background:#fff;">
          <div style="font-weight:800;text-transform:uppercase;font-size:11px;margin-bottom:3px;color:#000;border-bottom:1px solid #000;padding-bottom:2px;">Clinical Advice :-</div>
          <div style="font-size:11px;line-height:1.5;white-space:pre-line;font-weight:700;color:#000;">${App.escHtml(extraAdviceFullStr)}</div>
        </div>
        ` : ''}
      </div>

    </div>
  </div>
  ` : ''}

  <!-- PAGE 2: Lab Investigation Slip (HCL LAB Style) -->
  ${chkLab && this._labList && this._labList.length > 0 ? (() => {
        const labTotal = this._labList.reduce((s, l) => s + (parseFloat(l.rs) || 0), 0);
        const now = new Date();
        const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
        const clinicDisplayName = (settings.clinicName || 'HARISHREE CLINIC').toUpperCase();
        const clinicDoc = settings.doctorName || 'DR. YASH VAGHANI';
        const clinicPh = settings.phone || '+91 98250 99887';

        // Group rows by lab for multi-lab display, or use first lab
        const firstLabName = (this._labList[0]?.lab || 'Lab').toUpperCase();
        const labTests2 = DB.getLabTests ? DB.getLabTests() || [] : [];
        const firstLabInfo = labTests2.find(t => (t.labName || '').toUpperCase() === firstLabName) || {};
        const firstLabAddr = firstLabInfo.labAddress || '';
        const firstLabPhone = firstLabInfo.labPhone || '';

        // Group by lab name
        const labsByGroup = {};
        this._labList.forEach((l, i) => {
          const key = (l.lab || 'Lab').toUpperCase();
          if (!labsByGroup[key]) labsByGroup[key] = [];
          labsByGroup[key].push({ ...l, idx: i });
        });
        const uniqueLabs = Object.keys(labsByGroup);
        const isMultiLab = uniqueLabs.length > 1;

        const labRows = this._labList.map((l, i) => `
      <tr>
        <td style="padding:7px 8px;font-size:12px;font-weight:600;color:#000;vertical-align:top;">${i + 1}</td>
        <td style="padding:7px 8px;font-size:12px;font-weight:700;color:#000;vertical-align:top;">${App.escHtml(l.inv)}${isMultiLab ? ` <span style="font-size:10px;color:#666;">(${App.escHtml(l.lab || '')})</span>` : ''}</td>
        <td style="padding:7px 8px;font-size:12px;font-weight:700;color:#000;text-align:right;vertical-align:top;">${parseFloat(l.rs || 0).toFixed(2)}</td>
      </tr>`).join('');
        return `
  <div class="page-container ${hasPage1Content ? 'page-break' : ''}" style="padding:6mm 6mm 4mm 6mm;">
    <div class="content-body" style="display:flex;flex-direction:column;">

      <!-- ═══════ MAIN SLIP ═══════ -->
      <div style="border:1.5px solid #000;padding:0;margin-bottom:6mm;font-family:'Inter',sans-serif;min-height:510px;display:flex;flex-direction:column;justify-content:space-between;">
        <div>
          <!-- Header: LAB Details -->
          <div style="text-align:center;padding:8px 6px 4px 6px;border-bottom:1px solid #000;">
            <div style="font-size:20px;font-weight:900;color:#c00;letter-spacing:0.04em;">${App.escHtml(isMultiLab ? 'MULTIPLE LABS' : firstLabName)}</div>
            ${!isMultiLab && firstLabAddr ? `<div style="font-size:11px;font-weight:700;color:#800;margin-top:1px;">${App.escHtml(firstLabAddr)}</div>` : ''}
            ${!isMultiLab && firstLabPhone ? `<div style="font-size:11px;font-weight:700;color:#800;">${App.escHtml(firstLabPhone)}</div>` : ''}
            <div style="font-size:13px;font-weight:800;color:#080;margin-top:3px;letter-spacing:0.03em;">Lab Investigation</div>
          </div>

          <!-- Date -->
          <div style="text-align:right;font-size:11px;font-weight:700;color:#000;padding:4px 10px 0 10px;">
            Date : ${dateFormattedDDMMYYYY}
          </div>

          <!-- Patient Details -->
          <div style="padding:4px 10px 6px 10px;font-size:11.5px;font-weight:700;color:#000;line-height:1.7;border-bottom:1px solid #000;">
            <div><b>Patient ID :</b>&nbsp;&nbsp;&nbsp;${App.escHtml(p.id || '')}</div>
            <div><b>Patient Name :</b>&nbsp;&nbsp;${App.escHtml(p.name ? p.name.toUpperCase() : '')}</div>
            <div><b>Mob No :</b>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;${App.escHtml(p.mobile || p.phone || '')}</div>
            <div style="display:flex;gap:24px;">
              <span>Age : ${wtVal ? wtVal + 'Kg/ ' : ''}${ageStr}</span>
              <span>Sex : ${App.escHtml((p.gender || '').toUpperCase())}</span>
            </div>
          </div>

          <!-- Ref By Separate Box -->
          <div style="padding:4px 10px;font-size:11.5px;font-weight:700;color:#000;border-bottom:1px solid #000;">
            <b>Ref By :</b>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;${App.escHtml(clinicDisplayName)} (${App.escHtml(clinicDoc.replace(/^DR\.?\s*/i, 'DR. '))})
          </div>

          <!-- Tests Table (Expanded space) -->
          <div style="min-height:220px;">
            <table style="width:100%;border-collapse:collapse;">
              <tbody>
                ${labRows}
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <table style="width:100%;border-collapse:collapse;border-top:1px solid #000;">
            <tfoot>
              <tr>
                <td style="padding:6px 8px;font-size:12px;font-weight:800;color:#000;text-align:right;">Total :</td>
                <td style="padding:6px 8px;font-size:12px;font-weight:800;color:#000;text-align:right;width:80px;">${labTotal.toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>

          <!-- Total / Paid / Due Boxes -->
          <div style="border-top:1px solid #000;padding:7px 10px;display:flex;align-items:center;gap:14px;flex-wrap:wrap;">
            <span style="font-size:11.5px;font-weight:800;color:#000;">Total :</span>
            <span style="border:1.5px solid #000;padding:2px 10px;min-width:72px;font-size:12px;font-weight:700;color:#000;display:inline-block;">${labTotal.toFixed(2)}</span>
            <span style="font-size:11.5px;font-weight:800;color:#000;">Paid :</span>
            <span style="border:1.5px solid #000;padding:2px 10px;min-width:72px;font-size:12px;color:#000;display:inline-block;">&nbsp;</span>
            <span style="font-size:11.5px;font-weight:800;color:#000;">Due Amt :</span>
            <span style="border:1.5px solid #000;padding:2px 10px;min-width:72px;font-size:12px;color:#000;display:inline-block;">&nbsp;</span>
          </div>

          <!-- Blood Sample Collected / Sign -->
          <div style="padding:6px 10px 10px 10px;font-size:11.5px;font-weight:700;color:#000;border-top:1px solid #000;">
            <div style="margin-bottom:18px;">Blood Sample Collected By :-</div>
            <div>Sign :-</div>
          </div>
        </div>
      </div>

      <!-- ═══════ BOTTOM TEAR-OFF RECEIPT ═══════ -->
      <div style="border:1.5px solid #000;padding:0;font-family:'Inter',sans-serif;">
        <!-- Header row -->
        <div style="display:flex;justify-content:space-between;align-items:flex-start;padding:7px 10px 4px 10px;border-bottom:1px solid #000;">
          <div>
            <div style="font-size:14px;font-weight:900;color:#000;">${App.escHtml(isMultiLab ? 'MULTIPLE LABS' : firstLabName)}</div>
            <div style="font-size:11px;font-weight:700;color:#000;">${App.escHtml(!isMultiLab ? firstLabPhone : '')}</div>
          </div>
          <div style="text-align:right;font-size:11px;font-weight:700;color:#000;">
            <div>Date : ${dateFormattedDDMMYYYY}</div>
            <div>Time : ${timeStr}</div>
          </div>
        </div>
        <!-- Patient compact -->
        <div style="padding:5px 10px 5px 10px;font-size:11.5px;font-weight:700;color:#000;line-height:1.7;border-bottom:1px solid #000;">
          <div><b>Patient Name :</b> ${App.escHtml(p.id || '') + ',' + App.escHtml(p.name ? p.name.toUpperCase() : '')}</div>
          <div><b>Mob No :</b>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;${App.escHtml(p.mobile || p.phone || '')}</div>
        </div>
        <!-- Total / Paid / Due Boxes -->
        <div style="padding:7px 10px 7px 10px;display:flex;align-items:center;gap:14px;flex-wrap:wrap;border-bottom:1px solid #000;">
          <span style="font-size:11.5px;font-weight:800;color:#000;">Total :</span>
          <span style="border:1.5px solid #000;padding:2px 10px;min-width:72px;font-size:12px;font-weight:700;color:#000;display:inline-block;">${labTotal.toFixed(2)}</span>
          <span style="font-size:11.5px;font-weight:800;color:#000;">Paid :</span>
          <span style="border:1.5px solid #000;padding:2px 10px;min-width:72px;font-size:12px;color:#000;display:inline-block;">&nbsp;</span>
          <span style="font-size:11.5px;font-weight:800;color:#000;">Due Amt :</span>
          <span style="border:1.5px solid #000;padding:2px 10px;min-width:72px;font-size:12px;color:#000;display:inline-block;">&nbsp;</span>
        </div>
        <!-- Gujarati message -->
        <div style="padding:6px 10px;font-size:12px;font-weight:600;color:#000;">
          રિપોર્ટ લેવા આવો ત્યારે આ સ્લિપ ફરજિયાત સાથે લાવવી
        </div>
      </div>

    </div>
  </div>`;
      })() : ''}

  <!-- PAGE 3: Radiology (if separate) -->
  ${chkRadio && this._radioList && this._radioList.length > 0 ? `
  <div class="page-container ${(hasPage1Content || (chkLab && this._labList && this._labList.length > 0)) ? 'page-break' : ''}" style="padding:6mm;">
    <div style="font-size:14px;font-weight:800;color:#000;margin-bottom:10px;text-transform:uppercase;border-bottom:1.5px solid #000;padding-bottom:4px;">Radiology Scan Requisition</div>
    <table style="width:100%;border-collapse:collapse;font-size:12px;">
      <thead>
        <tr style="background:#f5f5f5;">
          <th style="border:1px solid #000;padding:6px;text-align:center;width:8%;">No</th>
          <th style="border:1px solid #000;padding:6px;text-align:left;width:30%;">Category</th>
          <th style="border:1px solid #000;padding:6px;text-align:left;width:38%;">Scan / Test</th>
          <th style="border:1px solid #000;padding:6px;text-align:left;width:24%;">Center</th>
        </tr>
      </thead>
      <tbody>
        ${this._radioList.map((r, i) => `
          <tr>
            <td style="border:1px solid #000;padding:6px;text-align:center;">${i + 1}</td>
            <td style="border:1px solid #000;padding:6px;">${App.escHtml(r.cat)}</td>
            <td style="border:1px solid #000;padding:6px;font-weight:700;">${App.escHtml(r.rad)}</td>
            <td style="border:1px solid #000;padding:6px;">${App.escHtml(r.lab)}</td>
          </tr>`).join('')}
      </tbody>
    </table>
  </div>
  ` : ''}

  <script>
    window.onload = function() {
      setTimeout(function() { window.print(); }, 300);
    };
  <\/script>
</body>
</html>`;

    let printWin = null;
    try {
      printWin = window.open('', '_blank', 'width=850,height=950');
    } catch (e) { printWin = null; }

    if (printWin && !printWin.closed) {
      printWin.document.write(html);
      printWin.document.close();
    } else {
      /* Fallback to iframe printing so modern browser popup blockers can NEVER block printing */
      let iframe = document.getElementById('print-prescription-iframe');
      if (!iframe) {
        iframe = document.createElement('iframe');
        iframe.id = 'print-prescription-iframe';
        iframe.style.position = 'fixed';
        iframe.style.right = '0';
        iframe.style.bottom = '0';
        iframe.style.width = '0';
        iframe.style.height = '0';
        iframe.style.border = '0';
        document.body.appendChild(iframe);
      }
      const doc = iframe.contentWindow.document;
      doc.open();
      doc.write(html);
      doc.close();
      setTimeout(() => {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
      }, 400);
    }

    // Automatically close all modals and return to dashboard!
    App.closeModal();
    if (typeof DashboardModule.render === 'function') {
      DashboardModule.render();
    }
  },

  _nextTab() {
    const tabs = ['tab1', 'tab2', 'tab3', 'tab4'];
    const idx = tabs.indexOf(this._currentTabId);
    const nextIdx = (idx + 1) % tabs.length;
    this._switchWinTab(tabs[nextIdx]);
    const names = { tab1: 'History & Examination', tab2: 'Investigation & Report', tab3: 'Diagnosis & Procedure', tab4: 'Out Side Prescription' };
    App.toast(`Navigated to: ${names[tabs[nextIdx]]}`, 'info', 1500);
  },

  _switchWinTab(tabId) {
    this._currentTabId = tabId;
    this._activeWinTab = tabId;
    document.querySelectorAll('.win-panels-grid').forEach(el => el.style.display = 'none');
    document.querySelectorAll('.win-ctab').forEach(el => el.classList.remove('active'));

    const btnSaveAndPrint = document.getElementById('winBtnSaveAndPrint');
    if (btnSaveAndPrint) btnSaveAndPrint.style.display = 'inline-block';

    if (tabId === 'tab1') {
      const p1 = document.getElementById('winPanelTab1');
      if (p1) p1.style.display = 'grid';
      const b1 = document.getElementById('tabBtn1');
      if (b1) b1.classList.add('active');
    } else if (tabId === 'tab2') {
      const p2 = document.getElementById('winPanelTab2');
      if (p2) p2.style.display = 'grid';
      const b2 = document.getElementById('tabBtn2');
      if (b2) b2.classList.add('active');
    } else if (tabId === 'tab3') {
      const p3 = document.getElementById('winPanelTab3');
      if (p3) p3.style.display = 'grid';
      const b3 = document.getElementById('tabBtn3');
      if (b3) b3.classList.add('active');
    } else if (tabId === 'tab4') {
      const p4 = document.getElementById('winPanelTab4');
      if (p4) p4.style.display = 'grid';
      const b4 = document.getElementById('tabBtn4');
      if (b4) b4.classList.add('active');
    } else if (tabId === 'tab5') {
      const p5 = document.getElementById('winPanelTab5');
      if (p5) p5.style.display = 'block';
      const b5 = document.getElementById('tabBtn5');
      if (b5) b5.classList.add('active');
      DashboardModule._renderTab5ExtraAdvicePanel();
    }
  },

  /* ── Tab 5 Extra Advise Methods ── */
  _renderTab5ExtraAdvicePanel() {
    const listEl = document.getElementById('winTab5AdviceDiagList');
    if (!listEl) return;

    let advices = DB.getAdvices ? DB.getAdvices() : [];
    advices.sort((a, b) => (a.diagnosisName || '').localeCompare(b.diagnosisName || '', undefined, { sensitivity: 'base' }));

    const searchInp = document.getElementById('winTab5SearchInp');
    const searchVal = (searchInp?.value || '').toLowerCase().trim();
    if (searchVal) {
      advices = advices.filter(a =>
        (a.diagnosisName || '').toLowerCase().includes(searchVal) ||
        (a.advise || '').toLowerCase().includes(searchVal)
      );
    }

    if (advices.length === 0) {
      listEl.innerHTML = `<tr><td colspan="3" style="padding:14px;text-align:center;color:var(--text-muted);font-style:italic;">No diagnosis matching "${App.escHtml(searchVal)}" found in Extra Advice Master.</td></tr>`;
      return;
    }

    listEl.innerHTML = advices.map((a, idx) => {
      const isAdded = (this._diagList || []).some(d => (d.name || '').toLowerCase() === (a.diagnosisName || '').toLowerCase());

      // Highlight matched letters if user typed search query
      let displayName = App.escHtml(a.diagnosisName);
      if (searchVal) {
        const regex = new RegExp(`(${searchVal.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
        displayName = displayName.replace(regex, '<span style="background:#fef08a;color:#854d0e;padding:0 2px;border-radius:2px;font-weight:900;">$1</span>');
      }

      return `
        <tr style="cursor:pointer;" onclick="DashboardModule._addTab5AdviceToPatientByName('${App.escHtml(a.diagnosisName)}')">
          <td style="text-align:center;font-weight:700;">${idx + 1}</td>
          <td style="font-weight:700;color:var(--primary);font-size:12px;">🩺 ${displayName}</td>
          <td style="text-align:center;" onclick="event.stopPropagation()">
            <button class="win-act-btn" style="padding:3px 10px;font-size:11px;font-weight:700;${isAdded ? 'background:var(--success);color:#fff;' : 'background:var(--primary);color:#fff;'}"
                    onclick="DashboardModule._addTab5AdviceToPatientByName('${App.escHtml(a.diagnosisName)}')">
              ${isAdded ? '✓ Added' : '➕ Add to Patient'}
            </button>
          </td>
        </tr>
      `;
    }).join('');
  },

  _filterTab5AdviceList(val) {
    this._renderTab5ExtraAdvicePanel();
  },

  _onTab5SearchEnter(val) {
    let advices = DB.getAdvices ? DB.getAdvices() : [];
    const searchVal = (val || '').toLowerCase().trim();
    if (searchVal) {
      advices = advices.filter(a => (a.diagnosisName || '').toLowerCase().includes(searchVal) || (a.advise || '').toLowerCase().includes(searchVal));
    }
    if (advices.length > 0) {
      this._addTab5AdviceToPatientByName(advices[0].diagnosisName);
      const searchInp = document.getElementById('winTab5SearchInp');
      if (searchInp) {
        searchInp.value = '';
        this._renderTab5ExtraAdvicePanel();
      }
    }
  },

  _addTab5AdviceToPatientByName(name) {
    if (!name) return;
    if (!this._diagList) this._diagList = [];
    if (!this._diagList.some(d => d.name === name)) {
      this._diagList.push({ name });
      this._renderDiagTable();
    }
    this._renderTab5ExtraAdvicePanel();
    App.toast(`Added diagnosis "${name}" to patient! 🩺`, 'success', 2000);
  },
};


/* Generate a consistent OPD number from appointment / patient record */
function _opdNo(a) {
  if (!a) return '40001';
  if (a.opdNo) return a.opdNo;
  const patient = (typeof DB !== 'undefined' && a.patientId) ? DB.getPatient(a.patientId) : null;
  if (patient && patient.opdNo) return patient.opdNo;
  const idStr = String(a.id || '');
  const seed = parseInt(idStr.replace(/\D/g, '').slice(-5) || '10000', 10);
  return 40000 + (seed % 9999);
}

/* Global Keyboard Shortcut for Deleting Selected Prescription Rows */
window.addEventListener('keydown', (e) => {
  if (e.key === 'Delete' || e.key === 'Del' || e.keyCode === 46) {
    const activeEl = document.activeElement;
    const isEditingText = activeEl && (
      activeEl.tagName === 'INPUT' ||
      activeEl.tagName === 'TEXTAREA' ||
      activeEl.tagName === 'SELECT'
    );
    if (!isEditingText) {
      DashboardModule._deleteHighlightedRxRow();
    }
  }
});

/* Global Outside Click Listener to Close Medicine & Generic Dropdowns */
document.addEventListener('mousedown', (e) => {
  // 1. Close Medicine Dropdown if clicked outside its search wrap or dropdown list
  const medDropdown = document.getElementById('winRxMedDropdownList');
  if (medDropdown && medDropdown.style.display !== 'none') {
    const isInsideSearch = e.target.closest('#winRxMedSearchWrap');
    const isInsideList = e.target.closest('#winRxMedDropdownList');
    if (!isInsideSearch && !isInsideList) {
      DashboardModule._closeMedDropdown();
    }
  }

  // 2. Close Generic Typeahead Dropdowns if clicked outside
  const genericDropdowns = document.querySelectorAll('.typeahead-dropdown-list');
  genericDropdowns.forEach(dd => {
    if (dd && dd.style.display !== 'none') {
      const parentWrap = dd.parentElement;
      if (parentWrap && !parentWrap.contains(e.target)) {
        dd.style.display = 'none';
      }
    }
  });
});
