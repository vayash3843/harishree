'use strict';
/* ============================================================
   app.js — Router, navigation, theme, global utilities (App)
   ============================================================ */

/* ── Module registry ── */
const MODULE_NAMES = {
  dashboard:     'Dashboard',
  patients:      'Patients',
  records:       'Medical Records',
  medicines:     'Medicine Master',
  labmaster:     'Lab Master',
  advicemaster:  'Extra Advice Master',
  billing:       'Billing',
  opd:           'OPD Collection',
  charges:       'Charges Master',
  staff:         'Team & Access',
  settings:      'Settings',
};

const MODULE_LOADERS = {
  dashboard:     () => DashboardModule.render(),
  patients:      () => PatientsModule.render(),
  records:       () => RecordsModule.render(),
  medicines:     () => MedicinesModule.render(),
  labmaster:     () => LabMasterModule.render(),
  advicemaster:  () => AdviceMasterModule.render(),
  billing:       () => BillingModule.render(),
  opd:           () => OpdModule.render(),
  charges:       () => ChargesModule.render(),
  staff:         () => StaffModule.render(),
  settings:      () => SettingsModule.render(),
};

/* ── Init ── */
document.addEventListener('DOMContentLoaded', () => {
  DB.seed();

  // Apply saved clinic branding
  _applyBranding();

  // Theme
  const savedTheme = localStorage.getItem('theme') || 'light';
  _setTheme(savedTheme);

  // Nav clicks
  document.querySelectorAll('.nav-item[data-module]').forEach(item => {
    item.addEventListener('click', e => {
      e.preventDefault();
      if (item.getAttribute('data-restricted') === 'true') {
        const curUser = App.getCurrentUser();
        App.toast(`Access restricted for ${curUser.role} role. Switch to Doctor/Admin to open.`, 'warning', 2500);
        return;
      }
      navigateTo(item.dataset.module);
      if (window.innerWidth < 768) {
        document.getElementById('sidebar').classList.remove('open');
      }
    });
  });

  // Sidebar Brand Logo Click — Toggle Expand/Collapse Sidebar
  const brandToggle = document.getElementById('sidebarBrandToggle');
  if (brandToggle) {
    brandToggle.addEventListener('click', () => {
      document.body.classList.toggle('sidebar-collapsed');
      const isCollapsed = document.body.classList.contains('sidebar-collapsed');
      const toggleIcon = document.getElementById('sidebarToggleIcon');
      if (toggleIcon) toggleIcon.textContent = isCollapsed ? '▶' : '◀';
      localStorage.setItem('sidebar_collapsed', isCollapsed ? '1' : '0');
    });
  }

  // Restore saved sidebar state
  if (localStorage.getItem('sidebar_collapsed') === '1') {
    document.body.classList.add('sidebar-collapsed');
    const toggleIcon = document.getElementById('sidebarToggleIcon');
    if (toggleIcon) toggleIcon.textContent = '▶';
  }

  // Sidebar toggle (mobile)
  document.getElementById('sidebarToggle').addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('open');
  });

  // Close sidebar when clicking outside on mobile
  document.addEventListener('click', e => {
    const sidebar = document.getElementById('sidebar');
    const toggle  = document.getElementById('sidebarToggle');
    if (
      window.innerWidth < 768 &&
      sidebar.classList.contains('open') &&
      !sidebar.contains(e.target) &&
      e.target !== toggle
    ) {
      sidebar.classList.remove('open');
    }
  });

  // Theme toggle
  document.getElementById('themeToggle').addEventListener('click', () => {
    const current = document.documentElement.dataset.theme;
    _setTheme(current === 'dark' ? 'light' : 'dark');
  });

  // Modal close — clicking header close button closes modal
  document.getElementById('modalClose').addEventListener('click', () => App.closeModal());

  // Backdrop click — do NOT close modal, trigger pulse/blink animation on white modal box
  document.getElementById('modalOverlay').addEventListener('click', e => {
    if (e.target === document.getElementById('modalOverlay')) {
      const modal = document.getElementById('modal');
      if (modal && modal.classList.contains('open')) {
        modal.classList.remove('blink');
        void modal.offsetWidth;
        modal.classList.add('blink');
        setTimeout(() => modal.classList.remove('blink'), 400);
      }
    }
  });

  // Keyboard ESC — trigger blink to protect unsaved work (exit only via Cancel / Save)
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      const modal = document.getElementById('modal');
      if (modal && modal.classList.contains('open')) {
        modal.classList.remove('blink');
        void modal.offsetWidth;
        modal.classList.add('blink');
        setTimeout(() => modal.classList.remove('blink'), 400);
      }
    }
  });

  // Clock
  _updateDateTime();
  setInterval(_updateDateTime, 10000);

  // Initialize active user session & badge
  App.updateUserBadge();
  App.applyUserPermissions(App.getCurrentUser());

  // Initial page
  const initialUser = App.getCurrentUser();
  if (typeof DashboardModule !== 'undefined' && initialUser && (initialUser.role || '').toLowerCase().includes('pharmacist')) {
    DashboardModule._topTab = 'pharmacy';
  }
  navigateTo('dashboard');
});

/* ── Private helpers ── */
function _setTheme(theme) {
  document.documentElement.dataset.theme = 'light';
  localStorage.setItem('theme', 'light');
  const btn = document.getElementById('themeToggle');
  if (btn) btn.textContent = '☀️';
}

function _updateDateTime() {
  const el = document.getElementById('datetime');
  if (!el) return;
  const now = new Date();
  el.textContent = now.toLocaleString('en-US', {
    weekday:'short', month:'short', day:'numeric',
    hour:'2-digit', minute:'2-digit',
  });
}

function _applyBranding() {
  const s = DB.getSettings();
  if (s.clinicName) document.querySelector('.brand-name').textContent = s.clinicName;
  if (s.doctorName) document.querySelector('.brand-sub').textContent  = s.doctorName;
}

/* ── Router ── */
function navigateTo(module) {
  // Highlight active nav
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.toggle('active', item.dataset.module === module);
  });

  // Show/hide modules
  document.querySelectorAll('.module').forEach(m => m.classList.remove('active'));
  const moduleEl = document.getElementById('module-' + module);
  if (moduleEl) moduleEl.classList.add('active');

  // Topbar title
  document.getElementById('topbarTitle').textContent = MODULE_NAMES[module] || module;

  // Load content
  if (MODULE_LOADERS[module]) {
    try {
      MODULE_LOADERS[module]();
    } catch (err) {
      console.error('Error loading module', module, err);
    }
  }
}

/* ── Global App utilities ── */
const App = {

  openModal(title, bodyHTML, footerHTML, isLg = false) {
    document.getElementById('modalTitle').textContent = title;
    document.getElementById('modalBody').innerHTML    = bodyHTML    || '';
    const footerEl = document.getElementById('modalFooter');
    if (footerEl) {
      if (footerHTML && footerHTML.trim()) {
        footerEl.innerHTML = footerHTML;
        footerEl.style.display = 'flex';
      } else {
        footerEl.innerHTML = '';
        footerEl.style.display = 'none';
      }
    }
    const modal = document.getElementById('modal');
    modal.classList.remove('modal-lg', 'modal-xl', 'modal-fullscreen');
    if (isLg === 'fullscreen' || isLg === 'full') {
      modal.classList.add('modal-fullscreen');
    } else if (isLg === 'xl') {
      modal.classList.add('modal-xl');
    } else if (isLg) {
      modal.classList.add('modal-lg');
    }
    modal.classList.add('open');
    document.getElementById('modalOverlay').classList.add('open');
    document.body.style.overflow = 'hidden';
  },

  closeModal() {
    const modal = document.getElementById('modal');
    modal.classList.remove('open', 'modal-lg', 'modal-xl', 'modal-fullscreen');
    document.getElementById('modalOverlay').classList.remove('open');
    document.body.style.overflow = '';
  },

  toast(message, type = 'info', duration = 3200) {
    const icons = { success:'✅', error:'❌', warning:'⚠️', info:'ℹ️' };
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span>${icons[type] || 'ℹ️'}</span><span>${message}</span>`;
    document.getElementById('toastContainer').appendChild(toast);
    setTimeout(() => { toast.style.opacity='0'; toast.style.transform='translateY(8px)'; toast.style.transition='all 0.3s'; setTimeout(() => toast.remove(), 350); }, duration);
  },

  confirm(message, onConfirm, confirmLabel = 'Delete', confirmClass = 'btn-danger') {
    const body = `<p style="color:var(--text-secondary);font-size:14px;line-height:1.6;">${message}</p>`;
    const footer = `
      <button class="btn btn-secondary" id="confirmNo">Cancel</button>
      <button class="btn ${confirmClass}" id="confirmYes">${confirmLabel}</button>
    `;
    App.openModal('Confirm', body, footer);
    document.getElementById('confirmNo').addEventListener('click',  () => App.closeModal());
    document.getElementById('confirmYes').addEventListener('click', () => { App.closeModal(); onConfirm(); });
  },

  /* ── Formatting helpers ── */
  formatDate(dateStr) {
    if (!dateStr) return '—';
    try {
      return new Date(dateStr + (dateStr.length === 10 ? 'T12:00:00' : '')).toLocaleDateString('en-US', {
        year:'numeric', month:'short', day:'numeric',
      });
    } catch { return dateStr; }
  },

  formatAge(dobOrAge) {
    if (!dobOrAge) return '—';
    if (typeof dobOrAge === 'number' || (/^\d+$/.test(String(dobOrAge).trim()) && parseInt(dobOrAge, 10) < 150)) {
      return `${dobOrAge} Yrs`;
    }
    try {
      const str = String(dobOrAge).trim();
      const birthDate = new Date(str + (str.length === 10 ? 'T12:00:00' : ''));
      if (isNaN(birthDate.getTime())) return str;
      const today = new Date();
      
      let years = today.getFullYear() - birthDate.getFullYear();
      let months = today.getMonth() - birthDate.getMonth();
      let days = today.getDate() - birthDate.getDate();

      if (days < 0) {
        months--;
      }
      if (months < 0) {
        years--;
        months += 12;
      }
      if (years < 0) return '0 Yrs';

      if (years > 0 && months > 0) {
        return `${years} Yrs ${months} Mo`;
      } else if (years > 0) {
        return `${years} Yrs`;
      } else if (months > 0) {
        return `${months} Mo`;
      } else {
        return `0 Yrs`;
      }
    } catch { return '—'; }
  },

  getAgeStr(dobOrAge) {
    if (!dobOrAge) return '—';
    if (typeof dobOrAge === 'number' || (/^\d+$/.test(String(dobOrAge).trim()) && parseInt(dobOrAge, 10) < 150)) {
      return `${dobOrAge} Year`;
    }
    try {
      const str = String(dobOrAge).trim();
      const birthDate = new Date(str + (str.length === 10 ? 'T12:00:00' : ''));
      if (isNaN(birthDate.getTime())) return str;
      const today = new Date();
      
      let years = today.getFullYear() - birthDate.getFullYear();
      let months = today.getMonth() - birthDate.getMonth();
      let days = today.getDate() - birthDate.getDate();

      if (days < 0) {
        months--;
      }
      if (months < 0) {
        years--;
        months += 12;
      }
      if (years < 0) return '0 Year';

      if (years > 0 && months > 0) {
        return `${years} Year ${months} Month`;
      } else if (years > 0) {
        return `${years} Year`;
      } else if (months > 0) {
        return `${months} Month`;
      } else {
        return `0 Year`;
      }
    } catch { return '—'; }
  },

  getInitials(name) {
    if (!name) return '?';
    return name.trim().split(/\s+/).map(w => w[0]).join('').substring(0, 2).toUpperCase();
  },

  getAvatarClass(index) {
    const classes = ['avatar-teal','avatar-indigo','avatar-green','avatar-amber','avatar-rose'];
    return classes[index % classes.length];
  },

  escHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  },

  /* ── User Session & Role Permissions ── */
  getCurrentUser() {
    try {
      const saved = localStorage.getItem('clinic_current_user');
      if (saved) return JSON.parse(saved);
    } catch {}
    const staff = (typeof DB !== 'undefined' && DB.getStaff) ? DB.getStaff() : [];
    const doc = staff.find(s => s.role === 'Doctor') || staff[0] || {
      id: 'EMP-00001',
      name: 'DR. YASH VAGHANI',
      role: 'Doctor',
      designation: 'Chief Consulting Physician'
    };
    return doc;
  },

  setCurrentUser(user) {
    if (!user) return;
    localStorage.setItem('clinic_current_user', JSON.stringify(user));
    this.updateUserBadge();
    this.applyUserPermissions(user);
  },

  updateUserBadge() {
    const user = this.getCurrentUser();
    const roleIcons = {
      'Doctor': '👨‍⚕️',
      'Pharmacist': '💊',
      'Receptionist': '💁‍♀️',
      'Nurse': '🩺',
      'Accountant': '📊',
      'Clinic Admin': '💼',
      'Admin': '💼',
      'Lab Technician': '🧪'
    };
    const roleColors = {
      'Doctor': { bg: '#e0f2fe', color: '#0369a1' },
      'Pharmacist': { bg: '#fef3c7', color: '#b45309' },
      'Receptionist': { bg: '#e0e7ff', color: '#4338ca' },
      'Nurse': { bg: '#dcfce7', color: '#15803d' },
      'Accountant': { bg: '#fce7f3', color: '#be185d' },
      'Clinic Admin': { bg: '#ede9fe', color: '#6d28d9' },
      'Admin': { bg: '#ede9fe', color: '#6d28d9' },
      'Lab Technician': { bg: '#ccfbf1', color: '#0f766e' }
    };

    const icon = roleIcons[user.role] || '👤';
    const conf = roleColors[user.role] || { bg: '#e2e8f0', color: '#334155' };

    const topIcon = document.getElementById('userRoleIcon');
    const topName = document.getElementById('userNameDisplay');
    const topBadge = document.getElementById('userRoleBadge');
    if (topIcon) topIcon.textContent = icon;
    if (topName) topName.textContent = user.name || 'User';
    if (topBadge) {
      topBadge.textContent = user.role || 'Staff';
      topBadge.style.background = conf.bg;
      topBadge.style.color = conf.color;
    }

    const sbIcon = document.getElementById('sidebarUserIcon');
    const sbName = document.getElementById('sidebarUserName');
    const sbRole = document.getElementById('sidebarUserRole');
    if (sbIcon) sbIcon.textContent = icon;
    if (sbName) sbName.textContent = user.name || 'User';
    if (sbRole) sbRole.textContent = `${user.role || 'Staff'} (Active)`;
  },

  applyUserPermissions(user) {
    if (!user) return;
    const role = (user.role || '').toLowerCase();
    const isFullAccess = role.includes('admin') || role.includes('doctor');

    // Modules permitted for Pharmacist or other specific roles
    // 'dashboard' and 'settings' are ALWAYS accessible by everyone!
    const allowedModules = isFullAccess
      ? Object.keys(MODULE_NAMES)
      : (user.modules && user.modules.length > 0
          ? ['dashboard', 'settings', ...user.modules.map(m => (m === 'pharmacy' ? 'medicines' : m))]
          : ['dashboard', 'settings', 'medicines', 'billing', 'opd', 'patients', 'records']);

    document.querySelectorAll('.nav-item[data-module]').forEach(el => {
      const mod = el.dataset.module;
      if (mod === 'settings' || mod === 'dashboard') {
        el.style.opacity = '1';
        el.style.pointerEvents = 'auto';
        el.removeAttribute('data-restricted');
        return;
      }
      const isAllowed = isFullAccess || allowedModules.includes(mod);
      if (isAllowed) {
        el.style.opacity = '1';
        el.style.pointerEvents = 'auto';
        el.removeAttribute('data-restricted');
      } else {
        el.style.opacity = '0.4';
        el.setAttribute('data-restricted', 'true');
      }
    });
  },

  openLoginModal() {
    const staff = (typeof DB !== 'undefined' && DB.getStaff) ? DB.getStaff() : [];
    const currentUser = this.getCurrentUser();
    const roleIcons = {
      'Doctor': '👨‍⚕️',
      'Pharmacist': '💊',
      'Receptionist': '💁‍♀️',
      'Nurse': '🩺',
      'Accountant': '📊',
      'Clinic Admin': '💼',
      'Admin': '💼',
      'Lab Technician': '🧪'
    };

    const body = `
      <div style="margin-bottom:16px;">
        <div style="font-size:13px;color:var(--text-secondary);margin-bottom:14px;">
          Choose a team member profile below to log in or switch roles instantly. Role controls module permissions and shortcuts:
        </div>
        <div style="display:grid;grid-template-columns:repeat(auto-fill, minmax(260px, 1fr));gap:12px;">
          ${staff.map(s => {
            const isCur = String(s.id) === String(currentUser.id) || String(s.empId) === String(currentUser.empId);
            const icon = roleIcons[s.role] || '👤';
            const isPharmacist = (s.role || '').toLowerCase().includes('pharmacist');
            return `
              <div style="background:var(--bg-elevated);border:${isCur ? '2px solid var(--primary)' : '1px solid var(--border)'};border-radius:var(--radius-md);padding:12px;display:flex;flex-direction:column;justify-content:space-between;position:relative;${isCur ? 'box-shadow:0 0 0 3px rgba(37,99,235,0.15);' : ''}">
                ${isCur ? `<span style="position:absolute;top:8px;right:8px;font-size:10px;background:var(--primary);color:#fff;padding:2px 6px;border-radius:4px;font-weight:800;">CURRENT</span>` : ''}
                <div style="display:flex;gap:10px;align-items:flex-start;margin-bottom:10px;">
                  <div style="font-size:24px;width:38px;height:38px;display:flex;align-items:center;justify-content:center;background:var(--bg-surface);border:1px solid var(--border);border-radius:8px;">
                    ${icon}
                  </div>
                  <div style="flex:1;min-width:0;">
                    <div style="font-weight:800;font-size:13px;color:var(--text-primary);">${App.escHtml(s.name)}</div>
                    <div style="font-size:11px;color:var(--primary);font-weight:700;margin-top:1px;">${App.escHtml(s.role)}</div>
                    <div style="font-size:10px;color:var(--text-muted);">${App.escHtml(s.designation || '')}</div>
                  </div>
                </div>

                <div style="font-size:11px;color:var(--text-secondary);margin-bottom:12px;background:var(--bg-surface);padding:6px 8px;border-radius:4px;border:1px dashed var(--border);">
                  <strong style="color:var(--text-primary);">Accessible Modules:</strong><br>
                  ${isPharmacist ? '📊 Dashboard, 💊 Medicine Master, 🧾 Billing, 🏥 OPD Prescriptions' : (s.role === 'Doctor' ? '🩺 All Clinical, Patients & Lab Modules' : (s.modules || ['All Modules']).join(', '))}
                </div>

                <button class="btn btn-sm ${isPharmacist ? 'btn-success' : 'btn-primary'}" 
                        style="width:100%;font-weight:700;font-size:12px;padding:6px 12px;display:flex;align-items:center;justify-content:center;gap:6px;"
                        onclick="App.loginAsMember('${s.id}')">
                  ${icon} Login as ${App.escHtml(s.role)}
                </button>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;

    const footer = `
      <button class="btn btn-secondary" onclick="App.closeModal()">✕ Close</button>
    `;

    App.openModal('🔐 Switch User / Staff Login', body, footer, 'lg');
  },

  loginAsMember(staffId) {
    const staff = (typeof DB !== 'undefined' && DB.getStaff) ? DB.getStaff() : [];
    const member = staff.find(s => String(s.id) === String(staffId) || String(s.empId) === String(staffId));
    if (!member) {
      App.toast('Staff member not found', 'error');
      return;
    }
    this.setCurrentUser(member);
    App.closeModal();
    App.toast(`Logged in as ${member.role} (${member.name})! 🔑`, 'success', 2200);

    // Land on relevant dashboard
    const role = (member.role || '').toLowerCase();
    if (typeof DashboardModule !== 'undefined') {
      DashboardModule._topTab = role.includes('pharmacist') ? 'pharmacy' : 'doctor';
    }
    navigateTo('dashboard');
  },
};

/* expose navigateTo globally so inline onclick handlers can call it */
window.navigateTo = navigateTo;
window.App        = App;
window._setTheme  = _setTheme;
