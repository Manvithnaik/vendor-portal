import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { UserCircle, Mail, MapPin, Building, Edit2, Save, X, Key, Lock, CheckCircle, Calendar, FileText } from 'lucide-react';
import apiClient from '../../api/client';
import Toast from '../../components/common/Toast';

const ManufacturerProfile = () => {
  const { user } = useAuth();
  
  const [toast, setToast] = useState(null);
  
  // Profile State
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileData, setProfileData] = useState({
    name: '',
    phone: '',
    address_line1: '',
    city: '',
    state: '',
    country: '',
    postal_code: '',
    industry_type: '',
    factory_address: '',
    contact_name: '',
    contact_email: '',
    contact_phone: ''
  });

  // Password State
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmNewPassword: ''
  });
  const [passwordLoading, setPasswordLoading] = useState(false);

  const fetchProfile = async () => {
    if (!user) return;
    try {
      const response = await apiClient.get(`/organizations/${user.org_id}`);
      if (response && response.data) {
        const org = response.data;
        setProfileData({
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
          contact_phone: org.contact_phone || user.phone || ''
        });
      }
    } catch (error) {
      setToast({ message: 'Failed to load organization details.', type: 'error' });
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [user]);

  if (!user || !profileData.name) {
    return (
      <div className="card p-8 text-center rounded-2xl shadow-md">
        <p className="text-brand-400">Loading profile data...</p>
      </div>
    );
  }

  // Handle Profile Update
  const handleProfileChange = (e) => {
    setProfileData({ ...profileData, [e.target.name]: e.target.value });
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      await apiClient.put(`/organizations/${user.org_id}`, profileData);
      setToast({ message: 'Profile updated successfully!', type: 'success' });
      setIsEditingProfile(false);
      await fetchProfile(); // Re-fetch to guarantee sync with DB
    } catch (error) {
      setToast({ message: error.message || 'Failed to update profile.', type: 'error' });
    } finally {
      setSavingProfile(false);
    }
  };

  // Handle Password Update
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

  // Helper to render values
  const renderValue = (val) => val ? <span className="text-brand-900 font-medium">{val}</span> : <span className="text-brand-400 italic">Not provided</span>;

  // Format member since date safely
  const memberSince = user.created_at ? new Date(user.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : 'Recently joined';

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
      
      {/* --- HERO HEADER CARD --- */}
      <div className="bg-white rounded-2xl shadow-md hover:shadow-lg transition-shadow overflow-hidden">
        <div className="h-32 bg-gradient-to-r from-indigo-600 to-purple-600 w-full relative"></div>
        <div className="px-6 pb-6 relative flex flex-col items-center">
          <div className="w-24 h-24 rounded-full bg-white flex items-center justify-center shadow-lg -mt-12 mb-3 border-4 border-white">
            <span className="font-display font-bold text-4xl text-indigo-700">
              {(profileData.name || 'M').charAt(0).toUpperCase()}
            </span>
          </div>
          <h2 className="font-display font-bold text-3xl text-brand-900 text-center">{profileData.name || 'Organization Name'}</h2>
          <p className="text-sm text-brand-500 flex items-center gap-2 mt-1 mb-4">
            <Mail size={16} className="text-brand-400" /> {user.email}
          </p>
          <div className="flex items-center gap-2 bg-green-50 text-green-700 px-4 py-1.5 rounded-full border border-green-200 shadow-sm">
            <CheckCircle size={16} className="text-green-600 animate-pulse" />
            <span className="text-sm font-semibold uppercase tracking-wider">Approved Manufacturer</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* --- LEFT COLUMN: INFO CARDS & EDIT --- */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Main Container for Info */}
          <div className="bg-white rounded-2xl shadow-md hover:shadow-lg transition-shadow overflow-hidden border border-surface-200">
            <div className="bg-surface-50 px-6 py-4 border-b border-surface-200 flex items-center justify-between">
              <div className="flex items-center gap-2 text-brand-900">
                <Building size={20} className="text-indigo-600" />
                <h2 className="font-display font-bold text-lg">Organization Profile</h2>
              </div>
              {!isEditingProfile && (
                <button 
                  onClick={() => setIsEditingProfile(true)}
                  className="btn-secondary text-sm py-1.5 px-4 rounded-full border-indigo-200 text-indigo-700 hover:bg-indigo-50 transition-colors"
                >
                  <Edit2 size={14} className="mr-1.5" /> Edit Profile
                </button>
              )}
            </div>

            <div className="p-6">
              {isEditingProfile ? (
                /* EDIT FORM */
                <form onSubmit={handleProfileSubmit} className="space-y-6 animate-fade-in">
                  <div className="bg-surface-50 p-5 rounded-xl border border-surface-200 border-l-4 border-l-indigo-500">
                    <h3 className="font-semibold text-brand-900 mb-4 flex items-center gap-2"><Building size={16}/> Organization Details</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-brand-600 mb-1 uppercase tracking-wide">Organization Name</label>
                        <input type="text" name="name" value={profileData.name} onChange={handleProfileChange} className="input-field shadow-sm" required />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-brand-600 mb-1 uppercase tracking-wide">Industry Type</label>
                        <input type="text" name="industry_type" value={profileData.industry_type} onChange={handleProfileChange} className="input-field shadow-sm" />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-brand-600 mb-1 uppercase tracking-wide">Phone Number</label>
                        <input type="tel" name="phone" value={profileData.phone} onChange={handleProfileChange} className="input-field shadow-sm" />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-semibold text-brand-600 mb-1 uppercase tracking-wide">Factory Address</label>
                        <input type="text" name="factory_address" value={profileData.factory_address} onChange={handleProfileChange} className="input-field shadow-sm" />
                      </div>
                    </div>
                  </div>

                  <div className="bg-surface-50 p-5 rounded-xl border border-surface-200 border-l-4 border-l-purple-500">
                    <h3 className="font-semibold text-brand-900 mb-4 flex items-center gap-2"><UserCircle size={16}/> Contact Person</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-brand-600 mb-1 uppercase tracking-wide">Contact Name</label>
                        <input type="text" name="contact_name" value={profileData.contact_name} onChange={handleProfileChange} className="input-field shadow-sm" />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-brand-600 mb-1 uppercase tracking-wide">Contact Email</label>
                        <input type="email" name="contact_email" value={profileData.contact_email} onChange={handleProfileChange} className="input-field shadow-sm" />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-brand-600 mb-1 uppercase tracking-wide">Contact Phone</label>
                        <input type="tel" name="contact_phone" value={profileData.contact_phone} onChange={handleProfileChange} className="input-field shadow-sm" />
                      </div>
                    </div>
                  </div>

                  <div className="bg-surface-50 p-5 rounded-xl border border-surface-200 border-l-4 border-l-indigo-500">
                    <h3 className="font-semibold text-brand-900 mb-4 flex items-center gap-2"><MapPin size={16}/> Billing / Main Address</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-semibold text-brand-600 mb-1 uppercase tracking-wide">Address</label>
                        <input type="text" name="address_line1" value={profileData.address_line1} onChange={handleProfileChange} className="input-field shadow-sm" />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-brand-600 mb-1 uppercase tracking-wide">City</label>
                        <input type="text" name="city" value={profileData.city} onChange={handleProfileChange} className="input-field shadow-sm" />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-brand-600 mb-1 uppercase tracking-wide">State</label>
                        <input type="text" name="state" value={profileData.state} onChange={handleProfileChange} className="input-field shadow-sm" />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-brand-600 mb-1 uppercase tracking-wide">Country</label>
                        <input type="text" name="country" value={profileData.country} onChange={handleProfileChange} className="input-field shadow-sm" />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-brand-600 mb-1 uppercase tracking-wide">Postal Code</label>
                        <input type="text" name="postal_code" value={profileData.postal_code} onChange={handleProfileChange} className="input-field shadow-sm" />
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-4">
                    <button type="button" onClick={() => setIsEditingProfile(false)} className="btn-secondary px-5 rounded-full">
                      <X size={16} className="mr-1.5"/> Cancel
                    </button>
                    <button type="submit" disabled={savingProfile} className="btn-primary bg-indigo-600 hover:bg-indigo-700 border-indigo-600 px-6 rounded-full shadow-md hover:shadow-lg transition-all">
                      <Save size={16} className="mr-1.5"/> {savingProfile ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </form>
              ) : (
                /* READ-ONLY VIEW */
                <div className="space-y-6">
                  {/* Organization Section */}
                  <div className="bg-white p-5 rounded-xl border border-surface-200 border-l-4 border-l-indigo-500 shadow-sm">
                    <h3 className="font-semibold text-brand-900 mb-4 flex items-center gap-2 border-b border-surface-100 pb-2"><Building size={18} className="text-indigo-600"/> Organization Details</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-8">
                      <div className="border-b border-surface-50 pb-2">
                        <p className="text-xs uppercase tracking-wider font-semibold text-brand-400 mb-1">Organization Name</p>
                        {renderValue(profileData.name)}
                      </div>
                      <div className="border-b border-surface-50 pb-2">
                        <p className="text-xs uppercase tracking-wider font-semibold text-brand-400 mb-1">Industry Type</p>
                        {renderValue(profileData.industry_type)}
                      </div>
                      <div className="border-b border-surface-50 pb-2">
                        <p className="text-xs uppercase tracking-wider font-semibold text-brand-400 mb-1">Phone Number</p>
                        {renderValue(profileData.phone)}
                      </div>
                      <div className="sm:col-span-2 border-b border-surface-50 pb-2">
                        <p className="text-xs uppercase tracking-wider font-semibold text-brand-400 mb-1">Factory Address</p>
                        {renderValue(profileData.factory_address)}
                      </div>
                    </div>
                  </div>

                  {/* Contact Person Section */}
                  <div className="bg-white p-5 rounded-xl border border-surface-200 border-l-4 border-l-purple-500 shadow-sm">
                    <h3 className="font-semibold text-brand-900 mb-4 flex items-center gap-2 border-b border-surface-100 pb-2"><UserCircle size={18} className="text-purple-600"/> Contact Person</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-y-4 gap-x-6">
                      <div className="border-b border-surface-50 pb-2">
                        <p className="text-xs uppercase tracking-wider font-semibold text-brand-400 mb-1">Name</p>
                        {renderValue(profileData.contact_name)}
                      </div>
                      <div className="border-b border-surface-50 pb-2">
                        <p className="text-xs uppercase tracking-wider font-semibold text-brand-400 mb-1">Email</p>
                        <div className="truncate">{renderValue(profileData.contact_email)}</div>
                      </div>
                      <div className="border-b border-surface-50 pb-2">
                        <p className="text-xs uppercase tracking-wider font-semibold text-brand-400 mb-1">Phone</p>
                        {renderValue(profileData.contact_phone)}
                      </div>
                    </div>
                  </div>

                  {/* Billing Address Section */}
                  <div className="bg-white p-5 rounded-xl border border-surface-200 border-l-4 border-l-indigo-500 shadow-sm">
                    <h3 className="font-semibold text-brand-900 mb-4 flex items-center gap-2 border-b border-surface-100 pb-2"><MapPin size={18} className="text-indigo-600"/> Billing / Main Address</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-8">
                      <div className="sm:col-span-2 border-b border-surface-50 pb-2">
                        <p className="text-xs uppercase tracking-wider font-semibold text-brand-400 mb-1">Address</p>
                        {renderValue(profileData.address_line1)}
                      </div>
                      <div className="border-b border-surface-50 pb-2">
                        <p className="text-xs uppercase tracking-wider font-semibold text-brand-400 mb-1">City</p>
                        {renderValue(profileData.city)}
                      </div>
                      <div className="border-b border-surface-50 pb-2">
                        <p className="text-xs uppercase tracking-wider font-semibold text-brand-400 mb-1">State & Country</p>
                        {renderValue(profileData.state && profileData.country ? `${profileData.state}, ${profileData.country}` : (profileData.state || profileData.country || ''))}
                      </div>
                      <div className="border-b border-surface-50 pb-2">
                        <p className="text-xs uppercase tracking-wider font-semibold text-brand-400 mb-1">Postal Code</p>
                        {renderValue(profileData.postal_code)}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Business Verification Card - Unique to Manufacturer */}
          <div className="bg-white rounded-2xl shadow-md hover:shadow-lg transition-shadow overflow-hidden border border-surface-200">
            <div className="bg-surface-50 px-6 py-4 border-b border-surface-200 flex items-center gap-2 text-brand-900">
              <FileText size={20} className="text-purple-600" />
              <h2 className="font-display font-bold text-lg">Business Verification</h2>
            </div>
            <div className="p-6">
               <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="border-b sm:border-b-0 sm:border-r border-surface-100 pb-3 sm:pb-0 sm:pr-4">
                    <p className="text-xs uppercase tracking-wider font-semibold text-brand-400 mb-1">GST / Tax Number</p>
                    {renderValue(user.gst_number)}
                  </div>
                  <div className="border-b sm:border-b-0 sm:border-r border-surface-100 pb-3 sm:pb-0 sm:px-4">
                    <p className="text-xs uppercase tracking-wider font-semibold text-brand-400 mb-1">Business License</p>
                    {renderValue(user.business_license)}
                  </div>
                  <div className="sm:pl-4">
                    <p className="text-xs uppercase tracking-wider font-semibold text-brand-400 mb-1">Annual Turnover</p>
                    {renderValue(user.annual_turnover)}
                  </div>
               </div>
               <div className="mt-5 pt-4 border-t border-surface-100 bg-surface-50 -mx-6 -mb-6 px-6 py-4">
                 <p className="text-xs text-brand-500 italic flex items-center gap-2">
                   <Lock size={12}/> Verification details are strictly managed by the admin. Please contact support to update these fields.
                 </p>
               </div>
            </div>
          </div>
        </div>

        {/* --- RIGHT COLUMN: SECURITY & ACCOUNT INFO --- */}
        <div className="space-y-6">
          
          {/* Security Settings Card */}
          <div className="bg-white rounded-2xl shadow-md hover:shadow-lg transition-shadow overflow-hidden border border-surface-200">
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-4 shadow-inner">
                <Lock size={28} className="text-indigo-600" />
              </div>
              <h2 className="font-display font-bold text-xl text-brand-900 mb-1">Password & Security</h2>
              <p className="text-sm text-brand-500 mb-6">Keep your account secure by updating your password regularly.</p>
              
              {!isChangingPassword ? (
                <button 
                  onClick={() => setIsChangingPassword(true)}
                  className="btn-primary w-full justify-center bg-indigo-600 hover:bg-indigo-700 border-indigo-600 rounded-full shadow-md py-2.5"
                >
                  <Key size={16} className="mr-2" /> Change Password
                </button>
              ) : (
                <form onSubmit={handlePasswordSubmit} className="space-y-4 animate-fade-in text-left">
                  <div className="bg-surface-50 p-4 rounded-xl border border-surface-200">
                    <div className="mb-3">
                      <label className="block text-xs font-semibold text-brand-700 mb-1">Current Password</label>
                      <input 
                        type="password" 
                        name="currentPassword" 
                        value={passwordData.currentPassword} 
                        onChange={handlePasswordChange} 
                        className="input-field text-sm shadow-sm focus:ring-indigo-500 focus:border-indigo-500" 
                        required 
                      />
                    </div>
                    <div className="mb-3">
                      <label className="block text-xs font-semibold text-brand-700 mb-1">New Password</label>
                      <input 
                        type="password" 
                        name="newPassword" 
                        value={passwordData.newPassword} 
                        onChange={handlePasswordChange} 
                        className="input-field text-sm shadow-sm focus:ring-indigo-500 focus:border-indigo-500" 
                        required 
                        minLength={6}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-brand-700 mb-1">Confirm New Password</label>
                      <input 
                        type="password" 
                        name="confirmNewPassword" 
                        value={passwordData.confirmNewPassword} 
                        onChange={handlePasswordChange} 
                        className="input-field text-sm shadow-sm focus:ring-indigo-500 focus:border-indigo-500" 
                        required 
                        minLength={6}
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setIsChangingPassword(false)} className="btn-secondary flex-1 justify-center text-sm rounded-full">
                      Cancel
                    </button>
                    <button type="submit" disabled={passwordLoading} className="btn-primary bg-indigo-600 hover:bg-indigo-700 border-indigo-600 flex-1 justify-center text-sm rounded-full shadow-md">
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
               <UserCircle size={20} className="text-indigo-600" /> Account Info
             </h2>
             <div className="space-y-4">
               <div className="flex items-center justify-between border-b border-surface-100 pb-3">
                 <span className="text-sm font-semibold text-brand-500 uppercase tracking-wide">Account Type</span>
                 <span className="badge badge-purple font-medium">Manufacturer</span>
               </div>
               <div className="flex items-center justify-between pb-1">
                 <span className="text-sm font-semibold text-brand-500 uppercase tracking-wide">Member Since</span>
                 <span className="text-brand-900 font-medium flex items-center gap-1.5"><Calendar size={14} className="text-brand-400"/> {memberSince}</span>
               </div>
             </div>
          </div>

        </div>

      </div>
    </div>
  );
};

export default ManufacturerProfile;
