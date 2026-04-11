import React, { useState, useEffect } from 'react';
import { getAdmins, addAdmin, removeAdmin } from '../../utils/storage';
import { useAuth } from '../../context/AuthContext';
import Toast from '../../components/common/Toast';
import Modal from '../../components/common/Modal';
import { Plus, Trash2, ShieldCheck } from 'lucide-react';

const ManageAdmins = () => {
  const [admins, setAdmins] = useState([]);
  const [toast, setToast] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newPw, setNewPw] = useState('');
  const { user } = useAuth();

  const load = () => setAdmins(getAdmins());
  useEffect(() => { load(); }, []);

  const handleAdd = (e) => {
    e.preventDefault();
    if (!newEmail || !newPw) return;
    const result = addAdmin(newEmail, newPw);
    if (!result.success) {
      setToast({ message: result.message, type: 'error' });
      return;
    }
    setToast({ message: 'Admin added successfully.', type: 'success' });
    setNewEmail(''); setNewPw(''); setShowAdd(false);
    load();
  };

  const handleRemove = (id) => {
    if (id === user.id) {
      setToast({ message: "You can't remove yourself.", type: 'error' });
      return;
    }
    removeAdmin(id);
    setToast({ message: 'Admin removed.', type: 'success' });
    load();
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-bold text-2xl text-brand-900">Admin Management</h1>
          <p className="text-sm text-brand-400 mt-1">Add or remove admin users.</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-primary">
          <Plus size={16} /> Add Admin
        </button>
      </div>

      <div className="card overflow-hidden">
        <div className="divide-y divide-surface-200">
          {admins.map(admin => (
            <div key={admin.id} className="px-5 py-4 flex items-center justify-between hover:bg-surface-50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-purple-100 flex items-center justify-center">
                  <ShieldCheck size={16} className="text-purple-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-brand-800">{admin.email}</p>
                  <p className="text-xs text-brand-400">Added {new Date(admin.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
              <button
                onClick={() => handleRemove(admin.id)}
                className="p-2 rounded-lg hover:bg-red-50 text-red-400 hover:text-red-600 transition-colors"
                title="Remove"
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}
          {admins.length === 0 && (
            <div className="px-5 py-10 text-center text-sm text-brand-400">No admins found.</div>
          )}
        </div>
      </div>

      {/* Add Admin Modal */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add New Admin">
        <form onSubmit={handleAdd} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-brand-700 mb-1.5">Email</label>
            <input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              className="input-field"
              placeholder="admin@example.com"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-brand-700 mb-1.5">Password</label>
            <input
              type="password"
              value={newPw}
              onChange={(e) => setNewPw(e.target.value)}
              className="input-field"
              placeholder="Min 6 characters"
              required
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setShowAdd(false)} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary">Add Admin</button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default ManageAdmins;
