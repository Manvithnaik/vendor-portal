import React, { useState, useEffect } from 'react';
import apiClient from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import Toast from '../../components/common/Toast';
import Modal from '../../components/common/Modal';
import { 
  Plus, Trash2, ShieldCheck, Mail, Calendar, 
  Clock, ShieldAlert, UserPlus, Loader2, X 
} from 'lucide-react';

const ManageAdmins = () => {
  const [admins, setAdmins]   = useState([]);
  const [toast, setToast]     = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm]       = useState({ name: '', email: '' });
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const { user } = useAuth();

  const loadAdmins = async () => {
    try {
      const res = await apiClient.get('/admin/admins');
      setAdmins(res?.data || []);
    } catch (err) {
      setToast({ message: 'Failed to load admins', type: 'error' });
      setAdmins([]);
    } finally {
      setInitialLoading(false);
    }
  };

  useEffect(() => { loadAdmins(); }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await apiClient.post('/admin/admins', form);
      setToast({ message: 'Invitation sent successfully.', type: 'success' });
      setShowAdd(false);
      setForm({ name: '', email: '' });
      loadAdmins();
    } catch (err) {
      setToast({ message: err.response?.data?.message || 'Failed to create admin', type: 'error' });
    } finally { setLoading(false); }
  };

  const handleRemove = async (id) => {
    if (!window.confirm('Are you sure you want to deactivate and remove this administrator? This action is recorded in audit logs.')) return;
    try {
      await apiClient.delete(`/admin/admins/${id}`);
      setToast({ message: 'Administrator account removed.', type: 'success' });
      loadAdmins();
    } catch (err) {
      setToast({ message: err.response?.data?.message || 'Failed to remove admin', type: 'error' });
    }
  };

  const getStatusStyle = (status) => {
    switch (status) {
      case 'active': return 'bg-green-50 text-green-700 border-green-100';
      case 'suspended': return 'bg-blue-50 text-blue-700 border-blue-100';
      case 'password_change_required': return 'bg-amber-50 text-amber-700 border-amber-100';
      default: return 'bg-surface-100 text-brand-400 border-surface-200';
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-3xl text-brand-900 tracking-tight">Admin Management</h1>
          <p className="text-sm text-brand-400 mt-1">Configure and manage platform administrators with role-based access.</p>
        </div>
        <button 
          onClick={() => setShowAdd(true)} 
          className="btn-primary px-5 py-2.5 shadow-lg shadow-brand-800/20 active:scale-[0.98] transition-all flex items-center gap-2"
        >
          <UserPlus size={18} /> 
          <span>Add Admin</span>
        </button>
      </div>

      <div className="card shadow-elevated border-brand-100/50 overflow-hidden">
        {initialLoading ? (
          <div className="flex flex-col items-center justify-center py-20 text-brand-300">
            <Loader2 className="animate-spin mb-3" size={32} />
            <p className="text-sm font-medium">Fetching administrators...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-surface-50 text-brand-600 border-b border-surface-200">
                  <th className="text-left px-6 py-4 font-semibold">Admin Profile</th>
                  <th className="text-left px-6 py-4 font-semibold">Status</th>
                  <th className="text-left px-6 py-4 font-semibold">Joined Date</th>
                  <th className="text-left px-6 py-4 font-semibold">Last Login</th>
                  <th className="text-right px-6 py-4 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-200">
                {admins.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-16 text-center">
                      <div className="flex flex-col items-center text-brand-200">
                        <ShieldAlert size={48} className="mb-3 opacity-20" />
                        <p className="text-lg font-medium text-brand-400">No Administrators Found</p>
                        <p className="text-sm text-brand-300 max-w-xs mx-auto mt-1">Start by adding a new administrator to help manage the platform.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  admins.map(a => (
                    <tr key={a.id} className="hover:bg-surface-50/50 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 group-hover:bg-indigo-100 transition-colors">
                            <ShieldCheck size={20} />
                          </div>
                          <div>
                            <p className="font-semibold text-brand-900">{a.name}</p>
                            <p className="text-xs text-brand-400 flex items-center gap-1">
                              <Mail size={12} />
                              {a.email}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold border uppercase tracking-wider ${getStatusStyle(a.status)}`}>
                          {a.status.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-brand-500 font-medium">
                        <div className="flex items-center gap-1.5">
                          <Calendar size={14} className="text-brand-300" />
                          {a.created_at ? new Date(a.created_at).toLocaleDateString() : '—'}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-brand-500">
                        <div className="flex items-center gap-1.5">
                          <Clock size={14} className="text-brand-300" />
                          {a.last_login_at ? new Date(a.last_login_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : 'Never'}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        {a.email !== user?.email && (
                          <button 
                            onClick={() => handleRemove(a.id)} 
                            className="p-2 rounded-lg hover:bg-red-50 text-red-400 hover:text-red-600 transition-colors"
                            title="Remove Admin"
                          >
                            <Trash2 size={18} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Administrator">
        <div className="p-1">
          <p className="text-sm text-brand-400 mb-6">
            Create a new administrator account. They will be required to change their temporary password upon first login.
          </p>
          <form onSubmit={handleAdd} className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-brand-700 ml-1">Full Name</label>
              <input 
                type="text" 
                className="input-field" 
                placeholder="John Doe"
                value={form.name} 
                onChange={e => setForm({ ...form, name: e.target.value })} 
                required 
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-brand-700 ml-1">Email Address</label>
              <input 
                type="email" 
                className="input-field" 
                placeholder="john@example.com"
                value={form.email} 
                onChange={e => setForm({ ...form, email: e.target.value })} 
                required 
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-surface-100">
              <button 
                type="button" 
                onClick={() => setShowAdd(false)} 
                className="btn-secondary px-6"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="btn-primary px-8" 
                disabled={loading}
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="animate-spin" size={16} />
                    Creating...
                  </div>
                ) : 'Create Account'}
              </button>
            </div>
          </form>
        </div>
      </Modal>
    </div>
  );
};

export default ManageAdmins;
