import { CheckCircle, Clock, FileText, Package, Search, ShoppingCart } from 'lucide-react';
import { useEffect, useState } from 'react';
import Modal from '../../components/common/Modal';
import Toast from '../../components/common/Toast';
import { useAuth } from '../../context/AuthContext';
import { createOrder, createRFQ, getProducts, getRFQs } from '../../utils/storage';

const BrowseProducts = () => {
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState(null);
  const [rfqProduct, setRfqProduct] = useState(null);
  const [notes, setNotes] = useState('');
  const [myRFQs, setMyRFQs] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [detailProduct, setDetailProduct] = useState(null);

  // Per-product quantity map: { [productId]: number }
  const [quantities, setQuantities] = useState({});

  const load = () => {
    setProducts(getProducts());
    setMyRFQs(getRFQs({ manufacturerEmail: user.email }));
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
  const hasRFQ = (productId) => myRFQs.some(r => r.productId === productId && r.status !== 'closed');

  // ── RFQ submit ──────────────────────────────────────────────────────────────
  const handleRFQ = (e) => {
    e.preventDefault();
    setSubmitting(true);
    createRFQ({
      productId: rfqProduct.id,
      productName: rfqProduct.name,
      vendorEmail: rfqProduct.vendorEmail,
      vendorName: rfqProduct.vendorName || rfqProduct.vendorEmail,
      manufacturerEmail: user.email,
      manufacturerName: user.name || user.email,
      notes: notes.trim(),
    });
    setToast({ message: `RFQ sent for "${rfqProduct.name}"! The vendor will be notified.`, type: 'success' });
    setRfqProduct(null);
    setNotes('');
    setSubmitting(false);
    load();
  };

  // ── Direct Purchase ─────────────────────────────────────────────────────────
  const handlePurchase = (p) => {
    const qty = getQty(p.id);
    createOrder({
      productId: p.id,
      productName: p.name,
      productPrice: p.price,
      vendorEmail: p.vendorEmail,
      vendorName: p.vendorName || p.vendorEmail,
      manufacturerEmail: user.email,
      manufacturerName: user.name || user.email,
      quantity: qty,
    });
    setToast({ message: `Order placed for ${qty}× "${p.name}"!`, type: 'success' });
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map(p => {
            const alreadySent = hasRFQ(p.id);
            const qty = getQty(p.id);

            return (
              <div key={p.id} className="card p-5 hover:shadow-elevated transition-shadow flex flex-col">

                {/* Clickable area → opens detail modal */}
                <button
                  type="button"
                  onClick={() => setDetailProduct(p)}
                  className="text-left w-full mb-0 focus:outline-none group"
                  aria-label={`View details for ${p.name}`}
                >
                  {/* Product image / icon */}
                  <div className="w-full h-36 rounded-lg bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center mb-4 overflow-hidden group-hover:opacity-90 transition-opacity">
                    {p.image ? (
                      <img src={p.image} alt={p.name} className="w-full h-full object-cover rounded-lg" />
                    ) : (
                      <Package size={32} className="text-blue-400" />
                    )}
                  </div>

                  {/* Info */}
                  <h3 className="font-semibold text-brand-900 mb-1 group-hover:text-blue-600 transition-colors">{p.name}</h3>
                  <p className="text-xs text-brand-400 mb-2">by {p.vendorName || p.vendorEmail}</p>
                  <p className="text-sm text-brand-500 mb-4 line-clamp-2 flex-1">
                    {p.description || 'No description provided.'}
                  </p>
                </button>

                {/* Quantity input */}
                <div className="mb-3">
                  <label className="block text-xs font-medium text-brand-600 mb-1">Quantity</label>
                  <input
                    type="number"
                    min="1"
                    value={qty}
                    onChange={(e) => setQty(p.id, e.target.value)}
                    className="input-field py-2 text-sm"
                  />
                </div>

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

                  {/* Purchase button */}
                  <button
                    onClick={() => handlePurchase(p)}
                    className="btn-primary w-full text-xs"
                  >
                    <ShoppingCart size={14} />
                    Purchase
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

      {/* Product Detail Modal */}
      <Modal
        open={!!detailProduct}
        onClose={() => setDetailProduct(null)}
        title="Product Details"
      >
        {detailProduct && (
          <div className="space-y-4">
            {/* Image */}
            <div className="w-full h-48 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center overflow-hidden">
              {detailProduct.image ? (
                <img src={detailProduct.image} alt={detailProduct.name} className="w-full h-full object-cover rounded-xl" />
              ) : (
                <Package size={48} className="text-blue-400" />
              )}
            </div>

            {/* Name & vendor */}
            <div>
              <h2 className="text-xl font-bold text-brand-900">{detailProduct.name}</h2>
              <p className="text-sm text-brand-400 mt-0.5">by {detailProduct.vendorName || detailProduct.vendorEmail}</p>
            </div>

            {/* Price */}
            {detailProduct.price != null && (
              <div className="flex items-center gap-2 p-3 bg-surface-100 rounded-lg">
                <span className="text-sm font-medium text-brand-600">Price:</span>
                <span className="text-lg font-bold text-blue-600">
                  ${parseFloat(detailProduct.price).toFixed(2)}
                </span>
              </div>
            )}

            {/* Description */}
            <div>
              <p className="text-sm font-medium text-brand-700 mb-1">Description</p>
              <p className="text-sm text-brand-500 leading-relaxed">
                {detailProduct.description || 'No description provided.'}
              </p>
            </div>

            {/* Extra metadata */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              {detailProduct.category && (
                <div className="p-3 bg-surface-100 rounded-lg">
                  <p className="text-xs text-brand-400 mb-0.5">Category</p>
                  <p className="font-medium text-brand-800">{detailProduct.category}</p>
                </div>
              )}
              {detailProduct.sku && (
                <div className="p-3 bg-surface-100 rounded-lg">
                  <p className="text-xs text-brand-400 mb-0.5">SKU</p>
                  <p className="font-medium text-brand-800">{detailProduct.sku}</p>
                </div>
              )}
              {detailProduct.stock != null && (
                <div className="p-3 bg-surface-100 rounded-lg">
                  <p className="text-xs text-brand-400 mb-0.5">Stock</p>
                  <p className="font-medium text-brand-800">{detailProduct.stock}</p>
                </div>
              )}
              {detailProduct.unit && (
                <div className="p-3 bg-surface-100 rounded-lg">
                  <p className="text-xs text-brand-400 mb-0.5">Unit</p>
                  <p className="font-medium text-brand-800">{detailProduct.unit}</p>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-2 border-t border-surface-200">
              <button
                type="button"
                onClick={() => setDetailProduct(null)}
                className="btn-secondary"
              >
                Close
              </button>
              {!hasRFQ(detailProduct.id) && (
                <button
                  type="button"
                  onClick={() => { setDetailProduct(null); setRfqProduct(detailProduct); }}
                  className="btn-accent"
                >
                  <FileText size={14} />
                  Request Quotation
                </button>
              )}
              <button
                type="button"
                onClick={() => { handlePurchase(detailProduct); setDetailProduct(null); }}
                className="btn-primary"
              >
                <ShoppingCart size={14} />
                Purchase
              </button>
            </div>
          </div>
        )}
      </Modal>

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

