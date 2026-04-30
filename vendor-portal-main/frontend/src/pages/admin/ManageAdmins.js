import React, { useState, useEffect } from 'react';
import apiClient from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import Toast from '../../components/common/Toast';
import Modal from '../../components/common/Modal';
import { Plus, Trash2, ShieldCheck } from 'lucide-react';

const ManageAdmins = () => {
  const [admins, setAdmins]   = useState([]);
  const [toast, setToast]     = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm]       = useState({ name: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  const load = async () => {
    try {
      const res = await apiClient.get('/auth/admins');
      setAdmins(res?.data || []);
    } catch { setAdmins([]); }
  };

  useEffect(() => { load(); }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await apiClient.post('/auth/admin/create', { ...form, role: 'admin' });
      setToast({ message: 'Admin created.', type: 'success' });
      setShowAdd(false);
      setForm({ name: '', email: '', password: '' });
      load();
    } catch (err) {
      setToast({ message: err.message || 'Failed to create admin', type: 'error' });
    } finally { setLoading(false); }
  };

  const handleRemove = async (id) => {
    if (!window.confirm('Remove this admin?')) return;
    try {
      await apiClient.delete(`/auth/admins/${id}`);
      setToast({ message: 'Admin removed.', type: 'success' });
      load();
    } catch (err) {
      setToast({ message: err.message || 'Failed to remove admin', type: 'error' });
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-bold text-2xl text-brand-900">Manage Admins</h1>
          <p className="text-sm text-brand-400 mt-1">Add or remove platform administrators.</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-primary"><Plus size={16} /> Add Admin</button>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-surface-100 text-brand-600">
              <th className="text-left px-5 py-3 font-medium">Name</th>
              <th className="text-left px-5 py-3 font-medium">Email</th>
              <th className="text-left px-5 py-3 font-medium">Role</th>
              <th className="text-right px-5 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-200">
            {admins.length === 0 && (
              <tr><td colSpan={4} className="px-5 py-10 text-center text-brand-400">No admins found.</td></tr>
            )}
            {admins.map(a => (
              <tr key={a.id} className="hover:bg-surface-50">
                <td className="px-5 py-3 font-medium text-brand-800 flex items-center gap-2"><ShieldCheck size={14} className="text-purple-500" />{a.name || '—'}</td>
                <td className="px-5 py-3 text-brand-500">{a.email}</td>
                <td className="px-5 py-3 text-brand-500 capitalize">{a.role}</td>
                <td className="px-5 py-3 text-right">
                  {a.email !== user?.email && (
                    <button onClick={() => handleRemove(a.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 hover:text-red-600">
                      <Trash2 size={14} />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Admin">
        <form onSubmit={handleAdd} className="space-y-4">
          {[['Name', 'name', 'text'], ['Email', 'email', 'email'], ['Password', 'password', 'password']].map(([label, key, type]) => (
            <div key={key}>
              <label className="block text-sm font-medium text-brand-700 mb-1.5">{label}</label>
              <input type={type} className="input-field" value={form[key]} onChange={e => setForm({ ...form, [key]: e.target.value })} required />
            </div>
          ))}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setShowAdd(false)} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary" disabled={loading}>{loading ? 'Creating...' : 'Create Admin'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default ManageAdmins;
