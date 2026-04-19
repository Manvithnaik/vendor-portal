import React from 'react';
import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';

const KPICard = ({ kpi, onClick }) => {
  const { label, value, trend, comparison, insight } = kpi;
  const isPositive = trend > 0;
  const isNegative = trend < 0;
  const isNeutral = trend === 0;

  return (
    <div 
      className={`card p-5 transition-shadow ${onClick ? 'cursor-pointer hover:shadow-elevated group' : ''}`}
      onClick={onClick}
    >
      <p className="text-sm text-brand-500 font-medium mb-1">{label}</p>
      <div className="flex items-end justify-between items-center mb-3">
        <h3 className="font-display font-bold text-3xl text-brand-900 group-hover:text-brand-700 transition-colors">
          {typeof value === 'number' && label.toLowerCase().includes('revenue') || label.toLowerCase().includes('spend') ? `$${value.toLocaleString()}` : value.toLocaleString()}
        </h3>
        
        <div className={`flex items-center gap-1 text-sm font-medium px-2 py-1 rounded-full ${
          isPositive ? 'bg-green-50 text-green-600' :
          isNegative ? 'bg-red-50 text-red-600' :
          'bg-surface-100 text-brand-600'
        }`}>
          {isPositive && <ArrowUpRight size={16} />}
          {isNegative && <ArrowDownRight size={16} />}
          {isNeutral && <Minus size={16} />}
          {Math.abs(trend)}%
        </div>
      </div>
      
      <p className="text-xs text-brand-400 mb-3">{comparison}</p>
      
      {insight && (
        <div className="pt-3 border-t border-surface-200">
          <p className="text-xs text-brand-600 leading-relaxed">{insight}</p>
        </div>
      )}
    </div>
  );
};

export default KPICard;
