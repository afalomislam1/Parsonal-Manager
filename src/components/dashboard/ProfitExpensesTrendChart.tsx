import React, { useMemo } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  ArrowUpRight,
  Info,
  Calendar,
  AlertCircle,
  DollarSign,
  Scale,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { useAccounting } from '../../context/AccountingContext';
import { formatBDT, formatUSD } from '../../utils/calculations';

interface MonthlyTrendPoint {
  monthKey: string; // YYYY-MM
  monthLabel: string; // "Apr 2026"
  shortLabel: string; // "Apr"
  profit: number; // in BDT
  expenses: number; // in BDT
  net: number; // profit - expenses
  txCount: number;
  expenseCount: number;
}

export function ProfitExpensesTrendChart() {
  const { transactions, personalExpenses, setActiveTab } = useAccounting();

  // Compute 6-month historical window up to current date/month
  const trendData = useMemo<MonthlyTrendPoint[]>(() => {
    // Determine the reference month (latest date between transactions, expenses, or now)
    const dates: string[] = [
      new Date().toISOString().slice(0, 10),
      ...transactions.map((t) => t.date),
      ...personalExpenses.map((e) => e.date),
    ];
    dates.sort();
    const latestDateStr = dates[dates.length - 1];
    const latestDate = new Date(latestDateStr);

    const refYear = latestDate.getFullYear();
    const refMonth = latestDate.getMonth(); // 0-indexed

    const points: MonthlyTrendPoint[] = [];

    // Generate 6 months from (refMonth - 5) to refMonth
    for (let i = 5; i >= 0; i--) {
      const d = new Date(refYear, refMonth - i, 1);
      const year = d.getFullYear();
      const monthNum = d.getMonth() + 1;
      const monthKey = `${year}-${String(monthNum).padStart(2, '0')}`;
      const monthLabel = d.toLocaleString('en-US', { month: 'short', year: 'numeric' });
      const shortLabel = d.toLocaleString('en-US', { month: 'short' });

      // Sum profit from completed transactions in this month
      const monthlyTxs = transactions.filter(
        (t) => t.status === 'Completed' && t.date.startsWith(monthKey)
      );
      const profit = monthlyTxs.reduce((sum, t) => sum + (t.profit || 0), 0);

      // Sum personal expenses in this month
      const monthlyExpenses = personalExpenses.filter((e) => e.date.startsWith(monthKey));
      const expenses = monthlyExpenses.reduce((sum, e) => sum + (e.amountBdt || 0), 0);

      points.push({
        monthKey,
        monthLabel,
        shortLabel,
        profit,
        expenses,
        net: profit - expenses,
        txCount: monthlyTxs.length,
        expenseCount: monthlyExpenses.length,
      });
    }

    return points;
  }, [transactions, personalExpenses]);

  // Aggregate metrics over the 6 months
  const total6mProfit = useMemo(
    () => trendData.reduce((acc, p) => acc + p.profit, 0),
    [trendData]
  );
  const total6mExpenses = useMemo(
    () => trendData.reduce((acc, p) => acc + p.expenses, 0),
    [trendData]
  );
  const net6mDifference = total6mProfit - total6mExpenses;
  const avgMonthlyProfit = total6mProfit / (trendData.length || 1);
  const avgMonthlyExpense = total6mExpenses / (trendData.length || 1);

  // Spending pattern assessment
  const isHealthySurplus = net6mDifference >= 0;
  const expenseCoveragePct =
    total6mProfit > 0 ? ((total6mExpenses / total6mProfit) * 100).toFixed(0) : null;

  // Custom Recharts Tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const dataPoint: MonthlyTrendPoint = payload[0].payload;
      const isSurplus = dataPoint.net >= 0;

      return (
        <div className="bg-white rounded-xl shadow-xl border border-slate-200 p-3.5 text-xs space-y-2 min-w-[210px]">
          <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
            <span className="font-bold text-slate-900 text-sm flex items-center">
              <Calendar className="w-3.5 h-3.5 mr-1 text-slate-400" />
              {dataPoint.monthLabel}
            </span>
            <span className="text-[10px] font-mono text-slate-400">{dataPoint.monthKey}</span>
          </div>

          <div className="space-y-1.5">
            {/* Profit Row */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 inline-block"></span>
                <span className="text-slate-600 font-medium">Profit (Income):</span>
              </div>
              <span className="font-mono font-bold text-emerald-700">
                {formatBDT(dataPoint.profit)}
              </span>
            </div>
            <div className="text-[10px] text-slate-400 pl-4">
              {dataPoint.txCount} transaction{dataPoint.txCount !== 1 ? 's' : ''} completed
            </div>

            {/* Expenses Row */}
            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center space-x-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-600 inline-block"></span>
                <span className="text-slate-600 font-medium">Personal Expenses:</span>
              </div>
              <span className="font-mono font-bold text-amber-700">
                {formatBDT(dataPoint.expenses)}
              </span>
            </div>
            <div className="text-[10px] text-slate-400 pl-4">
              {dataPoint.expenseCount} personal expense entry{dataPoint.expenseCount !== 1 ? 'ies' : ''}
            </div>

            {/* Net Balance in Month */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
              <span className="font-semibold text-slate-700">Net Monthly Balance:</span>
              <span
                className={`font-mono font-bold ${
                  isSurplus ? 'text-emerald-700' : 'text-rose-700'
                }`}
              >
                {isSurplus ? '+' : ''}
                {formatBDT(dataPoint.net)}
              </span>
            </div>

            {/* Status Pill */}
            <div className="pt-1">
              <span
                className={`inline-block w-full text-center py-0.5 rounded text-[10px] font-semibold ${
                  isSurplus
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-rose-50 text-rose-800 border border-rose-200'
                }`}
              >
                {isSurplus
                  ? '✓ Profit covers expenses'
                  : '⚠ Expenses exceeded transaction profit'}
              </span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-sm space-y-5">
      {/* Header with Title & Quick Action */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-100">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center">
              <Scale className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                6-Month Trend: Profit vs. Total Expenses
              </h3>
              <p className="text-xs text-slate-500">
                Compare earned remittance commission/profits against personal spending drawn from the fund.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            id="btn-trend-add-expense"
            onClick={() => setActiveTab('personal-expense')}
            className="inline-flex items-center space-x-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100 transition shadow-sm"
          >
            <Wallet className="w-3.5 h-3.5 text-amber-700" />
            <span>Manage Expenses</span>
          </button>
          <button
            id="btn-trend-new-tx"
            onClick={() => setActiveTab('new-transaction')}
            className="inline-flex items-center space-x-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white transition shadow-sm"
          >
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>New Payout</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* 6M Profit */}
        <div className="p-3.5 rounded-xl bg-emerald-50/50 border border-emerald-200/80">
          <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">
            6-Month Profit
          </span>
          <span className="text-base sm:text-lg font-mono font-bold text-emerald-950 block mt-0.5">
            {formatBDT(total6mProfit)}
          </span>
          <span className="text-[10px] text-emerald-700 block mt-0.5">
            Avg: {formatBDT(avgMonthlyProfit)} / mo
          </span>
        </div>

        {/* 6M Expenses */}
        <div className="p-3.5 rounded-xl bg-amber-50/50 border border-amber-200/80">
          <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block">
            6-Month Expenses
          </span>
          <span className="text-base sm:text-lg font-mono font-bold text-amber-950 block mt-0.5">
            {formatBDT(total6mExpenses)}
          </span>
          <span className="text-[10px] text-amber-700 block mt-0.5">
            Avg: {formatBDT(avgMonthlyExpense)} / mo
          </span>
        </div>

        {/* 6M Net Balance (Surplus/Deficit) */}
        <div
          className={`p-3.5 rounded-xl border ${
            isHealthySurplus
              ? 'bg-slate-50 border-slate-200'
              : 'bg-rose-50/60 border-rose-200'
          }`}
        >
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
            Net Surplus / Deficit
          </span>
          <span
            className={`text-base sm:text-lg font-mono font-bold block mt-0.5 ${
              isHealthySurplus ? 'text-emerald-700' : 'text-rose-700'
            }`}
          >
            {isHealthySurplus ? '+' : ''}
            {formatBDT(net6mDifference)}
          </span>
          <span className="text-[10px] text-slate-500 block mt-0.5">
            {isHealthySurplus ? 'Profits exceed expenses' : 'Expenses exceed profits'}
          </span>
        </div>

        {/* Expense Coverage / Ratio */}
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            Expense vs Profit Ratio
          </span>
          <div className="mt-1">
            <span className="text-base sm:text-lg font-mono font-bold text-slate-900">
              {expenseCoveragePct ? `${expenseCoveragePct}%` : 'N/A'}
            </span>
            <span className="text-[10px] text-slate-500 block">
              {expenseCoveragePct && Number(expenseCoveragePct) <= 100
                ? 'Spent within earnings'
                : 'Deficit spending drawn'}
            </span>
          </div>
        </div>
      </div>

      {/* Recharts Line Chart Container */}
      <div className="pt-2">
        <div className="w-full h-72 sm:h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={trendData}
              margin={{ top: 15, right: 15, left: -5, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis
                dataKey="monthLabel"
                stroke="#94a3b8"
                tick={{ fill: '#64748b', fontSize: 11 }}
                tickLine={false}
              />
              <YAxis
                stroke="#94a3b8"
                tick={{ fill: '#64748b', fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(val) =>
                  '৳' + (val >= 1000 ? `${(val / 1000).toFixed(0)}k` : `${val}`)
                }
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                verticalAlign="top"
                align="right"
                iconType="circle"
                wrapperStyle={{ paddingBottom: '16px', fontSize: '12px' }}
              />
              {/* Profit Line: Emerald */}
              <Line
                type="monotone"
                dataKey="profit"
                name="Profit / লাভ (Income)"
                stroke="#047857"
                strokeWidth={3}
                activeDot={{ r: 7, stroke: '#047857', strokeWidth: 2, fill: '#ffffff' }}
                dot={{ r: 4, fill: '#047857' }}
              />
              {/* Expenses Line: Amber */}
              <Line
                type="monotone"
                dataKey="expenses"
                name="Personal Expenses / নিজস্ব খরচ"
                stroke="#d97706"
                strokeWidth={3}
                strokeDasharray="4 4"
                activeDot={{ r: 7, stroke: '#d97706', strokeWidth: 2, fill: '#ffffff' }}
                dot={{ r: 4, fill: '#d97706' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Spending Pattern Insights Footer */}
      <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-start space-x-2 text-slate-700">
          <Info className="w-4 h-4 text-emerald-700 mt-0.5 shrink-0" />
          <div>
            <span className="font-bold text-slate-900">Spending Pattern Insight: </span>
            {isHealthySurplus ? (
              <span>
                Your remittance operations generated a cumulative surplus of{' '}
                <strong className="font-mono text-emerald-700">
                  {formatBDT(net6mDifference)}
                </strong>{' '}
                over personal expenses over the last 6 months.
              </span>
            ) : (
              <span>
                Personal expenses exceeded total earned profit by{' '}
                <strong className="font-mono text-rose-700">
                  {formatBDT(Math.abs(net6mDifference))}
                </strong>
                . Consider monitoring future drawings to preserve fund reserves.
              </span>
            )}
          </div>
        </div>

        {/* Quick Month by Month Indicator pills */}
        <div className="flex items-center space-x-1.5 shrink-0 overflow-x-auto max-w-full pb-1 sm:pb-0">
          {trendData.map((pt) => {
            const isPos = pt.net >= 0;
            return (
              <div
                key={pt.monthKey}
                title={`${pt.monthLabel}: Profit ${formatBDT(pt.profit)}, Expenses ${formatBDT(pt.expenses)}, Net ${formatBDT(pt.net)}`}
                className={`px-2 py-1 rounded text-[10px] font-mono font-bold cursor-default ${
                  isPos
                    ? 'bg-emerald-100/70 text-emerald-800'
                    : 'bg-rose-100/70 text-rose-800'
                }`}
              >
                {pt.shortLabel}: {isPos ? '+' : ''}
                {pt.net >= 1000 || pt.net <= -1000
                  ? `${(pt.net / 1000).toFixed(0)}k`
                  : pt.net}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
