import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getProducts, addProduct, updateProduct, deleteProduct } from '../../utils/storage';
import Modal from '../../components/common/Modal';
import Toast from '../../components/common/Toast';
import { Plus, Edit3, Trash2, Package, ImagePlus, X, AlertCircle } from 'lucide-react';

// ── Helper: read File → base64 ───────────────────────────────────────────────
const readFileAsBase64 = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

// ── Product card ─────────────────────────────────────────────────────────────
const ProductCard = ({ p, onEdit, onDelete }) => (
  <div className="card overflow-hidden hover:shadow-elevated transition-shadow flex flex-col">
    {/* Image / placeholder */}
    <div className="w-full h-40 bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center overflow-hidden">
      {p.image ? (
        <img src={p.image} alt={p.name} className="w-full h-full object-cover" />
      ) : (
        <Package size={36} className="text-blue-300" />
      )}
    </div>

    <div className="p-4 flex flex-col flex-1">
      <div className="flex items-start justify-between mb-2">
        <div className="min-w-0">
          <h3 className="font-semibold text-brand-900 truncate">{p.name}</h3>
          <p className="text-lg font-display font-bold text-accent-600">${p.price}</p>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0 ml-2">
          <button
            onClick={() => onEdit(p)}
            className="p-1.5 rounded-lg hover:bg-brand-50 text-brand-400 hover:text-brand-700 transition-colors"
            title="Edit"
          >
            <Edit3 size={14} />
          </button>
          <button
            onClick={() => onDelete(p.id)}
            className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 hover:text-red-600 transition-colors"
            title="Delete"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
      <p className="text-sm text-brand-400 line-clamp-2 flex-1">
        {p.description || 'No description provided.'}
      </p>
    </div>
  </div>
);

// ── Empty file form state ────────────────────────────────────────────────────
const EMPTY_FORM = { name: '', price: '', description: '', image: '' };

// ── Main Component ───────────────────────────────────────────────────────────
const VendorProducts = () => {
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const [toast, setToast] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

  // Image state
  const [imagePreview, setImagePreview] = useState('');
  const [imageError, setImageError] = useState('');
  const imageInputRef = useRef(null);

  const load = () => setProducts(getProducts(user.email));
  useEffect(() => { load(); }, []);

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditing(null);
    setShowForm(false);
    setImagePreview('');
    setImageError('');
    if (imageInputRef.current) imageInputRef.current.value = '';
  };

  // ── Image selection ──
  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    setImageError('');
    setImagePreview('');

    if (!file) return;

    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowed.includes(file.type)) {
      setImageError('Only JPG, PNG, WEBP, or GIF images are allowed.');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setImageError('Image must be under 2 MB.');
      return;
    }

    try {
      const base64 = await readFileAsBase64(file);
      setImagePreview(base64);
      setForm(f => ({ ...f, image: base64 }));
    } catch {
      setImageError('Failed to read image. Please try again.');
    }
  };

  const removeImage = () => {
    setImagePreview('');
    setImageError('');
    setForm(f => ({ ...f, image: '' }));
    if (imageInputRef.current) imageInputRef.current.value = '';
  };

  // ── Open edit modal ──
  const handleEdit = (p) => {
    setForm({ name: p.name, price: p.price, description: p.description || '', image: p.image || '' });
    setImagePreview(p.image || '');
    setEditing(p);
    setShowForm(true);
  };

  // ── Submit ──
  const handleSubmit = (e) => {
    e.preventDefault();
    if (editing) {
      updateProduct(editing.id, form);
      setToast({ message: 'Product updated.', type: 'success' });
    } else {
      addProduct({ ...form, vendorEmail: user.email, vendorName: user.name || user.email });
      setToast({ message: 'Product added.', type: 'success' });
    }
    resetForm();
    load();
  };

  const handleDelete = (id) => {
    deleteProduct(id);
    setToast({ message: 'Product deleted.', type: 'success' });
    load();
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-bold text-2xl text-brand-900">Products</h1>
          <p className="text-sm text-brand-400 mt-1">Manage your product catalog.</p>
        </div>
        <button
          onClick={() => { resetForm(); setShowForm(true); }}
          className="btn-primary"
        >
          <Plus size={16} /> Add Product
        </button>
      </div>

      {/* Products grid */}
      {products.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {products.map(p => (
            <ProductCard key={p.id} p={p} onEdit={handleEdit} onDelete={handleDelete} />
          ))}
        </div>
      ) : (
        <div className="card p-12 text-center">
          <Package size={40} className="text-brand-200 mx-auto mb-3" />
          <p className="text-brand-400 mb-3">No products yet. Add your first product.</p>
          <button onClick={() => setShowForm(true)} className="btn-primary">
            <Plus size={16} /> Add Product
          </button>
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal open={showForm} onClose={resetForm} title={editing ? 'Edit Product' : 'Add Product'}>
        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Product Image Upload */}
          <div>
            <label className="block text-sm font-medium text-brand-700 mb-1.5">
              Product Image <span className="text-brand-400 font-normal">(optional)</span>
            </label>

            {imagePreview ? (
              <div className="relative w-full h-44 rounded-xl overflow-hidden border border-surface-200 group">
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => imageInputRef.current?.click()}
                    className="px-3 py-1.5 rounded-lg bg-white text-brand-800 text-xs font-medium hover:bg-brand-50"
                  >
                    Change Image
                  </button>
                  <button
                    type="button"
                    onClick={removeImage}
                    className="p-1.5 rounded-lg bg-red-600 text-white hover:bg-red-700"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
            ) : (
              <div
                onClick={() => imageInputRef.current?.click()}
                className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-brand-200 rounded-xl cursor-pointer hover:border-brand-400 hover:bg-brand-50 transition-colors"
              >
                <ImagePlus size={28} className="text-brand-300 mb-2" />
                <p className="text-sm font-medium text-brand-600">Click to upload product image</p>
                <p className="text-xs text-brand-400 mt-0.5">JPG, PNG, WEBP, GIF · Max 2 MB</p>
              </div>
            )}

            <input
              ref={imageInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={handleImageChange}
            />

            {imageError && (
              <div className="flex items-center gap-1.5 mt-1.5 text-red-600 text-xs">
                <AlertCircle size={12} />
                {imageError}
              </div>
            )}
          </div>

          {/* Product Name */}
          <div>
            <label className="block text-sm font-medium text-brand-700 mb-1.5">Product Name</label>
            <input
              className="input-field"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Steel Bolts M10"
              required
            />
          </div>

          {/* Price */}
          <div>
            <label className="block text-sm font-medium text-brand-700 mb-1.5">Price ($)</label>
            <input
              type="number"
              step="0.01"
              className="input-field"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
              placeholder="0.00"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-brand-700 mb-1.5">Description</label>
            <textarea
              className="input-field h-24 resize-none"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Product details..."
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={resetForm} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary">
              {editing ? 'Update' : 'Add'} Product
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default VendorProducts;
