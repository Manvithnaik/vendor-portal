import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { productService } from '../../services/productService';
import { rfqService } from '../../services/rfqService';
import { orderService } from '../../services/orderService';
import Modal from '../../components/common/Modal';
import Toast from '../../components/common/Toast';
import { Search, Package, FileText, CheckCircle, Clock, ShoppingCart } from 'lucide-react';

const BrowseProducts = () => {
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState(null);
  const [rfqProduct, setRfqProduct] = useState(null);
  const [notes, setNotes] = useState('');
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
    try {
      await rfqService.createRFQ({
        product_id: rfqProduct.id,
        quantity: getQty(rfqProduct.id),
        specifications: notes.trim()
      });
      setToast({ message: `RFQ sent for "${rfqProduct.name}"! The vendor will be notified.`, type: 'success' });
      setRfqProduct(null);
      setNotes('');
      load();
    } catch (error) {
      setToast({ message: error.message || 'Failed to request quote.', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  // ── Direct Purchase ─────────────────────────────────────────────────────────
  const handlePurchase = async (p) => {
    const qty = getQty(p.id);
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
                <div className="space-y-2">
                  {/* RFQ button */}
                  {alreadySent ? (
                    <div className="flex items-center gap-2 justify-center py-2.5 rounded-lg bg-green-50 text-green-700 text-sm font-medium border border-green-200">
                      <CheckCircle size={15} />
                      RFQ Sent
                    </div>
                  ) : (
                    <button
                      onClick={() => setRfqProduct(p)}
                      className="btn-accent w-full text-xs"
                    >
                      <FileText size={14} />
                      Request for Quotation (RFQ)
                    </button>
                  )}
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

      {/* RFQ Modal */}
      <Modal
        open={!!rfqProduct}
        onClose={() => { setRfqProduct(null); setNotes(''); }}
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
                onClick={() => { setRfqProduct(null); setNotes(''); }}
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
