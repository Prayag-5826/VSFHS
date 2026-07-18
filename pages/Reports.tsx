
import React, { useState, useEffect } from 'react';
import { 
  Download, 
  FileSpreadsheet, 
  FileText, 
  TrendingUp, 
  Target, 
  Database,
  Loader2
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { api } from '../services/apiService';
import { Visit } from '../types';

const Reports: React.FC = () => {
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchVisits = async () => {
      try {
        const data = await api.request('/visits');
        setVisits(data);
      } catch (err) {
        console.error("Failed to fetch reports", err);
      } finally {
        setLoading(false);
      }
    };
    fetchVisits();
  }, []);

  const getChartData = () => {
    const dailyMap: Record<string, number> = {};
    const sortedVisits = [...visits].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    
    sortedVisits.forEach(v => {
      const date = new Date(v.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      dailyMap[date] = (dailyMap[date] || 0) + 1;
    });

    return Object.entries(dailyMap).map(([name, visits]) => ({ name, visits })).slice(-10);
  };

  const handleExportCSV = () => {
    if (visits.length === 0) {
      alert("No data available for export.");
      return;
    }
    const headers = ['ID', 'Company', 'Representative', 'Contact', 'Phone', 'Date', 'Latitude', 'Longitude'];
    const rows = visits.map((v: any) => [
      v.id,
      v.companyName,
      v.representativeName,
      v.contactPerson,
      v.phoneNumber,
      new Date(v.timestamp).toLocaleString(),
      v.location.latitude,
      v.location.longitude
    ]);
    
    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map((r: any) => r.join(','))].join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `FieldAudit_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportPDF = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="animate-spin text-indigo-600" size={48} />
      </div>
    );
  }

  const chartData = getChartData();
  const quota = 100;
  const progress = Math.min(100, (visits.length / quota) * 100);

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Analytics & Reports</h1>
          <p className="text-slate-500 font-medium tracking-tight">Cloud-synced performance auditing and data extraction.</p>
        </div>
        <div className="flex items-center space-x-3">
          <button 
            onClick={handleExportCSV}
            className="flex items-center px-5 py-2.5 bg-white border border-slate-200 text-slate-900 rounded-xl hover:bg-slate-50 font-bold transition-all shadow-sm text-xs uppercase tracking-widest"
          >
            <FileSpreadsheet size={16} className="mr-2 text-green-600" />
            Export CSV
          </button>
          <button 
            onClick={handleExportPDF}
            className="flex items-center px-5 py-2.5 bg-white border border-slate-200 text-slate-900 rounded-xl hover:bg-slate-50 font-bold transition-all shadow-sm text-xs uppercase tracking-widest"
          >
            <FileText size={16} className="mr-2 text-red-600" />
            Print Report
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm min-h-[400px] flex flex-col">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest">Deployment Trends</h2>
                <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">Audit volume across timeline</p>
              </div>
              <div className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-lg text-[10px] font-black uppercase tracking-widest">
                Real-time Sync
              </div>
            </div>
            
            <div className="flex-1 w-full">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorVisits" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1}/>
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10}} />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10}} />
                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                    <Area type="monotone" dataKey="visits" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorVisits)" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center">
                  <Database size={48} className="text-slate-100 mb-4" />
                  <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">No visit history found</p>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-indigo-600 p-8 rounded-3xl text-white shadow-xl shadow-indigo-100 relative overflow-hidden group">
               <TrendingUp className="absolute top-0 right-0 w-32 h-32 text-indigo-500/20 -mr-8 -mt-8" />
               <h3 className="text-indigo-100 text-[10px] font-black uppercase tracking-widest mb-1">Growth Efficiency</h3>
               <p className="text-3xl font-black mb-4">{(progress).toFixed(1)}%</p>
               <div className="w-full bg-indigo-500/50 rounded-full h-2">
                  <div className="bg-white h-full rounded-full transition-all duration-1000" style={{ width: `${progress}%` }}></div>
               </div>
               <p className="mt-4 text-[10px] font-bold text-indigo-100 uppercase tracking-tighter">Target: {quota} Audits/Month</p>
            </div>
            <div className="bg-slate-900 p-8 rounded-3xl text-white shadow-xl shadow-slate-200 relative overflow-hidden group">
               <Target className="absolute top-0 right-0 w-32 h-32 text-slate-800/40 -mr-8 -mt-8" />
               <h3 className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">Monthly Capture</h3>
               <p className="text-3xl font-black mb-4">{visits.length} / {quota}</p>
               <div className="w-full bg-slate-800 rounded-full h-2">
                  <div className="bg-indigo-500 h-full rounded-full transition-all duration-1000" style={{ width: `${progress}%` }}></div>
               </div>
               <p className="mt-4 text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Cloud Database Status: Active</p>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-8">Lead Personnel</h2>
            <div className="space-y-4">
              {visits.length === 0 ? (
                <p className="text-center text-slate-300 text-[10px] font-black uppercase py-10">No rankings available</p>
              ) : (
                Object.entries(visits.reduce((acc, v) => {
                  acc[v.representativeName] = (acc[v.representativeName] || 0) + 1;
                  return acc;
                }, {} as Record<string, number>))
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5)
                .map(([name, count], i) => (
                  <div key={name} className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-100">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px] font-black">
                        {i + 1}
                      </div>
                      <span className="text-xs font-black text-slate-900 uppercase">{name}</span>
                    </div>
                    <span className="text-[10px] font-bold bg-white px-2 py-1 rounded-lg border border-slate-200">{count} VISITS</span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 p-8 rounded-3xl text-white shadow-2xl shadow-indigo-100">
            <h3 className="text-sm font-black uppercase tracking-widest mb-4">Audit Transparency</h3>
            <p className="text-xs text-indigo-100 mb-8 leading-relaxed font-medium">
              Every data point is verified via GPS coordinates and cryptographic timestamps on the PostgreSQL backend.
            </p>
            <button 
              onClick={() => window.open('https://czbohynimtodyhlftbbn.supabase.co', '_blank')}
              className="w-full py-4 bg-white/10 hover:bg-white/20 backdrop-blur-xl rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center"
            >
              <Database size={16} className="mr-2" />
              Direct Console Access
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reports;
