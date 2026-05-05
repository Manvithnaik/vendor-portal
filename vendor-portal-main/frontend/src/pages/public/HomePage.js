import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight, Shield, Zap, BarChart3, Globe, ChevronDown,
  Package, Users, TrendingUp, CheckCircle
} from 'lucide-react';

const features = [
  { icon: Shield, title: 'Secure Onboarding', desc: 'End-to-end verification for vendors and manufacturers with status tracking.' },
  { icon: Zap, title: 'Instant Orders', desc: 'Manufacturers can browse products and place purchase orders in seconds.' },
  { icon: BarChart3, title: 'Real-time Tracking', desc: 'Track orders from placement through shipping to delivery.' },
  { icon: Globe, title: 'Multi-role Access', desc: 'Role-based dashboards for admins, vendors, and manufacturers.' },
];

const stats = [
  { label: 'Secure Vendor Onboarding', emoji: '🔒' },
  { label: 'Instant Order Placement', emoji: '🏭' },
  { label: '24/7 Platform Availability', emoji: '⏱️' },
];

const HomePage = () => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [dropdownOpen]);

  return (
    <div className="min-h-screen bg-surface-50">
      {/* Navigation */}
      <nav className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-surface-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-brand-800 flex items-center justify-center">
              <span className="text-white font-display font-bold text-sm">V</span>
            </div>
            <span className="font-display font-bold text-xl text-brand-900">VendorHub</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link to="/login" className="btn-ghost">Log in</Link>
            {/* Get Started dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="btn-primary"
              >
                Get Started <ChevronDown size={14} className={`transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-elevated border border-surface-300 overflow-hidden animate-fade-in">
                  <Link to="/register/vendor" onClick={() => setDropdownOpen(false)} className="block px-4 py-3 text-sm font-medium text-brand-700 hover:bg-brand-50 transition-colors">
                    Register as Vendor
                  </Link>
                  <Link to="/register/manufacturer" onClick={() => setDropdownOpen(false)} className="block px-4 py-3 text-sm font-medium text-brand-700 hover:bg-brand-50 transition-colors border-t border-surface-200">
                    Register as Manufacturer
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-800 via-brand-900 to-brand-900" />
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-72 h-72 bg-accent-400 rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-warm-400 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-24 lg:py-32">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur rounded-full text-sm text-brand-200 mb-6 animate-fade-in">
              <span className="w-2 h-2 bg-accent-400 rounded-full" />
              Trusted by 2,400+ businesses
            </div>
            <h1 className="font-display font-extrabold text-4xl sm:text-5xl lg:text-6xl text-white leading-tight mb-6 animate-fade-in">
              Connect Vendors &<br />
              <span className="text-accent-300">Manufacturers</span> Seamlessly
            </h1>
            <p className="text-lg text-brand-300 mb-8 leading-relaxed max-w-lg animate-fade-in animate-fade-in-delay-1">
              The all-in-one portal for managing vendor registrations, product catalogs, purchase orders, and shipment tracking.
            </p>
            <div className="flex flex-wrap gap-3 animate-fade-in animate-fade-in-delay-2">
              <Link to="/login" className="btn-accent text-base px-6 py-3">
                Log In <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <section className="bg-white border-b border-surface-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {stats.map((s, i) => (
              <div key={i} className="flex items-center gap-4 justify-center">
                <div className="w-10 h-10 rounded-lg bg-brand-50 flex items-center justify-center text-xl shrink-0">
                  {s.emoji}
                </div>
                <div>
                  <p className="font-display font-bold text-base text-brand-900 leading-tight">{s.label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-20">
        <div className="text-center mb-12">
          <h2 className="font-display font-bold text-3xl text-brand-900 mb-3">Everything you need</h2>
          <p className="text-brand-400 max-w-md mx-auto">A complete platform for vendor-manufacturer collaboration, from onboarding to delivery.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {features.map((f, i) => (
            <div key={i} className={`card p-6 hover:shadow-elevated transition-shadow animate-fade-in animate-fade-in-delay-${i % 4}`}>
              <div className="w-10 h-10 rounded-lg bg-accent-50 flex items-center justify-center mb-4">
                <f.icon size={20} className="text-accent-600" />
              </div>
              <h3 className="font-display font-semibold text-brand-900 mb-2">{f.title}</h3>
              <p className="text-sm text-brand-400 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="bg-brand-900 text-white py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <h2 className="font-display font-bold text-3xl mb-12 text-center">How it works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { step: '01', title: 'Register & Verify', desc: 'Submit your application with business documents. Our admin team reviews and approves.' },
              { step: '02', title: 'Set Up & Connect', desc: 'Vendors list products, manufacturers browse and discover suppliers.' },
              { step: '03', title: 'Order & Track', desc: 'Place purchase orders and track shipments in real-time through delivery.' },
            ].map((item, i) => (
              <div key={i} className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-accent-600/20 text-accent-300 font-display font-bold text-lg mb-4">
                  {item.step}
                </div>
                <h3 className="font-display font-semibold text-lg mb-2">{item.title}</h3>
                <p className="text-brand-300 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-20 text-center">
        <h2 className="font-display font-bold text-3xl text-brand-900 mb-4">Ready to get started?</h2>
        <p className="text-brand-400 mb-8 max-w-md mx-auto">Join thousands of businesses already using VendorHub.</p>
        <div className="flex justify-center gap-3">
          <Link to="/register/vendor" className="btn-primary text-base px-6 py-3">Register as Vendor</Link>
          <Link to="/register/manufacturer" className="btn-secondary text-base px-6 py-3">Register as Manufacturer</Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-surface-200 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-brand-800 flex items-center justify-center">
              <span className="text-white font-display font-bold text-xs">V</span>
            </div>
            <span className="font-display font-semibold text-sm text-brand-700">VendorHub</span>
          </div>
          <p className="text-xs text-brand-400">&copy; {new Date().getFullYear()} VendorHub. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;
