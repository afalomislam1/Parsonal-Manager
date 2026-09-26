import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  DollarSign,
  Calendar,
  Layers,
  ArrowUpRight,
  ShieldCheck,
  Activity,
  Zap,
  Cloud,
  CheckCircle2,
  Info,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts';
import { useAccounting } from '../../context/AccountingContext';
import { formatBDT, formatUSD } from '../../utils/calculations';

type MetricMode = 'usd' | 'bdt' | 'profit' | 'count';

interface DailyVolumePoint {
  dateStr: string; // YYYY-MM-DD
  displayDate: string; // "Sep 20"
  dayOfWeek: string; // "Sun"
  usdVolume: number;
  bdtVolume: number;
  profit: number;
  txCount: number;
  recipientNames: string[];
}

export function TransactionVolumeTrendChart() {
  const { transactions, setIsSyncModalOpen, syncPin } = useAccounting();
  const [metricMode, setMetricMode] = useState<MetricMode>('usd');

  // Compute 30-day timeline
  const { points, stats } = useMemo(() => {
    // Determine the end date (latest transaction date or today)
    const txDates = transactions.map((t) => t.date).filter(Boolean);
    const todayStr = new Date().toISOString().slice(0, 10);
    const allDates = [todayStr, ...txDates].sort();
    const endDateStr = allDates[allDates.length - 1];

    const endDate = new Date(endDateStr);
    const dailyPoints: DailyVolumePoint[] = [];

    // Map existing transactions by date (only completed / active ones)
    const txMap = new Map<string, typeof transactions>();
    transactions.forEach((tx) => {
      if (tx.status === 'Cancelled') return;
      const list = txMap.get(tx.date) || [];
      list.push(tx);
      txMap.set(tx.date, list);
    });

    // Generate 30 days backwards from endDate
    for (let i = 29; i >= 0; i--) {
      const d = new Date(endDate);
      d.setDate(d.getDate() - i);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const dateKey = `${year}-${month}-${day}`;

      const displayDate = d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
      const dayOfWeek = d.toLocaleDateString('en-US', { weekday: 'short' });

      const dayTxs = txMap.get(dateKey) || [];
      const usdVolume = dayTxs.reduce((sum, t) => sum + (t.sendUsd || 0), 0);
      const bdtVolume = dayTxs.reduce((sum, t) => sum + (t.actualSend || 0), 0);
      const profit = dayTxs.reduce((sum, t) => sum + (t.profit || 0), 0);
      const txCount = dayTxs.length;
      const recipientNames = dayTxs.map((t) => t.recipientName).slice(0, 3);

      dailyPoints.push({
        dateStr: dateKey,
        displayDate,
        dayOfWeek,
        usdVolume,
        bdtVolume,
        profit,
        txCount,
        recipientNames,
      });
    }

    // Compute 30-day aggregations
    const total30dUsd = dailyPoints.reduce((acc, p) => acc + p.usdVolume, 0);
    const total30dBdt = dailyPoints.reduce((acc, p) => acc + p.bdtVolume, 0);
    const total30dProfit = dailyPoints.reduce((acc, p) => acc + p.profit, 0);
    const total30dTxCount = dailyPoints.reduce((acc, p) => acc + p.txCount, 0);

    const activeDays = dailyPoints.filter((p) => p.txCount > 0).length;
    const avgDailyUsd = total30dUsd / 30;
    const avgDailyBdt = total30dBdt / 30;

    let peakDay = dailyPoints[0];
    dailyPoints.forEach((p) => {
      if (p.usdVolume > peakDay.usdVolume) {
        peakDay = p;
      }
    });

    return {
      points: dailyPoints,
      stats: {
        total30dUsd,
        total30dBdt,
        total30dProfit,
        total30dTxCount,
        activeDays,
        avgDailyUsd,
        avgDailyBdt,
        peakDay,
      },
    };
  }, [transactions]);

  // Tooltip custom renderer
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;
    const dataPoint = payload[0].payload as DailyVolumePoint;

    return (
      <div className="bg-slate-900/95 backdrop-blur-md text-white p-3.5 rounded-2xl shadow-2xl border border-slate-700/80 text-xs min-w-[210px] space-y-2 pointer-events-none">
        <div className="flex items-center justify-between border-b border-slate-700/60 pb-1.5">
          <div className="flex items-center space-x-1.5">
            <Calendar className="w-3.5 h-3.5 text-emerald-400" />
            <span className="font-bold text-slate-100">{dataPoint.dateStr}</span>
          </div>
          <span className="text-[10px] font-medium text-emerald-300 px-1.5 py-0.5 rounded bg-emerald-950/60 border border-emerald-500/30">
            {dataPoint.dayOfWeek}
          </span>
        </div>

        <div className="space-y-1 font-mono">
          <div className="flex justify-between items-center text-emerald-300">
            <span className="text-slate-400 font-sans text-[11px]">USD Volume:</span>
            <span className="font-bold text-sm">{formatUSD(dataPoint.usdVolume)}</span>
          </div>

          <div className="flex justify-between items-center text-slate-200">
            <span className="text-slate-400 font-sans text-[11px]">BDT Payout:</span>
            <span className="font-bold">{formatBDT(dataPoint.bdtVolume)}</span>
          </div>

          <div className="flex justify-between items-center text-emerald-400">
            <span className="text-slate-400 font-sans text-[11px]">Net Profit:</span>
            <span className="font-semibold">{formatBDT(dataPoint.profit)}</span>
          </div>

          <div className="flex justify-between items-center text-slate-300 pt-1 border-t border-slate-800">
            <span className="text-slate-400 font-sans text-[11px]">Transactions:</span>
            <span className="font-bold">{dataPoint.txCount} txns</span>
          </div>
        </div>

        {dataPoint.recipientNames.length > 0 && (
          <div className="pt-1 border-t border-slate-800/80 text-[10px] text-slate-400 truncate">
            <span>Recipients: </span>
            <span className="text-slate-200">{dataPoint.recipientNames.join(', ')}</span>
          </div>
        )}
      </div>
    );
  };

  const getMetricConfig = () => {
    switch (metricMode) {
      case 'usd':
        return {
          dataKey: 'usdVolume',
          stroke: '#059669', // Emerald 600
          fill: 'url(#usdGradient)',
          yFormatter: (val: number) => `$${val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val}`,
          title: 'Cross-Border Volume (USD)',
          symbol: '$',
          avgVal: stats.avgDailyUsd,
        };
      case 'bdt':
        return {
          dataKey: 'bdtVolume',
          stroke: '#2563eb', // Blue 600
          fill: 'url(#bdtGradient)',
          yFormatter: (val: number) => `৳${val >= 1000 ? `${Math.round(val / 1000)}k` : val}`,
          title: 'Payout Volume (BDT)',
          symbol: '৳',
          avgVal: stats.avgDailyBdt,
        };
      case 'profit':
        return {
          dataKey: 'profit',
          stroke: '#10b981', // Emerald 500
          fill: 'url(#profitGradient)',
          yFormatter: (val: number) => `৳${val}`,
          title: 'Daily Net Profit (BDT)',
          symbol: '৳',
          avgVal: stats.total30dProfit / 30,
        };
      case 'count':
        return {
          dataKey: 'txCount',
          stroke: '#8b5cf6', // Violet 500
          fill: 'url(#countGradient)',
          yFormatter: (val: number) => `${val}`,
          title: 'Daily Transaction Count',
          symbol: '',
          avgVal: stats.total30dTxCount / 30,
        };
    }
  };

  const config = getMetricConfig();

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden transition-all">
      {/* Chart Header */}
      <div className="p-4 sm:p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="p-1.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200">
              <TrendingUp className="w-4 h-4" />
            </span>
            <h3 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
              Cross-Border Transaction Volumes (Last 30 Days)
            </h3>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
              Recharts Line
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            দৈনিক ক্রস-বর্ডার লেনদেনের ভলিউম ট্রেন্ড, নেট প্রফিট ও ৩০ দিনের আর্থিক বিশ্লেষণ।
          </p>
        </div>

        {/* Action & Metric Toggles */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Multi-Device PIN Sync Reminder Button */}
          <button
            onClick={() => setIsSyncModalOpen(true)}
            className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-300 text-xs font-bold flex items-center space-x-1.5 shadow-2xs transition"
            title="মোবাইলে থাকা ১২২টি একাউন্ট ও লেনদেন সিঙ্ক করুন"
          >
            <Cloud className="w-3.5 h-3.5 text-emerald-700" />
            <span>PIN Sync ({syncPin ? `PIN: ${syncPin}` : 'মোবাইলের ডাটা আনুন'})</span>
          </button>

          {/* Metric Switcher Tabs */}
          <div className="bg-slate-100 p-1 rounded-xl flex items-center space-x-1 border border-slate-200 text-xs font-semibold">
            <button
              onClick={() => setMetricMode('usd')}
              className={`px-2.5 py-1 rounded-lg transition ${
                metricMode === 'usd'
                  ? 'bg-white text-emerald-900 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              USD ($)
            </button>
            <button
              onClick={() => setMetricMode('bdt')}
              className={`px-2.5 py-1 rounded-lg transition ${
                metricMode === 'bdt'
                  ? 'bg-white text-blue-900 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              BDT (৳)
            </button>
            <button
              onClick={() => setMetricMode('profit')}
              className={`px-2.5 py-1 rounded-lg transition ${
                metricMode === 'profit'
                  ? 'bg-white text-emerald-950 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Profit
            </button>
            <button
              onClick={() => setMetricMode('count')}
              className={`px-2.5 py-1 rounded-lg transition ${
                metricMode === 'count'
                  ? 'bg-white text-purple-900 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Txns (#)
            </button>
          </div>
        </div>
      </div>

      {/* 30-Day Highlight KPI Badges */}
      <div className="grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-100 bg-slate-50/60 border-b border-slate-100 text-xs">
        <div className="p-3 sm:p-4">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
            30-Day USD Volume
          </span>
          <span className="text-base sm:text-lg font-mono font-bold text-emerald-900 mt-0.5 block">
            {formatUSD(stats.total30dUsd)}
          </span>
          <span className="text-[10px] text-slate-400">
            {stats.total30dTxCount} transactions recorded
          </span>
        </div>

        <div className="p-3 sm:p-4">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
            30-Day Payout (BDT)
          </span>
          <span className="text-base sm:text-lg font-mono font-bold text-slate-900 mt-0.5 block">
            {formatBDT(stats.total30dBdt)}
          </span>
          <span className="text-[10px] text-slate-400">
            Avg: {formatBDT(stats.avgDailyBdt)} / day
          </span>
        </div>

        <div className="p-3 sm:p-4">
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 block">
            30-Day Net Profit
          </span>
          <span className="text-base sm:text-lg font-mono font-bold text-emerald-950 mt-0.5 block">
            {formatBDT(stats.total30dProfit)}
          </span>
          <span className="text-[10px] text-emerald-700 font-medium">
            Charge + Commission
          </span>
        </div>

        <div className="p-3 sm:p-4">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
            Peak Day Volume
          </span>
          <span className="text-base sm:text-lg font-mono font-bold text-slate-900 mt-0.5 block">
            {formatUSD(stats.peakDay.usdVolume)}
          </span>
          <span className="text-[10px] text-slate-400">
            {stats.peakDay.displayDate} ({stats.peakDay.txCount} txns)
          </span>
        </div>
      </div>

      {/* Main Recharts Container */}
      <div className="p-3 sm:p-6">
        <div className="h-72 sm:h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={points}
              margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
            >
              <defs>
                <linearGradient id="usdGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#059669" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#059669" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="bdtGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563eb" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#2563eb" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="profitGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="countGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.0} />
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />

              <XAxis
                dataKey="displayDate"
                stroke="#94a3b8"
                fontSize={11}
                tickLine={false}
                axisLine={{ stroke: '#e2e8f0' }}
                interval={Math.ceil(points.length / 8)}
              />

              <YAxis
                stroke="#94a3b8"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tickFormatter={config.yFormatter}
              />

              <Tooltip content={<CustomTooltip />} />

              {/* Average Daily Reference Line */}
              {config.avgVal > 0 && (
                <ReferenceLine
                  y={config.avgVal}
                  stroke="#94a3b8"
                  strokeDasharray="4 4"
                  label={{
                    value: '30-Day Avg',
                    fill: '#64748b',
                    fontSize: 10,
                    position: 'insideTopRight',
                  }}
                />
              )}

              {/* Primary Area & Line */}
              <Area
                type="monotone"
                dataKey={config.dataKey}
                stroke={config.stroke}
                strokeWidth={2.5}
                fill={config.fill}
                activeDot={{
                  r: 6,
                  fill: config.stroke,
                  stroke: '#ffffff',
                  strokeWidth: 2.5,
                }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Sub-Legend & Info Bar */}
        <div className="mt-3 pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span>
              <span className="font-medium text-slate-700">{config.title}</span>
            </div>
            <div className="flex items-center space-x-1.5 text-slate-400">
              <span className="w-3 border-t border-dashed border-slate-400"></span>
              <span>Daily 30-Day Average</span>
            </div>
          </div>

          <div className="text-[11px] text-slate-400 flex items-center space-x-1">
            <Info className="w-3.5 h-3.5" />
            <span>৩০ দিনের চার্টে যে কোনো পয়েন্টের উপর মাউস বা টাচ করে বিস্তারিত দেখুন।</span>
          </div>
        </div>
      </div>
    </div>
  );
}
