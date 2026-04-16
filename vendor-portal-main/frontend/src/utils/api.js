// ============================================================
// api.js — Thin HTTP client for the FastAPI backend.
//
// The frontend currently uses localStorage (storage.js) for
// persistence during development. This file provides drop-in
// replacements for the order-related flows that now MUST go
// through the backend (new RFQ → Quote → PO → Order workflow).
//
// Usage:
//   import { api } from './api';
//   const rfqs = await api.rfq.list();
//   const order = await api.orders.create({ quotation_id, po_document_url, ... });
//
// The BASE_URL is read from the REACT_APP_API_URL env var (see .env).
// ============================================================

const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api/v1';

// ── internal fetch helper ────────────────────────────────────────────────────
const request = async (method, path, body = null) => {
  const token = localStorage.getItem('vh_access_token');
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const json = await res.json();
  if (!res.ok) {
    const msg = json?.detail || json?.message || `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return json?.data ?? json;
};

const get  = (path)        => request('GET',    path);
const post = (path, body)  => request('POST',   path, body);
const patch = (path, body) => request('PATCH',  path, body);
const put  = (path, body)  => request('PUT',    path, body);


// ============================================================
//  Authentication
// ============================================================
export const authApi = {
  login: (email, password, role) =>
    post('/auth/login', { email, password, role }),
  logout: () =>
    post('/auth/logout'),
};


// ============================================================
//  RFQ  (Manufacturer creates → Vendor receives)
// ============================================================
export const rfqApi = {
  /**
   * Manufacturer: create a new RFQ and broadcast to vendor orgs.
   * POST /vendor/rfq
   */
  create: ({ title, description, deadline, broadcast_to_org_ids = [], ...rest }) =>
    post('/vendor/rfq', { title, description, deadline, broadcast_to_org_ids, ...rest }),

  /**
   * List RFQs for the current org (manufacturer = own RFQs).
   * GET /vendor/rfq
   */
  list: () =>
    get('/vendor/rfq'),

  /**
   * List quotes submitted against an RFQ.
   * GET /vendor/rfq/:rfq_id/quotes
   */
  listQuotes: (rfqId) =>
    get(`/vendor/rfq/${rfqId}/quotes`),

  /**
   * Manufacturer selects one quote.
   * Locks the chosen quote, rejects all others, closes the RFQ.
   * POST /vendor/rfq/:rfq_id/select-quote/:quote_id
   *
   * Returns { quote_id, rfq_id, message }
   * After this call, use orders.create({ quotation_id: quote_id, ... })
   */
  selectQuote: (rfqId, quoteId) =>
    post(`/vendor/rfq/${rfqId}/select-quote/${quoteId}`),
};


// ============================================================
//  Quotes  (Vendor submits a quote for an RFQ)
// ============================================================
export const quoteApi = {
  /**
   * Vendor: submit a price quote for an RFQ.
   * POST /vendor/rfq/quote
   *
   * Body: { rfq_id, price, lead_time_days, compliance_notes? }
   */
  submit: ({ rfq_id, price, lead_time_days, compliance_notes }) =>
    post('/vendor/rfq/quote', { rfq_id, price, lead_time_days, compliance_notes }),
};


// ============================================================
//  Orders  (Manufacturer creates AFTER selecting a quote)
// ============================================================
export const orderApi = {
  /**
   * Manufacturer: create an order from a selected quotation.
   * POST /orders
   *
   * REQUIRED fields (enforced by backend):
   *   quotation_id      — ID returned by rfqApi.selectQuote()
   *   po_document_url   — URL of uploaded PO PDF
   *   delivery_address  — full delivery address string
   *   manufacturer_org_id
   *
   * Order is created with status = vendor_review automatically.
   */
  create: ({
    quotation_id,
    po_document_url,
    manufacturer_org_id,
    delivery_address,
    required_by_date,
    special_instructions,
    notes,
    priority = 'normal',
    currency = 'INR',
    items = [],
  }) =>
    post('/orders', {
      quotation_id,
      po_document_url,
      manufacturer_org_id,
      delivery_address,
      required_by_date,
      special_instructions,
      notes,
      priority,
      currency,
      items,
    }),

  /**
   * List orders for the current org.
   * GET /orders?as_customer=true|false&status=...
   */
  list: ({ as_customer = true, status } = {}) => {
    const params = new URLSearchParams({ as_customer });
    if (status) params.set('status', status);
    return get(`/orders?${params}`);
  },

  /**
   * Get a single order by ID.
   * GET /orders/:id
   */
  get: (orderId) =>
    get(`/orders/${orderId}`),

  /**
   * Vendor: accept or reject a PO.
   * POST /orders/:id/vendor-response
   *
   * Body: { action: 'accept' | 'reject', reason?: string }
   * reason is REQUIRED when action === 'reject'
   */
  vendorRespond: (orderId, { action, reason }) =>
    post(`/orders/${orderId}/vendor-response`, { action, reason }),

  /**
   * Update order status (generic — for processing, shipped, etc.)
   * PATCH /orders/:id/status
   */
  updateStatus: (orderId, status, note) =>
    patch(`/orders/${orderId}/status`, { status, note }),

  /**
   * Get status history for an order.
   * GET /orders/:id/history
   */
  history: (orderId) =>
    get(`/orders/${orderId}/history`),
};


// ============================================================
//  File Upload helper
//  Uploads a PO PDF to the backend and returns the stored URL.
//  (Backend must expose POST /uploads/po — or use a cloud URL directly)
// ============================================================
export const uploadPO = async (file) => {
  const token = localStorage.getItem('vh_access_token');
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(`${BASE_URL}/uploads/po`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });

  const json = await res.json();
  if (!res.ok) throw new Error(json?.detail || 'Upload failed');
  return json?.data?.url || json?.url;
};


// ============================================================
//  Default export (all namespaced)
// ============================================================
export const api = {
  auth:  authApi,
  rfq:   rfqApi,
  quote: quoteApi,
  orders: orderApi,
  uploadPO,
};

export default api;
