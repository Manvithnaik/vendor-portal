import React from 'react';
import { RotateCcw } from 'lucide-react';

const VendorReturns = () => (
  <div className="space-y-6 animate-fade-in">
    <div>
      <h1 className="font-display font-bold text-2xl text-brand-900">Returns</h1>
      <p className="text-sm text-brand-400 mt-1">Manage return requests from manufacturers.</p>
    </div>
    <div className="card p-12 text-center">
      <RotateCcw size={40} className="text-brand-200 mx-auto mb-3" />
      <p className="text-brand-400">No return requests at this time.</p>
    </div>
  </div>
);

export default VendorReturns;
