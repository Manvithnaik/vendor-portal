import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  UserCircle, Mail, Building, MapPin,
  Save, X, Key, Lock, CheckCircle, Calendar, Eye, EyeOff
} from 'lucide-react';
import apiClient from '../../api/client';
import Toast from '../../components/common/Toast';

// ── Inline editable field ────────────────────────────────────────────────────
// Double-click the value to activate; Escape cancels local edit.
const InlineField = ({ label, name, value, type = 'text', disabled = false, changed, onDoubleClick, editing, onChange, onBlur }) => {
  const inputRef = useRef(null);

  useEffect(() => {
    if (editing && inputRef.current) inputRef.current.focus();
  }, [editing]);

  return (
    <div className="border-b border-surface-50 pb-3">
      <p className="text-xs uppercase tracking-wider font-semibold text-brand-400 mb-1">{label}</p>
      {editing && !disabled ? (
        <input
          ref={inputRef}
          type={type}
          name={name}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          onKeyDown={e => { if (e.key === 'Escape') onBlur(); }}
          className={`input-field text-sm w-full ${changed ? 'border-amber-400 bg-amber-50 focus:ring-amber-300' : ''}`}
        />
      ) : (
        <p
          onDoubleClick={() => !disabled && onDoubleClick(name)}
          title={disabled ? '' : 'Double-click to edit'}
          className={`text-sm font-medium min-h-[1.5rem] rounded px-1 py-0.5 -mx-1 transition-colors
            ${disabled ? 'text-brand-400 italic cursor-default' : 'text-brand-900 cursor-pointer hover:bg-surface-100'}
            ${changed ? 'text-amber-700' : ''}`}
        >
          {value || <span className="text-brand-400 italic font-normal">Not provided</span>}
        </p>
      )}
    </div>
  );
};

// ── Main component ───────────────────────────────────────────────────────────
const VendorProfile = () => {
  const { user } = useAuth();

  const [toast, setToast]             = useState(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [originalData, setOriginalData]   = useState(null);
  const [activeField, setActiveField]     = useState(null); // which field is being edited inline

  const [profileData, setProfileData] = useState({
    name: '', phone: '', address_line1: '', city: '', state: '',
    country: '', postal_code: '', industry_type: '', factory_address: '',
    contact_name: '', contact_email: '', contact_phone: '',
    signatory_name: '', signatory_phone: '', email: '', org_type: '', annual_turnover: ''
  });

  // Password state
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordData, setPasswordData] = useState({ currentPassword: '', newPassword: '', confirmNewPassword: '' });
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [showCurrent, setShowCurrent]   = useState(false);
  const [showNew, setShowNew]           = useState(false);
  const [showConfirm, setShowConfirm]   = useState(false);

  const fetchProfile = async () => {
    if (!user) return;
    try {
      const response = await apiClient.get(`/organizations/${user.org_id}`);
      if (response?.data) {
        const org = response.data;
        const next = {
          name: org.name || '',
          phone: org.phone || '',
          address_line1: org.address_line1 || '',
          city: org.city || '',
          state: org.state || '',
          country: org.country || '',
          postal_code: org.postal_code || '',
          industry_type: org.industry_type || '',
          factory_address: org.factory_address || '',
          contact_name: org.contact_name || user.full_name || '',
          contact_email: org.contact_email || user.email || '',
          contact_phone: org.contact_phone || user.phone || '',
          signatory_name: org.authorised_signatory_name || '',
          signatory_phone: org.authorised_signatory_phone || '',
          email: org.email || '',
          org_type: org.org_type || '',
          annual_turnover: org.about || ''
        };
        setProfileData(next);
        setOriginalData(next);
      }
    } catch {
      setToast({ message: 'Failed to load organization details.', type: 'error' });
    }
  };

  useEffect(() => { fetchProfile(); }, [user]);

  if (!user || !profileData.name) {
    return (
      <div className="card p-8 text-center rounded-2xl shadow-md">
        <p className="text-brand-400">Loading profile data...</p>
      </div>
    );
  }

  // ── Derived dirty state ─────────────────────────────────────────────────
  const dirtyFields = originalData
    ? Object.keys(originalData).filter(k => profileData[k] !== originalData[k])
    : [];
  const isDirty = dirtyFields.length > 0;
  const isChanged = (field) => dirtyFields.includes(field);

  // ── Handlers ────────────────────────────────────────────────────────────
  const handleFieldChange = (e) => {
    setProfileData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleDoubleClick = (field) => setActiveField(field);
  const handleFieldBlur = () => setActiveField(null);

  const handleSave = async () => {
    setSavingProfile(true);
    try {
      await apiClient.put(`/organizations/${user.org_id}`, profileData);
      setToast({ message: 'Profile updated successfully!', type: 'success' });
      await fetchProfile();
      setActiveField(null);
    } catch (error) {
      setToast({ message: error.message || 'Failed to update profile.', type: 'error' });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleDiscardChanges = () => {
    if (isDirty && !window.confirm('Discard unsaved changes?')) return;
    setProfileData(originalData);
    setActiveField(null);
  };

  const handlePasswordChange = (e) => {
    setPasswordData({ ...passwordData, [e.target.name]: e.target.value });
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmNewPassword) {
      setToast({ message: 'New passwords do not match.', type: 'error' });
      return;
    }
    setPasswordLoading(true);
    try {
      await apiClient.post('/auth/change-password', {
        current_password: passwordData.currentPassword,
        new_password: passwordData.newPassword,
        confirm_new_password: passwordData.confirmNewPassword
      });
      setToast({ message: 'Password changed successfully!', type: 'success' });
      setIsChangingPassword(false);
      setPasswordData({ currentPassword: '', newPassword: '', confirmNewPassword: '' });
    } catch (error) {
      setToast({ message: error.message || 'Failed to change password.', type: 'error' });
    } finally {
      setPasswordLoading(false);
    }
  };

  const memberSince = user.created_at
    ? new Date(user.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
    : 'Recently joined';

  // Common InlineField props
  const field = (label, name, opts = {}) => (
    <InlineField
      label={label}
      name={name}
      value={profileData[name]}
      type={opts.type || 'text'}
      disabled={opts.disabled || false}
      changed={isChanged(name)}
      editing={activeField === name}
      onDoubleClick={handleDoubleClick}
      onChange={handleFieldChange}
      onBlur={handleFieldBlur}
    />
  );

  return (
    <div className="space-y-6 animate-fade-in pb-16">
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      {/* Floating Save Bar */}
      {isDirty && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-brand-900 text-white px-5 py-3 rounded-2xl shadow-2xl border border-brand-700 animate-fade-in">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse flex-shrink-0" />
          <span className="text-sm font-medium">{dirtyFields.length} field{dirtyFields.length > 1 ? 's' : ''} changed</span>
          <button
            onClick={handleDiscardChanges}
            className="flex items-center gap-1.5 text-sm text-brand-300 hover:text-white transition-colors px-2"
          >
            <X size={14} /> Discard
          </button>
          <button
            onClick={handleSave}
            disabled={savingProfile}
            className="flex items-center gap-1.5 bg-purple-600 hover:bg-purple-500 text-white text-sm font-semibold px-4 py-1.5 rounded-xl transition-colors disabled:opacity-60"
          >
            <Save size={14} /> {savingProfile ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      )}

      {/* Hero Header */}
      <div className="bg-white rounded-2xl shadow-md hover:shadow-lg transition-shadow" style={{ overflow: 'visible' }}>
        <div className="h-32 bg-gradient-to-r from-purple-600 to-indigo-600 w-full relative rounded-t-2xl" />
        <div className="px-6 pb-6 relative flex flex-col items-center" style={{ overflow: 'visible' }}>
          <div className="w-24 h-24 rounded-full bg-white flex items-center justify-center shadow-lg -mt-12 mb-3 border-4 border-white" style={{ zIndex: 1, position: 'relative' }}>
            <span style={{ fontWeight: 700, fontSize: '2.25rem', color: '#6d28d9', fontFamily: 'inherit' }}>
              {(user.email || 'V').charAt(0).toUpperCase()}
            </span>
          </div>
          <h2 className="font-display font-bold text-3xl text-brand-900 text-center">{profileData.name || 'Organization Name'}</h2>
          <p className="text-sm text-brand-500 flex items-center gap-2 mt-1 mb-4">
            <Mail size={16} className="text-brand-400" /> {user.email}
          </p>
          <div className="flex items-center gap-2 bg-green-50 text-green-700 px-4 py-1.5 rounded-full border border-green-200 shadow-sm">
            <CheckCircle size={16} className="text-green-600 animate-pulse" />
            <span className="text-sm font-semibold uppercase tracking-wider">Approved Vendor</span>
          </div>
          {!isDirty && (
            <p className="text-xs text-brand-400 mt-3 italic">Double-click any field to edit it</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left: Profile Fields */}
        <div className="lg:col-span-2 space-y-6">

          {/* Organization Details */}
          <div className="bg-white rounded-2xl shadow-md hover:shadow-lg transition-shadow overflow-hidden border border-surface-200">
            <div className="bg-surface-50 px-6 py-4 border-b border-surface-200 flex items-center gap-2">
              <Building size={20} className="text-purple-600" />
              <h2 className="font-display font-bold text-lg text-brand-900">Organization Profile</h2>
            </div>
            <div className="p-6 space-y-6">

              {/* Org Details Section */}
              <div className="bg-surface-50 p-5 rounded-xl border border-surface-200 border-l-4 border-l-purple-500">
                <h3 className="font-semibold text-brand-900 mb-4 flex items-center gap-2 border-b border-surface-100 pb-2">
                  <Building size={16} className="text-purple-600" /> Organization Details
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
                  {field('Organization Name', 'name')}
                  {field('Industry Type', 'industry_type')}
                  {field('Phone Number', 'phone', { type: 'tel' })}
                  {field('Email', 'email', { disabled: true })}
                  <div className="sm:col-span-2">
                    {field('Factory Address', 'factory_address')}
                  </div>
                </div>
              </div>

              {/* Contact Person Section */}
              <div className="bg-surface-50 p-5 rounded-xl border border-surface-200 border-l-4 border-l-indigo-500">
                <h3 className="font-semibold text-brand-900 mb-4 flex items-center gap-2 border-b border-surface-100 pb-2">
                  <UserCircle size={16} className="text-indigo-600" /> Contact Person
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-6 gap-y-3">
                  {field('Name', 'contact_name')}
                  {field('Email', 'contact_email', { type: 'email' })}
                  {field('Phone', 'contact_phone', { type: 'tel' })}
                </div>
              </div>

              {/* Billing Address Section */}
              <div className="bg-surface-50 p-5 rounded-xl border border-surface-200 border-l-4 border-l-purple-500">
                <h3 className="font-semibold text-brand-900 mb-4 flex items-center gap-2 border-b border-surface-100 pb-2">
                  <MapPin size={16} className="text-purple-600" /> Billing / Main Address
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
                  <div className="sm:col-span-2">{field('Address', 'address_line1')}</div>
                  {field('City', 'city')}
                  {field('State', 'state')}
                  {field('Country', 'country')}
                  {field('Postal Code', 'postal_code')}
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* Right: Security & Account Info */}
        <div className="space-y-6">

          {/* Security Card */}
          <div className="bg-white rounded-2xl shadow-md hover:shadow-lg transition-shadow overflow-hidden border border-surface-200">
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-100 to-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4 shadow-inner">
                <Lock size={28} className="text-purple-600" />
              </div>
              <h2 className="font-display font-bold text-xl text-brand-900 mb-1">Password &amp; Security</h2>
              <p className="text-sm text-brand-500 mb-6">Keep your account secure by updating your password regularly.</p>

              {!isChangingPassword ? (
                <button
                  onClick={() => setIsChangingPassword(true)}
                  className="btn-primary w-full justify-center bg-purple-600 hover:bg-purple-700 border-purple-600 rounded-full shadow-md py-2.5"
                >
                  <Key size={16} className="mr-2" /> Change Password
                </button>
              ) : (
                <form onSubmit={handlePasswordSubmit} className="space-y-4 animate-fade-in text-left">
                  <div className="bg-surface-50 p-4 rounded-xl border border-surface-200">
                    {/* Current */}
                    <div className="mb-3">
                      <label className="block text-xs font-semibold text-brand-700 mb-1">Current Password</label>
                      <div className="relative">
                        <input
                          type={showCurrent ? 'text' : 'password'}
                          name="currentPassword"
                          value={passwordData.currentPassword}
                          onChange={handlePasswordChange}
                          className="input-field text-sm pr-10"
                          required
                        />
                        <button type="button" onClick={() => setShowCurrent(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-400 hover:text-brand-600" tabIndex={-1}>
                          {showCurrent ? <EyeOff size={15} /> : <Eye size={15} />}
                        </button>
                      </div>
                    </div>
                    {/* New */}
                    <div className="mb-3">
                      <label className="block text-xs font-semibold text-brand-700 mb-1">New Password</label>
                      <div className="relative">
                        <input
                          type={showNew ? 'text' : 'password'}
                          name="newPassword"
                          value={passwordData.newPassword}
                          onChange={handlePasswordChange}
                          className="input-field text-sm pr-10"
                          required
                          minLength={6}
                        />
                        <button type="button" onClick={() => setShowNew(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-400 hover:text-brand-600" tabIndex={-1}>
                          {showNew ? <EyeOff size={15} /> : <Eye size={15} />}
                        </button>
                      </div>
                    </div>
                    {/* Confirm */}
                    <div>
                      <label className="block text-xs font-semibold text-brand-700 mb-1">Confirm New Password</label>
                      <div className="relative">
                        <input
                          type={showConfirm ? 'text' : 'password'}
                          name="confirmNewPassword"
                          value={passwordData.confirmNewPassword}
                          onChange={handlePasswordChange}
                          className={`input-field text-sm pr-10 ${passwordData.confirmNewPassword && passwordData.newPassword !== passwordData.confirmNewPassword ? 'border-red-400' : ''}`}
                          required
                          minLength={6}
                        />
                        <button type="button" onClick={() => setShowConfirm(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-400 hover:text-brand-600" tabIndex={-1}>
                          {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
                        </button>
                      </div>
                      {passwordData.confirmNewPassword && passwordData.newPassword !== passwordData.confirmNewPassword && (
                        <p className="text-xs text-red-600 mt-1">Passwords do not match</p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setIsChangingPassword(false)} className="btn-secondary flex-1 justify-center text-sm rounded-full">
                      Cancel
                    </button>
                    <button type="submit" disabled={passwordLoading} className="btn-primary bg-purple-600 hover:bg-purple-700 border-purple-600 flex-1 justify-center text-sm rounded-full shadow-md">
                      {passwordLoading ? 'Saving...' : 'Update'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>

          {/* Account Info Card */}
          <div className="bg-white rounded-2xl shadow-md hover:shadow-lg transition-shadow overflow-hidden border border-surface-200 p-6">
            <h2 className="font-display font-bold text-lg text-brand-900 mb-4 flex items-center gap-2">
              <UserCircle size={20} className="text-purple-600" /> Account Info
            </h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-surface-100 pb-3">
                <span className="text-sm font-semibold text-brand-500 uppercase tracking-wide">Account Type</span>
                <span className="badge badge-purple font-medium">Vendor</span>
              </div>
              <div className="flex items-center justify-between pb-1">
                <span className="text-sm font-semibold text-brand-500 uppercase tracking-wide">Member Since</span>
                <span className="text-brand-900 font-medium flex items-center gap-1.5">
                  <Calendar size={14} className="text-brand-400" /> {memberSince}
                </span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default VendorProfile;
