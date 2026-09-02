"use client";

import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  LineChart, Line, AreaChart, Area
} from 'recharts';
import { DollarSign, Wrench, Package, TrendingUp, Users } from 'lucide-react';

const REVENUE_DATA = [
  { name: 'Mon', revenue: 4000 },
  { name: 'Tue', revenue: 3000 },
  { name: 'Wed', revenue: 2000 },
  { name: 'Thu', revenue: 2780 },
  { name: 'Fri', revenue: 1890 },
  { name: 'Sat', revenue: 2390 },
  { name: 'Sun', revenue: 3490 },
];

const REPAIRS_DATA = [
  { name: 'Week 1', completed: 12 },
  { name: 'Week 2', completed: 15 },
  { name: 'Week 3', completed: 9 },
  { name: 'Week 4', completed: 21 },
];

const MetricCard = ({ title, value, icon, trend, isPositive }: any) => (
  <div className="bg-zinc-900/50 border border-white/10 rounded-2xl p-6 backdrop-blur-md relative overflow-hidden group hover:border-cyan-500/30 transition-all">
    <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-cyan-500/10 to-transparent rounded-full -translate-y-16 translate-x-16 group-hover:scale-110 transition-transform" />
    
    <div className="flex justify-between items-start mb-4 relative z-10">
      <div className="bg-zinc-800 p-3 rounded-xl border border-white/5">
        {icon}
      </div>
      <div className={`px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1 ${
        isPositive ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
      }`}>
        <TrendingUp className={`w-3 h-3 ${!isPositive && 'rotate-180'}`} />
        {trend}
      </div>
    </div>
    
    <h3 className="text-zinc-400 font-medium text-sm mb-1">{title}</h3>
    <div className="text-3xl font-bold text-white relative z-10">{value}</div>
  </div>
);

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-zinc-950 p-8 text-zinc-50 font-sans">
      
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-cyan-500">
            Executive Dashboard
          </h1>
          <p className="text-zinc-400 mt-1">Real-time business performance metrics.</p>
        </div>
        <div className="bg-zinc-900 border border-white/10 rounded-lg px-4 py-2 text-sm text-zinc-300">
          Last 7 Days
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <MetricCard 
          title="Total Revenue" 
          value="$19,550.00" 
          icon={<DollarSign className="text-cyan-400 w-6 h-6" />} 
          trend="+12.5%" 
          isPositive={true} 
        />
        <MetricCard 
          title="Net Profit" 
          value="$5,240.00" 
          icon={<DollarSign className="text-green-400 w-6 h-6" />} 
          trend="+8.2%" 
          isPositive={true} 
        />
        <MetricCard 
          title="Completed Repairs" 
          value="57" 
          icon={<Wrench className="text-blue-400 w-6 h-6" />} 
          trend="-2.4%" 
          isPositive={false} 
        />
        <MetricCard 
          title="Low Stock Items" 
          value="12" 
          icon={<Package className="text-orange-400 w-6 h-6" />} 
          trend="+3" 
          isPositive={false} 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Revenue Chart */}
        <div className="lg:col-span-2 bg-zinc-900/50 border border-white/10 rounded-2xl p-6 backdrop-blur-md">
          <h3 className="text-lg font-semibold mb-6">Revenue Trend</h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={REVENUE_DATA} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                <XAxis dataKey="name" stroke="#666" tick={{fill: '#888'}} axisLine={false} tickLine={false} />
                <YAxis stroke="#666" tick={{fill: '#888'}} axisLine={false} tickLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#18181b', borderColor: '#333', borderRadius: '8px' }}
                  itemStyle={{ color: '#06b6d4' }}
                />
                <Area type="monotone" dataKey="revenue" stroke="#06b6d4" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Repairs Chart */}
        <div className="bg-zinc-900/50 border border-white/10 rounded-2xl p-6 backdrop-blur-md">
          <h3 className="text-lg font-semibold mb-6">Repairs Overview</h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={REPAIRS_DATA} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                <XAxis dataKey="name" stroke="#666" tick={{fill: '#888'}} axisLine={false} tickLine={false} />
                <YAxis stroke="#666" tick={{fill: '#888'}} axisLine={false} tickLine={false} />
                <Tooltip 
                  cursor={{fill: '#27272a'}}
                  contentStyle={{ backgroundColor: '#18181b', borderColor: '#333', borderRadius: '8px' }}
                />
                <Bar dataKey="completed" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
