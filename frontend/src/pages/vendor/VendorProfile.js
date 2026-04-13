import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { UserCircle, Mail, Phone, MapPin, Building, Factory } from 'lucide-react';

const VendorProfile = () => {
  const { user } = useAuth();
  
  // Map API user object to the expected structure
  const app = user ? {
    orgName: user.org_name || `Org #${user.org_id}`,
    contactName: user.full_name || `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.name,
    contactEmail: user.email,
    contactPhone: user.phone,
    email: user.email,
    industryType: user.industry_type || '',
    factoryAddress: user.factory_address || '',
    addressLine1: user.address || '',
    city: user.city || '',
    state: user.state || '',
    country: user.country || '',
    postalCode: user.postal_code || ''
  } : null;

  if (!app) {
    return (
      <div className="card p-8 text-center">
        <p className="text-brand-400">Loading profile data...</p>
      </div>
    );
  }


  const sections = [
    { title: 'Organization', icon: Building, fields: [
      ['Organization Name', app.orgName],
      ['Industry Type', app.industryType],
      ['Factory Address', app.factoryAddress],
    ]},
    { title: 'Contact', icon: UserCircle, fields: [
      ['Contact Name', app.contactName],
      ['Contact Email', app.contactEmail],
      ['Contact Phone', app.contactPhone],
    ]},
    { title: 'Address', icon: MapPin, fields: [
      ['Address', app.addressLine1],
      ['City', app.city],
      ['State', app.state],
      ['Country', app.country],
      ['Postal Code', app.postalCode],
    ]},
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="font-display font-bold text-2xl text-brand-900">My Profile</h1>
        <p className="text-sm text-brand-400 mt-1">Your account and organization details.</p>
      </div>

      {/* Header card */}
      <div className="card p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="w-14 h-14 rounded-xl bg-brand-100 flex items-center justify-center">
          <span className="font-display font-bold text-xl text-brand-700">
            {(app.orgName || 'V').charAt(0).toUpperCase()}
          </span>
        </div>
        <div>
          <h2 className="font-display font-bold text-xl text-brand-900">{app.orgName}</h2>
          <p className="text-sm text-brand-400 flex items-center gap-1.5 mt-0.5">
            <Mail size={13} /> {app.email}
          </p>
        </div>
        <span className="badge badge-approved ml-auto">Approved</span>
      </div>

      {/* Detail sections */}
      {sections.map((s, i) => (
        <div key={i} className="card p-6">
          <div className="flex items-center gap-2 mb-4">
            <s.icon size={18} className="text-brand-500" />
            <h2 className="font-display font-semibold text-brand-900">{s.title}</h2>
          </div>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
            {s.fields.map(([label, val]) => (
              <div key={label}>
                <dt className="text-brand-400">{label}</dt>
                <dd className="font-medium text-brand-800">{val || '—'}</dd>
              </div>
            ))}
          </dl>
        </div>
      ))}
    </div>
  );
};

export default VendorProfile;
