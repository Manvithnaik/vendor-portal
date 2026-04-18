// ============================================================
// localStorage utility — all CRUD for users, apps, products, orders, RFQs, quotations
// ============================================================

const KEYS = {
  USERS: 'vh_users',
  APPLICATIONS: 'vh_applications',
  PRODUCTS: 'vh_products',
  ORDERS: 'vh_orders',
  CURRENT_USER: 'vh_current_user',
  RFQS: 'vh_rfqs',
  QUOTATIONS: 'vh_quotations',
  DISPUTES: 'vh_disputes',
};

// ---- generic helpers ----
const getStore = (key) => {
  try { return JSON.parse(localStorage.getItem(key)) || []; }
  catch { return []; }
};
const setStore = (key, data) => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
    return true;
  } catch (error) {
    const isQuotaError = error instanceof DOMException && (
      error.name === 'QuotaExceededError' ||
      error.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
      error.code === 22
    );
    if (isQuotaError) {
      console.error(`localStorage quota exceeded for key "${key}"`, error);
      return false;
    }
    throw error;
  }
};

// ---- seed default admin on first load ----
export const seedData = () => {
  const users = getStore(KEYS.USERS);
  if (!users.find(u => u.role === 'admin')) {
    users.push({
      id: 'admin-1',
      email: 'admin@vendorhub.com',
      password: 'admin123',
      role: 'admin',
      name: 'Super Admin',
      createdAt: new Date().toISOString(),
    });
    setStore(KEYS.USERS, users);
  }
};

// ---- Auth ----
export const login = (email, password, role) => {
  const users = getStore(KEYS.USERS);
  const user = users.find(u => u.email === email && u.password === password && u.role === role);
  if (!user) return { success: false, message: 'Invalid credentials or role mismatch.' };

  // For vendor/manufacturer check application status
  if (role === 'vendor' || role === 'manufacturer') {
    const apps = getStore(KEYS.APPLICATIONS);
    const app = apps.find(a => a.email === email && a.role === role);
    if (!app) return { success: false, message: 'No application found. Please register first.' };
    if (app.status !== 'approved') return { success: false, message: `Your application is currently "${app.status}". Only approved users can log in.` };
  }

  localStorage.setItem(KEYS.CURRENT_USER, JSON.stringify(user));
  return { success: true, user };
};

export const logout = () => localStorage.removeItem(KEYS.CURRENT_USER);
export const getCurrentUser = () => {
  try { return JSON.parse(localStorage.getItem(KEYS.CURRENT_USER)); }
  catch { return null; }
};

// ---- Applications (vendor / manufacturer registrations) ----
export const submitApplication = (data) => {
  const apps = getStore(KEYS.APPLICATIONS);
  // Check duplicate email
  if (apps.find(a => a.email === data.email && a.role === data.role)) {
    return { success: false, message: 'An application with this email already exists.' };
  }
  const app = {
    ...data,
    id: `app-${Date.now()}`,
    status: 'pending',        // pending | approved | rejected | resubmit
    submittedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  apps.push(app);
  setStore(KEYS.APPLICATIONS, apps);

  // Also create a user record (login will still check status)
  const users = getStore(KEYS.USERS);
  users.push({
    id: `user-${Date.now()}`,
    email: data.email,
    password: data.password,
    role: data.role,
    name: data.orgName || data.contactName,
    createdAt: new Date().toISOString(),
  });
  setStore(KEYS.USERS, users);

  return { success: true, app };
};

export const getApplications = (role) => {
  const apps = getStore(KEYS.APPLICATIONS);
  return role ? apps.filter(a => a.role === role) : apps;
};

export const getApplicationByEmail = (email, role) => {
  return getStore(KEYS.APPLICATIONS).find(a => a.email === email && a.role === role);
};

export const updateApplicationStatus = (appId, status) => {
  const apps = getStore(KEYS.APPLICATIONS);
  const idx = apps.findIndex(a => a.id === appId);
  if (idx === -1) return false;
  apps[idx].status = status;
  apps[idx].updatedAt = new Date().toISOString();
  setStore(KEYS.APPLICATIONS, apps);
  return true;
};

export const resubmitApplication = (appId, updatedData) => {
  const apps = getStore(KEYS.APPLICATIONS);
  const idx = apps.findIndex(a => a.id === appId);
  if (idx === -1) return false;
  apps[idx] = { ...apps[idx], ...updatedData, status: 'pending', updatedAt: new Date().toISOString() };
  setStore(KEYS.APPLICATIONS, apps);
  return true;
};

// ---- Admin Management ----
export const addAdmin = (email, password) => {
  const users = getStore(KEYS.USERS);
  if (users.find(u => u.email === email && u.role === 'admin')) {
    return { success: false, message: 'Admin with this email already exists.' };
  }
  const admin = {
    id: `admin-${Date.now()}`,
    email,
    password,
    role: 'admin',
    name: email.split('@')[0],
    createdAt: new Date().toISOString(),
  };
  users.push(admin);
  setStore(KEYS.USERS, users);
  return { success: true, admin };
};

export const removeAdmin = (adminId) => {
  let users = getStore(KEYS.USERS);
  users = users.filter(u => !(u.id === adminId && u.role === 'admin'));
  setStore(KEYS.USERS, users);
  return true;
};

export const getAdmins = () => getStore(KEYS.USERS).filter(u => u.role === 'admin');

// ---- Products (Vendor) ----
export const addProduct = (product) => {
  const products = getStore(KEYS.PRODUCTS);
  const p = { ...product, id: `prod-${Date.now()}`, createdAt: new Date().toISOString() };
  products.push(p);
  setStore(KEYS.PRODUCTS, products);
  return p;
};

export const getProducts = (vendorEmail) => {
  const products = getStore(KEYS.PRODUCTS);
  return vendorEmail ? products.filter(p => p.vendorEmail === vendorEmail) : products;
};

export const updateProduct = (productId, data) => {
  const products = getStore(KEYS.PRODUCTS);
  const idx = products.findIndex(p => p.id === productId);
  if (idx === -1) return false;
  products[idx] = { ...products[idx], ...data };
  setStore(KEYS.PRODUCTS, products);
  return true;
};

export const deleteProduct = (productId) => {
  let products = getStore(KEYS.PRODUCTS);
  products = products.filter(p => p.id !== productId);
  setStore(KEYS.PRODUCTS, products);
  return true;
};

// ---- Orders (Manufacturer → Vendor) ----
export const createOrder = (order) => {
  const orders = getStore(KEYS.ORDERS);
  const o = {
    ...order,
    id: `ord-${Date.now()}`,
    status: 'pending',   // pending | accepted | rejected | shipped | delivered
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  orders.push(o);
  const saved = setStore(KEYS.ORDERS, orders);
  if (!saved) {
    return {
      success: false,
      message: 'Unable to save order: local storage quota exceeded. Clear browser storage or delete older orders and try again.',
    };
  }
  return { success: true, order: o };
};

export const getOrders = (filters = {}) => {
  let orders = getStore(KEYS.ORDERS);
  if (filters.vendorEmail) orders = orders.filter(o => o.vendorEmail === filters.vendorEmail);
  if (filters.manufacturerEmail) orders = orders.filter(o => o.manufacturerEmail === filters.manufacturerEmail);
  return orders;
};

export const updateOrderStatus = (orderId, status, rejectionReason) => {
  const orders = getStore(KEYS.ORDERS);
  const idx = orders.findIndex(o => o.id === orderId);
  if (idx === -1) return false;
  orders[idx].status = status;
  orders[idx].updatedAt = new Date().toISOString();
  if (rejectionReason) orders[idx].rejectionReason = rejectionReason;
  setStore(KEYS.ORDERS, orders);
  return true;
};

// ---- RFQs (Request for Quotation: Manufacturer → Vendor) ----
export const createRFQ = (data) => {
  const rfqs = getStore(KEYS.RFQS);
  const rfq = {
    ...data,
    id: `rfq-${Date.now()}`,
    status: 'open',   // open | submitted | closed
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  rfqs.push(rfq);
  setStore(KEYS.RFQS, rfqs);
  return rfq;
};

export const getRFQs = (filters = {}) => {
  let rfqs = getStore(KEYS.RFQS);
  if (filters.vendorEmail) rfqs = rfqs.filter(r => r.vendorEmail === filters.vendorEmail);
  if (filters.manufacturerEmail) rfqs = rfqs.filter(r => r.manufacturerEmail === filters.manufacturerEmail);
  if (filters.productId) rfqs = rfqs.filter(r => r.productId === filters.productId);
  return rfqs;
};

export const updateRFQStatus = (rfqId, status) => {
  const rfqs = getStore(KEYS.RFQS);
  const idx = rfqs.findIndex(r => r.id === rfqId);
  if (idx === -1) return false;
  rfqs[idx].status = status;
  rfqs[idx].updatedAt = new Date().toISOString();
  setStore(KEYS.RFQS, rfqs);
  return true;
};

// ---- Quotations (Vendor uploads PDF quotation against an RFQ) ----
export const uploadQuotation = (data) => {
  const quotations = getStore(KEYS.QUOTATIONS);
  const q = {
    ...data,
    id: `quot-${Date.now()}`,
    uploadedAt: new Date().toISOString(),
  };
  quotations.push(q);
  setStore(KEYS.QUOTATIONS, quotations);

  // Mark RFQ as submitted
  if (data.rfqId) updateRFQStatus(data.rfqId, 'submitted');

  return q;
};

export const getQuotations = (filters = {}) => {
  let quotations = getStore(KEYS.QUOTATIONS);
  if (filters.rfqId) quotations = quotations.filter(q => q.rfqId === filters.rfqId);
  if (filters.productId) quotations = quotations.filter(q => q.productId === filters.productId);
  if (filters.vendorEmail) quotations = quotations.filter(q => q.vendorEmail === filters.vendorEmail);
  if (filters.manufacturerEmail) quotations = quotations.filter(q => q.manufacturerEmail === filters.manufacturerEmail);
  return quotations;
};

// ---- RFQ Read Tracking (Vendor) ----
const RFQ_SEEN_KEY = 'vh_rfq_seen';

export const getSeenRFQIds = (vendorEmail) => {
  try {
    const data = JSON.parse(localStorage.getItem(RFQ_SEEN_KEY)) || {};
    return data[vendorEmail] || [];
  } catch { return []; }
};

export const markRFQsAsSeen = (vendorEmail, rfqIds) => {
  try {
    const data = JSON.parse(localStorage.getItem(RFQ_SEEN_KEY)) || {};
    const existing = data[vendorEmail] || [];
    data[vendorEmail] = [...new Set([...existing, ...rfqIds])];
    localStorage.setItem(RFQ_SEEN_KEY, JSON.stringify(data));
  } catch { }
};

export const hasUnseenRFQs = (vendorEmail) => {
  const allRFQs = getRFQs({ vendorEmail });
  const seen = getSeenRFQIds(vendorEmail);
  return allRFQs.some(r => !seen.includes(r.id));
};
// statuses: requested | acknowledged | investigating | escalated | resolved
// resolution: accepted | rejected | replacement_initiated | resolved

const generateRMA = () => {
  const ts = Date.now().toString().slice(-6);
  return `RMA-${ts}`;
};

export const createDispute = (data) => {
  const disputes = getStore(KEYS.DISPUTES);
  const now = new Date().toISOString();

  // Build initial evidence from proof files if provided
  const initialEvidence = (data.proofFiles || []).map((pf, i) => ({
    id: `ev-${Date.now()}-${i}`,
    uploadedBy: data.manufacturerName || data.manufacturerEmail,
    role: 'manufacturer',
    fileName: pf.fileName,
    fileData: pf.fileData,
    fileType: pf.fileType,
    uploadedAt: now,
  }));

  const dispute = {
    ...data,
    id: `disp-${Date.now()}`,
    rmaNumber: generateRMA(),
    status: 'requested',
    resolution: null,
    evidence: initialEvidence,
    timeline: [
      {
        id: `tl-${Date.now()}`,
        action: 'Return request created',
        actor: data.manufacturerName || data.manufacturerEmail,
        role: 'manufacturer',
        note: data.description || '',
        timestamp: now,
      },
      ...(initialEvidence.length > 0 ? [{
        id: `tl-${Date.now()}-ev`,
        action: `${initialEvidence.length} proof file(s) uploaded`,
        actor: data.manufacturerName || data.manufacturerEmail,
        role: 'manufacturer',
        note: '',
        timestamp: now,
      }] : []),
    ],
    vendorComment: '',
    createdAt: now,
    updatedAt: now,
  };
  // Remove proofFiles from stored dispute to avoid duplication
  delete dispute.proofFiles;
  disputes.push(dispute);
  setStore(KEYS.DISPUTES, disputes);
  return dispute;
};

export const getDisputes = (filters = {}) => {
  let disputes = getStore(KEYS.DISPUTES);
  if (filters.manufacturerEmail) disputes = disputes.filter(d => d.manufacturerEmail === filters.manufacturerEmail);
  if (filters.vendorEmail) disputes = disputes.filter(d => d.vendorEmail === filters.vendorEmail);
  if (filters.orderId) disputes = disputes.filter(d => d.orderId === filters.orderId);
  return disputes;
};

export const getDisputeById = (id) => getStore(KEYS.DISPUTES).find(d => d.id === id);

const _updateDispute = (id, updater) => {
  const disputes = getStore(KEYS.DISPUTES);
  const idx = disputes.findIndex(d => d.id === id);
  if (idx === -1) return null;
  disputes[idx] = { ...updater(disputes[idx]), updatedAt: new Date().toISOString() };
  setStore(KEYS.DISPUTES, disputes);
  return disputes[idx];
};

// Add a timeline event to an existing dispute
export const addDisputeTimelineEvent = (disputeId, { action, actor, role, note = '' }) => {
  return _updateDispute(disputeId, (d) => ({
    ...d,
    timeline: [
      ...d.timeline,
      { id: `tl-${Date.now()}`, action, actor, role, note, timestamp: new Date().toISOString() },
    ],
  }));
};

// Upload evidence (base64 file) to a dispute
export const addDisputeEvidence = (disputeId, { uploadedBy, role, fileName, fileData, fileType }) => {
  const ev = { id: `ev-${Date.now()}`, uploadedBy, role, fileName, fileData, fileType, uploadedAt: new Date().toISOString() };
  const updated = _updateDispute(disputeId, (d) => ({
    ...d,
    evidence: [...d.evidence, ev],
  }));
  if (updated) {
    addDisputeTimelineEvent(disputeId, {
      action: `Evidence uploaded: ${fileName}`,
      actor: uploadedBy,
      role,
    });
  }
  return ev;
};

// Vendor: respond (accept / reject) to a dispute
export const respondToDispute = (disputeId, { resolution, vendorComment, vendorName }) => {
  // status becomes the resolution directly: 'accepted' or 'rejected'
  const newStatus = resolution === 'accepted' ? 'accepted' : 'rejected';
  return _updateDispute(disputeId, (d) => {
    const tl = [
      ...d.timeline,
      {
        id: `tl-${Date.now()}`,
        action: resolution === 'accepted' ? 'Vendor accepted return' : 'Vendor rejected return',
        actor: vendorName,
        role: 'vendor',
        note: vendorComment || '',
        timestamp: new Date().toISOString(),
      },
    ];
    return { ...d, status: newStatus, resolution, vendorComment, timeline: tl };
  });
};

// Vendor: update investigation status
export const updateDisputeStatus = (disputeId, newStatus, { actor, role, note = '' }) => {
  return _updateDispute(disputeId, (d) => {
    const tl = [
      ...d.timeline,
      {
        id: `tl-${Date.now()}`,
        action: `Status updated to "${newStatus}"`,
        actor,
        role,
        note,
        timestamp: new Date().toISOString(),
      },
    ];
    return { ...d, status: newStatus, timeline: tl };
  });
};



