import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { productService } from '../../services/productService';
import { rfqService } from '../../services/rfqService';
import Modal from '../../components/common/Modal';
import Toast from '../../components/common/Toast';
import { Search, Package, FileText, CheckCircle, Clock, ShoppingCart, Eye } from 'lucide-react';

const BrowseProducts = () => {
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState(null);
  const [rfqProduct, setRfqProduct] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [notes, setNotes] = useState('');
  const [minRate, setMinRate] = useState('');
  const [myRFQs, setMyRFQs] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  // Per-product quantity map: { [productId]: number }
  const [quantities, setQuantities] = useState({});

  const load = async () => {
    try {
      const [prodRes, rfqRes] = await Promise.all([
        productService.listProducts(),
        rfqService.listRFQs()
      ]);
      setProducts(prodRes?.data || []);
      setMyRFQs(rfqRes?.data || []);
    } catch (e) {
      setToast({ message: e.message || 'Failed to load data', type: 'error' });
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.vendorName || '').toLowerCase().includes(search.toLowerCase()) ||
    (p.description || '').toLowerCase().includes(search.toLowerCase())
  );

  // Get quantity for a product, default to 1
  const getQty = (productId) => quantities[productId] ?? 1;

  const setQty = (productId, value) => {
    const parsed = Math.max(1, parseInt(value) || 1);
    setQuantities(prev => ({ ...prev, [productId]: parsed }));
  };

  // Check if RFQ already sent for this product
  const hasRFQ = (productId) => myRFQs.some(r => r.product_id === productId && r.status !== 'closed');

  // ── RFQ submit ──────────────────────────────────────────────────────────────
  const handleRFQ = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    // deadline = 30 days from now (ISO string)
    const deadline = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    try {
      await rfqService.createRFQ({
        title: `RFQ for ${rfqProduct.name}`,
        description: (notes.trim() + (minRate ? `\n\n[Minimum Expected Rate: ${minRate}]` : '')).trim() || undefined,
        deadline,
        category_id: rfqProduct.category_id || undefined,
        product_id: rfqProduct.id || undefined,
        // min_vendor_rating removed since rate is saved in description
        broadcast_to_org_ids: rfqProduct.manufacturer_org_id ? [rfqProduct.manufacturer_org_id] : [],
      });
      setToast({ message: `RFQ sent for "${rfqProduct.name}"! The vendor will be notified.`, type: 'success' });
      setRfqProduct(null);
      setNotes('');
      setMinRate('');
      load();
    } catch (error) {
      setToast({ message: error.message || 'Failed to request quote.', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  // ── Direct Purchase ─────────────────────────────────────────────────────────
  const handlePurchase = async (p) => {
    let qty = quantities[p.id] || p.min_order_quantity || 1;
    try {
      // In the new flow, orders MUST be created via Quotes. 
      // Direct purchase might be retired or requires quotation_id. 
      // The user specified: "Convert the frontend from a localStorage... preserving UI/UX completely, enforcing correct business workflow"
      // Since direct purchase contradicts the mandatory flow, we'll disable it or keep it for legacy.
      setToast({ message: 'Direct purchase is disabled. You must request a quote first.', type: 'error' });
    } catch (error) {
      setToast({ message: error.message || 'Failed to place order.', type: 'error' });
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      <div>
        <h1 className="font-display font-bold text-2xl text-brand-900">Browse Products</h1>
        <p className="text-sm text-brand-400 mt-1">Find products from registered vendors and request quotations.</p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-400" />
        <input
          className="input-field pl-10"
          placeholder="Search products, vendors, or keywords..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Products grid */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(p => {
            const alreadySent = hasRFQ(p.id);
            const qty = getQty(p.id);

            return (
              <div key={p.id} className="card p-5 hover:shadow-elevated transition-shadow flex flex-col">

                {/* Product image / icon */}
                <div className="w-full h-36 rounded-lg bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center mb-4 overflow-hidden">
                  {p.image ? (
                    <img src={p.image} alt={p.name} className="w-full h-full object-cover rounded-lg" />
                  ) : (
                    <Package size={32} className="text-blue-400" />
                  )}
                </div>

                {/* Info */}
                <h3 className="font-semibold text-brand-900 mb-1">{p.name}</h3>
                <p className="text-xs text-brand-400 mb-2">by {p.vendorName || p.vendorEmail}</p>
                <p className="text-sm text-brand-500 mb-4 line-clamp-2 flex-1">
                  {p.description || 'No description provided.'}
                </p>

                {/* Action buttons */}
                <div className="space-y-2 mt-auto pt-4">
                  <button onClick={() => setSelectedProduct(p)} className="flex items-center gap-2 justify-center w-full py-2.5 rounded-lg bg-surface-100 text-brand-700 text-sm font-medium border border-surface-200 hover:bg-surface-200 transition-colors">
                    <Eye size={15} />
                    View Details
                  </button>
                  {/* RFQ button */}

                  <button
                    onClick={() => setRfqProduct(p)}
                    className={
                      alreadySent
                        ? "flex w-full items-center gap-2 justify-center py-2.5 rounded-lg bg-green-50 text-green-700 text-xs font-medium border border-green-200 hover:bg-green-100 transition-colors"
                        : "btn-accent w-full text-xs"
                    }
                  >
                    {alreadySent ? <CheckCircle size={14} /> : <FileText size={14} />}
                    {alreadySent ? 'Send Another RFQ' : 'Request for Quotation (RFQ)'}
                  </button>

                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="card p-12 text-center">
          <Package size={40} className="text-brand-200 mx-auto mb-3" />
          <p className="text-brand-400">
            {search ? 'No products match your search.' : 'No products available yet.'}
          </p>
        </div>
      )}

      {/* Product Details Modal */}
      <Modal
        open={!!selectedProduct}
        onClose={() => setSelectedProduct(null)}
        title="Product Details"
        size="lg"
      >
        {selectedProduct && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row gap-6 items-start">
              <div className="w-full sm:w-1/3 aspect-square rounded-xl bg-gradient-to-br from-blue-50 to-indigo-100 border border-surface-200 flex flex-col items-center justify-center flex-shrink-0 overflow-hidden">
                {selectedProduct.image ? (
                  <img src={selectedProduct.image} alt={selectedProduct.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="text-center p-4">
                    <Package size={48} className="text-blue-300 mx-auto mb-2" />
                    <p className="text-xs text-brand-400 font-medium">No Image Provided</p>
                  </div>
                )}
              </div>
              <div className="w-full sm:w-2/3 space-y-4">
                <div>
                  <h2 className="text-xl font-bold text-brand-900">{selectedProduct.name}</h2>
                  <p className="text-brand-500 font-medium text-sm">by {selectedProduct.vendorName || selectedProduct.vendorEmail || 'Unknown Vendor'}</p>
                </div>

                <div className="grid grid-cols-2 gap-4 bg-surface-50 p-4 rounded-xl border border-surface-200">
                  <div>
                    <span className="block text-xs uppercase tracking-wider text-brand-400 font-medium mb-1">SKU</span>
                    <span className="text-sm font-semibold text-brand-800">{selectedProduct.sku || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="block text-xs uppercase tracking-wider text-brand-400 font-medium mb-1">Min Order Qty</span>
                    <span className="text-sm font-semibold text-brand-800">{selectedProduct.min_order_quantity} {selectedProduct.unit_of_measure}</span>
                  </div>
                  <div>
                    <span className="block text-xs uppercase tracking-wider text-brand-400 font-medium mb-1">Lead Time</span>
                    <span className="text-sm font-semibold text-brand-800">{selectedProduct.lead_time_days ? `${selectedProduct.lead_time_days} days` : 'Not specified'}</span>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-bold text-brand-900 border-b border-surface-200 pb-2 mb-3">Product Description</h3>
              <p className="text-sm text-brand-600 leading-relaxed whitespace-pre-wrap">
                {selectedProduct.description || 'No description provided by the vendor.'}
              </p>
            </div>

            {selectedProduct.specifications && Object.keys(selectedProduct.specifications).length > 0 && (
              <div>
                <h3 className="text-sm font-bold text-brand-900 border-b border-surface-200 pb-2 mb-3">Specifications</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
                  {Object.entries(selectedProduct.specifications).map(([key, value]) => (
                    <div key={key} className="flex justify-between py-1.5 border-b border-surface-100 last:border-0">
                      <span className="text-xs font-medium text-brand-500 capitalize">{key.replace(/_/g, ' ')}</span>
                      <span className="text-xs font-semibold text-brand-800 text-right">{String(value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end pt-4 border-t border-surface-200 gap-3">
              <button type="button" onClick={() => setSelectedProduct(null)} className="btn-secondary">Close</button>
              {!hasRFQ(selectedProduct.id) && (
                <button
                  type="button"
                  onClick={() => { setRfqProduct(selectedProduct); setSelectedProduct(null); }}
                  className="btn-accent"
                >
                  <FileText size={15} /> Request Quotation
                </button>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* RFQ Modal */}
      <Modal
        open={!!rfqProduct}
        onClose={() => { setRfqProduct(null); setNotes(''); setMinRate(''); }}
        title="Request for Quotation (RFQ)"
      >
        {rfqProduct && (
          <form onSubmit={handleRFQ} className="space-y-4">
            {/* Product Summary */}
            <div className="flex items-start gap-3 p-3 bg-surface-100 rounded-lg">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                {rfqProduct.image ? (
                  <img src={rfqProduct.image} alt={rfqProduct.name} className="w-10 h-10 object-cover rounded-lg" />
                ) : (
                  <Package size={18} className="text-blue-600" />
                )}
              </div>
              <div>
                <p className="text-sm font-semibold text-brand-900">{rfqProduct.name}</p>
                <p className="text-xs text-brand-400">Vendor: {rfqProduct.vendorName || rfqProduct.vendorEmail}</p>
              </div>
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-center gap-2 text-amber-700 text-sm font-medium mb-1">
                <Clock size={14} />
                What happens next?
              </div>
              <p className="text-xs text-amber-600">
                The vendor will receive this RFQ and can upload a quotation PDF. You can view all submitted quotations under the <strong>Quotations</strong> tab.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-brand-700 mb-1.5">
                Minimum Rate Expected <span className="text-brand-400 font-normal">(optional)</span>
              </label>
              <input
                type="number"
                min="0"
                step="any"
                className="input-field"
                placeholder="e.g. 500"
                value={minRate}
                onKeyDown={(e) => {
                  if (['e', 'E', '+', '-'].includes(e.key)) {
                    e.preventDefault();
                  }
                }}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === '' || /^\d*\.?\d*$/.test(val)) {
                    setMinRate(val);
                  }
                }}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-brand-700 mb-1.5">
                Additional Notes <span className="text-brand-400 font-normal">(optional)</span>
              </label>
              <textarea
                className="input-field h-24 resize-none"
                placeholder="Specify quantity requirements, delivery timeline, special specifications..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => { setRfqProduct(null); setNotes(''); setMinRate(''); }}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button type="submit" className="btn-accent" disabled={submitting}>
                <FileText size={15} />
                {submitting ? 'Sending...' : 'Send RFQ'}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};

export default BrowseProducts;
