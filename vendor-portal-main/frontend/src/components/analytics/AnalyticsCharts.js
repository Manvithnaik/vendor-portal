import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

export const LineChartTrend = ({ data, dataKey = 'revenue', xKey = 'name', title }) => (
  <div className="card p-5">
    <h3 className="font-display font-semibold text-brand-900 mb-4">{title}</h3>
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
          <XAxis dataKey={xKey} axisLine={false} tickLine={false} tick={{fill: '#64748B', fontSize: 12}} dy={10} />
          <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748B', fontSize: 12}} tickFormatter={(value) => `$${value}`} />
          <Tooltip 
            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
          />
          <Line 
            type="monotone" 
            dataKey={dataKey} 
            stroke="#4F46E5" 
            strokeWidth={3}
            dot={{ r: 4, fill: '#4F46E5', strokeWidth: 0 }}
            activeDot={{ r: 6, stroke: '#3730A3', strokeWidth: 2 }} 
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  </div>
);

export const BarChartDistribution = ({ data, dataKey = 'value', xKey = 'name', title }) => (
  <div className="card p-5">
    <h3 className="font-display font-semibold text-brand-900 mb-4">{title}</h3>
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
          <XAxis dataKey={xKey} axisLine={false} tickLine={false} tick={{fill: '#64748B', fontSize: 12}} dy={10} />
          <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748B', fontSize: 12}} />
          <Tooltip 
            cursor={{fill: '#F1F5F9'}}
            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
          />
          <Bar dataKey={dataKey} fill="#4F46E5" radius={[4, 4, 0, 0]} maxBarSize={50} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  </div>
);
