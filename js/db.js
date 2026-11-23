'use strict';
/* ============================================================
   db.js — localStorage CRUD helpers + Cloud Sync Hooks + Seed Data
   ============================================================ */

const DB = {

  /* ── Generic helpers ── */
  _get(key)       { try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch { return []; } },
  _set(key, data) { localStorage.setItem(key, JSON.stringify(data)); },
  _getObj(key)    { try { return JSON.parse(localStorage.getItem(key) || '{}'); } catch { return {}; } },
  _setObj(key, d) { localStorage.setItem(key, JSON.stringify(d)); },

  genId() {
    return Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
  },

  /* ── Patients ── */
  getPatients() {
    const raw = localStorage.getItem('patients');
    let list;
    if (raw === null) {
      list = this.seedDummyPatients(true);
    } else {
      try { list = JSON.parse(raw); } catch { list = []; }
      if (!Array.isArray(list)) list = [];
    }
    return list;
  },
  _savePatients(data)   { this._set('patients', data); },

  addPatient(p) {
    const list = this.getPatients();
    if (!p.id) {
      const maxNum = list.reduce((max, pat) => {
        const num = parseInt(String(pat.id).replace(/\D/g, ''), 10);
        return !isNaN(num) && num > max ? num : max;
      }, 0);
      p.id = String(maxNum + 1);
    }
    p.createdAt = new Date().toISOString();
    list.push(p);
    this._savePatients(list);
    if (window.CloudDB) CloudDB.syncDoc('patients', p.id, p);
    return p;
  },

  updatePatient(id, updates) {
    const list = this.getPatients();
    const strId = String(id);
    let found = false;
    let saved = null;
    const updated = list.map(p => {
      if (String(p.id) === strId) {
        found = true;
        saved = { ...p, ...updates };
        return saved;
      }
      return p;
    });
    if (!found && id) {
      saved = { id: strId, ...updates };
      updated.push(saved);
    }
    this._savePatients(updated);
    if (window.CloudDB && saved) CloudDB.syncDoc('patients', strId, saved);
  },

  deletePatient(id) { 
    const strId = String(id);
    this._savePatients(this.getPatients().filter(p => String(p.id) !== strId)); 
    if (window.CloudDB) CloudDB.removeDoc('patients', strId);
  },
  
  getPatient(id) { 
    const strId = String(id);
    return this.getPatients().find(p => String(p.id) === strId); 
  },

  seedDummyPatients(force = false) {
    const current = this.getPatients();
    if (!force && current.length >= 10) return current;

    const dummyPatients = [
      {
        id: '1',
        name: 'KAIRAVI RAMESHBHAI PATEL',
        dob: '1995-04-12',
        gender: 'Female',
        phone: '9825012345',
        email: 'kairavi.p@gmail.com',
        address: '12-A Shrinath Society, Ahmedabad',
        bloodType: 'O+',
        createdAt: '2024-01-15T08:00:00Z',
        savedComplaints: [{ name: 'Fever with chills', remark: 'Since 3 days' }, { name: 'Body ache & weakness', remark: 'Moderate' }],
        savedExam: [{ exam: 'BP', res: '120/80', unit: 'mmHg' }, { exam: 'PULSE', res: '78', unit: 'bpm' }, { exam: 'TEMP', res: '100.4', unit: '°F' }, { exam: 'SPO2', res: '98', unit: '%' }],
        savedDiag: [{ name: 'Viral Fever with Myalgia' }],
        savedRx: [
          { name: 'PARACETAMOL 650MG', dose: '1 Tab', m: 1, a: 0, n: 1, s: 0, day: 3, qty: 6, rate: 3.20, total: 19.20, remark: 'જમ્યા પછી', method: 'TABLET' },
          { name: 'PAN 40MG', dose: '1 Tab', m: 1, a: 0, n: 0, s: 0, day: 3, qty: 3, rate: 14.50, total: 43.50, remark: 'સવારે ભૂખ્યા પેટે', method: 'TABLET' }
        ],
        savedLab: [{ lab: 'CBC (Complete Blood Count)', labName: 'Main Parth Pathology', rate: 250 }, { lab: 'Blood Sugar (Fasting)', labName: 'Main Parth Pathology', rate: 150 }],
        savedRadio: [{ cat: 'X-RAY', test: 'X-Ray Chest PA View', lab: 'City Diagnostic Center' }]
      },
      {
        id: '2',
        name: 'RAVINABEN UMESHBHAI CHAUHAN',
        dob: '1988-09-22',
        gender: 'Female',
        phone: '9428619900',
        email: 'ravinaben@yahoo.com',
        address: '45 Parth Residency, Surat',
        bloodType: 'A+',
        createdAt: '2024-02-10T09:00:00Z',
        savedComplaints: [{ name: 'Headache & Dizziness', remark: 'Occipital pain' }, { name: 'High BP recorded at home', remark: '150/95' }],
        savedExam: [{ exam: 'BP', res: '150/94', unit: 'mmHg' }, { exam: 'PULSE', res: '82', unit: 'bpm' }, { exam: 'WEIGHT', res: '64.5', unit: 'kg' }],
        savedDiag: [{ name: 'Essential Hypertension Stage 1' }],
        savedRx: [
          { name: 'TELMA 40', dose: '1 Tab', m: 1, a: 0, n: 0, s: 0, day: 30, qty: 30, rate: 9.50, total: 285.00, remark: 'સવારે ભૂખ્યા પેટે', method: 'TABLET' }
        ],
        savedLab: [{ lab: 'Lipid Profile', labName: 'City Clinical Lab', rate: 450 }, { lab: 'Renal Function Test (RFT)', labName: 'City Clinical Lab', rate: 380 }]
      },
      {
        id: '3',
        name: 'AGASTI VINESHBHAI SUTRIYA',
        dob: '1990-11-08',
        gender: 'Male',
        phone: '9898144556',
        email: 'agasti.s@gmail.com',
        address: '78 Green Park, Rajkot',
        bloodType: 'B+',
        createdAt: '2024-03-05T10:00:00Z',
        savedComplaints: [{ name: 'Running nose & sneezing', remark: 'Allergic cold' }, { name: 'Throat irritation', remark: 'Mild' }],
        savedExam: [{ exam: 'BP', res: '118/76', unit: 'mmHg' }, { exam: 'PULSE', res: '74', unit: 'bpm' }],
        savedDiag: [{ name: 'Allergic Rhinitis & Pharyngitis' }],
        savedRx: [
          { name: 'ALERID 10MG', dose: '1 Tab', m: 0, a: 0, n: 1, s: 0, day: 5, qty: 5, rate: 2.50, total: 12.50, remark: 'રાત્રે સૂતી વખતે', method: 'TABLET' },
          { name: 'COMBIFLAM', dose: '1 Tab', m: 1, a: 0, n: 1, s: 0, day: 3, qty: 6, rate: 4.50, total: 27.00, remark: 'જમ્યા પછી', method: 'TABLET' }
        ]
      },
      {
        id: '4',
        name: 'MULJIBHAI NARAYANBHAI GOYANI',
        dob: '1962-06-30',
        gender: 'Male',
        phone: '9723311223',
        email: 'muljibhai@gmail.com',
        address: '101 Yogichowk, Surat',
        bloodType: 'AB+',
        createdAt: '2024-04-01T11:00:00Z',
        savedComplaints: [{ name: 'Increased thirst & urination', remark: 'Since 2 weeks' }],
        savedExam: [{ exam: 'BP', res: '130/84', unit: 'mmHg' }, { exam: 'PULSE', res: '76', unit: 'bpm' }, { exam: 'WEIGHT', res: '72', unit: 'kg' }],
        savedDiag: [{ name: 'Diabetes Mellitus (Type 2)' }],
        savedRx: [
          { name: 'GLYCOMET 500', dose: '1 Tab', m: 1, a: 0, n: 1, s: 0, day: 30, qty: 60, rate: 2.30, total: 138.00, remark: 'જમ્યા પછી', method: 'TABLET' }
        ],
        savedLab: [{ lab: 'HbA1c', labName: 'City Clinical Lab', rate: 350 }, { lab: 'Blood Sugar (Fasting)', labName: 'Main Parth Pathology', rate: 150 }]
      },
      {
        id: '5',
        name: 'BIRENDRABHAI SHIVRATBHAI NISHAD',
        dob: '1982-01-15',
        gender: 'Male',
        phone: '9978833445',
        email: 'birendra@gmail.com',
        address: '23 Industrial Area, Vadodara',
        bloodType: 'O-',
        createdAt: '2024-04-20T12:00:00Z',
        savedComplaints: [{ name: 'Skin itching & red patches', remark: 'Both arms' }],
        savedExam: [{ exam: 'BP', res: '122/78', unit: 'mmHg' }, { exam: 'PULSE', res: '80', unit: 'bpm' }],
        savedDiag: [{ name: 'Acute Urticaria & Contact Dermatitis' }],
        savedRx: [
          { name: 'LEVOCET 5MG', dose: '1 Tab', m: 0, a: 0, n: 1, s: 0, day: 5, qty: 5, rate: 4.00, total: 20.00, remark: 'રાત્રે સૂતી વખતે', method: 'TABLET' }
        ]
      },
      {
        id: '6',
        name: 'DAKSHABEN PRAVINBHAI SHAH',
        dob: '1976-08-14',
        gender: 'Female',
        phone: '9825123456',
        email: 'daksha.shah@gmail.com',
        address: '56 Vasant Kunj, Ahmedabad',
        bloodType: 'B+',
        createdAt: '2024-05-10T10:00:00Z',
        savedComplaints: [{ name: 'Fatigue, weight gain & hair fall', remark: 'Since 3 months' }],
        savedExam: [{ exam: 'BP', res: '126/82', unit: 'mmHg' }, { exam: 'PULSE', res: '68', unit: 'bpm' }],
        savedDiag: [{ name: 'Primary Hypothyroidism' }],
        savedRx: [
          { name: 'THYRONORM 50MCG', dose: '1 Tab', m: 1, a: 0, n: 0, s: 0, day: 30, qty: 30, rate: 4.80, total: 144.00, remark: 'સવારે ભૂખ્યા પેટે', method: 'TABLET' }
        ],
        savedLab: [{ lab: 'Thyroid Profile (T3, T4, TSH)', labName: 'Main Parth Pathology', rate: 500 }]
      },
      {
        id: '7',
        name: 'CHETAN KUMAR MEHTA',
        dob: '1986-03-28',
        gender: 'Male',
        phone: '9426578901',
        email: 'chetan.mehta@outlook.com',
        address: '14 Royal Heritage, Gandhinagar',
        bloodType: 'A-',
        createdAt: '2024-06-01T09:30:00Z',
        savedComplaints: [{ name: 'Loose stools & stomach cramps', remark: 'Since morning' }],
        savedExam: [{ exam: 'BP', res: '110/70', unit: 'mmHg' }, { exam: 'PULSE', res: '88', unit: 'bpm' }, { exam: 'TEMP', res: '99.1', unit: '°F' }],
        savedDiag: [{ name: 'Acute Gastroenteritis & Mild Dehydration' }],
        savedRx: [
          { name: 'OFLOX-OZ', dose: '1 Tab', m: 1, a: 0, n: 1, s: 0, day: 3, qty: 6, rate: 11.50, total: 69.00, remark: 'જમ્યા પછી', method: 'TABLET' },
          { name: 'ORS SACHET', dose: '1 Sachet', m: 1, a: 1, n: 1, s: 0, day: 2, qty: 3, rate: 22.00, total: 66.00, remark: '૧ લિટર પાણીમાં ઓગાળીને', method: 'POWDER' }
        ]
      },
      {
        id: '8',
        name: 'JAGDISHBHAI KANUBHAI PATEL',
        dob: '1969-12-10',
        gender: 'Male',
        phone: '9898012345',
        email: 'jagdish.patel@gmail.com',
        address: '89 Anand Nagar, Anand',
        bloodType: 'O+',
        createdAt: '2024-06-18T11:20:00Z',
        savedComplaints: [{ name: 'Bilateral knee joint pain & stiffness', remark: 'Worse while climbing stairs' }],
        savedExam: [{ exam: 'BP', res: '138/88', unit: 'mmHg' }, { exam: 'WEIGHT', res: '78', unit: 'kg' }],
        savedDiag: [{ name: 'Osteoarthritis Bilateral Knee Joints' }],
        savedRx: [
          { name: 'ZERODOL-P', dose: '1 Tab', m: 1, a: 0, n: 1, s: 0, day: 5, qty: 10, rate: 6.50, total: 65.00, remark: 'જમ્યા પછી', method: 'TABLET' }
        ],
        savedRadio: [{ cat: 'X-RAY', test: 'X-Ray Both Knee AP & Lateral', lab: 'City Diagnostic Center' }]
      },
      {
        id: '9',
        name: 'POOJA ANILBHAI DESAI',
        dob: '1998-05-19',
        gender: 'Female',
        phone: '9712345678',
        email: 'pooja.desai@gmail.com',
        address: '32 Lakeview Apts, Vadodara',
        bloodType: 'AB-',
        createdAt: '2024-07-02T14:15:00Z',
        savedComplaints: [{ name: 'Easy fatigability, pale skin & breathlessness on exertion', remark: 'Since 1 month' }],
        savedExam: [{ exam: 'BP', res: '106/68', unit: 'mmHg' }, { exam: 'PULSE', res: '92', unit: 'bpm' }, { exam: 'PALLOR', res: 'Positive ++' }],
        savedDiag: [{ name: 'Iron Deficiency Anemia' }],
        savedRx: [
          { name: 'AUTRIN CAP', dose: '1 Cap', m: 1, a: 0, n: 0, s: 0, day: 30, qty: 30, rate: 8.20, total: 246.00, remark: 'જમ્યા પછી', method: 'CAPSULE' }
        ],
        savedLab: [{ lab: 'CBC (Complete Blood Count)', labName: 'Main Parth Pathology', rate: 250 }, { lab: 'Serum Ferritin', labName: 'City Clinical Lab', rate: 450 }]
      },
      {
        id: '10',
        name: 'HARSHADRAY JAYANTILAL JOSHI',
        dob: '1957-02-04',
        gender: 'Male',
        phone: '9824056789',
        email: 'harshad.joshi@gmail.com',
        address: '09 Somnath Park, Bhavnagar',
        bloodType: 'B+',
        createdAt: '2024-07-22T16:00:00Z',
        savedComplaints: [{ name: 'Chronic cough with nocturnal wheezing & breathlessness', remark: 'Aggravated in cold weather' }],
        savedExam: [{ exam: 'BP', res: '134/86', unit: 'mmHg' }, { exam: 'PULSE', res: '84', unit: 'bpm' }, { exam: 'SPO2', res: '95', unit: '%' }],
        savedDiag: [{ name: 'Chronic Bronchial Asthma' }],
        savedRx: [
          { name: 'BUDECORT 200 INHALER', dose: '2 Puffs', m: 1, a: 0, n: 1, s: 0, day: 30, qty: 1, rate: 320.00, total: 320.00, remark: 'કોગળા કરવા (Gargle after puff)', method: 'INHALER' },
          { name: 'DERIPHYLLIN RETARD 150', dose: '1 Tab', m: 1, a: 0, n: 1, s: 0, day: 10, qty: 20, rate: 1.80, total: 36.00, remark: 'જમ્યા પછી', method: 'TABLET' }
        ]
      }
    ];

    this._savePatients(dummyPatients);

    // Sync each patient to CloudDB if connected
    if (window.CloudDB && window.CloudDB.isInitialized) {
      dummyPatients.forEach(p => {
        window.CloudDB.syncDoc('patients', p.id, p);
      });
    }

    return dummyPatients;
  },

  /* ── Appointments ── */
  getAppointments() {
    let list = this._get('appointments') || [];
    const today = new Date().toISOString().split('T')[0];
    const todayAppts = list.filter(a => a.date === today);
    if (list.length === 0 || todayAppts.length === 0) {
      list = this._seedTodayAppointments(list);
      this._saveAppointments(list);
    }
    return list;
  },

  _seedTodayAppointments(existing = []) {
    const today = new Date().toISOString().split('T')[0];
    const patients = this.getPatients();

    const sampleSlots = [
      { pIdx: 0, time: '09:00 AM', reason: 'Viral Fever & Bodyache', status: 'completed', fee: 100, paid: true, paymentMode: 'Cash' },
      { pIdx: 1, time: '09:30 AM', reason: 'Hypertension Follow-up', status: 'completed', fee: 100, paid: true, paymentMode: 'UPI' },
      { pIdx: 2, time: '10:15 AM', reason: 'Allergic Rhinitis & Cold', status: 'completed', fee: 100, paid: false, paymentMode: 'Cash' },
      { pIdx: 3, time: '11:00 AM', reason: 'Diabetes Mellitus & HbA1c', status: 'scheduled', fee: 100, paid: false, paymentMode: 'Cash' },
      { pIdx: 4, time: '11:45 AM', reason: 'Skin Rash & Allergy', status: 'scheduled', fee: 100, paid: false, paymentMode: 'Cash' },
      { pIdx: 5, time: '02:00 PM', reason: 'Joint Pain & Knee Care', status: 'scheduled', fee: 400, indoor: true, ipdDoneCount: 3, bedChargePerDay: 400, paid: false, paymentMode: 'Cash' },
      { pIdx: 6, time: '02:30 PM', reason: 'Abdominal Acidity & APD', status: 'scheduled', fee: 100, paid: false, paymentMode: 'Cash' },
      { pIdx: 7, time: '03:15 PM', reason: 'ECG & Cardiac Routine', status: 'scheduled', fee: 250, paid: true, paymentMode: 'Cash' },
      { pIdx: 8, time: '04:00 PM', reason: 'General Health Screening', status: 'scheduled', fee: 100, paid: false, paymentMode: 'Cash' },
      { pIdx: 9, time: '04:30 PM', reason: 'Thyroid Profile Follow-up', status: 'scheduled', fee: 100, paid: false, paymentMode: 'Cash' },
      { pIdx: 10, time: '05:00 PM', reason: 'Consultation & Follow-up', status: 'scheduled', fee: 100, paid: false, paymentMode: 'Cash' },
      { pIdx: 11, time: '05:30 PM', reason: 'Routine Health Check', status: 'scheduled', fee: 100, paid: false, paymentMode: 'Cash' },
    ];

    const todayGenerated = sampleSlots.map((s, idx) => {
      const p = patients[s.pIdx] || patients[idx % patients.length] || { id: String(idx + 1), name: 'Patient ' + (idx + 1) };
      return {
        id: 'appt_' + today.replace(/-/g, '') + '_' + (idx + 1),
        patientId: String(p.id),
        patientName: p.name,
        date: today,
        time: s.time,
        reason: s.reason,
        status: s.status,
        fee: s.fee,
        paid: s.paid,
        indoor: Boolean(s.indoor),
        ipdDoneCount: s.ipdDoneCount || 0,
        bedChargePerDay: s.bedChargePerDay || 0,
        paymentMode: s.paymentMode,
        doctorName: 'DR. YASH VAGHANI',
        createdAt: new Date().toISOString()
      };
    });

    const otherDateAppts = existing.filter(a => a.date !== today);
    return [...otherDateAppts, ...todayGenerated];
  },

  _saveAppointments(data) { this._set('appointments', data); },

  addAppointment(a) {
    const list = this.getAppointments();
    a.id        = this.genId();
    a.createdAt = new Date().toISOString();
    if (a.paid === undefined) {
      a.paid = true;
    }
    list.push(a);
    this._saveAppointments(list);
    if (window.CloudDB) CloudDB.syncDoc('appointments', a.id, a);
    return a;
  },

  updateAppointment(id, updates) {
    const list = this.getAppointments();
    const strId = String(id);
    let saved = null;
    this._saveAppointments(list.map(a => {
      if (String(a.id) === strId) {
        saved = { ...a, ...updates };
        return saved;
      }
      return a;
    }));
    if (window.CloudDB && saved) CloudDB.syncDoc('appointments', strId, saved);
  },

  deleteAppointment(id) { 
    const strId = String(id);
    this._saveAppointments(this.getAppointments().filter(a => String(a.id) !== strId)); 
    if (window.CloudDB) CloudDB.removeDoc('appointments', strId);
  },

  /* ── Visits (Medical Records) ── */
  getVisits()       { return this._get('visits'); },
  _saveVisits(data) { this._set('visits', data); },

  addVisit(v) {
    const list = this.getVisits();
    v.id        = this.genId();
    v.createdAt = new Date().toISOString();
    list.push(v);
    this._saveVisits(list);
    if (window.CloudDB) CloudDB.syncDoc('visits', v.id, v);
    return v;
  },

  updateVisit(id, updates) {
    const strId = String(id);
    let saved = null;
    this._saveVisits(this.getVisits().map(v => {
      if (String(v.id) === strId) {
        saved = { ...v, ...updates };
        return saved;
      }
      return v;
    }));
    if (window.CloudDB && saved) CloudDB.syncDoc('visits', strId, saved);
  },

  deleteVisit(id) { 
    const strId = String(id);
    this._saveVisits(this.getVisits().filter(v => String(v.id) !== strId)); 
    if (window.CloudDB) CloudDB.removeDoc('visits', strId);
  },

  /* ── Prescriptions ── */
  getPrescriptions()       { return this._get('prescriptions'); },
  _savePrescriptions(data) { this._set('prescriptions', data); },

  addPrescription(rx) {
    const list = this.getPrescriptions();
    rx.id        = this.genId();
    rx.createdAt = new Date().toISOString();
    list.push(rx);
    this._savePrescriptions(list);
    if (window.CloudDB) CloudDB.syncDoc('prescriptions', rx.id, rx);
    return rx;
  },

  deletePrescription(id) { 
    const strId = String(id);
    this._savePrescriptions(this.getPrescriptions().filter(r => String(r.id) !== strId)); 
    if (window.CloudDB) CloudDB.removeDoc('prescriptions', strId);
  },

  /* ── Invoices ── */
  getInvoices() {
    let list = this._get('invoices') || [];
    const today = new Date().toISOString().split('T')[0];
    const todayInvoices = list.filter(i => i.date === today);
    if (list.length === 0 || todayInvoices.length === 0) {
      list = this._seedTodayInvoices(list);
      this._saveInvoices(list);
    }
    return list;
  },

  _seedTodayInvoices(existing = []) {
    const today = new Date().toISOString().split('T')[0];
    const appts = (this._get('appointments') || []).filter(a => a.date === today && a.paid);

    const newInvoices = appts.map((a, idx) => ({
      id: 'inv_' + today.replace(/-/g, '') + '_' + (idx + 1),
      invoiceNo: 'INV-' + today.replace(/-/g, '') + '-' + String(idx + 1).padStart(3, '0'),
      patientId: a.patientId,
      patientName: a.patientName,
      appointmentId: a.id,
      date: today,
      amount: a.fee || 100,
      total: a.fee || 100,
      paidAmount: a.fee || 100,
      paymentMode: a.paymentMode || 'Cash',
      status: 'paid',
      items: [{ description: a.reason || 'Consultation & OPD Checkup', qty: 1, rate: a.fee || 100, amount: a.fee || 100 }],
      createdAt: new Date().toISOString()
    }));

    return [...existing.filter(i => i.date !== today), ...newInvoices];
  },
  _saveInvoices(data) { this._set('invoices', data); },

  addInvoice(inv) {
    const list = this.getInvoices();
    inv.id        = this.genId();
    inv.createdAt = new Date().toISOString();
    list.push(inv);
    this._saveInvoices(list);
    if (window.CloudDB) CloudDB.syncDoc('invoices', inv.id, inv);
    return inv;
  },

  updateInvoice(id, updates) {
    const strId = String(id);
    let saved = null;
    this._saveInvoices(this.getInvoices().map(i => {
      if (String(i.id) === strId) {
        saved = { ...i, ...updates };
        return saved;
      }
      return i;
    }));
    if (window.CloudDB && saved) CloudDB.syncDoc('invoices', strId, saved);
  },

  deleteInvoice(id) { 
    const strId = String(id);
    this._saveInvoices(this.getInvoices().filter(i => String(i.id) !== strId)); 
    if (window.CloudDB) CloudDB.removeDoc('invoices', strId);
  },

  /* ── OPD Entries ── */
  getOpdEntries()       { return this._get('opd_entries'); },
  _saveOpdEntries(data) { this._set('opd_entries', data); },

  addOpdEntry(entry) {
    const list = this.getOpdEntries();
    entry.id        = this.genId();
    entry.createdAt = new Date().toISOString();
    list.push(entry);
    this._saveOpdEntries(list);
    if (window.CloudDB) CloudDB.syncDoc('opd_entries', entry.id, entry);
    return entry;
  },

  deleteOpdEntry(id) { 
    const strId = String(id);
    this._saveOpdEntries(this.getOpdEntries().filter(e => String(e.id) !== strId)); 
    if (window.CloudDB) CloudDB.removeDoc('opd_entries', strId);
  },

  /* ── Medicines (Medicine Master) ── */
  getMedicines() {
    const list = this._get('medicines');
    return list.sort((a, b) => (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' }));
  },
  _saveMedicines(data) { this._set('medicines', data); },

  addMedicine(m) {
    const list = this.getMedicines();
    m.id        = this.genId();
    m.createdAt = new Date().toISOString();
    list.push(m);
    this._saveMedicines(list);
    if (window.CloudDB) CloudDB.syncDoc('medicines', m.id, m);
    return m;
  },

  updateMedicine(id, updates) {
    const strId = String(id);
    let saved = null;
    this._saveMedicines(this.getMedicines().map(m => {
      if (String(m.id) === strId) {
        saved = { ...m, ...updates };
        return saved;
      }
      return m;
    }));
    if (window.CloudDB && saved) CloudDB.syncDoc('medicines', strId, saved);
  },

  deleteMedicine(id) { 
    const strId = String(id);
    this._saveMedicines(this.getMedicines().filter(m => String(m.id) !== strId)); 
    if (window.CloudDB) CloudDB.removeDoc('medicines', strId);
  },

  /* ── Charges (Charges Master) ── */
  getCharges()       { return this._get('charges'); },
  _saveCharges(data) { this._set('charges', data); },

  addCharge(c) {
    const list = this.getCharges();
    c.id        = this.genId();
    c.createdAt = new Date().toISOString();
    list.push(c);
    this._saveCharges(list);
    if (window.CloudDB) CloudDB.syncDoc('charges', c.id, c);
    return c;
  },

  updateCharge(id, updates) {
    const strId = String(id);
    let saved = null;
    this._saveCharges(this.getCharges().map(c => {
      if (String(c.id) === strId) {
        saved = { ...c, ...updates };
        return saved;
      }
      return c;
    }));
    if (window.CloudDB && saved) CloudDB.syncDoc('charges', strId, saved);
  },

  deleteCharge(id) { 
    const strId = String(id);
    this._saveCharges(this.getCharges().filter(c => String(c.id) !== strId)); 
    if (window.CloudDB) CloudDB.removeDoc('charges', strId);
  },

  /* ── Lab Tests (Lab Master) ── */
  getLabTests()       { return this._get('lab_tests'); },
  _saveLabTests(data) { this._set('lab_tests', data); },

  addLabTest(t) {
    const list = this.getLabTests();
    t.id        = this.genId();
    t.createdAt = new Date().toISOString();
    list.push(t);
    this._saveLabTests(list);
    if (window.CloudDB) CloudDB.syncDoc('lab_tests', t.id, t);
    return t;
  },

  updateLabTest(id, updates) {
    const strId = String(id);
    let saved = null;
    this._saveLabTests(this.getLabTests().map(t => {
      if (String(t.id) === strId) {
        saved = { ...t, ...updates };
        return saved;
      }
      return t;
    }));
    if (window.CloudDB && saved) CloudDB.syncDoc('lab_tests', strId, saved);
  },

  deleteLabTest(id) { 
    const strId = String(id);
    this._saveLabTests(this.getLabTests().filter(t => String(t.id) !== strId)); 
    if (window.CloudDB) CloudDB.removeDoc('lab_tests', strId);
  },

  /* ── Extra Advices (Extra Advice Master) ── */
  getAdvices()       { return this._get('extra_advices'); },
  _saveAdvices(data) { this._set('extra_advices', data); },

  addAdvice(a) {
    const list = this.getAdvices();
    a.id        = this.genId();
    a.createdAt = new Date().toISOString();
    list.push(a);
    this._saveAdvices(list);
    if (window.CloudDB) CloudDB.syncDoc('extra_advices', a.id, a);
    return a;
  },

  updateAdvice(id, updates) {
    const strId = String(id);
    let saved = null;
    this._saveAdvices(this.getAdvices().map(a => {
      if (String(a.id) === strId) {
        saved = { ...a, ...updates };
        return saved;
      }
      return a;
    }));
    if (window.CloudDB && saved) CloudDB.syncDoc('extra_advices', strId, saved);
  },

  deleteAdvice(id) { 
    const strId = String(id);
    this._saveAdvices(this.getAdvices().filter(a => String(a.id) !== strId)); 
    if (window.CloudDB) CloudDB.removeDoc('extra_advices', strId);
  },

  /* ── Staff & Team ── */
  getStaff() {
    const raw = localStorage.getItem('staff');
    let list;
    if (raw === null) {
      this.seedStaffDummyData(true);
      list = this._get('staff');
    } else {
      try { list = JSON.parse(raw); } catch { list = []; }
      if (!Array.isArray(list)) list = [];
    }

    // Ensure all staff have modern schema fields
    let modified = false;
    list = list.map((s, idx) => {
      let updated = { ...s };
      if (!updated.empId) {
        updated.empId = 'EMP-' + String(10000 + (idx + 2)).padStart(5, '0');
        modified = true;
      }
      if (!updated.status) {
        updated.status = 'Active';
        modified = true;
      }
      if (!updated.joinedOn) {
        updated.joinedOn = updated.createdAt ? updated.createdAt.split('T')[0] : '2026-08-20';
        modified = true;
      }
      if (typeof updated.hasLogin !== 'boolean') {
        updated.hasLogin = Boolean(updated.email);
        modified = true;
      }
      if (!Array.isArray(updated.modules)) {
        updated.modules = ['appointments', 'opd', 'patients'];
        modified = true;
      }
      return updated;
    });
    if (modified) {
      this._saveStaff(list);
    }
    return list;
  },

  _saveStaff(data) {
    this._set('staff', data);
  },

  addStaff(member) {
    const list = this.getStaff();
    // Auto-generate employee code if not provided
    const nextSeq = list.length + 1;
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const empId = member.empId || `EMP-${String(randomNum).padStart(5, '0')}`;
    const newMember = {
      id: member.id || empId,
      empId: empId,
      name: (member.name || '').trim(),
      designation: (member.designation || '').trim(),
      role: member.role || 'Receptionist',
      phone: (member.phone || '').trim(),
      email: (member.email || '').trim(),
      joinedOn: member.joinedOn || new Date().toISOString().split('T')[0],
      status: member.status || 'Active',
      hasLogin: Boolean(member.hasLogin || (member.email && member.password)),
      password: member.password || '',
      modules: Array.isArray(member.modules) ? member.modules : ['appointments', 'opd', 'patients'],
      createdAt: new Date().toISOString()
    };
    list.push(newMember);
    this._saveStaff(list);
    if (window.CloudDB) CloudDB.syncDoc('staff', newMember.id, newMember);
    return newMember;
  },

  updateStaff(id, updates) {
    const strId = String(id);
    let saved = null;
    const list = this.getStaff().map(s => {
      if (String(s.id) === strId || String(s.empId) === strId) {
        saved = { ...s, ...updates };
        if (updates.email || updates.password) {
          saved.hasLogin = Boolean(saved.email && (saved.password || s.password || updates.hasLogin));
        }
        return saved;
      }
      return s;
    });
    this._saveStaff(list);
    if (window.CloudDB && saved) CloudDB.syncDoc('staff', strId, saved);
    return saved;
  },

  deleteStaff(id) {
    const strId = String(id);
    const list = this.getStaff().filter(s => String(s.id) !== strId && String(s.empId) !== strId);
    this._saveStaff(list);
    if (window.CloudDB) CloudDB.removeDoc('staff', strId);
  },

  /* ── Staff Attendance ── */
  getStaffAttendance(date) {
    const all = this._getObj('staff_attendance') || {};
    return all[date] || {};
  },

  setStaffAttendance(date, staffId, record) {
    const all = this._getObj('staff_attendance') || {};
    if (!all[date]) all[date] = {};
    all[date][staffId] = {
      status: record.status || 'Present',
      checkIn: record.checkIn || '09:00 AM',
      checkOut: record.checkOut || '',
      notes: record.notes || '',
      updatedAt: new Date().toISOString()
    };
    this._setObj('staff_attendance', all);
    if (window.CloudDB) CloudDB.syncDoc('staff_attendance', date, all[date]);
    return all[date][staffId];
  },

  /* ── Staff Leaves ── */
  getStaffLeaves() {
    return this._get('staff_leaves') || [];
  },

  addStaffLeave(leave) {
    const list = this.getStaffLeaves();
    leave.id = leave.id || this.genId();
    leave.status = leave.status || 'Pending';
    leave.appliedOn = leave.appliedOn || new Date().toISOString().split('T')[0];
    list.push(leave);
    this._set('staff_leaves', list);
    if (window.CloudDB) CloudDB.syncDoc('staff_leaves', leave.id, leave);
    return leave;
  },

  updateStaffLeave(id, updates) {
    const strId = String(id);
    let saved = null;
    const list = this.getStaffLeaves().map(l => {
      if (String(l.id) === strId) {
        saved = { ...l, ...updates };
        return saved;
      }
      return l;
    });
    this._set('staff_leaves', list);
    if (window.CloudDB && saved) CloudDB.syncDoc('staff_leaves', strId, saved);
    return saved;
  },

  deleteStaffLeave(id) {
    const strId = String(id);
    const list = this.getStaffLeaves().filter(l => String(l.id) !== strId);
    this._set('staff_leaves', list);
    if (window.CloudDB) CloudDB.removeDoc('staff_leaves', strId);
  },

  /* ── Seed Dummy Staff Data ── */
  seedStaffDummyData(force = false) {
    const currentStaff = this._get('staff') || [];
    if (!force && currentStaff.length > 0) return;

    const dummyStaff = [
      {
        id: 'EMP-00002',
        empId: 'EMP-00002',
        name: 'Karan Choudhary',
        role: 'Clinic Admin',
        designation: 'Clinic Operations Manager',
        phone: '+919424951124',
        email: 'kc901789+arogya@gmail.com',
        joinedOn: '2026-08-20',
        status: 'Active',
        hasLogin: true,
        modules: ['appointments', 'opd', 'patients', 'pharmacy', 'staff', 'billing', 'records', 'labmaster', 'advicemaster', 'settings'],
        createdAt: new Date().toISOString()
      },
      {
        id: 'EMP-00001',
        empId: 'EMP-00001',
        name: 'DR. YASH VAGHANI',
        role: 'Doctor',
        designation: 'Chief Consulting Physician',
        phone: '+91 98250 99887',
        email: 'dr.yash@harishreeclinic.com',
        joinedOn: '2026-01-10',
        status: 'Active',
        hasLogin: true,
        modules: ['appointments', 'opd', 'patients', 'pharmacy', 'records', 'labmaster', 'advicemaster'],
        createdAt: new Date().toISOString()
      },
      {
        id: 'EMP-00012',
        empId: 'EMP-00012',
        name: 'Priya Sharma',
        role: 'Receptionist',
        designation: 'Front Desk Executive',
        phone: '+91 98765 43210',
        email: 'priya.sharma@clinic.com',
        joinedOn: '2026-08-20',
        status: 'Active',
        hasLogin: true,
        modules: ['appointments', 'opd', 'patients', 'billing'],
        createdAt: new Date().toISOString()
      },
      {
        id: 'EMP-00054',
        empId: 'EMP-00054',
        name: 'Test Receptionist',
        role: 'Receptionist',
        designation: 'Front desk',
        phone: '+91 98220 12345',
        email: 'reception.desk@clinic.com',
        joinedOn: '2026-08-20',
        status: 'Active',
        hasLogin: false,
        modules: ['appointments', 'opd', 'patients'],
        createdAt: new Date().toISOString()
      },
      {
        id: 'EMP-00018',
        empId: 'EMP-00018',
        name: 'Sister Anita Patel',
        role: 'Nurse',
        designation: 'Head Nursing Sister & Triage',
        phone: '+91 97245 88990',
        email: 'anita.nurse@clinic.com',
        joinedOn: '2026-03-15',
        status: 'Active',
        hasLogin: true,
        modules: ['appointments', 'opd', 'patients', 'records'],
        createdAt: new Date().toISOString()
      },
      {
        id: 'EMP-00025',
        empId: 'EMP-00025',
        name: 'Rajesh Mehta',
        role: 'Pharmacist',
        designation: 'Senior Pharmacy Manager',
        phone: '+91 99042 33445',
        email: 'rajesh.pharmacy@clinic.com',
        joinedOn: '2026-04-01',
        status: 'Active',
        hasLogin: true,
        modules: ['pharmacy', 'billing', 'opd'],
        createdAt: new Date().toISOString()
      },
      {
        id: 'EMP-00031',
        empId: 'EMP-00031',
        name: 'Bhavin Joshi',
        role: 'Lab Technician',
        designation: 'Senior Pathologist Technician',
        phone: '+91 98255 66778',
        email: 'bhavin.lab@clinic.com',
        joinedOn: '2026-05-12',
        status: 'Active',
        hasLogin: false,
        modules: ['labmaster', 'records'],
        createdAt: new Date().toISOString()
      },
      {
        id: 'EMP-00042',
        empId: 'EMP-00042',
        name: 'Sneha Dave',
        role: 'Accountant',
        designation: 'Billing & Accounts Executive',
        phone: '+91 94290 11223',
        email: 'accounts@clinic.com',
        joinedOn: '2026-06-01',
        status: 'Active',
        hasLogin: true,
        modules: ['billing', 'opd', 'staff'],
        createdAt: new Date().toISOString()
      }
    ];

    this._saveStaff(dummyStaff);

    // Seed realistic attendance for today and recent days
    const today = new Date().toISOString().split('T')[0];
    const d1 = new Date(); d1.setDate(d1.getDate() - 1);
    const yesterday = d1.toISOString().split('T')[0];
    const d2 = new Date(); d2.setDate(d2.getDate() - 2);
    const dayBefore = d2.toISOString().split('T')[0];

    const allAttendance = this._getObj('staff_attendance') || {};

    allAttendance[today] = {
      'EMP-00002': { status: 'Present', checkIn: '08:50 AM', checkOut: '06:15 PM', notes: 'On time' },
      'EMP-00001': { status: 'Present', checkIn: '09:15 AM', checkOut: '07:00 PM', notes: 'OPD consults' },
      'EMP-00012': { status: 'Present', checkIn: '08:55 AM', checkOut: '05:45 PM', notes: 'Front desk' },
      'EMP-00054': { status: 'Half-Day', checkIn: '09:00 AM', checkOut: '01:30 PM', notes: 'Afternoon exam' },
      'EMP-00018': { status: 'Present', checkIn: '08:45 AM', checkOut: '06:00 PM', notes: 'OPD vitals' },
      'EMP-00025': { status: 'Present', checkIn: '09:30 AM', checkOut: '07:15 PM', notes: 'Stock dispatch' },
      'EMP-00031': { status: 'Leave', checkIn: '—', checkOut: '—', notes: 'Approved casual leave' },
      'EMP-00042': { status: 'Present', checkIn: '09:10 AM', checkOut: '06:20 PM', notes: 'Weekly invoices' },
    };

    allAttendance[yesterday] = {
      'EMP-00002': { status: 'Present', checkIn: '08:55 AM', checkOut: '06:30 PM' },
      'EMP-00001': { status: 'Present', checkIn: '09:20 AM', checkOut: '07:10 PM' },
      'EMP-00012': { status: 'Present', checkIn: '08:50 AM', checkOut: '05:30 PM' },
      'EMP-00054': { status: 'Present', checkIn: '09:00 AM', checkOut: '06:00 PM' },
      'EMP-00018': { status: 'Present', checkIn: '08:45 AM', checkOut: '06:00 PM' },
      'EMP-00025': { status: 'Present', checkIn: '09:15 AM', checkOut: '07:00 PM' },
      'EMP-00031': { status: 'Present', checkIn: '09:05 AM', checkOut: '06:00 PM' },
      'EMP-00042': { status: 'Present', checkIn: '09:10 AM', checkOut: '06:00 PM' },
    };

    allAttendance[dayBefore] = {
      'EMP-00002': { status: 'Present', checkIn: '08:50 AM', checkOut: '06:15 PM' },
      'EMP-00001': { status: 'Present', checkIn: '09:00 AM', checkOut: '06:45 PM' },
      'EMP-00012': { status: 'Present', checkIn: '09:00 AM', checkOut: '05:30 PM' },
      'EMP-00054': { status: 'Absent', checkIn: '—', checkOut: '—', notes: 'Uninformed' },
      'EMP-00018': { status: 'Present', checkIn: '08:40 AM', checkOut: '06:00 PM' },
      'EMP-00025': { status: 'Present', checkIn: '09:30 AM', checkOut: '07:00 PM' },
      'EMP-00031': { status: 'Present', checkIn: '09:00 AM', checkOut: '06:00 PM' },
      'EMP-00042': { status: 'Present', checkIn: '09:15 AM', checkOut: '06:00 PM' },
    };

    this._setObj('staff_attendance', allAttendance);

    // Seed realistic leave requests
    const dummyLeaves = [
      {
        id: 'lv101',
        staffId: 'EMP-00031',
        staffName: 'Bhavin Joshi',
        type: 'Casual Leave',
        startDate: today,
        endDate: today,
        reason: 'Family function in Rajkot',
        status: 'Approved',
        appliedOn: yesterday
      },
      {
        id: 'lv102',
        staffId: 'EMP-00018',
        staffName: 'Sister Anita Patel',
        type: 'Sick Leave',
        startDate: '2026-09-12',
        endDate: '2026-09-14',
        reason: 'Dental surgery and recovery',
        status: 'Pending',
        appliedOn: today
      },
      {
        id: 'lv103',
        staffId: 'EMP-00012',
        staffName: 'Priya Sharma',
        type: 'Earned Leave',
        startDate: '2026-09-20',
        endDate: '2026-09-24',
        reason: 'Annual family pilgrimage trip',
        status: 'Pending',
        appliedOn: today
      },
      {
        id: 'lv104',
        staffId: 'EMP-00025',
        staffName: 'Rajesh Mehta',
        type: 'Casual Leave',
        startDate: '2026-08-28',
        endDate: '2026-08-29',
        reason: 'Personal emergency at native town',
        status: 'Approved',
        appliedOn: '2026-08-26'
      },
      {
        id: 'lv105',
        staffId: 'EMP-00054',
        staffName: 'Test Receptionist',
        type: 'Sick Leave',
        startDate: '2026-08-15',
        endDate: '2026-08-16',
        reason: 'Viral fever & throat infection',
        status: 'Approved',
        appliedOn: '2026-08-14'
      }
    ];

    this._set('staff_leaves', dummyLeaves);
  },

  /* ── Settings ── */
  getSettings() {
    const s = this._getObj('settings') || {};
    if (s.doctorName && s.doctorName.toUpperCase().includes('YASHBHAI')) {
      s.doctorName = s.doctorName.replace(/YASHBHAI/gi, 'YASH');
      this.saveSettings(s);
    }
    return s;
  },
  saveSettings(data) { 
    this._setObj('settings', data); 
    if (window.CloudDB) CloudDB.syncDoc('config', 'settings', data);
  },

  /* ── Seed data (Protected: only seeds on first setup or explicit reset) ── */
  seed(force = false) {
    const today = new Date().toISOString().split('T')[0];
    const getPastDate = (daysAgo) => {
      const d = new Date();
      d.setDate(d.getDate() - daysAgo);
      return d.toISOString().split('T')[0];
    };

    // PROTECT USER DATA:
    // Never wipe patient or prescription records when calendar date changes!
    if (!force && localStorage.getItem('clinic_seeded_v20')) {
      return;
    }

    localStorage.removeItem('patients');
    localStorage.removeItem('appointments');
    localStorage.removeItem('visits');
    localStorage.removeItem('prescriptions');
    localStorage.removeItem('invoices');
    localStorage.removeItem('opd_entries');
    localStorage.removeItem('medicines');
    localStorage.removeItem('charges');
    localStorage.removeItem('lab_tests');
    localStorage.removeItem('extra_advices');
    localStorage.removeItem('staff');
    localStorage.removeItem('clinic_lab_reports');
    localStorage.setItem('clinic_seeded_v20', 'true');
    localStorage.setItem('clinic_seeded_date', today);

    const patients = [
      {
        id:'1', name:'KAIRAVI RAMESHBHAI PATEL', dob:'1995-04-12', gender:'Female', phone:'9825012345', email:'kairavi.p@gmail.com', address:'12-A Shrinath Society, Ahmedabad', bloodType:'O+', createdAt:'2024-01-15T08:00:00Z',
        savedComplaints: [{ name:'Fever with chills', remark:'Since 3 days' }, { name:'Body ache & weakness', remark:'Moderate' }],
        savedExam: [{ exam:'BP', res:'120/80', unit:'mmHg' }, { exam:'PULSE', res:'78', unit:'bpm' }, { exam:'TEMP', res:'100.4', unit:'°F' }, { exam:'SPO2', res:'98', unit:'%' }],
        savedDiag: [{ name:'Viral Fever with Myalgia' }],
        savedRx: [
          { name:'PARACETAMOL 650MG', dose:'1 Tab', m:1, a:0, n:1, s:0, day:3, qty:6, rate:3.20, total:19.20, remark:'જમ્યા પછી', method:'TABLET' },
          { name:'PAN 40MG', dose:'1 Tab', m:1, a:0, n:0, s:0, day:3, qty:3, rate:14.50, total:43.50, remark:'સવારે ભૂખ્યા પેટે', method:'TABLET' }
        ],
        savedLab: [{ lab:'CBC (Complete Blood Count)', labName:'Main Parth Pathology', rate:250 }, { lab:'Blood Sugar (Fasting)', labName:'Main Parth Pathology', rate:150 }],
        savedRadio: [{ cat:'X-RAY', test:'X-Ray Chest PA View', lab:'City Diagnostic Center' }]
      },
      {
        id:'2', name:'RAVINABEN UMESHBHAI CHAUHAN', dob:'1988-09-22', gender:'Female', phone:'9428619900', email:'ravinaben@yahoo.com', address:'45 Parth Residency, Surat', bloodType:'A+', createdAt:'2024-02-10T09:00:00Z',
        savedComplaints: [{ name:'Headache & Dizziness', remark:'Occipital pain' }, { name:'High BP recorded at home', remark:'150/95' }],
        savedExam: [{ exam:'BP', res:'150/94', unit:'mmHg' }, { exam:'PULSE', res:'82', unit:'bpm' }, { exam:'WEIGHT', res:'64.5', unit:'kg' }],
        savedDiag: [{ name:'Essential Hypertension Stage 1' }],
        savedRx: [
          { name:'TELMA 40', dose:'1 Tab', m:1, a:0, n:0, s:0, day:30, qty:30, rate:9.50, total:285.00, remark:'સવારે ભૂખ્યા પેટે', method:'TABLET' }
        ],
        savedLab: [{ lab:'Lipid Profile', labName:'City Clinical Lab', rate:450 }, { lab:'Renal Function Test (RFT)', labName:'City Clinical Lab', rate:380 }]
      },
      {
        id:'3', name:'AGASTI VINESHBHAI SUTRIYA', dob:'1990-11-08', gender:'Male', phone:'9898144556', email:'agasti.s@gmail.com', address:'78 Green Park, Rajkot', bloodType:'B+', createdAt:'2024-03-05T10:00:00Z',
        savedComplaints: [{ name:'Running nose & sneezing', remark:'Allergic cold' }, { name:'Throat irritation', remark:'Mild' }],
        savedExam: [{ exam:'BP', res:'118/76', unit:'mmHg' }, { exam:'PULSE', res:'74', unit:'bpm' }],
        savedDiag: [{ name:'Allergic Rhinitis & Pharyngitis' }],
        savedRx: [
          { name:'ALERID 10MG', dose:'1 Tab', m:0, a:0, n:1, s:0, day:5, qty:5, rate:2.50, total:12.50, remark:'રાત્રે સૂતી વખતે', method:'TABLET' },
          { name:'COMBIFLAM', dose:'1 Tab', m:1, a:0, n:1, s:0, day:3, qty:6, rate:4.50, total:27.00, remark:'જમ્યા પછી', method:'TABLET' }
        ]
      },
      {
        id:'4', name:'MULJIBHAI NARAYANBHAI GOYANI', dob:'1962-06-30', gender:'Male', phone:'9723311223', email:'muljibhai@gmail.com', address:'101 Yogichowk, Surat', bloodType:'AB+', createdAt:'2024-04-01T11:00:00Z',
        savedComplaints: [{ name:'Increased thirst & urination', remark:'Since 2 weeks' }],
        savedExam: [{ exam:'BP', res:'130/84', unit:'mmHg' }, { exam:'PULSE', res:'76', unit:'bpm' }, { exam:'WEIGHT', res:'72', unit:'kg' }],
        savedDiag: [{ name:'Diabetes Mellitus (Type 2)' }],
        savedRx: [
          { name:'GLYCOMET 500', dose:'1 Tab', m:1, a:0, n:1, s:0, day:30, qty:60, rate:2.30, total:138.00, remark:'જમ્યા પછી', method:'TABLET' }
        ],
        savedLab: [{ lab:'HbA1c', labName:'City Clinical Lab', rate:350 }, { lab:'Blood Sugar (Fasting)', labName:'Main Parth Pathology', rate:150 }]
      },
      {
        id:'5', name:'BIRENDRABHAI SHIVRATBHAI NISHAD', dob:'1982-01-15', gender:'Male', phone:'9978833445', email:'birendra@gmail.com', address:'23 Industrial Area, Vadodara', bloodType:'O-', createdAt:'2024-04-20T12:00:00Z',
        savedComplaints: [{ name:'Skin itching & red patches', remark:'Both arms' }],
        savedExam: [{ exam:'BP', res:'122/80', unit:'mmHg' }],
        savedDiag: [{ name:'Allergic Contact Dermatitis' }]
      },
      {
        id:'6', name:'MAMIBEN BALKRUSHANA GOUDA', dob:'1975-08-19', gender:'Female', phone:'9898566778', email:'mamiben@gmail.com', address:'89 Varachha Road, Surat', bloodType:'B-', createdAt:'2024-05-10T14:00:00Z',
        ipdDoneCount: 3, bedChargePerDay: 400,
        savedComplaints: [{ name:'Severe bilateral knee pain', remark:'Osteoarthritis flare' }],
        savedExam: [{ exam:'BP', res:'136/86', unit:'mmHg' }, { exam:'PULSE', res:'80', unit:'bpm' }],
        savedDiag: [{ name:'Osteoarthritis Bilateral Knees (IPD)' }]
      },
      {
        id:'7', name:'KAJALBEN DILIPBHAI GOYANI', dob:'1992-03-25', gender:'Female', phone:'9426577889', email:'kajalben@gmail.com', address:'56 Katargam, Surat', bloodType:'A-', createdAt:'2024-06-01T15:00:00Z',
        savedComplaints: [{ name:'Epigastric burning & acidity', remark:'Post meals' }, { name:'Nausea', remark:'Morning' }],
        savedExam: [{ exam:'BP', res:'114/72', unit:'mmHg' }, { exam:'PULSE', res:'76', unit:'bpm' }],
        savedDiag: [{ name:'Acid Peptic Disease (APD) / Gastritis' }],
        savedRx: [
          { name:'PAN-D CAPSULE', dose:'1 Cap', m:1, a:0, n:0, s:0, day:7, qty:7, rate:14.50, total:101.50, remark:'સવારે ભૂખ્યા પેટે', method:'CAPSULE' }
        ]
      },
      {
        id:'8', name:'CHETANBHAI BABUBHAI BAROT', dob:'1984-12-05', gender:'Male', phone:'9824133221', email:'chetan.barot@gmail.com', address:'12 Ring Road, Surat', bloodType:'O+', createdAt:'2024-06-15T16:00:00Z',
        savedComplaints: [{ name:'Chest tightness on exertion', remark:'Non-radiating' }],
        savedExam: [{ exam:'BP', res:'128/82', unit:'mmHg' }, { exam:'PULSE', res:'72', unit:'bpm' }],
        savedDiag: [{ name:'Atypical Chest Pain - ECG Normal' }],
        savedRadio: [{ cat:'ECG', test:'ECG Routine', lab:'Clinic In-House' }]
      },
      {
        id:'9', name:'ROOPA SUNILBHAI BISWAS', dob:'1987-10-18', gender:'Female', phone:'9909988776', email:'roopa.biswas@gmail.com', address:'34 Udhna Main Road, Surat', bloodType:'B+', createdAt:'2024-07-01T10:00:00Z',
        savedComplaints: [{ name:'General checkup & weakness', remark:'Routine' }]
      },
      {
        id:'10', name:'KAJALBEN CHETANBHAI VAGHANI', dob:'1994-02-11', gender:'Female', phone:'9825544332', email:'kajal.vaghani@gmail.com', address:'88 Mota Varachha, Surat', bloodType:'AB-', createdAt:'2024-07-15T11:00:00Z',
        savedComplaints: [{ name:'Weight gain & tiredness', remark:'Since 2 months' }],
        savedDiag: [{ name:'Hypothyroidism Evaluation' }],
        savedLab: [{ lab:'Thyroid Profile (T3, T4, TSH)', labName:'Main Parth Pathology', rate:500 }]
      },
      {
        id:'11', name:'VIPULBHAI NANUBHAI DOBARIYA', dob:'1979-05-29', gender:'Male', phone:'9712955667', email:'vipul.dobariya@gmail.com', address:'19 Adajan, Surat', bloodType:'O+', createdAt:'2024-08-01T09:00:00Z'
      },
      {
        id:'12', name:'PRAKASHBHAI HARIBHAI JADEJA', dob:'1971-09-03', gender:'Male', phone:'9898077665', email:'prakash.jadeja@gmail.com', address:'63 Race Course, Rajkot', bloodType:'B+', createdAt:'2024-08-05T14:00:00Z'
      },
      {
        id:'13', name:'DIPIKABEN VIJAYBHAI SOLANKI', dob:'1993-07-14', gender:'Female', phone:'9429988123', email:'dipika.solanki@gmail.com', address:'15 Navrangpura, Ahmedabad', bloodType:'A+', createdAt:'2024-08-10T10:00:00Z',
        savedComplaints: [{ name:'Throat pain & difficulty swallowing', remark:'Since yesterday' }],
        savedDiag: [{ name:'Acute Tonsillopharyngitis' }],
        savedRx: [
          { name:'AUGMENTIN 625', dose:'1 Tab', m:1, a:0, n:1, s:0, day:5, qty:10, rate:21.00, total:210.00, remark:'જમ્યા પછી', method:'TABLET' }
        ]
      },
      {
        id:'14', name:'JAYESHBHAI MOHANBHAI SHAH', dob:'1966-11-20', gender:'Male', phone:'9879122334', email:'jayesh.shah@gmail.com', address:'42 Rupanagar, Bhavnagar', bloodType:'B+', createdAt:'2024-08-12T11:00:00Z'
      },
      {
        id:'15', name:'SHARDABEN KANUBHAI PARMAR', dob:'1959-03-28', gender:'Female', phone:'9909266778', email:'shardaben@gmail.com', address:'77 Station Road, Anand', bloodType:'O+', createdAt:'2024-08-15T12:00:00Z'
      },

      /* ── Fresh Newly Added Patients ── */
      {
        id:'16', name:'DHARMESHBHAI KISHORBHAI PATEL', dob:'1976-04-18', gender:'Male', phone:'9825123411', email:'dharmesh.patel@gmail.com', address:'44 Swaminarayan Park, Surat', bloodType:'B+', createdAt:'2024-08-20T10:30:00Z',
        savedComplaints: [{ name:'Bilateral pedal swelling & lethargy', remark:'Since 10 days' }, { name:'Nocturia 3-4 times', remark:'Frequent night urination' }],
        savedExam: [{ exam:'BP', res:'144/92', unit:'mmHg' }, { exam:'PULSE', res:'76', unit:'bpm' }, { exam:'WEIGHT', res:'78.5', unit:'kg' }, { exam:'SPO2', res:'98', unit:'%' }],
        savedDiag: [{ name:'Type 2 Diabetes Mellitus with Stage 2 Hypertension' }],
        savedRx: [
          { name:'GLIMESTAR-M2', dose:'1 Tab', m:1, a:0, n:1, s:0, day:30, qty:60, rate:7.50, total:450.00, remark:'જમ્યા પહેલા', method:'TABLET' },
          { name:'TELMA-H', dose:'1 Tab', m:1, a:0, n:0, s:0, day:30, qty:30, rate:11.20, total:336.00, remark:'સવારે ભૂખ્યા પેટે', method:'TABLET' }
        ],
        savedLab: [{ lab:'HbA1c', labName:'City Clinical Lab', rate:350 }, { lab:'Renal Function Test (RFT)', labName:'City Clinical Lab', rate:380 }]
      },
      {
        id:'17', name:'ANITABEN PRAVINBHAI SHAH', dob:'1989-11-04', gender:'Female', phone:'9909112244', email:'anita.shah@yahoo.com', address:'18 Shanti Niketan, Ahmedabad', bloodType:'O+', createdAt:'2024-08-22T11:15:00Z',
        savedComplaints: [{ name:'Productive cough with wheezing', remark:'Aggravated at night & early morning' }, { name:'Shortness of breath on walking', remark:'Mild exertional' }],
        savedExam: [{ exam:'BP', res:'118/78', unit:'mmHg' }, { exam:'PULSE', res:'88', unit:'bpm' }, { exam:'TEMP', res:'99.0', unit:'°F' }, { exam:'SPO2', res:'97', unit:'%' }],
        savedDiag: [{ name:'Allergic Bronchitis with Bronchospasm' }],
        savedRx: [
          { name:'FORACORT 200 INHALER', dose:'2 Puffs', m:2, a:0, n:2, s:0, day:30, qty:1, rate:380.00, total:380.00, remark:'૨ પફ સવારે અને રાત્રે પછી કોગળા કરવા', method:'INHALER' },
          { name:'MONTEK-LC', dose:'1 Tab', m:0, a:0, n:1, s:0, day:10, qty:10, rate:18.00, total:180.00, remark:'રાત્રે સૂતી વખતે', method:'TABLET' }
        ]
      },
      {
        id:'18', name:'AARAV HITESHBHAI VAGHANI', dob:'2019-06-15', gender:'Male', phone:'9428556677', email:'hitesh.vaghani@gmail.com', address:'302 Tulsi Arcade, Surat', bloodType:'A+', createdAt:'2024-08-25T09:45:00Z',
        savedComplaints: [{ name:'Watery loose stools 5-6 times', remark:'Since early morning' }, { name:'Vomiting 2 episodes', remark:'Post milk intake' }, { name:'Abdominal cramps', remark:'Periumbilical mild' }],
        savedExam: [{ exam:'TEMP', res:'99.8', unit:'°F' }, { exam:'PULSE', res:'102', unit:'bpm' }, { exam:'WEIGHT', res:'18.5', unit:'kg' }],
        savedDiag: [{ name:'Acute Pediatric Gastroenteritis with Mild Dehydration' }],
        savedRx: [
          { name:'ELECTRAL ORS SACHET', dose:'1 Sachet', m:1, a:1, n:1, s:0, day:3, qty:3, rate:22.00, total:66.00, remark:'૧ લીટર પાણીમાં ઓગાળીને ઘૂંટડે ઘૂંટડે પીવું', method:'SACHET' },
          { name:'ENTEROGERMINA RESPOULES', dose:'1 Vial', m:1, a:0, n:1, s:0, day:5, qty:10, rate:55.00, total:550.00, remark:'સીધું પી જવું', method:'LIQUID' }
        ]
      },
      {
        id:'19', name:'KANTILAL GOKALBHAI PATEL', dob:'1955-02-12', gender:'Male', phone:'9879443322', email:'kantilal.patel@gmail.com', address:'12 Sardar Patel Society, Bardoli', bloodType:'AB+', createdAt:'2024-08-28T14:30:00Z',
        savedComplaints: [{ name:'Burning sensation & tingling in both feet', remark:'Diabetic Neuropathy' }, { name:'Generalized muscular weakness', remark:'Fatigue' }],
        savedExam: [{ exam:'BP', res:'132/86', unit:'mmHg' }, { exam:'PULSE', res:'72', unit:'bpm' }],
        savedDiag: [{ name:'Diabetic Peripheral Neuropathy & Vitamin B12 Deficiency' }],
        savedRx: [
          { name:'NEUROBION FORTE', dose:'1 Tab', m:1, a:0, n:0, s:0, day:30, qty:30, rate:1.35, total:40.50, remark:'જમ્યા પછી સવારે', method:'TABLET' },
          { name:'SHELCAL 500', dose:'1 Tab', m:0, a:0, n:1, s:0, day:30, qty:30, rate:8.50, total:255.00, remark:'જમ્યા પછી રાત્રે', method:'TABLET' }
        ]
      },
      {
        id:'20', name:'PRIYANKABEN MANISHBHAI JADAV', dob:'1998-08-20', gender:'Female', phone:'9727668899', email:'priyanka.jadav@gmail.com', address:'85 Krishna Nagar, Surat', bloodType:'B+', createdAt:'2024-08-30T16:00:00Z',
        savedComplaints: [{ name:'Antenatal Routine Checkup (2nd Trimester)', remark:'G1P0 at 22 weeks' }, { name:'Occasional morning nausea & acidity', remark:'Mild' }],
        savedExam: [{ exam:'BP', res:'110/70', unit:'mmHg' }, { exam:'PULSE', res:'80', unit:'bpm' }, { exam:'WEIGHT', res:'56', unit:'kg' }],
        savedDiag: [{ name:'Second Trimester Antenatal Care (ANC Routine)' }],
        savedRx: [
          { name:'SHELCAL 500', dose:'1 Tab', m:0, a:0, n:1, s:0, day:30, qty:30, rate:8.50, total:255.00, remark:'જમ્યા પછી રાત્રે', method:'TABLET' },
          { name:'SUPRADYN DAILY', dose:'1 Tab', m:1, a:0, n:0, s:0, day:30, qty:30, rate:4.20, total:126.00, remark:'જમ્યા પછી બપોરે', method:'TABLET' }
        ]
      }
    ];

    const appointments = [
      { id:'a1',  patientId:'1',  patientName:'KAIRAVI RAMESHBHAI PATEL',        date:today, time:'09:00 AM', reason:'Viral Fever & Bodyache',         status:'completed', fee:100, paid:true,  paymentMode:'Cash', createdAt:new Date().toISOString() },
      { id:'a2',  patientId:'2',  patientName:'RAVINABEN UMESHBHAI CHAUHAN',     date:today, time:'09:30 AM', reason:'Hypertension Stage 1 Follow-up', status:'completed', fee:100, paid:true,  paymentMode:'UPI',  createdAt:new Date().toISOString() },
      { id:'a3',  patientId:'3',  patientName:'AGASTI VINESHBHAI SUTRIYA',       date:today, time:'10:15 AM', reason:'Allergic Rhinitis & Cold',      status:'completed', fee:100, paid:false, paymentMode:'Cash', createdAt:new Date().toISOString() },
      { id:'a4',  patientId:'4',  patientName:'MULJIBHAI NARAYANBHAI GOYANI',    date:today, time:'11:00 AM', reason:'Diabetes Mellitus & HbA1c',      status:'scheduled', fee:100, paid:false, paymentMode:'Cash', createdAt:new Date().toISOString() },
      { id:'a5',  patientId:'5',  patientName:'BIRENDRABHAI SHIVRATBHAI NISHAD', date:today, time:'11:45 AM', reason:'Skin Rash & Allergy',           status:'scheduled', fee:100, paid:false, paymentMode:'Cash', createdAt:new Date().toISOString() },
      { id:'a6',  patientId:'6',  patientName:'MAMIBEN BALKRUSHANA GOUDA',       date:today, time:'02:00 PM', reason:'Joint Pain & Knee Care',         status:'scheduled', fee:400, indoor:true, ipdDoneCount:3, bedChargePerDay:400, paid:false, paymentMode:'Cash', createdAt:new Date().toISOString() },
      { id:'a7',  patientId:'7',  patientName:'KAJALBEN DILIPBHAI GOYANI',       date:today, time:'02:30 PM', reason:'Abdominal Acidity & APD',       status:'scheduled', fee:100, paid:false, paymentMode:'Cash', createdAt:new Date().toISOString() },
      { id:'a8',  patientId:'8',  patientName:'CHETANBHAI BABUBHAI BAROT',       date:today, time:'03:15 PM', reason:'ECG & Cardiac Routine',         status:'scheduled', fee:250, paid:true,  paymentMode:'Cash', createdAt:new Date().toISOString() },
      { id:'a9',  patientId:'9',  patientName:'ROOPA SUNILBHAI BISWAS',          date:today, time:'04:00 PM', reason:'General Health Screening',      status:'scheduled', fee:100, paid:false, paymentMode:'Cash', createdAt:new Date().toISOString() },
      { id:'a10', patientId:'10', patientName:'KAJALBEN CHETANBHAI VAGHANI',     date:today, time:'04:30 PM', reason:'Thyroid Profile Follow-up',     status:'scheduled', fee:100, paid:false, paymentMode:'Cash', createdAt:new Date().toISOString() },
      { id:'a11', patientId:'11', patientName:'VIPULBHAI NANUBHAI DOBARIYA',     date:today, time:'05:00 PM', reason:'GP-2 Follow-Up Consultation',   status:'scheduled', fee:50,  paid:false, paymentMode:'Cash', createdAt:new Date().toISOString() },
      { id:'a12', patientId:'12', patientName:'PRAKASHBHAI HARIBHAI JADEJA',     date:today, time:'05:30 PM', reason:'Routine Health Screening',      status:'scheduled', fee:100, paid:false, paymentMode:'Cash', createdAt:new Date().toISOString() },
      { id:'a13', patientId:'13', patientName:'DIPIKABEN VIJAYBHAI SOLANKI',     date:today, time:'06:00 PM', reason:'Tonsillopharyngitis Check',     status:'scheduled', fee:100, paid:false, paymentMode:'Cash', createdAt:new Date().toISOString() },
      { id:'a14', patientId:'14', patientName:'JAYESHBHAI MOHANBHAI SHAH',       date:today, time:'06:30 PM', reason:'Lipid & Cholesterol Profile',   status:'scheduled', fee:100, paid:false, paymentMode:'Cash', createdAt:new Date().toISOString() },
      { id:'a15', patientId:'15', patientName:'SHARDABEN KANUBHAI PARMAR',       date:today, time:'07:00 PM', reason:'Arthritis Knee Evaluation',     status:'scheduled', fee:100, paid:false, paymentMode:'Cash', createdAt:new Date().toISOString() },
      
      /* Fresh Appointments */
      { id:'a16', patientId:'16', patientName:'DHARMESHBHAI KISHORBHAI PATEL',   date:today, time:'07:30 PM', reason:'Diabetes & HTN Evaluation',      status:'scheduled', fee:100, paid:true,  paymentMode:'UPI',  createdAt:new Date().toISOString() },
      { id:'a17', patientId:'17', patientName:'ANITABEN PRAVINBHAI SHAH',        date:today, time:'08:00 PM', reason:'Cough, Wheezing & Inhaler Care',status:'scheduled', fee:100, paid:false, paymentMode:'Cash', createdAt:new Date().toISOString() }
    ];

    const visits = [
      {
        id:'v1', patientId:'1', patientName:'KAIRAVI RAMESHBHAI PATEL',
        date:today, diagnosis:'Viral Fever (Follow-up Check)',
        notes:'Fever resolved. Mild post-viral weakness persists. Advised hydration & vitamins.',
        vitals:{ bp:'120/80', pulse:'74', temp:'98.4', spo2:'99', weight:'58.0', height:'162' },
        createdAt:new Date().toISOString()
      },
      {
        id:'v1_prev', patientId:'1', patientName:'KAIRAVI RAMESHBHAI PATEL',
        date:getPastDate(4), diagnosis:'Viral Fever with Acute Myalgia',
        notes:'High grade fever with chills for 3 days. Prescribed Paracetamol 650mg & Pan 40.',
        vitals:{ bp:'120/80', pulse:'84', temp:'101.2', spo2:'98', weight:'58.2', height:'162' },
        createdAt:new Date(Date.now() - 4 * 86400000).toISOString()
      },
      {
        id:'v2', patientId:'2', patientName:'RAVINABEN UMESHBHAI CHAUHAN',
        date:today, diagnosis:'Essential Hypertension Stage 1 (Follow-up Review)',
        notes:'BP maintained well at 138/86. Headaches subsided. Continue Telma 40mg.',
        vitals:{ bp:'138/86', pulse:'78', temp:'98.4', spo2:'99', weight:'64.5', height:'156' },
        createdAt:new Date().toISOString()
      },
      {
        id:'v2_prev', patientId:'2', patientName:'RAVINABEN UMESHBHAI CHAUHAN',
        date:getPastDate(28), diagnosis:'Essential Hypertension Stage 1',
        notes:'Started on Telmisartan 40mg. Advised low salt diet & daily walking.',
        vitals:{ bp:'154/96', pulse:'84', temp:'98.6', spo2:'99', weight:'65.2', height:'156' },
        createdAt:new Date(Date.now() - 28 * 86400000).toISOString()
      },
      {
        id:'v4_prev', patientId:'4', patientName:'MULJIBHAI NARAYANBHAI GOYANI',
        date:getPastDate(24), diagnosis:'Type 2 Diabetes Mellitus with High HbA1c',
        notes:'Fasting sugar 192. Started Glycomet 500mg post meals.',
        vitals:{ bp:'134/86', pulse:'76', temp:'98.4', spo2:'98', weight:'72.5', height:'168' },
        createdAt:new Date(Date.now() - 24 * 86400000).toISOString()
      },
      {
        id:'v16', patientId:'16', patientName:'DHARMESHBHAI KISHORBHAI PATEL',
        date:today, diagnosis:'Type 2 Diabetes Mellitus with Stage 2 HTN (Follow-up Review)',
        notes:'BP improved to 136/86. Pedal swelling significantly reduced. Continue Glimestar-M2 & Telma-H.',
        vitals:{ bp:'136/86', pulse:'74', temp:'98.6', spo2:'98', weight:'78.0', height:'170' },
        createdAt:new Date().toISOString()
      },
      {
        id:'v16_prev1', patientId:'16', patientName:'DHARMESHBHAI KISHORBHAI PATEL',
        date:getPastDate(20), diagnosis:'Type 2 Diabetes Mellitus Uncontrolled with Stage 2 HTN',
        notes:'Initiated Glimestar-M2 and Telma-H. Advised HbA1c & RFT lab tests.',
        vitals:{ bp:'148/94', pulse:'78', temp:'98.6', spo2:'98', weight:'79.0', height:'170' },
        createdAt:new Date(Date.now() - 20 * 86400000).toISOString()
      },
      {
        id:'v16_prev2', patientId:'16', patientName:'DHARMESHBHAI KISHORBHAI PATEL',
        date:getPastDate(45), diagnosis:'Newly Evaluated Diabetes Mellitus & HTN',
        notes:'Initial checkup. Blood sugar fasting 240. Advised diabetic diet and lifestyle change.',
        vitals:{ bp:'152/96', pulse:'82', temp:'98.4', spo2:'98', weight:'80.2', height:'170' },
        createdAt:new Date(Date.now() - 45 * 86400000).toISOString()
      },
      {
        id:'v17', patientId:'17', patientName:'ANITABEN PRAVINBHAI SHAH',
        date:today, diagnosis:'Allergic Bronchitis (Follow-up Check)',
        notes:'Wheezing much better. Cough reduced by 80%. Continue Foracort 200 Inhaler with spacer.',
        vitals:{ bp:'118/78', pulse:'82', temp:'98.6', spo2:'98', weight:'59.0', height:'158' },
        createdAt:new Date().toISOString()
      },
      {
        id:'v17_prev1', patientId:'17', patientName:'ANITABEN PRAVINBHAI SHAH',
        date:getPastDate(15), diagnosis:'Acute Allergic Bronchitis with Bronchospasm',
        notes:'Severe nocturnal cough, wheezing and chest congestion. Started Foracort 200 Inhaler 2 puffs BD and Montek-LC.',
        vitals:{ bp:'122/80', pulse:'90', temp:'99.0', spo2:'97', weight:'59.5', height:'158' },
        createdAt:new Date(Date.now() - 15 * 86400000).toISOString()
      },
      {
        id:'v17_prev2', patientId:'17', patientName:'ANITABEN PRAVINBHAI SHAH',
        date:getPastDate(35), diagnosis:'Seasonal Allergic Rhinitis & Pharyngitis',
        notes:'Running nose, throat irritation, dry cough. Advised warm water gargle and antihistamines.',
        vitals:{ bp:'116/74', pulse:'78', temp:'98.4', spo2:'99', weight:'60.0', height:'158' },
        createdAt:new Date(Date.now() - 35 * 86400000).toISOString()
      }
    ];

    const prescriptions = [
      {
        id:'rx1', patientId:'1', patientName:'KAIRAVI RAMESHBHAI PATEL',
        date:today, notes:'Viral Fever Follow-up', total:25.00,
        medications:[
          { name:'SUPRADYN DAILY', dose:'1 Tab', m:1, a:0, n:0, s:0, day:10, qty:10, rate:4.20, total:42.00, remark:'જમ્યા પછી બપોરે', method:'TABLET' }
        ]
      },
      {
        id:'rx1_prev', patientId:'1', patientName:'KAIRAVI RAMESHBHAI PATEL',
        date:getPastDate(4), notes:'Viral Fever with Acute Myalgia', total:62.70,
        medications:[
          { name:'PARACETAMOL 650MG', dose:'1 Tab', m:1, a:0, n:1, s:0, day:3, qty:6, rate:3.20, total:19.20, remark:'જમ્યા પછી', method:'TABLET' },
          { name:'PAN 40MG', dose:'1 Tab', m:1, a:0, n:0, s:0, day:3, qty:3, rate:14.50, total:43.50, remark:'સવારે ભૂખ્યા પેટે', method:'TABLET' }
        ]
      },
      {
        id:'rx2', patientId:'2', patientName:'RAVINABEN UMESHBHAI CHAUHAN',
        date:today, notes:'Essential Hypertension Stage 1 Follow-up', total:285.00,
        medications:[
          { name:'TELMA 40', dose:'1 Tab', m:1, a:0, n:0, s:0, day:30, qty:30, rate:9.50, total:285.00, remark:'સવારે ભૂખ્યા પેટે', method:'TABLET' }
        ]
      },
      {
        id:'rx2_prev', patientId:'2', patientName:'RAVINABEN UMESHBHAI CHAUHAN',
        date:getPastDate(28), notes:'Essential Hypertension Stage 1 Initial', total:285.00,
        medications:[
          { name:'TELMA 40', dose:'1 Tab', m:1, a:0, n:0, s:0, day:30, qty:30, rate:9.50, total:285.00, remark:'સવારે ભૂખ્યા પેટે', method:'TABLET' }
        ]
      },
      {
        id:'rx4_prev', patientId:'4', patientName:'MULJIBHAI NARAYANBHAI GOYANI',
        date:getPastDate(24), notes:'Type 2 Diabetes Mellitus Initial', total:138.00,
        medications:[
          { name:'GLYCOMET 500', dose:'1 Tab', m:1, a:0, n:1, s:0, day:30, qty:60, rate:2.30, total:138.00, remark:'જમ્યા પછી', method:'TABLET' }
        ]
      },
      {
        id:'rx16_prev1', patientId:'16', patientName:'DHARMESHBHAI KISHORBHAI PATEL',
        date:getPastDate(20), notes:'Type 2 Diabetes Mellitus with Stage 2 Hypertension', total:786.00,
        medications:[
          { name:'GLIMESTAR-M2', dose:'1 Tab', m:1, a:0, n:1, s:0, day:30, qty:60, rate:7.50, total:450.00, remark:'જમ્યા પહેલા', method:'TABLET' },
          { name:'TELMA-H', dose:'1 Tab', m:1, a:0, n:0, s:0, day:30, qty:30, rate:11.20, total:336.00, remark:'સવારે ભૂખ્યા પેટે', method:'TABLET' }
        ]
      },
      {
        id:'rx16_prev2', patientId:'16', patientName:'DHARMESHBHAI KISHORBHAI PATEL',
        date:getPastDate(45), notes:'Diabetic Initial Consultation', total:330.00,
        medications:[
          { name:'GLYCOMET 500', dose:'1 Tab', m:1, a:0, n:1, s:0, day:30, qty:60, rate:2.30, total:138.00, remark:'જમ્યા પછી', method:'TABLET' },
          { name:'TELMA 40', dose:'1 Tab', m:1, a:0, n:0, s:0, day:20, qty:20, rate:9.50, total:190.00, remark:'સવારે ભૂખ્યા પેટે', method:'TABLET' }
        ]
      },
      {
        id:'rx17_prev1', patientId:'17', patientName:'ANITABEN PRAVINBHAI SHAH',
        date:getPastDate(15), notes:'Allergic Bronchitis with Bronchospasm', total:560.00,
        medications:[
          { name:'FORACORT 200 INHALER', dose:'2 Puffs', m:2, a:0, n:2, s:0, day:30, qty:1, rate:380.00, total:380.00, remark:'૨ પફ સવારે અને રાત્રે પછી કોગળા કરવા', method:'INHALER' },
          { name:'MONTEK-LC', dose:'1 Tab', m:0, a:0, n:1, s:0, day:10, qty:10, rate:18.00, total:180.00, remark:'રાત્રે સૂતી વખતે', method:'TABLET' }
        ]
      },
      {
        id:'rx17_prev2', patientId:'17', patientName:'ANITABEN PRAVINBHAI SHAH',
        date:getPastDate(35), notes:'Seasonal Allergic Rhinitis & Pharyngitis', total:74.50,
        medications:[
          { name:'ALERID 10MG', dose:'1 Tab', m:0, a:0, n:1, s:0, day:5, qty:5, rate:2.50, total:12.50, remark:'રાત્રે સૂતી વખતે', method:'TABLET' },
          { name:'COMBIFLAM', dose:'1 Tab', m:1, a:0, n:1, s:0, day:3, qty:6, rate:4.50, total:27.00, remark:'જમ્યા પછી', method:'TABLET' },
          { name:'PAN 40MG', dose:'1 Tab', m:1, a:0, n:0, s:0, day:3, qty:3, rate:14.50, total:43.50, remark:'સવારે ભૂખ્યા પેટે', method:'TABLET' }
        ]
      }
    ];

    const invoices = [
      { id:'inv1', patientId:'1', patientName:'KAIRAVI RAMESHBHAI PATEL', items:[{ desc:'OPD Consultation Fee', amount:100 }], total:100, status:'paid', paymentMode:'Cash', createdAt:new Date().toISOString() },
      { id:'inv2', patientId:'2', patientName:'RAVINABEN UMESHBHAI CHAUHAN', items:[{ desc:'OPD Consultation Fee', amount:100 }], total:100, status:'paid', paymentMode:'UPI', createdAt:new Date().toISOString() },
      { id:'inv16', patientId:'16', patientName:'DHARMESHBHAI KISHORBHAI PATEL', items:[{ desc:'OPD Consultation Fee', amount:100 }, { desc:'Blood Glucose Fasting', amount:150 }], total:250, status:'paid', paymentMode:'UPI', createdAt:new Date().toISOString() }
    ];

    const opdEntries = [
      { id:'opd1', patientName:'KAIRAVI RAMESHBHAI PATEL', date:today, type:'Consultation', amount:100, payMode:'Cash', note:'Token #1', createdAt:new Date().toISOString() },
      { id:'opd2', patientName:'RAVINABEN UMESHBHAI CHAUHAN', date:today, type:'Consultation', amount:100, payMode:'UPI', note:'Token #2', createdAt:new Date().toISOString() },
      { id:'opd16', patientName:'DHARMESHBHAI KISHORBHAI PATEL', date:today, type:'Consultation', amount:100, payMode:'UPI', note:'Token #16', createdAt:new Date().toISOString() }
    ];

    const labReports = [
      { id:'lr1', date:today, patientId:'1', patientName:'KAIRAVI RAMESHBHAI PATEL', labName:'Main Parth Pathology', reportName:'CBC (Complete Blood Count)', done:true, paid:true, amt:250, payMode:'Cash' },
      { id:'lr2', date:today, patientId:'1', patientName:'KAIRAVI RAMESHBHAI PATEL', labName:'Main Parth Pathology', reportName:'Blood Sugar (Fasting)', done:true, paid:true, amt:150, payMode:'Cash' },
      { id:'lr3', date:today, patientId:'2', patientName:'RAVINABEN UMESHBHAI CHAUHAN', labName:'City Clinical Lab', reportName:'Lipid Profile', done:false, paid:false, amt:450, payMode:'Cash' },
      { id:'lr4', date:today, patientId:'4', patientName:'MULJIBHAI NARAYANBHAI GOYANI', labName:'City Clinical Lab', reportName:'HbA1c', done:false, paid:false, amt:350, payMode:'Cash' },
      { id:'lr5', date:today, patientId:'10', patientName:'KAJALBEN CHETANBHAI VAGHANI', labName:'Main Parth Pathology', reportName:'Thyroid Profile (T3, T4, TSH)', done:false, paid:false, amt:500, payMode:'Cash' },
      { id:'lr16', date:today, patientId:'16', patientName:'DHARMESHBHAI KISHORBHAI PATEL', labName:'City Clinical Lab', reportName:'HbA1c & Fasting Glucose', done:false, paid:false, amt:500, payMode:'UPI' }
    ];

    const medicines = [
      /* Paracetamol 650mg Group */
      { id:'m1',  name:'PARACETAMOL 650MG', unit:'TAB.', mrppack:32.00,  orqty:100, generic:'PARACETAMOL 650MG',           dosage:'1-0-1 After Food',       m:1,a:0,n:1,s:0, remark:'જમ્યા પછી', method:'TABLET', isTablet:true, displayIndoor:true, displayOpd:true, notUse:false, reOrder:true, maxQty:200, dower:'G10', stockDower:'S2/1', ptr:2.50 },
      { id:'m2',  name:'DOLO 650',          unit:'TAB.', mrppack:34.00,  orqty:100, generic:'PARACETAMOL 650MG',           dosage:'1-0-1 After Food',       m:1,a:0,n:1,s:0, remark:'જમ્યા પછી', method:'TABLET', isTablet:true, displayIndoor:true, displayOpd:true, notUse:false, reOrder:true, maxQty:200, dower:'G10', stockDower:'S2/1', ptr:2.60 },
      { id:'m3',  name:'CALPOL 650',        unit:'TAB.', mrppack:30.00,  orqty:100, generic:'PARACETAMOL 650MG',           dosage:'1-0-1 After Food',       m:1,a:0,n:1,s:0, remark:'જમ્યા પછી', method:'TABLET', isTablet:true, displayIndoor:true, displayOpd:true, notUse:false, reOrder:true, maxQty:200, dower:'G10', stockDower:'S2/1', ptr:2.20 },
      { id:'m4',  name:'CROCIN ADVANCE 650',unit:'TAB.', mrppack:35.00,  orqty:100, generic:'PARACETAMOL 650MG',           dosage:'1-0-1 After Food',       m:1,a:0,n:1,s:0, remark:'જમ્યા પછી', method:'TABLET', isTablet:true, displayIndoor:true, displayOpd:true, notUse:false, reOrder:true, maxQty:200, dower:'G10', stockDower:'S2/1', ptr:2.70 },
      { id:'m5',  name:'PACIMOL 650',       unit:'TAB.', mrppack:28.00,  orqty:80,  generic:'PARACETAMOL 650MG',           dosage:'1-0-1 After Food',       m:1,a:0,n:1,s:0, remark:'જમ્યા પછી', method:'TABLET', isTablet:true, displayIndoor:true, displayOpd:true, notUse:false, reOrder:true, maxQty:150, dower:'G10', stockDower:'S2/1', ptr:2.00 },

      /* Pantoprazole 40mg Group */
      { id:'m6',  name:'PAN 40MG',          unit:'TAB.', mrppack:145.00, orqty:50,  generic:'PANTOPRAZOLE 40MG',            dosage:'1-0-0 Empty Stomach',    m:1,a:0,n:0,s:0, remark:'સવારે ભૂખ્યા પેટે (Morning Empty Stomach)', method:'TABLET', isTablet:true, displayIndoor:true, displayOpd:true, notUse:false, reOrder:true, maxQty:100, dower:'G12', stockDower:'S2/3', ptr:9.50 },
      { id:'m7',  name:'PANTOCID 40',       unit:'TAB.', mrppack:130.00, orqty:50,  generic:'PANTOPRAZOLE 40MG',            dosage:'1-0-0 Empty Stomach',    m:1,a:0,n:0,s:0, remark:'સવારે ભૂખ્યા પેટે (Morning Empty Stomach)', method:'TABLET', isTablet:true, displayIndoor:true, displayOpd:true, notUse:false, reOrder:true, maxQty:100, dower:'G12', stockDower:'S2/3', ptr:8.90 },
      { id:'m8',  name:'PANSEC 40',         unit:'TAB.', mrppack:125.00, orqty:50,  generic:'PANTOPRAZOLE 40MG',            dosage:'1-0-0 Empty Stomach',    m:1,a:0,n:0,s:0, remark:'સવારે ભૂખ્યા પેટે (Morning Empty Stomach)', method:'TABLET', isTablet:true, displayIndoor:true, displayOpd:true, notUse:false, reOrder:true, maxQty:100, dower:'G12', stockDower:'S2/3', ptr:8.50 },
      { id:'m9',  name:'PANTODAC 40',       unit:'TAB.', mrppack:140.00, orqty:50,  generic:'PANTOPRAZOLE 40MG',            dosage:'1-0-0 Empty Stomach',    m:1,a:0,n:0,s:0, remark:'સવારે ભૂખ્યા પેટે (Morning Empty Stomach)', method:'TABLET', isTablet:true, displayIndoor:true, displayOpd:true, notUse:false, reOrder:true, maxQty:100, dower:'G12', stockDower:'S2/3', ptr:9.20 },

      /* Pantoprazole 40mg + Domperidone 30mg Group */
      { id:'m10', name:'PAN-D CAPSULE',     unit:'CAP.', mrppack:145.00, orqty:50,  generic:'PANTOPRAZOLE 40MG + DOMPERIDONE 30MG', dosage:'1-0-0 Empty Stomach', m:1,a:0,n:0,s:0, remark:'સવારે ભૂખ્યા પેટે (Morning Empty Stomach)', method:'CAPSULE', isTablet:false, displayIndoor:true, displayOpd:true, notUse:false, reOrder:true, maxQty:100, dower:'G12', stockDower:'S2/3', ptr:9.50 },
      { id:'m11', name:'PANTOCID D',        unit:'CAP.', mrppack:155.00, orqty:50,  generic:'PANTOPRAZOLE 40MG + DOMPERIDONE 30MG', dosage:'1-0-0 Empty Stomach', m:1,a:0,n:0,s:0, remark:'સવારે ભૂખ્યા પેટે (Morning Empty Stomach)', method:'CAPSULE', isTablet:false, displayIndoor:true, displayOpd:true, notUse:false, reOrder:true, maxQty:100, dower:'G12', stockDower:'S2/3', ptr:10.50 },
      { id:'m12', name:'PANSEC D',          unit:'CAP.', mrppack:138.00, orqty:50,  generic:'PANTOPRAZOLE 40MG + DOMPERIDONE 30MG', dosage:'1-0-0 Empty Stomach', m:1,a:0,n:0,s:0, remark:'સવારે ભૂખ્યા પેટે (Morning Empty Stomach)', method:'CAPSULE', isTablet:false, displayIndoor:true, displayOpd:true, notUse:false, reOrder:true, maxQty:100, dower:'G12', stockDower:'S2/3', ptr:9.00 },

      /* Cetirizine 10mg Group */
      { id:'m13', name:'ALERID 10MG',        unit:'TAB.', mrppack:25.00,  orqty:80,  generic:'CETIRIZINE HYDROCHLORIDE 10MG',dosage:'0-0-1 Night At Bedtime', m:0,a:0,n:1,s:0, remark:'રાત્રે સૂતી વખતે (At Bedtime)', method:'TABLET', isTablet:true, displayIndoor:true, displayOpd:true, notUse:false, reOrder:true, maxQty:150, dower:'G05', stockDower:'S1/2', ptr:1.80 },
      { id:'m14', name:'CETZIP 10',          unit:'TAB.', mrppack:20.00,  orqty:80,  generic:'CETIRIZINE HYDROCHLORIDE 10MG',dosage:'0-0-1 Night At Bedtime', m:0,a:0,n:1,s:0, remark:'રાત્રે સૂતી વખતે (At Bedtime)', method:'TABLET', isTablet:true, displayIndoor:true, displayOpd:true, notUse:false, reOrder:true, maxQty:150, dower:'G05', stockDower:'S1/2', ptr:1.40 },
      { id:'m15', name:'ZYRTEC 10',         unit:'TAB.', mrppack:38.00,  orqty:80,  generic:'CETIRIZINE HYDROCHLORIDE 10MG',dosage:'0-0-1 Night At Bedtime', m:0,a:0,n:1,s:0, remark:'રાત્રે સૂતી વખતે (At Bedtime)', method:'TABLET', isTablet:true, displayIndoor:true, displayOpd:true, notUse:false, reOrder:true, maxQty:150, dower:'G05', stockDower:'S1/2', ptr:2.80 },
      { id:'m16', name:'OKACET 10',         unit:'TAB.', mrppack:22.00,  orqty:80,  generic:'CETIRIZINE HYDROCHLORIDE 10MG',dosage:'0-0-1 Night At Bedtime', m:0,a:0,n:1,s:0, remark:'રાત્રે સૂતી વખતે (At Bedtime)', method:'TABLET', isTablet:true, displayIndoor:true, displayOpd:true, notUse:false, reOrder:true, maxQty:150, dower:'G05', stockDower:'S1/2', ptr:1.60 },

      /* Amoxicillin + Clavulanic Acid 625mg Group */
      { id:'m17', name:'AUGMENTIN 625',     unit:'TAB.', mrppack:210.00, orqty:40,  generic:'AMOXICILLIN 500MG + CLAVULANIC ACID 125MG', dosage:'1-0-1 After Food', m:1,a:0,n:1,s:0, remark:'જમ્યા પછી', method:'TABLET', isTablet:true, displayIndoor:true, displayOpd:true, notUse:false, reOrder:true, maxQty:80, dower:'G08', stockDower:'S1/5', ptr:18.50 },
      { id:'m18', name:'MOXIKIND-CV 625',   unit:'TAB.', mrppack:195.00, orqty:40,  generic:'AMOXICILLIN 500MG + CLAVULANIC ACID 125MG', dosage:'1-0-1 After Food', m:1,a:0,n:1,s:0, remark:'જમ્યા પછી', method:'TABLET', isTablet:true, displayIndoor:true, displayOpd:true, notUse:false, reOrder:true, maxQty:80, dower:'G08', stockDower:'S1/5', ptr:17.00 },
      { id:'m19', name:'CLAVAM 625',        unit:'TAB.', mrppack:205.00, orqty:40,  generic:'AMOXICILLIN 500MG + CLAVULANIC ACID 125MG', dosage:'1-0-1 After Food', m:1,a:0,n:1,s:0, remark:'જમ્યા પછી', method:'TABLET', isTablet:true, displayIndoor:true, displayOpd:true, notUse:false, reOrder:true, maxQty:80, dower:'G08', stockDower:'S1/5', ptr:18.00 },

      /* Ibuprofen + Paracetamol Group */
      { id:'m20', name:'COMBIFLAM',         unit:'TAB.', mrppack:45.00,  orqty:80,  generic:'IBUPROFEN 400MG + PARACETAMOL 325MG', dosage:'1-0-1 After Food', m:1,a:0,n:1,s:0, remark:'જમ્યા પછી', method:'TABLET', isTablet:true, displayIndoor:true, displayOpd:true, notUse:false, reOrder:true, maxQty:100, dower:'G14', stockDower:'S2/2', ptr:3.50 },
      { id:'m21', name:'FLEXON',            unit:'TAB.', mrppack:38.00,  orqty:80,  generic:'IBUPROFEN 400MG + PARACETAMOL 325MG', dosage:'1-0-1 After Food', m:1,a:0,n:1,s:0, remark:'જમ્યા પછી', method:'TABLET', isTablet:true, displayIndoor:true, displayOpd:true, notUse:false, reOrder:true, maxQty:100, dower:'G14', stockDower:'S2/2', ptr:2.90 },
      { id:'m22', name:'IBUGESIC PLUS',     unit:'TAB.', mrppack:42.00,  orqty:80,  generic:'IBUPROFEN 400MG + PARACETAMOL 325MG', dosage:'1-0-1 After Food', m:1,a:0,n:1,s:0, remark:'જમ્યા પછી', method:'TABLET', isTablet:true, displayIndoor:true, displayOpd:true, notUse:false, reOrder:true, maxQty:100, dower:'G14', stockDower:'S2/2', ptr:3.20 },

      /* Aceclofenac + Paracetamol + Serratiopeptidase Group */
      { id:'m23', name:'ZERODOL-SP',        unit:'TAB.', mrppack:115.00, orqty:50,  generic:'ACECLOFENAC 100MG + PARACETAMOL 325MG + SERRATIOPEPTIDASE', dosage:'1-0-1 After Food', m:1,a:0,n:1,s:0, remark:'જમ્યા પછી', method:'TABLET', isTablet:true, displayIndoor:true, displayOpd:true, notUse:false, reOrder:true, maxQty:100, dower:'G14', stockDower:'S2/2', ptr:8.50 },
      { id:'m24', name:'DOLOKIND-SP',       unit:'TAB.', mrppack:98.00,  orqty:50,  generic:'ACECLOFENAC 100MG + PARACETAMOL 325MG + SERRATIOPEPTIDASE', dosage:'1-0-1 After Food', m:1,a:0,n:1,s:0, remark:'જમ્યા પછી', method:'TABLET', isTablet:true, displayIndoor:true, displayOpd:true, notUse:false, reOrder:true, maxQty:100, dower:'G14', stockDower:'S2/2', ptr:7.20 },
      { id:'m25', name:'ACENAC-SP',         unit:'TAB.', mrppack:110.00, orqty:50,  generic:'ACECLOFENAC 100MG + PARACETAMOL 325MG + SERRATIOPEPTIDASE', dosage:'1-0-1 After Food', m:1,a:0,n:1,s:0, remark:'જમ્યા પછી', method:'TABLET', isTablet:true, displayIndoor:true, displayOpd:true, notUse:false, reOrder:true, maxQty:100, dower:'G14', stockDower:'S2/2', ptr:8.00 },

      /* Azithromycin 500mg Group */
      { id:'m26', name:'AZITHRAL 500MG',     unit:'TAB.', mrppack:120.00, orqty:30,  generic:'AZITHROMYCIN 500MG',          dosage:'1-0-0 After Food',       m:1,a:0,n:0,s:0, remark:'જમ્યા પછી', method:'TABLET', isTablet:true, displayIndoor:true, displayOpd:true, notUse:false, reOrder:true, maxQty:50,  dower:'G08', stockDower:'S1/4', ptr:14.00 },
      { id:'m27', name:'AZITHROLOG 500',    unit:'TAB.', mrppack:115.00, orqty:30,  generic:'AZITHROMYCIN 500MG',          dosage:'1-0-0 After Food',       m:1,a:0,n:0,s:0, remark:'જમ્યા પછી', method:'TABLET', isTablet:true, displayIndoor:true, displayOpd:true, notUse:false, reOrder:true, maxQty:50,  dower:'G08', stockDower:'S1/4', ptr:13.50 },
      { id:'m28', name:'AZITHROCIN 500',    unit:'TAB.', mrppack:110.00, orqty:30,  generic:'AZITHROMYCIN 500MG',          dosage:'1-0-0 After Food',       m:1,a:0,n:0,s:0, remark:'જમ્યા પછી', method:'TABLET', isTablet:true, displayIndoor:true, displayOpd:true, notUse:false, reOrder:true, maxQty:50,  dower:'G08', stockDower:'S1/4', ptr:13.00 },
      { id:'m29', name:'AZEE 500',          unit:'TAB.', mrppack:125.00, orqty:30,  generic:'AZITHROMYCIN 500MG',          dosage:'1-0-0 After Food',       m:1,a:0,n:0,s:0, remark:'જમ્યા પછી', method:'TABLET', isTablet:true, displayIndoor:true, displayOpd:true, notUse:false, reOrder:true, maxQty:50,  dower:'G08', stockDower:'S1/4', ptr:14.50 },

      /* Montelukast + Levocetirizine Group */
      { id:'m30', name:'MONTEK-LC',         unit:'TAB.', mrppack:180.00, orqty:60,  generic:'MONTELUKAST 10MG + LEVOCETIRIZINE 5MG', dosage:'0-0-1 Night At Bedtime', m:0,a:0,n:1,s:0, remark:'રાત્રે સૂતી વખતે (At Bedtime)', method:'TABLET', isTablet:true, displayIndoor:true, displayOpd:true, notUse:false, reOrder:true, maxQty:100, dower:'G05', stockDower:'S1/3', ptr:12.00 },
      { id:'m31', name:'MONTICOPE',         unit:'TAB.', mrppack:170.00, orqty:60,  generic:'MONTELUKAST 10MG + LEVOCETIRIZINE 5MG', dosage:'0-0-1 Night At Bedtime', m:0,a:0,n:1,s:0, remark:'રાત્રે સૂતી વખતે (At Bedtime)', method:'TABLET', isTablet:true, displayIndoor:true, displayOpd:true, notUse:false, reOrder:true, maxQty:100, dower:'G05', stockDower:'S1/3', ptr:11.50 },
      { id:'m32', name:'ROMILAST-L',        unit:'TAB.', mrppack:175.00, orqty:60,  generic:'MONTELUKAST 10MG + LEVOCETIRIZINE 5MG', dosage:'0-0-1 Night At Bedtime', m:0,a:0,n:1,s:0, remark:'રાત્રે સૂતી વખતે (At Bedtime)', method:'TABLET', isTablet:true, displayIndoor:true, displayOpd:true, notUse:false, reOrder:true, maxQty:100, dower:'G05', stockDower:'S1/3', ptr:11.80 },
      { id:'m33', name:'TELEKAST-L',        unit:'TAB.', mrppack:165.00, orqty:60,  generic:'MONTELUKAST 10MG + LEVOCETIRIZINE 5MG', dosage:'0-0-1 Night At Bedtime', m:0,a:0,n:1,s:0, remark:'રાત્રે સૂતી વખતે (At Bedtime)', method:'TABLET', isTablet:true, displayIndoor:true, displayOpd:true, notUse:false, reOrder:true, maxQty:100, dower:'G05', stockDower:'S1/3', ptr:11.00 },

      /* Metformin 500mg Group */
      { id:'m34', name:'GLYCOMET 500',      unit:'TAB.', mrppack:35.00,  orqty:100, generic:'METFORMIN HYDROCHLORIDE 500MG', dosage:'1-0-1 After Food', m:1,a:0,n:1,s:0, remark:'જમ્યા પછી', method:'TABLET', isTablet:true, displayIndoor:true, displayOpd:true, notUse:false, reOrder:true, maxQty:200, dower:'G02', stockDower:'S3/1', ptr:2.30 },
      { id:'m35', name:'METFORAL 500',      unit:'TAB.', mrppack:30.00,  orqty:100, generic:'METFORMIN HYDROCHLORIDE 500MG', dosage:'1-0-1 After Food', m:1,a:0,n:1,s:0, remark:'જમ્યા પછી', method:'TABLET', isTablet:true, displayIndoor:true, displayOpd:true, notUse:false, reOrder:true, maxQty:200, dower:'G02', stockDower:'S3/1', ptr:2.00 },
      { id:'m36', name:'OBIMET 500',        unit:'TAB.', mrppack:32.00,  orqty:100, generic:'METFORMIN HYDROCHLORIDE 500MG', dosage:'1-0-1 After Food', m:1,a:0,n:1,s:0, remark:'જમ્યા પછી', method:'TABLET', isTablet:true, displayIndoor:true, displayOpd:true, notUse:false, reOrder:true, maxQty:200, dower:'G02', stockDower:'S3/1', ptr:2.10 },

      /* Telmisartan 40mg Group */
      { id:'m37', name:'TELMA 40',          unit:'TAB.', mrppack:95.00,  orqty:80,  generic:'TELMISARTAN 40MG',              dosage:'1-0-0 Morning',          m:1,a:0,n:0,s:0, remark:'સવારે ભૂખ્યા પેટે (Morning Empty Stomach)', method:'TABLET', isTablet:true, displayIndoor:true, displayOpd:true, notUse:false, reOrder:true, maxQty:150, dower:'G03', stockDower:'S3/2', ptr:6.50 },
      { id:'m38', name:'TELMIKIND 40',      unit:'TAB.', mrppack:85.00,  orqty:80,  generic:'TELMISARTAN 40MG',              dosage:'1-0-0 Morning',          m:1,a:0,n:0,s:0, remark:'સવારે ભૂખ્યા પેટે (Morning Empty Stomach)', method:'TABLET', isTablet:true, displayIndoor:true, displayOpd:true, notUse:false, reOrder:true, maxQty:150, dower:'G03', stockDower:'S3/2', ptr:5.80 },
      { id:'m39', name:'TELPRES 40',        unit:'TAB.', mrppack:90.00,  orqty:80,  generic:'TELMISARTAN 40MG',              dosage:'1-0-0 Morning',          m:1,a:0,n:0,s:0, remark:'સવારે ભૂખ્યા પેટે (Morning Empty Stomach)', method:'TABLET', isTablet:true, displayIndoor:true, displayOpd:true, notUse:false, reOrder:true, maxQty:150, dower:'G03', stockDower:'S3/2', ptr:6.10 },

      /* Atorvastatin 10mg Group */
      { id:'m40', name:'STORVAS 10',        unit:'TAB.', mrppack:80.00,  orqty:70,  generic:'ATORVASTATIN 10MG',             dosage:'0-0-1 Night At Bedtime', m:0,a:0,n:1,s:0, remark:'રાત્રે સૂતી વખતે (At Bedtime)', method:'TABLET', isTablet:true, displayIndoor:true, displayOpd:true, notUse:false, reOrder:true, maxQty:100, dower:'G04', stockDower:'S3/4', ptr:5.50 },
      { id:'m41', name:'ATORVA 10',         unit:'TAB.', mrppack:78.00,  orqty:70,  generic:'ATORVASTATIN 10MG',             dosage:'0-0-1 Night At Bedtime', m:0,a:0,n:1,s:0, remark:'રાત્રે સૂતી વખતે (At Bedtime)', method:'TABLET', isTablet:true, displayIndoor:true, displayOpd:true, notUse:false, reOrder:true, maxQty:100, dower:'G04', stockDower:'S3/4', ptr:5.20 },
      { id:'m42', name:'LIPICARD 10',       unit:'TAB.', mrppack:75.00,  orqty:70,  generic:'ATORVASTATIN 10MG',             dosage:'0-0-1 Night At Bedtime', m:0,a:0,n:1,s:0, remark:'રાત્રે સૂતી વખતે (At Bedtime)', method:'TABLET', isTablet:true, displayIndoor:true, displayOpd:true, notUse:false, reOrder:true, maxQty:100, dower:'G04', stockDower:'S3/4', ptr:5.00 },

      /* Ondansetron 4mg Group */
      { id:'m43', name:'EMSET 4MG',         unit:'TAB.', mrppack:55.00,  orqty:50,  generic:'ONDANSETRON 4MG',               dosage:'1-0-1 Before Food',      m:1,a:0,n:1,s:0, remark:'જમ્યા પહેલા (Before Food)', method:'TABLET', isTablet:true, displayIndoor:true, displayOpd:true, notUse:false, reOrder:true, maxQty:100, dower:'G09', stockDower:'S4/1', ptr:3.80 },
      { id:'m44', name:'VOMIKIND 4',        unit:'TAB.', mrppack:48.00,  orqty:50,  generic:'ONDANSETRON 4MG',               dosage:'1-0-1 Before Food',      m:1,a:0,n:1,s:0, remark:'જમ્યા પહેલા (Before Food)', method:'TABLET', isTablet:true, displayIndoor:true, displayOpd:true, notUse:false, reOrder:true, maxQty:100, dower:'G09', stockDower:'S4/1', ptr:3.20 },
      { id:'m45', name:'ONDEM 4',           unit:'TAB.', mrppack:52.00,  orqty:50,  generic:'ONDANSETRON 4MG',               dosage:'1-0-1 Before Food',      m:1,a:0,n:1,s:0, remark:'જમ્યા પહેલા (Before Food)', method:'TABLET', isTablet:true, displayIndoor:true, displayOpd:true, notUse:false, reOrder:true, maxQty:100, dower:'G09', stockDower:'S4/1', ptr:3.50 },

      /* Rabeprazole 20mg Group */
      { id:'m46', name:'RABEKIND 20',       unit:'TAB.', mrppack:90.00,  orqty:60,  generic:'RABEPRAZOLE SODIUM 20MG',        dosage:'1-0-0 Empty Stomach',    m:1,a:0,n:0,s:0, remark:'સવારે ભૂખ્યા પેટે (Morning Empty Stomach)', method:'TABLET', isTablet:true, displayIndoor:true, displayOpd:true, notUse:false, reOrder:true, maxQty:100, dower:'G12', stockDower:'S2/5', ptr:6.00 },
      { id:'m47', name:'RABECID 20',        unit:'TAB.', mrppack:85.00,  orqty:60,  generic:'RABEPRAZOLE SODIUM 20MG',        dosage:'1-0-0 Empty Stomach',    m:1,a:0,n:0,s:0, remark:'સવારે ભૂખ્યા પેટે (Morning Empty Stomach)', method:'TABLET', isTablet:true, displayIndoor:true, displayOpd:true, notUse:false, reOrder:true, maxQty:100, dower:'G12', stockDower:'S2/5', ptr:5.60 },
      { id:'m48', name:'RAZO 20',           unit:'TAB.', mrppack:95.00,  orqty:60,  generic:'RABEPRAZOLE SODIUM 20MG',        dosage:'1-0-0 Empty Stomach',    m:1,a:0,n:0,s:0, remark:'સવારે ભૂખ્યા પેટે (Morning Empty Stomach)', method:'TABLET', isTablet:true, displayIndoor:true, displayOpd:true, notUse:false, reOrder:true, maxQty:100, dower:'G12', stockDower:'S2/5', ptr:6.30 },

      /* Ciprofloxacin 500mg Group */
      { id:'m49', name:'CIPLOX 500',        unit:'TAB.', mrppack:45.00,  orqty:50,  generic:'CIPROFLOXACIN 500MG',            dosage:'1-0-1 After Food',       m:1,a:0,n:1,s:0, remark:'જમ્યા પછી', method:'TABLET', isTablet:true, displayIndoor:true, displayOpd:true, notUse:false, reOrder:true, maxQty:100, dower:'G08', stockDower:'S1/8', ptr:3.10 },
      { id:'m50', name:'CIFOLEX 500',       unit:'TAB.', mrppack:42.00,  orqty:50,  generic:'CIPROFLOXACIN 500MG',            dosage:'1-0-1 After Food',       m:1,a:0,n:1,s:0, remark:'જમ્યા પછી', method:'TABLET', isTablet:true, displayIndoor:true, displayOpd:true, notUse:false, reOrder:true, maxQty:100, dower:'G08', stockDower:'S1/8', ptr:2.90 },

      /* Cefixime 200mg Group */
      { id:'m51', name:'TAXIM-O 200',       unit:'TAB.', mrppack:110.00, orqty:40,  generic:'CEFIXIME 200MG',                 dosage:'1-0-1 After Food',       m:1,a:0,n:1,s:0, remark:'જમ્યા પછી', method:'TABLET', isTablet:true, displayIndoor:true, displayOpd:true, notUse:false, reOrder:true, maxQty:80,  dower:'G08', stockDower:'S1/9', ptr:8.00 },
      { id:'m52', name:'CEFIX 200',         unit:'TAB.', mrppack:105.00, orqty:40,  generic:'CEFIXIME 200MG',                 dosage:'1-0-1 After Food',       m:1,a:0,n:1,s:0, remark:'જમ્યા પછી', method:'TABLET', isTablet:true, displayIndoor:true, displayOpd:true, notUse:false, reOrder:true, maxQty:80,  dower:'G08', stockDower:'S1/9', ptr:7.50 },
      { id:'m53', name:'MAHFEX 200',        unit:'TAB.', mrppack:115.00, orqty:40,  generic:'CEFIXIME 200MG',                 dosage:'1-0-1 After Food',       m:1,a:0,n:1,s:0, remark:'જમ્યા પછી', method:'TABLET', isTablet:true, displayIndoor:true, displayOpd:true, notUse:false, reOrder:true, maxQty:80,  dower:'G08', stockDower:'S1/9', ptr:8.20 },

      /* Deflazacort 6mg Group */
      { id:'m54', name:'DEFCORT 6',         unit:'TAB.', mrppack:95.00,  orqty:50,  generic:'DEFLAZACORT 6MG',                dosage:'1-0-0 After Food',       m:1,a:0,n:0,s:0, remark:'જમ્યા પછી', method:'TABLET', isTablet:true, displayIndoor:true, displayOpd:true, notUse:false, reOrder:true, maxQty:100, dower:'G15', stockDower:'S4/2', ptr:6.80 },
      { id:'m55', name:'DEFLAZA 6',         unit:'TAB.', mrppack:90.00,  orqty:50,  generic:'DEFLAZACORT 6MG',                dosage:'1-0-0 After Food',       m:1,a:0,n:0,s:0, remark:'જમ્યા પછી', method:'TABLET', isTablet:true, displayIndoor:true, displayOpd:true, notUse:false, reOrder:true, maxQty:100, dower:'G15', stockDower:'S4/2', ptr:6.20 },

      /* Classical Ayurvedic Brand Medicines */
      { id:'m56', name:'SUVARNA VASANT MALTI', unit:'TAB.', mrppack:1000.95, orqty:20, generic:'SUVARNA VASANT MALTI RASA', dosage:'1-0-0 Milk',             m:1,a:0,n:0,s:0, remark:'જમ્યા પછી દૂધમાં', method:'TABLET', isTablet:true, displayIndoor:true, displayOpd:true, notUse:false, reOrder:true, maxQty:30, dower:'G25', stockDower:'S6/1', ptr:66.73 },
      { id:'m57', name:'CHANDRAPRABHA GULIKA 250MG', unit:'TAB.', mrppack:123.00, orqty:50, generic:'CHANDRAPRABHA VATI',    dosage:'1-0-1 After Food',       m:1,a:0,n:1,s:0, remark:'જમ્યા પછી', method:'TABLET', isTablet:true, displayIndoor:true, displayOpd:true, notUse:false, reOrder:true, maxQty:100, dower:'G25', stockDower:'S6/2', ptr:4.10 },
      { id:'m58', name:'MAANASAMIHRA VATAKAM', unit:'TAB.', mrppack:225.00, orqty:30, generic:'MANASAMITRA VATAKAM',         dosage:'0-0-1 After Food',       m:0,a:0,n:1,s:0, remark:'જમ્યા પછી', method:'TABLET', isTablet:true, displayIndoor:true, displayOpd:true, notUse:false, reOrder:true, maxQty:60, dower:'G25', stockDower:'S6/3', ptr:15.00 },
      { id:'m59', name:'SAMVARDHANA GHRITA 100ML', unit:'SYP', mrppack:230.00, orqty:15, generic:'SAMVARDHANA GHRITAM',      dosage:'1-0-0 Morning',          m:1,a:0,n:0,s:0, remark:'સવારે ભૂખ્યા પેટે (Morning Empty Stomach)', method:'SYRUP', isTablet:false, displayIndoor:true, displayOpd:true, notUse:false, reOrder:true, maxQty:25, dower:'G25', stockDower:'S6/4', ptr:180.00 },
      { id:'m60', name:'GYNOTIP SYP 300ML', unit:'SYP', mrppack:220.00, orqty:20, generic:'GYNECOLOGICAL HERBAL FORMULA',    dosage:'5-0-5 After Food',       m:5,a:0,n:5,s:0, remark:'જમ્યા પહેલા 60 મિનિટ', method:'SYRUP', isTablet:false, displayIndoor:true, displayOpd:true, notUse:false, reOrder:true, maxQty:30, dower:'G25', stockDower:'S6/5', ptr:160.00 },

      /* General Clinic Essentials */
      { id:'m61', name:'MUCINAC 600MG',     unit:'SACHET', mrppack:180.00,orqty:20, generic:'N-ACETYLCYSTEINE 600MG',      dosage:'1-0-0 Morning',          m:1,a:0,n:0,s:0, remark:'હૂંફાળા પાણી સાથે (With Warm Water)', method:'SACHET', isTablet:false,displayIndoor:true, displayOpd:true, notUse:false, reOrder:true, maxQty:40, dower:'G22', stockDower:'S5/1', ptr:15.00 },
      { id:'m62', name:'OFLOX-OZ',          unit:'TAB.', mrppack:135.00, orqty:50,  generic:'OFLOXACIN 200MG + ORNIDAZOLE 500MG', dosage:'1-0-1 After Food', m:1,a:0,n:1,s:0, remark:'જમ્યા પછી', method:'TABLET', isTablet:true, displayIndoor:true, displayOpd:true, notUse:false, reOrder:true, maxQty:100, dower:'G08', stockDower:'S1/6', ptr:11.00 },
      { id:'m63', name:'METROGYL 400',      unit:'TAB.', mrppack:22.00,  orqty:60,  generic:'METRONIDAZOLE 400MG',         dosage:'1-0-1 After Food',       m:1,a:0,n:1,s:0, remark:'જમ્યા પછી', method:'TABLET', isTablet:true, displayIndoor:true, displayOpd:true, notUse:false, reOrder:true, maxQty:100, dower:'G08', stockDower:'S1/7', ptr:1.50 },
      { id:'m64', name:'VOLINI GEL',        unit:'OINTMENT',mrppack:125.00,orqty:20,generic:'DICLOFENAC DIETHYLAMINE GEL',  dosage:'As Needed / SOS',        m:0,a:0,n:0,s:0, remark:'જરૂર પડે ત્યારે (As Needed / SOS)', method:'TOPICAL', isTablet:false,displayIndoor:true, displayOpd:true, notUse:false, reOrder:true, maxQty:30, dower:'G20', stockDower:'S5/3', ptr:85.00 },
      { id:'m65', name:'MEFTAL-SPAS',       unit:'TAB.', mrppack:50.00,  orqty:50,  generic:'MEFENAMIC ACID 250MG + DICYCLOMINE 10MG', dosage:'As Needed / SOS', m:0,a:0,n:0,s:0, remark:'દુખાવા વખતે (When Having Pain)', method:'TABLET', isTablet:true, displayIndoor:true, displayOpd:true, notUse:false, reOrder:true, maxQty:100, dower:'G14', stockDower:'S2/4', ptr:3.80 },

      /* ── Fresh Newly Added Clinical Medicines ── */
      { id:'m66', name:'NEUROBION FORTE',   unit:'TAB.', mrppack:42.00,  orqty:100, generic:'VITAMIN B-COMPLEX WITH B12',  dosage:'1-0-0 After Food',       m:1,a:0,n:0,s:0, remark:'જમ્યા પછી સવારે (Morning After Food)', method:'TABLET', isTablet:true, displayIndoor:true, displayOpd:true, notUse:false, reOrder:true, maxQty:200, dower:'G16', stockDower:'S3/5', ptr:1.35 },
      { id:'m67', name:'SHELCAL 500',       unit:'TAB.', mrppack:130.00, orqty:80,  generic:'CALCIUM 500MG + VITAMIN D3 250IU', dosage:'0-0-1 After Food',  m:0,a:0,n:1,s:0, remark:'જમ્યા પછી રાત્રે (Night After Food)', method:'TABLET', isTablet:true, displayIndoor:true, displayOpd:true, notUse:false, reOrder:true, maxQty:150, dower:'G16', stockDower:'S3/6', ptr:8.50 },
      { id:'m68', name:'FORACORT 200 INHALER', unit:'INHALER', mrppack:380.00, orqty:15, generic:'BUDESONIDE 200MCG + FORMOTEROL 6MCG', dosage:'2-0-2 Inhalation', m:2,a:0,n:2,s:0, remark:'૨ પફ સવારે અને રાત્રે (Rinse mouth after use)', method:'INHALER', isTablet:false, displayIndoor:true, displayOpd:true, notUse:false, reOrder:true, maxQty:25, dower:'G18', stockDower:'S4/5', ptr:310.00 },
      { id:'m69', name:'GLIMESTAR-M2',     unit:'TAB.', mrppack:115.00, orqty:60,  generic:'GLIMEPIRIDE 2MG + METFORMIN 500MG SR', dosage:'1-0-1 Before Food', m:1,a:0,n:1,s:0, remark:'જમ્યા પહેલા (Before Meals)', method:'TABLET', isTablet:true, displayIndoor:true, displayOpd:true, notUse:false, reOrder:true, maxQty:120, dower:'G02', stockDower:'S3/3', ptr:7.50 },
      { id:'m70', name:'TELMA-H',          unit:'TAB.', mrppack:175.00, orqty:50,  generic:'TELMISARTAN 40MG + HYDROCHLOROTHIAZIDE 12.5MG', dosage:'1-0-0 Morning', m:1,a:0,n:0,s:0, remark:'સવારે ભૂખ્યા પેટે (Morning Empty Stomach)', method:'TABLET', isTablet:true, displayIndoor:true, displayOpd:true, notUse:false, reOrder:true, maxQty:100, dower:'G03', stockDower:'S3/5', ptr:11.20 },
      { id:'m71', name:'GELUSIL MPS LIQUID', unit:'SYP', mrppack:145.00, orqty:25, generic:'ALUMINIUM HYDROXIDE + MAGNESIUM + SIMETHICONE', dosage:'10ml SOS Post Meals', m:0,a:0,n:0,s:0, remark:'જમ્યા પછી એસિડિટી વખતે ૨ ચમચી', method:'SYRUP', isTablet:false, displayIndoor:true, displayOpd:true, notUse:false, reOrder:true, maxQty:40, dower:'G12', stockDower:'S5/4', ptr:105.00 },
      { id:'m72', name:'SUPRADYN DAILY',   unit:'TAB.', mrppack:65.00,  orqty:60,  generic:'MULTIVITAMIN + MINERALS + AMINO ACIDS', dosage:'1-0-0 After Lunch', m:1,a:0,n:0,s:0, remark:'બપોરે જમ્યા પછી (Post Lunch)', method:'TABLET', isTablet:true, displayIndoor:true, displayOpd:true, notUse:false, reOrder:true, maxQty:100, dower:'G16', stockDower:'S3/7', ptr:4.20 },
      { id:'m73', name:'ELECTRAL ORS SACHET', unit:'SACHET', mrppack:22.00, orqty:50, generic:'ORAL REHYDRATION SALTS WHO FORMULA', dosage:'As Advised with Water', m:1,a:1,n:1,s:0, remark:'૧ લિટર ઉકાળેલા ઠંડા પાણીમાં ઓગાળીને પીવું', method:'SACHET', isTablet:false, displayIndoor:true, displayOpd:true, notUse:false, reOrder:true, maxQty:100, dower:'G22', stockDower:'S5/2', ptr:17.50 },
      { id:'m74', name:'ENTEROGERMINA RESPOULES', unit:'LIQUID', mrppack:550.00, orqty:20, generic:'BACILLUS CLAUSII SPORES 2 BILLION', dosage:'1-0-1 Oral Suspension', m:1,a:0,n:1,s:0, remark:'મોંઢેથી પીવું (Direct Oral)', method:'LIQUID', isTablet:false, displayIndoor:true, displayOpd:true, notUse:false, reOrder:true, maxQty:30, dower:'G22', stockDower:'S5/5', ptr:440.00 },
      { id:'m75', name:'BETADINE 5% OINTMENT', unit:'OINTMENT', mrppack:110.00, orqty:20, generic:'POVIDONE-IODINE 5% W/W', dosage:'Topical Application', m:0,a:0,n:0,s:0, remark:'ઘા સાફ કર્યા પછી લગાવવું (Apply on wound)', method:'TOPICAL', isTablet:false, displayIndoor:true, displayOpd:true, notUse:false, reOrder:true, maxQty:30, dower:'G20', stockDower:'S5/6', ptr:82.00 },
      { id:'m76', name:'CIPLOX EYE/EAR DROPS', unit:'DROPS', mrppack:18.00, orqty:40, generic:'CIPROFLOXACIN 0.3% W/V', dosage:'2 Drops Thrice Daily', m:2,a:2,n:2,s:0, remark:'આંખ/કાનમાં ૨-૨ ટીપાં દિવસમાં ૩ વાર', method:'DROPS', isTablet:false, displayIndoor:true, displayOpd:true, notUse:false, reOrder:true, maxQty:60, dower:'G09', stockDower:'S4/6', ptr:12.50 },
      { id:'m77', name:'PAN-L CAPSULE',    unit:'CAP.', mrppack:195.00, orqty:30,  generic:'PANTOPRAZOLE 40MG + LEVOSULPIRIDE 75MG SR', dosage:'1-0-0 Empty Stomach', m:1,a:0,n:0,s:0, remark:'સવારે ભૂખ્યા પેટે (Morning Empty Stomach)', method:'CAPSULE', isTablet:false, displayIndoor:true, displayOpd:true, notUse:false, reOrder:true, maxQty:50, dower:'G12', stockDower:'S2/6', ptr:148.00 }
    ];

    const charges = [
      { id:'c1', name:'NEW OPD CONSULTATION',      category:'Consultation', amount:100, notes:'Standard new OPD consultation fee' },
      { id:'c2', name:'GP-2 FOLLOW UP',            category:'Follow-Up',    amount:50,  notes:'Follow-up visit within 14 days' },
      { id:'c3', name:'GENERAL CHECKUP',           category:'Consultation', amount:100, notes:'General routine checkup' },
      { id:'c4', name:'ECG / CARDIAC SCREENING',   category:'Procedure',    amount:250, notes:'12-lead ECG recording & report' },
      { id:'c5', name:'MINOR SURGICAL DRESSING',   category:'Procedure',    amount:150, notes:'Wound cleaning & sterile dressing' },
      { id:'c6', name:'VACCINATION FEE',           category:'Vaccines',     amount:200, notes:'Vaccine administration charge' },
      { id:'c7', name:'PUNCHKARMA / YOG THERAPY',  category:'Ayurvedic',    amount:350, notes:'Specialist Panchakarma therapy session' },
      { id:'c8', name:'LAB / INVESTIGATION PANEL', category:'Diagnostics',  amount:180, notes:'In-house lab blood panel screening' }
    ];

    const labTests = [
      { id:'lt1',  name:'Blood Sugar (Fasting)',         category:'Pathology', labName:'Main Parth Pathology', labAddress:'Near ST Stand, Bapunagar', labPhone:'9825099887', rate:150 },
      { id:'lt2',  name:'CBC (Complete Blood Count)',    category:'Pathology', labName:'Main Parth Pathology', labAddress:'Near ST Stand, Bapunagar', labPhone:'9825099887', rate:250 },
      { id:'lt3',  name:'Lipid Profile',                 category:'Pathology', labName:'City Clinical Lab',    labAddress:'Main Road, City Center',   labPhone:'7575862233', rate:450 },
      { id:'lt4',  name:'Liver Function Test (LFT)',     category:'Pathology', labName:'Main Parth Pathology', labAddress:'Near ST Stand, Bapunagar', labPhone:'9825099887', rate:400 },
      { id:'lt5',  name:'Renal Function Test (RFT)',     category:'Pathology', labName:'City Clinical Lab',    labAddress:'Main Road, City Center',   labPhone:'7575862233', rate:380 },
      { id:'lt6',  name:'Thyroid Profile (T3, T4, TSH)', category:'Pathology', labName:'Main Parth Pathology', labAddress:'Near ST Stand, Bapunagar', labPhone:'9825099887', rate:500 },
      { id:'lt7',  name:'HbA1c',                         category:'Pathology', labName:'City Clinical Lab',    labAddress:'Main Road, City Center',   labPhone:'7575862233', rate:350 },
      { id:'lt8',  name:'X-Ray Chest PA View',           category:'Radiology', labName:'City Diagnostic Center', labAddress:'Hospital Road',          labPhone:'9998887776', rate:300 },
      { id:'lt9',  name:'USG Abdomen & Pelvis',          category:'Radiology', labName:'City Diagnostic Center', labAddress:'Hospital Road',          labPhone:'9998887776', rate:750 },
      { id:'lt10', name:'ECG Routine',                   category:'Radiology', labName:'Clinic In-House',      labAddress:'',                         labPhone:'',           rate:200 }
    ];

    const extraAdvices = [
      {
        id:'ea1',
        diagnosisName:'Fever & Cold Protocol',
        category:'General',
        adviceNotes:'1. Drink 3-4 liters of warm water daily.\n2. Avoid cold drinks, ice cream, and deep-fried food.\n3. Take complete bed rest for 3 days.\n4. (દરરોજ ૩-૪ લીટર ગરમ પાણી પીવું અને સંપૂર્ણ આરામ કરવો.)'
      },
      {
        id:'ea2',
        diagnosisName:'Hypertension (High Blood Pressure)',
        category:'Chronic',
        adviceNotes:'1. Low salt diet (Restrict sodium intake to <2g/day).\n2. Avoid stressful activities & monitor BP weekly.\n3. 30 mins morning walking.\n4. (મીઠું ઓછું ખાવું અને રોજ સવારે ચાલવું.)'
      },
      {
        id:'ea3',
        diagnosisName:'Diabetes Mellitus (Type 2)',
        category:'Chronic',
        adviceNotes:'1. Strict sugar-free diet.\n2. Avoid sweets, potatoes, white rice, and mangoes.\n3. Regular blood sugar monitoring (Fasting & PP).\n4. (ખાંડ, ગળપણ અને બટાકા ન ખાવા.)'
      },
      {
        id:'ea4',
        diagnosisName:'Abdominal Pain & Dyspepsia',
        category:'General',
        adviceNotes:'1. Avoid spicy, oily, and outside junk food.\n2. Eat small frequent meals.\n3. Drink warm water after meals.\n4. (તીખું અને તળેલું ખોરાક ન લેવું.)'
      },
      {
        id:'ea5',
        diagnosisName:'Migraine & Headache Routine',
        category:'General',
        adviceNotes:'1. Avoid loud noises, bright screens, and irregular sleep.\n2. Stay well hydrated with plenty of water.\n3. Apply cold compress on forehead during headache episodes.'
      },
      {
        id:'ea6',
        diagnosisName:'Thyroid Profile Follow-Up',
        category:'Endocrine',
        adviceNotes:'1. Take Thyroid medication early morning on an empty stomach with plain water.\n2. Do not eat or drink anything for 45 minutes after taking medicine.\n3. Repeat TSH test after 6 weeks.'
      }
    ];

    const staff = [
      { id:'EMP-00002', empId:'EMP-00002', name:'Karan Choudhary', role:'Clinic Admin', designation:'Clinic Administrator', phone:'+919424951124', email:'kc901789+arogya@gmail.com', joinedOn:'2026-08-20', status:'Active', hasLogin:true, modules:['appointments', 'opd', 'patients', 'pharmacy', 'staff', 'billing', 'records', 'labmaster', 'advicemaster', 'settings'], createdAt:new Date().toISOString() },
      { id:'EMP-00054', empId:'EMP-00054', name:'Test Receptionist', role:'Receptionist', designation:'Front desk', phone:'', email:'', joinedOn:'2026-08-20', status:'Active', hasLogin:false, modules:['appointments', 'opd', 'patients'], createdAt:new Date().toISOString() },
      { id:'EMP-00001', empId:'EMP-00001', name:'DR. YASH VAGHANI', role:'Doctor', designation:'Chief Physician', phone:'+91 98250 99887', email:'dr.yash@harishreeclinic.com', joinedOn:'2026-01-15', status:'Active', hasLogin:true, modules:['appointments', 'opd', 'patients', 'pharmacy', 'staff', 'billing', 'records', 'labmaster', 'advicemaster', 'settings'], createdAt:new Date().toISOString() }
    ];

    const settings = {
      clinicName:  'HARISHREE CLINIC',
      doctorName:  'DR. YASH VAGHANI',
      specialty:   'General Medicine & OPD Clinic',
      phone:       '+91 98250 99887',
      email:       'info@harishreeclinic.com',
      address:     'Harishree Hospital, Medical Center Complex',
    };

    this._set('patients',           patients);
    this._set('appointments',       appointments);
    this._set('visits',             visits);
    this._set('prescriptions',      prescriptions);
    this._set('invoices',           invoices);
    this._set('opd_entries',        opdEntries);
    this._set('clinic_lab_reports', labReports);
    this._set('medicines',          medicines);
    this._set('charges',            charges);
    this._set('lab_tests',          labTests);
    this._set('extra_advices',      extraAdvices);
    this._set('staff',              staff);
    this._setObj('settings',        settings);
  }
};
