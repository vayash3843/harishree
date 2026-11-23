'use strict';
/* ============================================================
   appointments.js — Appointments module (day view + full list)
   ============================================================ */

const AppointmentsModule = {
  currentDate: new Date().toISOString().split('T')[0],

  render() {
    const el = document.getElementById('module-appointments');
    if (!el) return;

    el.innerHTML = `
      <div class="page-header">
        <div>
          <h1>📅 Appointments</h1>
          <div class="subtitle">Manage your daily schedule</div>
        </div>
        <button class="btn btn-primary" onclick="AppointmentsModule.openBookModal()">➕ Book Appointment</button>
      </div>

      <!-- Day Navigator -->
      <div class="card" style="margin-bottom:var(--gap-md);">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--gap-md);">
          <button class="btn btn-secondary" onclick="AppointmentsModule._changeDay(-1)">← Prev</button>
          <div style="text-align:center;">
            <div style="font-size:15px;font-weight:700;" id="dayLabel">${_fmtDay(this.currentDate)}</div>
            <button onclick="AppointmentsModule._goToday()"
                    style="font-size:11px;color:var(--primary);background:none;border:none;cursor:pointer;margin-top:2px;font-weight:600;">
              Go to Today
            </button>
          </div>
          <button class="btn btn-secondary" onclick="AppointmentsModule._changeDay(1)">Next →</button>
        </div>
        <div id="dayView"></div>
      </div>

      <!-- All Appointments -->
      <div class="card" style="padding:0;">
        <div style="padding:var(--gap-md) var(--gap-lg);border-bottom:1px solid var(--border);">
          <div class="card-title" style="margin:0;">📋 All Appointments</div>
        </div>
        <div id="allAppts"></div>
      </div>
    `;

    this._renderDayView();
    this._renderAll();
  },

  _changeDay(delta) {
    const d = new Date(this.currentDate + 'T12:00:00');
    d.setDate(d.getDate() + delta);
    this.currentDate = d.toISOString().split('T')[0];
    document.getElementById('dayLabel').textContent = _fmtDay(this.currentDate);
    this._renderDayView();
  },

  _goToday() {
    this.currentDate = new Date().toISOString().split('T')[0];
    document.getElementById('dayLabel').textContent = _fmtDay(this.currentDate);
    this._renderDayView();
  },

  _renderDayView() {
    const el = document.getElementById('dayView');
    if (!el) return;

    const dayAppts = DB.getAppointments()
      .filter(a => a.date === this.currentDate)
      .sort((a, b) => a.time.localeCompare(b.time));

    const hours = ['08','09','10','11','12','13','14','15','16','17','18'];

    el.innerHTML = `<div class="time-slots">` +
      hours.map(h => {
        const label = `${h}:00`;
        const appt  = dayAppts.find(a => a.time.startsWith(h));

        return `
          <div class="time-slot">
            <div class="time-label">${label}</div>
            <div class="time-slot-content">
              ${appt ? `
                <div class="appt-block ${appt.status}">
                  <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px;">
                    <div>
                      <div class="appt-time">
                        ${App.escHtml(appt.time)}
                        <span class="badge badge-${appt.status}">${appt.status}</span>
                      </div>
                      <div class="appt-name">${App.escHtml(appt.patientName)}</div>
                      <div class="appt-reason">${App.escHtml(appt.reason)}</div>
                    </div>
                    ${appt.status === 'scheduled' ? `
                      <div style="display:flex;gap:4px;flex-shrink:0;">
                        <button class="btn btn-sm btn-success" onclick="AppointmentsModule._setStatus('${appt.id}','completed')">✓</button>
                        <button class="btn btn-sm btn-danger"  onclick="AppointmentsModule._setStatus('${appt.id}','cancelled')">✕</button>
                      </div>
                    ` : ''}
                  </div>
                </div>
              ` : ''}
            </div>
          </div>
        `;
      }).join('') + `</div>`;
  },

  _renderAll() {
    const el = document.getElementById('allAppts');
    if (!el) return;

    const appts = DB.getAppointments()
      .slice()
      .sort((a, b) => b.date.localeCompare(a.date) || a.time.localeCompare(b.time));

    if (appts.length === 0) {
      el.innerHTML = `<div class="empty-state"><span class="empty-icon">📭</span><h3>No appointments yet</h3><p>Book your first appointment</p></div>`;
      return;
    }

    el.innerHTML = `
      <div class="table-wrapper">
        <table>
          <thead><tr>
            <th>Patient</th><th>Date</th><th>Time</th><th>Reason</th><th>Status</th><th>Actions</th>
          </tr></thead>
          <tbody>
            ${appts.map(a => `
              <tr>
                <td style="font-weight:700;">${App.escHtml(a.patientName)}</td>
                <td>${App.formatDate(a.date)}</td>
                <td>${App.escHtml(a.time)}</td>
                <td style="color:var(--text-secondary);">${App.escHtml(a.reason)}</td>
                <td><span class="badge badge-${a.status}">${a.status}</span></td>
                <td>
                  <div class="td-actions">
                    ${a.status === 'scheduled' ? `
                      <button class="btn btn-sm btn-success" onclick="AppointmentsModule._setStatus('${a.id}','completed')">Complete</button>
                      <button class="btn btn-sm btn-danger"  onclick="AppointmentsModule._setStatus('${a.id}','cancelled')">Cancel</button>
                    ` : ''}
                    <button class="btn btn-sm btn-danger" onclick="AppointmentsModule._delete('${a.id}')">Delete</button>
                  </div>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  },

  _setStatus(id, status) {
    DB.updateAppointment(id, { status });
    App.toast(`Appointment marked as ${status}`, 'success');
    this._renderDayView();
    this._renderAll();
    // Refresh dashboard stats if visible
    if (document.getElementById('module-dashboard').classList.contains('active')) DashboardModule.render();
  },

  _delete(id) {
    App.confirm('Delete this appointment?', () => {
      DB.deleteAppointment(id);
      App.toast('Appointment deleted', 'info');
      this._renderDayView();
      this._renderAll();
    });
  },

  /* ── Book modal (Patient Case Entry) ── */
  openBookModal(prePatientId = '') {
    const p = DB.getPatient(prePatientId) || {};
    PatientsModule.openAddModal(p);
  },

  _save() {
    const sel        = document.getElementById('apptPatient');
    const patientId  = sel.value;
    const patientName= sel.options[sel.selectedIndex]?.dataset.name || '';
    const date       = document.getElementById('apptDate').value;
    const time       = document.getElementById('apptTime').value;
    const reason     = document.getElementById('apptReason').value.trim();

    if (!patientId) { App.toast('Please select a patient', 'error');  return; }
    if (!date)      { App.toast('Please select a date', 'error');     return; }
    if (!reason)    { App.toast('Please enter a reason', 'error');    return; }

    DB.addAppointment({ patientId, patientName, date, time, reason, status:'scheduled' });
    App.closeModal();
    App.toast('Appointment booked!', 'success');
    // Update currentDate to show the new appointment
    this.currentDate = date;
    this.render();
  },
};

function _fmtDay(dateStr) {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', {
    weekday:'long', year:'numeric', month:'long', day:'numeric',
  });
}
