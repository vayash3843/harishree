'use strict';
/* ============================================================
   billing.js — Billing module (invoices)
   ============================================================ */

const BillingModule = {
  _itemCount: 1,

  render() {
    const el = document.getElementById('module-billing');
    if (!el) return;

    const invoices = DB.getInvoices()
      .slice()
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const paid    = invoices.filter(i => i.status === 'paid');
    const unpaid  = invoices.filter(i => i.status === 'unpaid');
    const revenue = paid.reduce((s, i) => s + (Number(i.total) || 0), 0);
    const pending = unpaid.reduce((s, i) => s + (Number(i.total) || 0), 0);

    el.innerHTML = `
      <div class="page-header">
        <div>
          <h1>🧾 Billing</h1>
          <div class="subtitle">Manage invoices and track payments</div>
        </div>
        <button class="btn btn-primary" onclick="BillingModule.openNewInvoiceModal()">➕ New Invoice</button>
      </div>

      <div class="stats-grid" style="grid-template-columns:repeat(auto-fit,minmax(160px,1fr));">
        <div class="stat-card green">
          <div class="stat-icon green">💰</div>
          <div class="stat-info">
            <div class="stat-value">$${revenue.toLocaleString('en-US',{maximumFractionDigits:0})}</div>
            <div class="stat-label">Revenue Collected</div>
          </div>
        </div>
        <div class="stat-card amber">
          <div class="stat-icon amber">⏳</div>
          <div class="stat-info">
            <div class="stat-value">$${pending.toLocaleString('en-US',{maximumFractionDigits:0})}</div>
            <div class="stat-label">Pending Amount</div>
          </div>
        </div>
        <div class="stat-card indigo">
          <div class="stat-icon indigo">🧾</div>
          <div class="stat-info">
            <div class="stat-value">${invoices.length}</div>
            <div class="stat-label">Total Invoices</div>
          </div>
        </div>
        <div class="stat-card teal">
          <div class="stat-icon teal">✅</div>
          <div class="stat-info">
            <div class="stat-value">${paid.length}</div>
            <div class="stat-label">Paid</div>
          </div>
        </div>
      </div>

      <div class="card" style="padding:0;">
        <div class="table-wrapper">
          <table>
            <thead><tr>
              <th>Patient</th><th>Date</th><th>Items</th><th>Total</th><th>Status</th><th>Actions</th>
            </tr></thead>
            <tbody>
              ${invoices.map(inv => `
                <tr>
                  <td style="font-weight:700;">${App.escHtml(inv.patientName)}</td>
                  <td>${App.formatDate(inv.createdAt)}</td>
                  <td style="font-size:12px;color:var(--text-secondary);">
                    ${(inv.items||[]).map(i => App.escHtml(i.desc)).join(', ') || '—'}
                  </td>
                  <td style="font-weight:800;color:var(--primary);font-size:15px;">
                    $${Number(inv.total).toFixed(2)}
                  </td>
                  <td><span class="badge badge-${inv.status}">${inv.status}</span></td>
                  <td>
                    <div class="td-actions">
                      <button class="btn btn-sm btn-secondary" onclick="BillingModule.viewInvoice('${inv.id}')">View</button>
                      ${inv.status === 'unpaid'
                        ? `<button class="btn btn-sm btn-success" onclick="BillingModule.markPaid('${inv.id}')">✓ Paid</button>`
                        : ''}
                      <button class="btn btn-sm btn-danger" onclick="BillingModule._delete('${inv.id}')">Delete</button>
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

  /* ── New invoice modal ── */
  openNewInvoiceModal(prePatientId = '') {
    this._itemCount = 1;
    const patients = DB.getPatients();

    const body = `
      <div class="form-group">
        <label>Patient *</label>
        <select class="form-control" id="invPatient">
          <option value="">Select patient</option>
          ${patients.map(p => `<option value="${p.id}" data-name="${App.escHtml(p.name)}" ${p.id===prePatientId?'selected':''}>${App.escHtml(p.name)}</option>`).join('')}
        </select>
      </div>

      <hr class="section-divider">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
        <div style="font-size:12px;font-weight:700;color:var(--text-secondary);text-transform:uppercase;letter-spacing:0.06em;">Invoice Items</div>
        <button class="btn btn-sm btn-secondary" onclick="BillingModule._addItem()">+ Add Item</button>
      </div>

      <div id="invoiceItemsList">
        ${this._itemRowHTML(1, 'Consultation Fee', '50')}
      </div>

      <div style="text-align:right;margin-top:12px;padding:12px 16px;background:var(--bg-elevated);border-radius:var(--radius-md);border:1px solid var(--border);">
        <span style="font-size:13px;color:var(--text-secondary);margin-right:12px;">Total Amount</span>
        <span style="font-size:20px;font-weight:800;color:var(--primary);">$<span id="invTotalDisplay">50.00</span></span>
      </div>
    `;

    App.openModal('🧾 New Invoice', body,
      `<button class="btn btn-secondary" onclick="App.closeModal()">Cancel</button>
       <button class="btn btn-primary"   onclick="BillingModule._save()">Create Invoice</button>`
    );
  },

  _itemRowHTML(n, desc = '', amount = '') {
    return `
      <div class="item-row" id="inv-item-${n}"
           style="display:flex;gap:8px;align-items:flex-end;margin-bottom:8px;">
        <div class="form-group" style="flex:2;margin-bottom:0;">
          ${n === 1 ? '<label>Description</label>' : ''}
          <input class="form-control item-desc" placeholder="Service or item description"
                 value="${App.escHtml(desc)}" oninput="BillingModule._updateTotal()">
        </div>
        <div class="form-group" style="flex:1;margin-bottom:0;">
          ${n === 1 ? '<label>Amount ($)</label>' : ''}
          <input class="form-control item-amount" type="number" min="0" step="0.01"
                 placeholder="0.00" value="${amount}" oninput="BillingModule._updateTotal()">
        </div>
        ${n > 1
          ? `<button class="btn btn-icon btn-danger" style="flex-shrink:0;"
                     onclick="document.getElementById('inv-item-${n}').remove();BillingModule._updateTotal()">✕</button>`
          : `<div style="width:34px;flex-shrink:0;"></div>`}
      </div>
    `;
  },

  _addItem() {
    this._itemCount++;
    document.getElementById('invoiceItemsList').insertAdjacentHTML('beforeend', this._itemRowHTML(this._itemCount));
  },

  _updateTotal() {
    const total = [...document.querySelectorAll('.item-amount')]
      .reduce((s, el) => s + (parseFloat(el.value) || 0), 0);
    const disp = document.getElementById('invTotalDisplay');
    if (disp) disp.textContent = total.toFixed(2);
  },

  _save() {
    const sel         = document.getElementById('invPatient');
    const patientId   = sel.value;
    const patientName = sel.options[sel.selectedIndex]?.dataset.name || '';

    if (!patientId) { App.toast('Please select a patient', 'error'); return; }

    const items = [];
    document.querySelectorAll('.item-row').forEach(row => {
      const desc   = row.querySelector('.item-desc').value.trim();
      const amount = parseFloat(row.querySelector('.item-amount').value) || 0;
      if (desc && amount > 0) items.push({ desc, amount });
    });

    if (items.length === 0) { App.toast('Add at least one item with a valid amount', 'error'); return; }

    const total = items.reduce((s, i) => s + i.amount, 0);
    DB.addInvoice({ patientId, patientName, items, total, status:'unpaid' });
    App.closeModal();
    App.toast('Invoice created', 'success');
    this.render();
  },

  markPaid(id) {
    DB.updateInvoice(id, { status:'paid' });
    App.toast('Invoice marked as paid ✅', 'success');
    this.render();
  },

  _delete(id) {
    App.confirm('Delete this invoice?', () => {
      DB.deleteInvoice(id);
      App.toast('Invoice deleted', 'info');
      this.render();
    });
  },

  viewInvoice(id) {
    const inv = DB.getInvoices().find(i => i.id === id);
    if (!inv) return;

    const body = `
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px;flex-wrap:wrap;gap:12px;">
        <div>
          <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.05em;color:var(--text-muted);">Invoice For</div>
          <div style="font-size:20px;font-weight:800;margin-top:4px;">${App.escHtml(inv.patientName)}</div>
          <div style="font-size:13px;color:var(--text-secondary);margin-top:2px;">Issued: ${App.formatDate(inv.createdAt)}</div>
        </div>
        <span class="badge badge-${inv.status}" style="font-size:13px;padding:6px 14px;">${inv.status}</span>
      </div>

      <div class="table-wrapper">
        <table>
          <thead><tr>
            <th>Description</th><th style="text-align:right;">Amount</th>
          </tr></thead>
          <tbody>
            ${(inv.items||[]).map(item => `
              <tr>
                <td>${App.escHtml(item.desc)}</td>
                <td style="text-align:right;font-weight:600;">$${Number(item.amount).toFixed(2)}</td>
              </tr>
            `).join('')}
          </tbody>
          <tfoot>
            <tr style="background:var(--bg-elevated);">
              <td style="font-weight:800;font-size:15px;padding:14px 16px;">TOTAL</td>
              <td style="text-align:right;font-weight:900;font-size:20px;color:var(--primary);padding:14px 16px;">
                $${Number(inv.total).toFixed(2)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    `;

    App.openModal('Invoice Details', body,
      `<button class="btn btn-secondary" onclick="App.closeModal()">Close</button>
       ${inv.status === 'unpaid'
         ? `<button class="btn btn-success" onclick="App.closeModal();BillingModule.markPaid('${inv.id}')">✓ Mark as Paid</button>`
         : ''}`
    );
  },
};
