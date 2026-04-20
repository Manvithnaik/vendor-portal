import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../api/client';
import Toast from '../../components/common/Toast';
import { Upload, ArrowLeft, AlertCircle, X, ImagePlus } from 'lucide-react';
import { getProductSummary } from '../../utils/orderUtils';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000/api/v1';
const MAX_FILES = 2;

const RaiseDispute = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [toast, setToast] = useState(null);

  // Form State
  const [selectedOrderId, setSelectedOrderId] = useState('');
  const [disputeType, setDisputeType] = useState('Damaged');
  const [reason, setReason] = useState('');
  const [imageFiles, setImageFiles] = useState([]);   // array of { file, preview }
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const loadEligibleOrders = async () => {
      try {
        const res = await apiClient.get('/orders');
        const allOrders = res?.data || [];
        const eligibleOrders = allOrders.filter(o =>
          ['delivered', 'shipped', 'accepted'].includes(o.status.toLowerCase()) &&
          !o.notes?.includes('Dispute:')
        );
        setOrders(eligibleOrders);
      } catch (e) {
        setToast({ message: e.message || 'Failed to load eligible orders.', type: 'error' });
      }
    };
    loadEligibleOrders();
  }, []);

  const handleAddFiles = (e) => {
    const selected = Array.from(e.target.files);
    const remaining = MAX_FILES - imageFiles.length;
    const toAdd = selected.slice(0, remaining);

    toAdd.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImageFiles(prev => [...prev, { file, preview: reader.result }]);
      };
      reader.readAsDataURL(file);
    });

    // Reset input so the same file can be re-selected if removed
    e.target.value = '';
  };

  const handleRemoveFile = (index) => {
    setImageFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleRaiseDispute = async (e) => {
    e.preventDefault();
    if (!selectedOrderId || !reason) return;
    setSubmitting(true);

    try {
      const image_urls = [];
      // Upload each file in sequence
      for (const { file } of imageFiles) {
        const formData = new FormData();
        formData.append('file', file);

        const uploadRes = await apiClient.post('/uploads/image', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        
        if (uploadRes?.data?.file_url) {
          image_urls.push(uploadRes.data.file_url);
        } else {
          throw new Error('Upload failed: No URL returned');
        }
      }

      await apiClient.post('/disputes/create', {
        order_id: parseInt(selectedOrderId),
        dispute_type: disputeType,
        reason,
        image_urls: image_urls.length ? image_urls : undefined,
      });

      setToast({ message: 'Dispute raised successfully. Redirecting...', type: 'success' });
      setTimeout(() => navigate('/manufacturer/returns'), 1500);
    } catch (e) {
      setToast({ message: e.message || 'Failed to raise dispute', type: 'error' });
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in relative py-8">
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate('/manufacturer/returns')}
          className="p-2 bg-surface-100 hover:bg-surface-200 text-brand-600 rounded-full transition-colors"
          title="Go back"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="font-display font-bold text-3xl text-brand-900">Raise Dispute</h1>
          <p className="text-sm text-brand-500 mt-1">Submit a formal request for an issue regarding an order.</p>
        </div>
      </div>

      <div className="card overflow-hidden shadow-sm border border-surface-200">
        <div className="bg-red-50/50 px-8 py-4 border-b border-red-100 flex items-start gap-3">
          <AlertCircle className="text-red-500 flex-shrink-0 mt-0.5" size={20} />
          <div>
            <h3 className="text-sm font-semibold text-red-800">Important Note</h3>
            <p className="text-xs text-red-600 mt-1">
              Please provide clear and accurate information. Photographic evidence (up to {MAX_FILES} images)
              is highly recommended to expedite the resolution process.
            </p>
          </div>
        </div>

        <form onSubmit={handleRaiseDispute} className="p-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <label className="block text-sm font-semibold text-brand-800">
                Select Order <span className="text-red-500">*</span>
              </label>
              <select
                className="input-field py-3 bg-surface-50 focus:bg-white transition-colors border-surface-300"
                value={selectedOrderId}
                onChange={e => setSelectedOrderId(e.target.value)}
                required
              >
                <option value="" disabled>-- Choose an eligible order --</option>
                {orders.map(o => (
                  <option key={o.id} value={o.id}>
                    Order #{o.order_number || o.id} - {getProductSummary(o)}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-semibold text-brand-800">
                Dispute Type <span className="text-red-500">*</span>
              </label>
              <select
                className="input-field py-3 bg-surface-50 focus:bg-white transition-colors border-surface-300"
                value={disputeType}
                onChange={e => setDisputeType(e.target.value)}
                required
              >
                <option value="Damaged">Damaged Item</option>
                <option value="Wrong Item">Wrong Item Received</option>
                <option value="Quality Issue">Quality/Defect Issue</option>
                <option value="Quantity Issue">Incorrect Quantity</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-sm font-semibold text-brand-800">
              Detailed Reason <span className="text-red-500">*</span>
            </label>
            <p className="text-xs text-brand-400 mb-2">Describe exactly what is wrong. Be as specific as possible.</p>
            <textarea
              className="input-field min-h-[160px] py-3 bg-surface-50 focus:bg-white transition-colors border-surface-300 resize-y"
              placeholder="E.g., The product arrived with a shattered screen and crushed packaging..."
              value={reason}
              onChange={e => setReason(e.target.value)}
              required
            />
          </div>

          {/* ── Multi-file evidence upload ── */}
          <div className="space-y-1.5">
            <label className="block text-sm font-semibold text-brand-800">
              Upload Evidence
              <span className="ml-2 text-xs font-normal text-brand-400">(up to {MAX_FILES} images — JPEG, PNG, WEBP)</span>
            </label>

            {/* Thumbnails row */}
            {imageFiles.length > 0 && (
              <div className="flex flex-wrap gap-3 mb-3">
                {imageFiles.map((item, idx) => (
                  <div key={idx} className="relative group w-24 h-24 rounded-xl overflow-hidden border border-surface-200 bg-surface-100 shadow-sm">
                    <img
                      src={item.preview}
                      alt={`evidence-${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveFile(idx)}
                      className="absolute top-1 right-1 w-5 h-5 bg-red-600 hover:bg-red-700 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow"
                    >
                      <X size={11} />
                    </button>
                    <span className="absolute bottom-1 left-1 text-[9px] bg-black/50 text-white rounded px-1">
                      {idx + 1}
                    </span>
                  </div>
                ))}

                {/* Add-more slot */}
                {imageFiles.length < MAX_FILES && (
                  <label className="w-24 h-24 rounded-xl border-2 border-dashed border-surface-300 hover:border-brand-300 hover:bg-surface-50 flex flex-col items-center justify-center gap-1 cursor-pointer transition-colors">
                    <ImagePlus size={20} className="text-brand-400" />
                    <span className="text-[10px] text-brand-400">Add more</span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      multiple
                      onChange={handleAddFiles}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
            )}

            {/* Initial drop zone (only shown when no files yet) */}
            {imageFiles.length === 0 && (
              <div className="relative border-2 border-dashed border-surface-300 rounded-xl p-8 text-center hover:bg-surface-50 hover:border-brand-300 transition-colors group">
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  onChange={handleAddFiles}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                <div className="flex flex-col items-center justify-center text-brand-500">
                  <div className="w-12 h-12 bg-brand-50 text-brand-600 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                    <Upload size={24} />
                  </div>
                  <span className="text-base font-medium text-brand-700">Click or drag images here</span>
                  <span className="text-xs text-brand-400 mt-1">Up to {MAX_FILES} images, max 10 MB each</span>
                </div>
              </div>
            )}
          </div>

          <div className="pt-8 border-t border-surface-200 flex flex-col-reverse sm:flex-row gap-4 sm:justify-end">
            <button
              type="button"
              disabled={submitting}
              onClick={() => navigate('/manufacturer/returns')}
              className="btn-secondary px-8 py-3 w-full sm:w-auto"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !selectedOrderId || !reason}
              className="btn-primary px-10 py-3 w-full sm:w-auto text-base shadow-md hover:shadow-lg transition-all"
            >
              {submitting ? 'Confirming Dispute…' : 'Confirm Submission'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RaiseDispute;
