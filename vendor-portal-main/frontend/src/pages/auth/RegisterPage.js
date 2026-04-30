import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { authService } from '../../services/authService';
import { ArrowLeft, Upload, CheckCircle } from 'lucide-react';
import Toast from '../../components/common/Toast';

// ✅ Defined OUTSIDE RegisterPage so React doesn't treat it as a new
//    component type on every keystroke (which would unmount/remount the
//    input and steal focus after each character).
const Field = ({ label, name, type = 'text', required = true, placeholder, value, onChange }) => (
  <div>
    <label className="block text-sm font-medium text-brand-700 mb-1.5">{label}</label>
    <input
      type={type}
      name={name}
      value={value}
      onChange={onChange}
      required={required}
      placeholder={placeholder || label}
      className="input-field"
    />
  </div>
);

const RegisterPage = () => {
  const { role } = useParams(); // 'vendor' or 'manufacturer'
  const navigate = useNavigate();
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(false);
  const isManufacturer = role === 'manufacturer';

  const [form, setForm] = useState({
    orgName: '', email: '', phone: '',
    addressLine1: '', city: '', state: '', country: '', postalCode: '',
    contactName: '', contactEmail: '', contactPhone: '',
    industryType: '', factoryAddress: '',
    signatoryName: '', signatoryPhone: '',
    businessDoc: '',
    password: '', confirmPassword: '',
    // Manufacturer extras
    gstNumber: '', businessLicense: '', annualTurnover: '',
  });

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) {
      setToast({ message: 'Passwords do not match.', type: 'error' });
      return;
    }
    if (form.password.length < 6) {
      setToast({ message: 'Password must be at least 6 characters.', type: 'error' });
      return;
    }

    // Split signatory name into first/last (required by RegisterRequest)
    const nameParts = (form.signatoryName || form.contactName || 'User').trim().split(' ');
    const firstName = nameParts[0] || 'User';
    const lastName  = nameParts.slice(1).join(' ') || '-';

    setLoading(true);
    try {
      const data = {
        role,
        org_name:         form.orgName || form.contactName,
        email:            form.email,
        password:         form.password,
        confirm_password: form.confirmPassword,   // required by backend schema
        first_name:       firstName,              // required
        last_name:        lastName,               // required
        phone:            form.phone || undefined,
        user_phone:       form.contactPhone || undefined,
        address_line1:    form.addressLine1 || undefined,
        city:             form.city || undefined,
        state:            form.state || undefined,
        country:          form.country || undefined,
        postal_code:      form.postalCode || undefined,
      };
      await authService.register(data);
      navigate(`/application-status?email=${encodeURIComponent(form.email)}&role=${role}`);
    } catch (error) {
      setToast({ message: error.message || 'Registration failed', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-50">
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      {/* Top bar */}
      <div className="bg-white border-b border-surface-200">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-3">
          <Link to="/" className="p-2 rounded-lg hover:bg-surface-100 transition-colors">
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="font-display font-bold text-lg text-brand-900">
              {isManufacturer ? 'Manufacturer' : 'Vendor'} Registration
            </h1>
            <p className="text-sm text-brand-400">Fill out the form to submit your application</p>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Organization Details */}
          <div className="card p-6">
            <h2 className="font-display font-semibold text-brand-900 mb-4">Organization Details</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <Field label="Organization Name" name="orgName" value={form.orgName} onChange={onChange} />
              </div>
              <Field label="Email" name="email" type="email" value={form.email} onChange={onChange} />
              <Field label="Phone" name="phone" type="tel" value={form.phone} onChange={onChange} />
              <Field label="Industry Type" name="industryType" placeholder="e.g. Electronics, Textiles" value={form.industryType} onChange={onChange} />
              <div className="sm:col-span-2">
                <Field label="Factory Address" name="factoryAddress" value={form.factoryAddress} onChange={onChange} />
              </div>
            </div>
          </div>

          {/* Address */}
          <div className="card p-6">
            <h2 className="font-display font-semibold text-brand-900 mb-4">Address</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <Field label="Address Line 1" name="addressLine1" value={form.addressLine1} onChange={onChange} />
              </div>
              <Field label="City" name="city" value={form.city} onChange={onChange} />
              <Field label="State" name="state" value={form.state} onChange={onChange} />
              <Field label="Country" name="country" value={form.country} onChange={onChange} />
              <Field label="Postal Code" name="postalCode" value={form.postalCode} onChange={onChange} />
            </div>
          </div>

          {/* Contact Person */}
          <div className="card p-6">
            <h2 className="font-display font-semibold text-brand-900 mb-4">Contact Person</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Contact Name" name="contactName" value={form.contactName} onChange={onChange} />
              <Field label="Contact Email" name="contactEmail" type="email" value={form.contactEmail} onChange={onChange} />
              <Field label="Contact Phone" name="contactPhone" type="tel" value={form.contactPhone} onChange={onChange} />
            </div>
          </div>

          {/* Authorized Signatory */}
          <div className="card p-6">
            <h2 className="font-display font-semibold text-brand-900 mb-4">Authorized Signatory</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Signatory Name" name="signatoryName" value={form.signatoryName} onChange={onChange} />
              <Field label="Signatory Phone" name="signatoryPhone" type="tel" value={form.signatoryPhone} onChange={onChange} />
            </div>
          </div>

          {/* Manufacturer extras */}
          {isManufacturer && (
            <div className="card p-6">
              <h2 className="font-display font-semibold text-brand-900 mb-4">Business Verification</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="GST / Tax Number" name="gstNumber" value={form.gstNumber} onChange={onChange} />
                <Field label="Business License Number" name="businessLicense" value={form.businessLicense} onChange={onChange} />
                <Field label="Annual Turnover" name="annualTurnover" placeholder="e.g. $500,000" value={form.annualTurnover} onChange={onChange} />
              </div>
            </div>
          )}

          {/* Documents & Password */}
          <div className="card p-6">
            <h2 className="font-display font-semibold text-brand-900 mb-4">Documents & Security</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-brand-700 mb-1.5">Business Documents</label>
                <div className="flex items-center gap-3 p-3 border border-dashed border-brand-300 rounded-lg bg-surface-50">
                  <Upload size={18} className="text-brand-400" />
                  <input
                    type="file"
                    accept="application/pdf,image/*"
                    className="text-sm text-brand-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-brand-100 file:text-brand-700 hover:file:bg-brand-200"
                    onChange={(e) => {
                      const file = e.target.files[0];
                      if (!file) return;
                      setForm({ ...form, businessDoc: file.name });
                      const reader = new FileReader();
                      reader.onload = (ev) => setForm(f => ({ ...f, businessDocData: ev.target.result }));
                      reader.readAsDataURL(file);
                    }}
                  />
                </div>
              </div>
              <Field label="Password" name="password" type="password" value={form.password} onChange={onChange} />
              <Field label="Confirm Password" name="confirmPassword" type="password" value={form.confirmPassword} onChange={onChange} />
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Link to="/" className="btn-secondary">Cancel</Link>
            <button type="submit" className="btn-accent" disabled={loading}>
              <CheckCircle size={16} /> {loading ? 'Submitting...' : 'Submit Application'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RegisterPage;
