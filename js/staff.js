'use strict';
/* ============================================================
   staff.js — Team & Access Management Module
   Matches the high-end reference design with slide-over drawer,
   KPI counters, permissions matrix, attendance, and leave management.
   ============================================================ */

const StaffModule = {
  activeTab: 'members',
  searchQuery: '',
  editingId: null,
  attendanceDate: new Date().toISOString().split('T')[0],

  // Module configuration for permissions matrix
  MODULE_DEFS: [
    { id: 'appointments', label: 'Appointments',       icon: '📅' },
    { id: 'opd',          label: 'OPD console',        icon: '🩺' },
    { id: 'patients',     label: 'Customers / Patients', icon: '👤' },
    { id: 'pharmacy',     label: 'Pharmacy',           icon: '💊' },
    { id: 'staff',        label: 'Team & Staff',       icon: '👥' },
    { id: 'billing',      label: 'Billing & Accounts', icon: '🧾' },
    { id: 'records',      label: 'Medical Records',    icon: '📋' },
    { id: 'labmaster',    label: 'Lab Master',         icon: '🧪' },
    { id: 'advicemaster', label: 'Extra Advice',       icon: '💡' },
    { id: 'settings',     label: 'Settings',           icon: '⚙️' },
  ],

  // Default permissions preset by role
  ROLE_PRESETS: {
    'Clinic Admin':   ['appointments', 'opd', 'patients', 'pharmacy', 'staff', 'billing', 'records', 'labmaster', 'advicemaster', 'settings'],
    'Doctor':         ['appointments', 'opd', 'patients', 'pharmacy', 'records', 'labmaster', 'advicemaster'],
    'Receptionist':   ['appointments', 'opd', 'patients', 'billing'],
    'Nurse':          ['appointments', 'opd', 'patients', 'records'],
    'Pharmacist':     ['pharmacy', 'billing', 'opd'],
    'Accountant':     ['billing', 'opd', 'staff'],
    'Lab Technician': ['labmaster', 'records'],
    'Other':          ['appointments', 'opd'],
  },

  // Color generator for member initials avatars
  _getAvatarStyles(index, name = '') {
    const palettes = [
      { bg: '#EDE9FE', color: '#7C3AED' }, // purple / indigo (Karan Choudhary)
      { bg: '#FFEDD5', color: '#C2410C' }, // rust / orange (Test Receptionist)
      { bg: '#CCFBF1', color: '#0F766E' }, // teal
      { bg: '#E0F2FE', color: '#0369A1' }, // sky blue
      { bg: '#DCFCE7', color: '#15803D' }, // emerald
      { bg: '#FCE7F3', color: '#BE185D' }, // pink
    ];
    let idx = index;
    if (name) {
      let hash = 0;
      for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
      idx = Math.abs(hash) % palettes.length;
    }
    const p = palettes[idx % palettes.length];
    return `background-color: ${p.bg}; color: ${p.color};`;
  },

  _getRoleBadgeClass(role = '') {
    const lower = role.toLowerCase();
    if (lower.includes('admin')) return 'admin';
    if (lower.includes('reception')) return 'receptionist';
    if (lower.includes('doctor')) return 'doctor';
    if (lower.includes('nurse')) return 'nurse';
    if (lower.includes('pharm')) return 'pharmacist';
    return 'other';
  },

  _formatSubtitleDate() {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const d = new Date();
    return `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
  },

  /* ── Main Render ── */
  render() {
    const el = document.getElementById('module-staff');
    if (!el) return;

    const settings = DB.getSettings();
    const clinicName = settings.clinicName || 'Arogya Skin Clinic';
    const subDate = this._formatSubtitleDate();

    el.innerHTML = `
      <div class="page-header" style="align-items: center; margin-bottom: 20px;">
        <div class="team-header-info">
          <h1 style="font-size: 22px; font-weight: 800; color: var(--text-primary); margin: 0;">Team & Access</h1>
          <div class="team-header-meta">
            <span>${App.escHtml(clinicName)}</span>
            <span class="meta-dot">●</span>
            <span>Clinic admin</span>
            <span class="meta-dot">●</span>
            <span>${subDate}</span>
          </div>
        </div>

        <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
          <div class="team-search-box">
            <span class="search-icon">🔍</span>
            <input type="text" class="drawer-input" id="teamSearchInput" 
                   placeholder="Search members by name, mobile or..." 
                   value="${App.escHtml(this.searchQuery)}"
                   oninput="StaffModule.onSearch(this.value)">
          </div>

          <button class="btn btn-sm btn-secondary" onclick="StaffModule.loadDummyData()" title="Reload sample clinic staff, attendance, and leave records" style="padding: 8px 14px; font-size: 12.5px;">
            <span>🌱</span>
            <span>Load Demo Data</span>
          </button>

          <button class="btn-save-member" onclick="StaffModule.openDrawer()" style="padding: 9px 18px; font-size: 13px;">
            <span>➕</span>
            <span>Add staff member</span>
          </button>
        </div>
      </div>

      <!-- Navigation Tabs -->
      <div class="team-tabs-bar">
        <button class="team-tab-btn ${this.activeTab === 'members' ? 'active' : ''}" onclick="StaffModule.setTab('members')">
          Members
        </button>
        <button class="team-tab-btn ${this.activeTab === 'attendance' ? 'active' : ''}" onclick="StaffModule.setTab('attendance')">
          Attendance
        </button>
        <button class="team-tab-btn ${this.activeTab === 'leave' ? 'active' : ''}" onclick="StaffModule.setTab('leave')">
          Leave
        </button>
      </div>

      <!-- Tab Content Area -->
      <div id="teamTabContent"></div>
    `;

    this._renderTabContent();
  },

  setTab(tab) {
    this.activeTab = tab;
    this.render();
  },

  loadDummyData() {
    DB.seedStaffDummyData(true);
    App.toast('🌱 Demo team members, attendance & leave records loaded!', 'success');
    this.render();
  },

  onSearch(val) {
    this.searchQuery = val.trim().toLowerCase();
    if (this.activeTab === 'members') {
      this._renderMembersTable();
    }
  },

  _renderTabContent() {
    const container = document.getElementById('teamTabContent');
    if (!container) return;

    if (this.activeTab === 'members') {
      this._renderMembersTab(container);
    } else if (this.activeTab === 'attendance') {
      this._renderAttendanceTab(container);
    } else if (this.activeTab === 'leave') {
      this._renderLeaveTab(container);
    }
  },

  /* ============================================================
     TAB 1: MEMBERS
     ============================================================ */
  _renderMembersTab(container) {
    const staff = DB.getStaff();
    const totalMembers = staff.length;
    const activeMembers = staff.filter(s => s.status !== 'Inactive').length;
    const withLoginCount = staff.filter(s => s.hasLogin).length;

    container.innerHTML = `
      <!-- KPI Summary Cards -->
      <div class="team-kpi-grid">
        <div class="team-kpi-card">
          <div class="team-kpi-info">
            <span class="team-kpi-title">Team members</span>
            <span class="team-kpi-value">${totalMembers}</span>
          </div>
          <div class="team-kpi-badge-icon teal">👥</div>
        </div>

        <div class="team-kpi-card">
          <div class="team-kpi-info">
            <span class="team-kpi-title">Active</span>
            <span class="team-kpi-value">${activeMembers}</span>
          </div>
          <div class="team-kpi-badge-icon green">✓</div>
        </div>

        <div class="team-kpi-card">
          <div class="team-kpi-info">
            <span class="team-kpi-title">With login</span>
            <span class="team-kpi-value">${withLoginCount}</span>
          </div>
          <div class="team-kpi-badge-icon blue">🔑</div>
        </div>
      </div>

      <!-- Section Title Sub-bar -->
      <div class="team-section-bar">
        <div>
          <div class="team-section-title">${totalMembers} team members</div>
          <div class="team-section-subtitle">A member's role controls which modules they can open.</div>
        </div>
      </div>

      <!-- Members Table Container -->
      <div class="team-table-card" id="teamMembersTableContainer"></div>
    `;

    this._renderMembersTable();
  },

  _renderMembersTable() {
    const wrap = document.getElementById('teamMembersTableContainer');
    if (!wrap) return;

    let staff = DB.getStaff();

    if (this.searchQuery) {
      staff = staff.filter(s =>
        (s.name && s.name.toLowerCase().includes(this.searchQuery)) ||
        (s.empId && s.empId.toLowerCase().includes(this.searchQuery)) ||
        (s.role && s.role.toLowerCase().includes(this.searchQuery)) ||
        (s.phone && s.phone.toLowerCase().includes(this.searchQuery)) ||
        (s.email && s.email.toLowerCase().includes(this.searchQuery))
      );
    }

    if (staff.length === 0) {
      wrap.innerHTML = `
        <div style="padding: 48px 24px; text-align: center;">
          <div style="font-size: 36px; margin-bottom: 12px;">👥</div>
          <h3 style="margin-bottom: 6px; font-weight: 700; color: var(--text-primary);">No team members found</h3>
          <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 16px;">
            ${this.searchQuery ? 'Try clearing your search query.' : 'Get started by adding your first clinic team member.'}
          </p>
          <button class="btn-save-member" onclick="StaffModule.openDrawer()">➕ Add staff member</button>
        </div>
      `;
      return;
    }

    wrap.innerHTML = `
      <table class="team-table">
        <thead>
          <tr>
            <th style="width: 32%;">Member</th>
            <th style="width: 22%;">Role / access</th>
            <th style="width: 24%;">Contact</th>
            <th style="width: 12%;">Status</th>
            <th style="width: 10%; text-align: right;">Actions</th>
          </tr>
        </thead>
        <tbody>
          ${staff.map((s, idx) => {
            const roleClass = this._getRoleBadgeClass(s.role);
            const avatarStyles = this._getAvatarStyles(idx, s.name);
            const initials = App.getInitials(s.name || 'Member');
            const contactPhone = s.phone ? (s.phone.startsWith('+') ? s.phone : `+91${s.phone}`) : '';
            const contactEmail = s.email || '';
            const empCode = s.empId || `EMP-${String(idx + 1).padStart(5, '0')}`;
            const moduleCount = Array.isArray(s.modules) ? s.modules.length : 0;

            return `
              <tr>
                <td>
                  <div class="team-member-cell">
                    <div class="team-member-avatar" style="${avatarStyles}">
                      ${initials}
                    </div>
                    <div>
                      <div class="team-member-name-wrap">
                        <span class="team-member-name">${App.escHtml(s.name)}</span>
                        <span class="team-emp-badge">${App.escHtml(empCode)}</span>
                      </div>
                      ${s.designation ? `<div class="team-member-sub">${App.escHtml(s.designation)}</div>` : ''}
                    </div>
                  </div>
                </td>

                <td>
                  <div style="display: flex; flex-direction: column; gap: 4px; align-items: flex-start;">
                    <span class="role-pill ${roleClass}">${App.escHtml(s.role || 'Staff')}</span>
                    <span style="font-size: 11px; color: var(--text-muted);">
                      ${moduleCount >= 9 ? 'Full Access' : `${moduleCount} modules`}
                    </span>
                  </div>
                </td>

                <td>
                  <div class="team-contact-cell">
                    ${contactPhone ? `<span class="team-contact-phone">${App.escHtml(contactPhone)}</span>` : ''}
                    ${contactEmail ? `<span class="team-contact-email">${App.escHtml(contactEmail)}</span>` : ''}
                    ${!contactPhone && !contactEmail ? `<span style="color: var(--text-muted);">—</span>` : ''}
                  </div>
                </td>

                <td>
                  <div style="display: flex; flex-direction: column; gap: 4px; align-items: flex-start;">
                    <span style="display: inline-flex; align-items: center; gap: 5px; font-size: 12px; font-weight: 600; color: #10B981;">
                      <span style="width: 7px; height: 7px; border-radius: 50%; background: #10B981;"></span>
                      Active
                    </span>
                    ${s.hasLogin ? `
                      <span style="font-size: 10.5px; color: #0D9488; font-weight: 600;">🔑 With Login</span>
                    ` : `
                      <span style="font-size: 10.5px; color: var(--text-muted);">No Login</span>
                    `}
                  </div>
                </td>

                <td style="text-align: right;">
                  <div style="display: inline-flex; gap: 6px;">
                    <button class="btn btn-sm btn-secondary" title="Edit member" onclick="StaffModule.openDrawer('${s.id}')">
                      ✏️ Edit
                    </button>
                    <button class="btn btn-sm btn-danger" title="Remove member" onclick="StaffModule.deleteMember('${s.id}', '${App.escHtml(s.name)}')">
                      🗑️
                    </button>
                  </div>
                </td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    `;
  },

  /* ============================================================
     TAB 2: ATTENDANCE
     ============================================================ */
  _renderAttendanceTab(container) {
    const staff = DB.getStaff();
    const attendanceMap = DB.getStaffAttendance(this.attendanceDate);

    // Summary counts
    let presentCount = 0;
    let absentCount = 0;
    let halfDayCount = 0;
    let leaveCount = 0;

    staff.forEach(s => {
      const rec = attendanceMap[s.id];
      const status = rec ? rec.status : 'Present';
      if (status === 'Present') presentCount++;
      else if (status === 'Absent') absentCount++;
      else if (status === 'Half-Day') halfDayCount++;
      else if (status === 'Leave') leaveCount++;
    });

    container.innerHTML = `
      <!-- Attendance Toolbar -->
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; flex-wrap: wrap; gap: 12px;">
        <div style="display: flex; align-items: center; gap: 10px;">
          <button class="btn btn-secondary btn-sm" onclick="StaffModule.changeAttendanceDate(-1)">◀ Prev Day</button>
          <input type="date" class="drawer-input" style="width: 170px; padding: 6px 10px;" 
                 value="${this.attendanceDate}" 
                 onchange="StaffModule.setAttendanceDate(this.value)">
          <button class="btn btn-secondary btn-sm" onclick="StaffModule.changeAttendanceDate(1)">Next Day ▶</button>
          <button class="btn btn-secondary btn-sm" onclick="StaffModule.setAttendanceDateToday()">Today</button>
        </div>

        <div style="display: flex; gap: 8px;">
          <button class="btn btn-sm btn-success" onclick="StaffModule.markAllAttendance('Present')">✓ Mark All Present</button>
        </div>
      </div>

      <!-- Attendance Metrics -->
      <div class="team-kpi-grid">
        <div class="team-kpi-card">
          <div class="team-kpi-info">
            <span class="team-kpi-title">Present</span>
            <span class="team-kpi-value" style="color: #10B981;">${presentCount}</span>
          </div>
          <div class="team-kpi-badge-icon green">✓</div>
        </div>

        <div class="team-kpi-card">
          <div class="team-kpi-info">
            <span class="team-kpi-title">Absent</span>
            <span class="team-kpi-value" style="color: #EF4444;">${absentCount}</span>
          </div>
          <div class="team-kpi-badge-icon" style="background: rgba(239, 68, 68, 0.12); color: #EF4444;">✕</div>
        </div>

        <div class="team-kpi-card">
          <div class="team-kpi-info">
            <span class="team-kpi-title">Half Day</span>
            <span class="team-kpi-value" style="color: #F59E0B;">${halfDayCount}</span>
          </div>
          <div class="team-kpi-badge-icon" style="background: rgba(245, 158, 11, 0.12); color: #F59E0B;">⏱</div>
        </div>

        <div class="team-kpi-card">
          <div class="team-kpi-info">
            <span class="team-kpi-title">On Leave</span>
            <span class="team-kpi-value" style="color: #3B82F6;">${leaveCount}</span>
          </div>
          <div class="team-kpi-badge-icon blue">🏖️</div>
        </div>
      </div>

      <!-- Attendance Table -->
      <div class="team-table-card">
        <table class="team-table">
          <thead>
            <tr>
              <th style="width: 32%;">Member</th>
              <th style="width: 20%;">Status</th>
              <th style="width: 18%;">Clock In</th>
              <th style="width: 18%;">Clock Out</th>
              <th style="width: 12%; text-align: right;">Quick Action</th>
            </tr>
          </thead>
          <tbody>
            ${staff.map((s, idx) => {
              const rec = attendanceMap[s.id] || { status: 'Present', checkIn: '09:00 AM', checkOut: '06:00 PM' };
              const avatarStyles = this._getAvatarStyles(idx, s.name);
              const initials = App.getInitials(s.name);

              let badgeStyle = 'background: #DCFCE7; color: #15803D;';
              if (rec.status === 'Absent') badgeStyle = 'background: #FEE2E2; color: #B91C1C;';
              if (rec.status === 'Half-Day') badgeStyle = 'background: #FEF3C7; color: #B45309;';
              if (rec.status === 'Leave') badgeStyle = 'background: #E0F2FE; color: #0369A1;';

              return `
                <tr>
                  <td>
                    <div class="team-member-cell">
                      <div class="team-member-avatar" style="${avatarStyles}">${initials}</div>
                      <div>
                        <div class="team-member-name">${App.escHtml(s.name)}</div>
                        <div class="team-member-sub">${App.escHtml(s.role || '')} · ${App.escHtml(s.empId || '')}</div>
                      </div>
                    </div>
                  </td>

                  <td>
                    <span class="role-pill" style="${badgeStyle}">
                      ${App.escHtml(rec.status)}
                    </span>
                  </td>

                  <td>
                    <input type="text" class="drawer-input" style="width: 110px; padding: 5px 8px; font-size: 12px;"
                           value="${App.escHtml(rec.checkIn || '')}"
                           placeholder="09:00 AM"
                           onchange="StaffModule.updateClockTime('${s.id}', 'checkIn', this.value)">
                  </td>

                  <td>
                    <input type="text" class="drawer-input" style="width: 110px; padding: 5px 8px; font-size: 12px;"
                           value="${App.escHtml(rec.checkOut || '')}"
                           placeholder="06:00 PM"
                           onchange="StaffModule.updateClockTime('${s.id}', 'checkOut', this.value)">
                  </td>

                  <td style="text-align: right;">
                    <select class="drawer-input" style="width: 110px; padding: 5px 8px; font-size: 12px;"
                            onchange="StaffModule.setMemberStatus('${s.id}', this.value)">
                      <option value="Present"  ${rec.status === 'Present' ? 'selected' : ''}>Present</option>
                      <option value="Absent"   ${rec.status === 'Absent' ? 'selected' : ''}>Absent</option>
                      <option value="Half-Day" ${rec.status === 'Half-Day' ? 'selected' : ''}>Half-Day</option>
                      <option value="Leave"    ${rec.status === 'Leave' ? 'selected' : ''}>Leave</option>
                    </select>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;
  },

  setAttendanceDate(date) {
    this.attendanceDate = date;
    const container = document.getElementById('teamTabContent');
    if (container) this._renderAttendanceTab(container);
  },

  setAttendanceDateToday() {
    this.setAttendanceDate(new Date().toISOString().split('T')[0]);
  },

  changeAttendanceDate(offsetDays) {
    const cur = new Date(this.attendanceDate + 'T12:00:00');
    cur.setDate(cur.getDate() + offsetDays);
    this.setAttendanceDate(cur.toISOString().split('T')[0]);
  },

  setMemberStatus(staffId, status) {
    const map = DB.getStaffAttendance(this.attendanceDate);
    const existing = map[staffId] || {};
    DB.setStaffAttendance(this.attendanceDate, staffId, {
      ...existing,
      status
    });
    App.toast(`Status updated to ${status}`, 'success');
    const container = document.getElementById('teamTabContent');
    if (container) this._renderAttendanceTab(container);
  },

  updateClockTime(staffId, field, value) {
    const map = DB.getStaffAttendance(this.attendanceDate);
    const existing = map[staffId] || {};
    existing[field] = value.trim();
    DB.setStaffAttendance(this.attendanceDate, staffId, existing);
    App.toast('Time recorded', 'info');
  },

  markAllAttendance(status) {
    const staff = DB.getStaff();
    staff.forEach(s => {
      DB.setStaffAttendance(this.attendanceDate, s.id, {
        status,
        checkIn: '09:00 AM',
        checkOut: '06:00 PM'
      });
    });
    App.toast(`All marked ${status} for selected date`, 'success');
    const container = document.getElementById('teamTabContent');
    if (container) this._renderAttendanceTab(container);
  },

  /* ============================================================
     TAB 3: LEAVE MANAGEMENT
     ============================================================ */
  _renderLeaveTab(container) {
    const leaves = DB.getStaffLeaves();
    const staff = DB.getStaff();
    const staffMap = {};
    staff.forEach(s => { staffMap[s.id] = s; staffMap[s.empId] = s; });

    const pendingCount = leaves.filter(l => l.status === 'Pending').length;
    const approvedCount = leaves.filter(l => l.status === 'Approved').length;

    container.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; flex-wrap: wrap; gap: 12px;">
        <div class="team-section-title" style="font-size: 16px;">Staff Leave Tracker</div>
        <button class="btn-save-member" onclick="StaffModule.openApplyLeaveModal()">
          <span>➕</span>
          <span>Apply Leave</span>
        </button>
      </div>

      <div class="team-kpi-grid">
        <div class="team-kpi-card">
          <div class="team-kpi-info">
            <span class="team-kpi-title">Total Requests</span>
            <span class="team-kpi-value">${leaves.length}</span>
          </div>
          <div class="team-kpi-badge-icon teal">📋</div>
        </div>

        <div class="team-kpi-card">
          <div class="team-kpi-info">
            <span class="team-kpi-title">Pending</span>
            <span class="team-kpi-value" style="color: #F59E0B;">${pendingCount}</span>
          </div>
          <div class="team-kpi-badge-icon" style="background: rgba(245, 158, 11, 0.12); color: #F59E0B;">⏳</div>
        </div>

        <div class="team-kpi-card">
          <div class="team-kpi-info">
            <span class="team-kpi-title">Approved</span>
            <span class="team-kpi-value" style="color: #10B981;">${approvedCount}</span>
          </div>
          <div class="team-kpi-badge-icon green">✓</div>
        </div>
      </div>

      <div class="team-table-card">
        ${leaves.length === 0 ? `
          <div style="padding: 40px; text-align: center; color: var(--text-muted);">
            <div style="font-size: 32px; margin-bottom: 10px;">🏖️</div>
            <div style="font-weight: 600; font-size: 14px; margin-bottom: 4px;">No leave records</div>
            <div style="font-size: 12.5px;">Click "Apply Leave" above to record a planned leave for a team member.</div>
          </div>
        ` : `
          <table class="team-table">
            <thead>
              <tr>
                <th>Member</th>
                <th>Leave Type</th>
                <th>Dates</th>
                <th>Reason</th>
                <th>Status</th>
                <th style="text-align: right;">Actions</th>
              </tr>
            </thead>
            <tbody>
              ${leaves.map(l => {
                const s = staffMap[l.staffId] || { name: l.staffName || 'Staff Member', role: '' };
                let statusBadge = 'background: #FEF3C7; color: #B45309;';
                if (l.status === 'Approved') statusBadge = 'background: #DCFCE7; color: #15803D;';
                if (l.status === 'Rejected') statusBadge = 'background: #FEE2E2; color: #B91C1C;';

                return `
                  <tr>
                    <td>
                      <div class="team-member-name">${App.escHtml(s.name)}</div>
                      <div class="team-member-sub">${App.escHtml(s.role || '')}</div>
                    </td>
                    <td>
                      <span style="font-weight: 600; font-size: 12.5px;">${App.escHtml(l.type || 'Casual')}</span>
                    </td>
                    <td>
                      <div style="font-size: 12.5px; font-weight: 500;">
                        ${App.formatDate(l.startDate)} → ${App.formatDate(l.endDate)}
                      </div>
                    </td>
                    <td>
                      <div style="font-size: 12.5px; color: var(--text-secondary); max-width: 200px;">
                        ${App.escHtml(l.reason || 'Personal')}
                      </div>
                    </td>
                    <td>
                      <span class="role-pill" style="${statusBadge}">${App.escHtml(l.status)}</span>
                    </td>
                    <td style="text-align: right;">
                      <div style="display: inline-flex; gap: 4px;">
                        ${l.status === 'Pending' ? `
                          <button class="btn btn-sm btn-success" onclick="StaffModule.setLeaveStatus('${l.id}', 'Approved')">Approve</button>
                          <button class="btn btn-sm btn-danger" onclick="StaffModule.setLeaveStatus('${l.id}', 'Rejected')">Reject</button>
                        ` : ''}
                        <button class="btn btn-sm btn-secondary" onclick="StaffModule.deleteLeave('${l.id}')">🗑️</button>
                      </div>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        `}
      </div>
    `;
  },

  openApplyLeaveModal() {
    const staff = DB.getStaff();
    const today = new Date().toISOString().split('T')[0];

    const body = `
      <div class="form-group">
        <label>Staff Member *</label>
        <select class="form-control" id="lvStaffId">
          ${staff.map(s => `<option value="${s.id}">${App.escHtml(s.name)} (${App.escHtml(s.role || '')})</option>`).join('')}
        </select>
      </div>

      <div class="form-group">
        <label>Leave Type</label>
        <select class="form-control" id="lvType">
          <option value="Casual Leave">Casual Leave</option>
          <option value="Sick Leave">Sick Leave</option>
          <option value="Earned Leave">Earned Leave</option>
          <option value="Maternity / Paternity Leave">Maternity / Paternity Leave</option>
          <option value="Unpaid Leave">Unpaid Leave</option>
        </select>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label>Start Date</label>
          <input type="date" class="form-control" id="lvStartDate" value="${today}">
        </div>
        <div class="form-group">
          <label>End Date</label>
          <input type="date" class="form-control" id="lvEndDate" value="${today}">
        </div>
      </div>

      <div class="form-group">
        <label>Reason</label>
        <textarea class="form-control" id="lvReason" placeholder="Reason for leave..." rows="2"></textarea>
      </div>
    `;

    const footer = `
      <button class="btn btn-secondary" onclick="App.closeModal()">Cancel</button>
      <button class="btn-save-member" onclick="StaffModule.saveLeave()">Submit Leave</button>
    `;

    App.openModal('🏖️ Apply Staff Leave', body, footer);
  },

  saveLeave() {
    const staffId = document.getElementById('lvStaffId').value;
    const type = document.getElementById('lvType').value;
    const startDate = document.getElementById('lvStartDate').value;
    const endDate = document.getElementById('lvEndDate').value;
    const reason = document.getElementById('lvReason').value.trim();

    if (!startDate || !endDate) {
      App.toast('Please select dates', 'error');
      return;
    }

    DB.addStaffLeave({
      staffId,
      type,
      startDate,
      endDate,
      reason,
      status: 'Pending'
    });

    App.closeModal();
    App.toast('Leave application submitted', 'success');
    const container = document.getElementById('teamTabContent');
    if (container) this._renderLeaveTab(container);
  },

  setLeaveStatus(id, status) {
    DB.updateStaffLeave(id, { status });
    App.toast(`Leave marked ${status}`, 'success');
    const container = document.getElementById('teamTabContent');
    if (container) this._renderLeaveTab(container);
  },

  deleteLeave(id) {
    App.confirm('Delete this leave request?', () => {
      DB.deleteStaffLeave(id);
      App.toast('Leave record deleted', 'info');
      const container = document.getElementById('teamTabContent');
      if (container) this._renderLeaveTab(container);
    }, 'Delete', 'btn-danger');
  },

  /* ============================================================
     SLIDE-OVER DRAWER: ADD / EDIT STAFF MEMBER
     (Matches reference screenshot in exact layout and fields)
     ============================================================ */
  openDrawer(memberId = null) {
    this.editingId = memberId;
    const drawerEl = document.getElementById('staffDrawer');
    const overlayEl = document.getElementById('staffDrawerOverlay');
    if (!drawerEl || !overlayEl) return;

    let member = null;
    if (memberId) {
      member = DB.getStaff().find(s => s.id === memberId || s.empId === memberId);
    }

    const isEdit = Boolean(member);
    const title = isEdit ? 'Edit staff member' : 'Add staff member';
    const joinedOnDefault = (member && member.joinedOn) ? member.joinedOn : new Date().toISOString().split('T')[0];
    const rawPhone = member && member.phone ? member.phone.replace(/^\+91/, '').trim() : '';
    const selectedModules = (member && Array.isArray(member.modules)) 
      ? member.modules 
      : (member && member.role && this.ROLE_PRESETS[member.role] ? this.ROLE_PRESETS[member.role] : ['appointments', 'opd', 'patients']);

    drawerEl.innerHTML = `
      <!-- Drawer Header -->
      <div class="staff-drawer-header">
        <h3 class="staff-drawer-title">${title}</h3>
        <button class="staff-drawer-close" onclick="StaffModule.closeDrawer()" aria-label="Close">✕</button>
      </div>

      <!-- Drawer Body -->
      <div class="staff-drawer-body">
        <!-- Row 1: Full name * & Designation -->
        <div class="drawer-field-row">
          <div class="drawer-field">
            <label>Full name <span class="required">*</span></label>
            <input type="text" class="drawer-input" id="sfDrawerName" 
                   placeholder="e.g. Priya Sharma" 
                   value="${App.escHtml((member && member.name) || '')}">
          </div>

          <div class="drawer-field">
            <label>Designation</label>
            <input type="text" class="drawer-input" id="sfDrawerDesignation" 
                   placeholder="e.g. Front desk" 
                   value="${App.escHtml((member && member.designation) || '')}">
          </div>
        </div>

        <!-- Row 2: Role & access * -->
        <div class="drawer-field">
          <label>Role & access <span class="required">*</span></label>
          <select class="drawer-input" id="sfDrawerRole" onchange="StaffModule.onRoleSelected(this.value)">
            <option value="">Choose a role...</option>
            <option value="Clinic Admin"   ${member && member.role === 'Clinic Admin' ? 'selected' : ''}>Clinic Admin</option>
            <option value="Doctor"         ${member && member.role === 'Doctor' ? 'selected' : ''}>Doctor</option>
            <option value="Receptionist"   ${member && member.role === 'Receptionist' ? 'selected' : ''}>Receptionist</option>
            <option value="Nurse"          ${member && member.role === 'Nurse' ? 'selected' : ''}>Nurse</option>
            <option value="Pharmacist"     ${member && member.role === 'Pharmacist' ? 'selected' : ''}>Pharmacist</option>
            <option value="Accountant"     ${member && member.role === 'Accountant' ? 'selected' : ''}>Accountant</option>
            <option value="Lab Technician" ${member && member.role === 'Lab Technician' ? 'selected' : ''}>Lab Technician</option>
            <option value="Other"          ${member && member.role === 'Other' ? 'selected' : ''}>Other</option>
          </select>
          <div class="helper-text">
            The role sets their base modules. Tick extra modules below to give one person multiple permissions.
          </div>
        </div>

        <!-- Extra module permissions -->
        <div class="drawer-field">
          <label style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.04em; color: var(--text-muted);">
            Extra module permissions
          </label>
          <div class="permission-grid" id="sfPermissionGrid">
            ${this.MODULE_DEFS.map(mod => {
              const isChecked = selectedModules.includes(mod.id);
              return `
                <label class="permission-item">
                  <input type="checkbox" value="${mod.id}" ${isChecked ? 'checked' : ''} class="sf-perm-cb">
                  <span class="perm-icon">${mod.icon}</span>
                  <span>${mod.label}</span>
                </label>
              `;
            }).join('')}
          </div>
        </div>

        <!-- Row 3: Phone & Joined on -->
        <div class="drawer-field-row">
          <div class="drawer-field">
            <label>Phone</label>
            <div class="drawer-phone-wrap">
              <span class="drawer-phone-prefix">+91</span>
              <input type="tel" class="drawer-input" id="sfDrawerPhone" 
                     placeholder="Mobile" 
                     value="${App.escHtml(rawPhone)}">
            </div>
          </div>

          <div class="drawer-field">
            <label>Joined on</label>
            <input type="date" class="drawer-input" id="sfDrawerJoinedOn" 
                   value="${joinedOnDefault}">
          </div>
        </div>

        <!-- Login Optional Section -->
        <div class="drawer-section-divider">
          <div class="drawer-section-heading">LOGIN (OPTIONAL)</div>
          <div class="drawer-section-desc">
            Set both fields so the member can sign in to the clinic management system.
          </div>

          <div class="drawer-field-row">
            <div class="drawer-field">
              <label>Email</label>
              <input type="email" class="drawer-input" id="sfDrawerEmail" 
                     placeholder="staff@clinic.com" 
                     value="${App.escHtml((member && member.email) || '')}">
            </div>

            <div class="drawer-field">
              <label>Password</label>
              <div style="position: relative;">
                <input type="password" class="drawer-input" id="sfDrawerPassword" 
                       placeholder="min 8 characters" 
                       value="${App.escHtml((member && member.password) || '')}"
                       style="padding-right: 36px;">
                <span onclick="StaffModule.togglePasswordVisibility()" 
                      style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%); cursor: pointer; opacity: 0.6; font-size: 13px;" 
                      title="Show/Hide Password">👁️</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Drawer Footer -->
      <div class="staff-drawer-footer">
        <button class="btn-drawer-cancel" onclick="StaffModule.closeDrawer()">Cancel</button>
        <button class="btn-save-member" onclick="StaffModule.saveDrawer()">
          <span>✓</span>
          <span>Save member</span>
        </button>
      </div>
    `;

    overlayEl.classList.add('open');
    document.body.style.overflow = 'hidden';

    // Close on Escape key
    this._escHandler = (e) => {
      if (e.key === 'Escape') StaffModule.closeDrawer();
    };
    window.addEventListener('keydown', this._escHandler);
  },

  closeDrawer() {
    const overlayEl = document.getElementById('staffDrawerOverlay');
    if (overlayEl) overlayEl.classList.remove('open');
    document.body.style.overflow = '';
    this.editingId = null;
    if (this._escHandler) {
      window.removeEventListener('keydown', this._escHandler);
      this._escHandler = null;
    }
  },

  onRoleSelected(role) {
    if (!role || !this.ROLE_PRESETS[role]) return;
    const preset = this.ROLE_PRESETS[role];
    document.querySelectorAll('.sf-perm-cb').forEach(cb => {
      cb.checked = preset.includes(cb.value);
    });
  },

  togglePasswordVisibility() {
    const input = document.getElementById('sfDrawerPassword');
    if (input) {
      input.type = input.type === 'password' ? 'text' : 'password';
    }
  },

  saveDrawer() {
    const name = (document.getElementById('sfDrawerName').value || '').trim();
    if (!name) {
      App.toast('Full name is required', 'error');
      document.getElementById('sfDrawerName').focus();
      return;
    }

    const role = document.getElementById('sfDrawerRole').value;
    if (!role) {
      App.toast('Please choose a role & access level', 'error');
      document.getElementById('sfDrawerRole').focus();
      return;
    }

    const designation = (document.getElementById('sfDrawerDesignation').value || '').trim();
    const rawPhone = (document.getElementById('sfDrawerPhone').value || '').trim();
    const phone = rawPhone ? (rawPhone.startsWith('+') ? rawPhone : `+91${rawPhone}`) : '';
    const joinedOn = document.getElementById('sfDrawerJoinedOn').value || new Date().toISOString().split('T')[0];
    const email = (document.getElementById('sfDrawerEmail').value || '').trim();
    const password = (document.getElementById('sfDrawerPassword').value || '').trim();

    // Collect permissions
    const checkedModules = [];
    document.querySelectorAll('.sf-perm-cb:checked').forEach(cb => checkedModules.push(cb.value));

    const payload = {
      name,
      role,
      designation: designation || (role === 'Receptionist' ? 'Front desk' : role),
      phone,
      email,
      joinedOn,
      status: 'Active',
      hasLogin: Boolean(email && (password || this.editingId)),
      password,
      modules: checkedModules.length > 0 ? checkedModules : ['appointments', 'opd', 'patients'],
    };

    if (this.editingId) {
      DB.updateStaff(this.editingId, payload);
      App.toast('Staff member updated successfully', 'success');
    } else {
      DB.addStaff(payload);
      App.toast('Staff member added successfully', 'success');
    }

    this.closeDrawer();
    this.render();
  },

  deleteMember(id, name) {
    App.confirm(`Are you sure you want to remove ${name}?`, () => {
      DB.deleteStaff(id);
      App.toast('Staff member removed', 'info');
      this.render();
    }, 'Remove', 'btn-danger');
  }
};
