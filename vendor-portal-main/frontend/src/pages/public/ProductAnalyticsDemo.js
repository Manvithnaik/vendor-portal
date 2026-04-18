import React, { useState } from 'react';
import { 
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, LineChart, Line 
} from 'recharts';
import { Star, FileText, CheckCircle, Shield, Filter, Lock, ThumbsUp, ThumbsDown, MessageSquare } from 'lucide-react';

const mockReviews = [
  { id: 1, company: 'AeroTech Dynamics', industry: 'Aerospace', po: 'PO-7392-2024', date: '2023-11-15', overall: 4.8, params: { quality: 5, consistency: 5, packaging: 4, specs: 5, value: 4, communication: 5 }, tags: ['Consistent quality', 'True to spec'], text: 'The aluminum alloy sheets met all our aerospace grade requirements. Very slight issue with an outer packaging pallet being dented, but material was unharmed.', doc: true, helpful: 14, notHelpful: 0 },
  { id: 2, company: 'Delta Auto Parts', industry: 'Automotive', po: 'PO-8812-2024', date: '2023-12-02', overall: 3.5, params: { quality: 4, consistency: 3, packaging: 3, specs: 4, value: 3, communication: 4 }, tags: ['Batch variation', 'Delayed delivery'], text: 'Quality was acceptable for the price point, but we noticed slight batch variations in thickness tolerance. Delivery was delayed by 3 days.', doc: false, helpful: 8, notHelpful: 1 },
  { id: 3, company: 'PharmaTech India', industry: 'Pharmaceuticals', po: 'PO-9001-2024', date: '2024-01-20', overall: 5.0, params: { quality: 5, consistency: 5, packaging: 5, specs: 5, value: 4, communication: 5 }, tags: ['Great packaging', 'Highly recommended'], text: 'Outstanding cleanroom packaging. Lab reports matched perfectly. Communication from their sales head was phenomenal during the RFQ phase.', doc: true, helpful: 22, notHelpful: 0 },
  { id: 4, company: 'BuildWell Corp', industry: 'Construction', po: 'PO-9122-2024', date: '2024-02-14', overall: 4.2, params: { quality: 4, consistency: 4, packaging: 4, specs: 5, value: 5, communication: 3 }, tags: ['Great value'], text: 'Good pricing for bulk orders. Customer service was a bit slow to respond to our shipment tracking inquiries, but the product itself is solid.', doc: false, helpful: 5, notHelpful: 2 },
  { id: 5, company: 'ElectroManufact', industry: 'Electronics', po: 'PO-9304-2024', date: '2024-03-01', overall: 2.8, params: { quality: 3, consistency: 2, packaging: 2, specs: 4, value: 3, communication: 3 }, tags: ['Poor labeling', 'Batch variation'], text: 'We had to resort to rigorous internal QA because the labeling on the reels was smudged on multiple batches. Tolerance is barely passing.', doc: true, helpful: 19, notHelpful: 3 },
  { id: 6, company: 'Global MedTech', industry: 'Medical Devices', po: 'PO-9411-2024', date: '2024-03-15', overall: 4.7, params: { quality: 5, consistency: 5, packaging: 4, specs: 5, value: 4, communication: 5 }, tags: ['Consistent quality', 'True to spec'], text: 'Materials passed all our ISO audits without a hitch. The vendor provided excellent documentation.', doc: true, helpful: 11, notHelpful: 0 },
  { id: 7, company: 'SunPower Solar', industry: 'Renewable Energy', po: 'PO-9520-2024', date: '2024-04-05', overall: 4.0, params: { quality: 4, consistency: 4, packaging: 3, specs: 4, value: 5, communication: 4 }, tags: ['Great value'], text: 'Extremely cost-effective for our scale. Packaging should ideally be more weather-resistant as some crates arrived damp.', doc: false, helpful: 7, notHelpful: 1 },
  { id: 8, company: 'Nova Robotics', industry: 'Robotics', po: 'PO-9605-2024', date: '2024-04-10', overall: 4.5, params: { quality: 5, consistency: 4, packaging: 5, specs: 5, value: 3, communication: 5 }, tags: ['Great packaging', 'True to spec'], text: 'Precision is spot on for our CNC tolerances. Highly reliable vendor, although slightly on the pricier side.', doc: true, helpful: 15, notHelpful: 0 },
];

const radarData = [
  { subject: 'Material Quality', score: 4.5, fullMark: 5 },
  { subject: 'Consistency', score: 4.0, fullMark: 5 },
  { subject: 'Packaging', score: 3.8, fullMark: 5 },
  { subject: 'Match to Specs', score: 4.6, fullMark: 5 },
  { subject: 'Value for Price', score: 3.9, fullMark: 5 },
  { subject: 'Communication', score: 4.3, fullMark: 5 },
];

const trendData = [
  { month: 'May', rating: 4.0 }, { month: 'Jun', rating: 4.1 }, { month: 'Jul', rating: 4.0 },
  { month: 'Aug', rating: 4.2 }, { month: 'Sep', rating: 4.3 }, { month: 'Oct', rating: 4.1 },
  { month: 'Nov', rating: 4.4 }, { month: 'Dec', rating: 4.5 }, { month: 'Jan', rating: 4.3 },
  { month: 'Feb', rating: 4.3 }, { month: 'Mar', rating: 4.6 }, { month: 'Apr', rating: 4.5 }
];

const distributionData = [
  { stars: '5 Stars', count: 4 },
  { stars: '4 Stars', count: 3 },
  { stars: '3 Stars', count: 0 },
  { stars: '2 Stars', count: 1 },
  { stars: '1 Star', count: 0 },
];

export default function ProductAnalyticsDemo() {
  const [role, setRole] = useState('verified_manufacturer');
  const [hasRated, setHasRated] = useState(false);
  const [filterStar, setFilterStar] = useState('All');

  const filteredReviews = mockReviews.filter(r => {
    if (filterStar === 'All') return true;
    return Math.floor(r.overall) === parseInt(filterStar);
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans pb-20">
      
      {/* Top Demo Bar */}
      <div className="bg-slate-900 text-white p-4 shadow-md sticky top-0 z-50 flex flex-wrap justify-between items-center gap-4">
        <div className="flex items-center gap-3">
          <Shield className="text-emerald-400" size={24} />
          <h1 className="font-bold text-lg">Product Analytics Demo (Manufacturer Ratings)</h1>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-slate-300">View as Role:</label>
          <select 
            className="bg-slate-800 border border-slate-700 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            value={role}
            onChange={(e) => setRole(e.target.value)}
          >
            <option value="buyer">Future Buyer (No Purchase)</option>
            <option value="verified_manufacturer">Verified Manufacturer (Has PO)</option>
            <option value="vendor">Vendor (The Seller)</option>
          </select>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 space-y-8">
        
        {/* 1. Header Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8 flex flex-col md:flex-row items-start gap-8 relative overflow-hidden">
          <div className="w-full md:w-48 h-48 bg-slate-100 rounded-xl flex items-center justify-center flex-shrink-0 border border-slate-200">
            <span className="text-slate-400 text-sm font-medium">Product Image Placeholder</span>
          </div>
          <div className="flex-1 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs font-bold tracking-wider text-emerald-600 uppercase bg-emerald-50 px-2 py-1 rounded-md">Industrial Raw Material</span>
                <h1 className="text-3xl font-extrabold text-slate-900 mt-2">Premium Aluminum Alloy Sheet (Grade 6061)</h1>
                <p className="text-slate-500 mt-1">SKU: AL-6061-SHT-01</p>
              </div>
              <div className="hidden sm:flex items-center bg-slate-50 rounded-lg p-3 border border-slate-100 shadow-sm">
                <CheckCircle className="text-blue-500 mr-2" size={20} />
                <div className="text-sm">
                  <p className="font-bold text-slate-800">Apex Metals Inc.</p>
                  <p className="text-slate-500 text-xs">Verified Vendor</p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-6 mt-4">
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-black text-slate-900">4.2</span>
                <Star className="text-yellow-400 fill-yellow-400" size={28} />
              </div>
              <div className="h-10 w-px bg-slate-200"></div>
              <div>
                <p className="text-sm font-bold text-slate-800">Rated by Verified Manufacturers</p>
                <p className="text-xs text-slate-500 underline decoration-dashed cursor-help">Based on 8 confirmed purchase orders</p>
              </div>
            </div>
          </div>
        </div>

        {/* 2. Rating Analytics Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Radar Chart */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 lg:col-span-1">
            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Filter size={18} className="text-emerald-600" />
              Parameter Breakdown
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart outerRadius="70%" data={radarData}>
                  <PolarGrid stroke="#e2e8f0" />
                  <PolarAngleAxis dataKey="subject" tick={{fill: '#475569', fontSize: 11}} />
                  <PolarRadiusAxis angle={30} domain={[0, 5]} tick={{fontSize: 10}} />
                  <Radar name="Manufacturer Score" dataKey="score" stroke="#059669" fill="#10b981" fillOpacity={0.6} />
                  <Tooltip />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Bar Chart & Trends */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 lg:col-span-2 flex flex-col sm:flex-row gap-8">
            <div className="flex-1">
              <h3 className="font-bold text-slate-800 mb-4">Rating Distribution</h3>
              <div className="h-48">
                 <ResponsiveContainer width="100%" height="100%">
                    <BarChart layout="vertical" data={distributionData} margin={{top: 0, right: 20, left: -20, bottom: 0}}>
                      <XAxis type="number" hide />
                      <YAxis dataKey="stars" type="category" tick={{fill: '#475569', fontSize: 12}} axisLine={false} tickLine={false} />
                      <Tooltip cursor={{fill: '#f8fafc'}} />
                      <Bar dataKey="count" fill="#fbbf24" radius={[0, 4, 4, 0]} barSize={16} />
                    </BarChart>
                 </ResponsiveContainer>
              </div>
            </div>
            <div className="flex-1 border-t sm:border-l sm:border-t-0 border-slate-100 pt-6 sm:pt-0 sm:pl-8">
              <h3 className="font-bold text-slate-800 mb-4">12-Month Trend</h3>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendData} margin={{top: 5, right: 5, left: -25, bottom: 0}}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="month" tick={{fontSize: 10, fill: '#64748b'}} axisLine={false} tickLine={false} />
                    <YAxis domain={[1, 5]} tick={{fontSize: 10, fill: '#64748b'}} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                    <Line type="monotone" dataKey="rating" stroke="#059669" strokeWidth={3} dot={{r: 4, fill: '#059669', strokeWidth: 2, stroke: '#fff'}} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>

        {/* Sentiment Tags */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-wrap gap-3 items-center">
          <span className="text-sm font-bold text-slate-700 mr-2">Top Insights:</span>
          <span className="px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-xs font-semibold">✓ Consistent quality (3)</span>
          <span className="px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-xs font-semibold">✓ Great packaging (2)</span>
          <span className="px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-xs font-semibold">✓ True to spec (2)</span>
          <span className="px-3 py-1 bg-red-50 text-red-600 border border-red-200 rounded-full text-xs font-semibold">⚠ Batch variation (2)</span>
        </div>

        {/* 5. Vendor Specific Analytics (Private) */}
        {role === 'vendor' && (
          <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-6 shadow-sm">
             <div className="flex items-center gap-2 mb-4 text-indigo-800">
               <Lock size={20} />
               <h2 className="font-bold text-lg">Vendor Private Insights</h2>
             </div>
             <p className="text-sm text-indigo-600 mb-6 font-medium">This section is only visible to you. It contains non-anonymized data to help you improve your service.</p>
             
             <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
               <div className="bg-white rounded-xl p-5 border border-indigo-100 shadow-sm">
                 <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Weakest Parameter</p>
                 <p className="text-xl font-black text-slate-800 mt-1">Packaging (3.8)</p>
                 <p className="text-sm text-red-500 mt-2 flex items-center"><ArrowDown size={14} className="mr-1"/> Mentioned negatively in 2 reviews</p>
               </div>
               <div className="bg-white rounded-xl p-5 border border-indigo-100 shadow-sm">
                 <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Top Industry Score</p>
                 <p className="text-xl font-black text-slate-800 mt-1">Pharma (5.0)</p>
                 <p className="text-sm text-slate-600 mt-2">Highest volume buyer segment.</p>
               </div>
               <div className="bg-white rounded-xl p-5 border border-indigo-100 shadow-sm">
                 <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Lowest Industry Score</p>
                 <p className="text-xl font-black text-slate-800 mt-1">Electronics (2.8)</p>
                 <p className="text-sm text-slate-600 mt-2">Action needed regarding tolerances.</p>
               </div>
             </div>
          </div>
        )}

        {/* 4. Submit Rating Box */}
        {(role === 'verified_manufacturer' || role === 'buyer') && (
          <div className={`rounded-2xl p-6 shadow-sm border ${role === 'buyer' || hasRated ? 'bg-slate-50 border-slate-200' : 'bg-white border-emerald-200 shadow-emerald-100'}`}>
             {role === 'buyer' ? (
                <div className="flex flex-col items-center justify-center py-6 text-center">
                  <div className="w-12 h-12 bg-slate-200 rounded-full flex items-center justify-center mb-4">
                    <Lock className="text-slate-500" size={24} />
                  </div>
                  <h3 className="font-bold text-slate-800 text-lg">Leave a Rating</h3>
                  <p className="text-slate-500 mt-2 max-w-md">Only verified manufacturers with a confirmed purchase order can submit reviews for this product.</p>
                  <button disabled className="mt-4 px-6 py-2 bg-slate-200 text-slate-400 font-bold rounded-lg cursor-not-allowed">Purchase to Unlock Ratings</button>
                </div>
             ) : hasRated ? (
                <div className="flex flex-col items-center justify-center py-6 text-center">
                  <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mb-4">
                    <CheckCircle className="text-emerald-600" size={24} />
                  </div>
                  <h3 className="font-bold text-slate-800 text-lg">Review Submitted</h3>
                  <p className="text-slate-500 mt-2">Thank you! Your verified rating is now under moderation and will be published soon.</p>
                </div>
             ) : (
                <div className="space-y-6">
                  <div>
                    <h2 className="font-bold text-xl text-slate-800">Rate your recent purchase</h2>
                    <p className="text-sm text-slate-500">PO-9912-2024 · Delivered on May 10, 2024</p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6 bg-slate-50 p-6 rounded-xl border border-slate-200">
                    {['Material Quality', 'Consistency', 'Packaging & Delivery', 'Match to Specs', 'Value for Price', 'Vendor Communication'].map(param => (
                       <div key={param} className="flex justify-between items-center">
                         <span className="text-sm font-medium text-slate-700">{param}</span>
                         <div className="flex gap-1">
                           {[1,2,3,4,5].map(s => (
                             <Star key={s} size={20} className="text-slate-300 hover:text-yellow-400 cursor-pointer transition-colors" />
                           ))}
                         </div>
                       </div>
                    ))}
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-bold text-slate-700 mb-1 block">Written Overview</label>
                      <textarea className="w-full border border-slate-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none" rows="3" placeholder="Describe your experience using this material..."></textarea>
                    </div>
                    <div>
                      <label className="text-sm font-bold text-slate-700 mb-1 block">Attach Document (Optional)</label>
                      <div className="border-2 border-dashed border-slate-300 rounded-lg p-4 flex items-center justify-center bg-slate-50 hover:bg-slate-100 cursor-pointer transition-colors">
                        <span className="text-sm text-slate-500 flex items-center gap-2"><FileText size={16}/> Upload lab report or quality inspection PDF</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end pt-4 border-t border-slate-100">
                    <button onClick={() => setHasRated(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-8 rounded-lg shadow-sm transition-colors text-sm">
                      Submit Verified Rating
                    </button>
                  </div>
                </div>
             )}
          </div>
        )}

        {/* 3. Verified Manufacturer Reviews List */}
        <div>
          <div className="flex justify-between items-end border-b border-slate-200 pb-4 mb-6">
            <div>
              <h2 className="text-2xl font-bold text-slate-800">Manufacturer Reviews</h2>
              <div className="flex items-center gap-2 mt-1">
                <CheckCircle size={14} className="text-emerald-500" />
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">All ratings are from verified purchase orders only</span>
              </div>
            </div>
            
            <div className="flex gap-3">
              <select className="border border-slate-300 rounded-lg text-sm px-3 py-2 bg-white shadow-sm outline-none" value={filterStar} onChange={(e)=>setFilterStar(e.target.value)}>
                <option value="All">All Stars</option>
                <option value="5">5 Star Only</option>
                <option value="4">4 Star Only</option>
                <option value="3">3 Star Only</option>
                <option value="2">2 Star Only</option>
                <option value="1">1 Star Only</option>
              </select>
            </div>
          </div>

          <div className="space-y-6">
            {filteredReviews.length === 0 && <p className="text-slate-500 italic py-10 text-center">No reviews match your filter.</p>}
            
            {filteredReviews.map(review => (
               <div key={review.id} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
                 <div className="flex flex-col sm:flex-row gap-6">
                   
                   {/* Left Col - Identity */}
                   <div className="sm:w-64 flex-shrink-0 space-y-3">
                     <div className="flex items-center gap-3">
                       <div className="w-10 h-10 bg-slate-800 text-white rounded-lg flex items-center justify-center font-bold text-lg">
                         {review.company.charAt(0)}
                       </div>
                       <div>
                         {/* Vendor sees real names, others might see it if un-anonymized, here we show names for demo */}
                         <p className="font-bold text-slate-800 text-sm leading-tight">{review.company}</p>
                         <p className="text-xs text-slate-500">Sector: {review.industry}</p>
                       </div>
                     </div>
                     <div className="bg-slate-50 border border-slate-100 rounded-md p-2 space-y-1">
                       <p className="text-xs text-slate-500 flex justify-between"><span>PO Ref:</span> <span className="font-mono text-slate-700">{review.po.substring(0, 8)}****</span></p>
                       <p className="text-xs text-slate-500 flex justify-between"><span>Reviewed:</span> <span className="text-slate-700">{review.date}</span></p>
                     </div>
                     <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 text-[10px] font-bold uppercase px-2 py-1 rounded">
                       <CheckCircle size={10} /> Purchase Verified
                     </span>
                   </div>

                   {/* Right Col - Content */}
                   <div className="flex-1 space-y-4">
                     <div className="flex justify-between items-start">
                       <div className="flex items-center gap-2">
                         <div className="flex items-center bg-slate-900 text-white px-2 py-1 rounded text-sm font-bold gap-1">
                           {review.overall.toFixed(1)} <Star size={14} className="fill-yellow-400 text-yellow-400" />
                         </div>
                         <div className="flex gap-2">
                            {review.tags.map(tag => (
                              <span key={tag} className="bg-slate-100 text-slate-600 text-xs px-2 py-1 rounded-full font-medium">{tag}</span>
                            ))}
                         </div>
                       </div>
                     </div>

                     <p className="text-slate-700 text-sm leading-relaxed">{review.text}</p>
                     
                     {/* Parameter breakdown micro-grid */}
                     <div className="grid grid-cols-2 md:grid-cols-3 gap-y-2 gap-x-4 pt-3 border-t border-slate-100">
                       <ParameterScore label="Quality" score={review.params.quality} />
                       <ParameterScore label="Consistency" score={review.params.consistency} />
                       <ParameterScore label="Packaging" score={review.params.packaging} />
                       <ParameterScore label="Specifications" score={review.params.specs} />
                       <ParameterScore label="Value" score={review.params.value} />
                       <ParameterScore label="Communication" score={review.params.communication} />
                     </div>

                     <div className="flex justify-between items-end pt-2">
                       <div>
                         {review.doc && (
                           <button className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 hover:underline">
                             <FileText size={14} /> Quality Report Attached.pdf
                           </button>
                         )}
                       </div>
                       
                       <div className="flex items-center gap-4 text-xs text-slate-500 font-medium">
                         <span className="flex items-center gap-1 cursor-pointer hover:text-emerald-600 transition-colors"><ThumbsUp size={14}/> Helpful ({review.helpful})</span>
                         <span className="flex items-center gap-1 cursor-pointer hover:text-red-600 transition-colors"><ThumbsDown size={14}/> No ({review.notHelpful})</span>
                         {role === 'vendor' && (
                           <span className="flex items-center gap-1 cursor-pointer text-indigo-600 font-bold ml-2"><MessageSquare size={14}/> Vendor Reply</span>
                         )}
                       </div>
                     </div>
                   </div>

                 </div>
               </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}

function ParameterScore({ label, score }) {
  return (
    <div className="flex justify-between items-center w-full max-w-[180px]">
      <span className="text-[11px] font-semibold text-slate-500 uppercase">{label}</span>
      <div className="flex gap-0.5">
        {[1,2,3,4,5].map(s => (
          <Star key={s} size={10} className={s <= score ? "text-yellow-400 fill-yellow-400" : "text-slate-200"} />
        ))}
      </div>
    </div>
  );
}
