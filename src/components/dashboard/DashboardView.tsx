import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  DollarSign,
  ArrowUpRight,
  ArrowDownLeft,
  Calendar,
  Users,
  ShieldCheck,
  Building,
  CheckCircle2,
  Clock,
  Layers,
  FileText,
  BarChart3,
  PieChart,
  Wallet,
  Cloud,
  Zap,
  FileSpreadsheet,
  ArrowRight,
} from 'lucide-react';
import { useAccounting } from '../../context/AccountingContext';
import {
  formatBDT,
  formatDate,
  formatUSD,
  roundTo,
} from '../../utils/calculations';
import { TransactionVolumeTrendChart } from './TransactionVolumeTrendChart';
import { ProfitExpensesTrendChart } from './ProfitExpensesTrendChart';

export function DashboardView() {
  const {
    todayStats,
    thisMonthStats,
    remainingUsdBalance,
    totalProfit,
    totalDepositedUsd,
    totalDepositedBdt,
    totalSentUsd,
    totalSentBdt,
    totalPersonalExpenseBdt,
    totalPersonalExpenseUsd,
    netAvailableUsdBalance,
    personalExpenses,
    referenceSummaries,
    transactions,
    setActiveTab,
    setDraftTransaction,
    settings,
    setIsSyncModalOpen,
    syncPin,
  } = useAccounting();

  // Completed transactions
  const completedTx = useMemo(
    () => transactions.filter((t) => t.status === 'Completed'),
    [transactions]
  );

  // Recent 5 transactions
  const recentTransactions = useMemo(() => {
    return [...transactions].slice(0, 5);
  }, [transactions]);

  // Bank-wise distribution for chart
  const bankDistribution = useMemo(() => {
    const map = new Map<string, { count: number; usd: number; bdt: number }>();
    completedTx.forEach((t) => {
      const existing = map.get(t.bankName) || { count: 0, usd: 0, bdt: 0 };
      existing.count += 1;
      existing.usd += t.sendUsd;
      existing.bdt += t.actualSend;
      map.set(t.bankName, existing);
    });

    const list = Array.from(map.entries()).map(([bank, val]) => ({
      bank,
      ...val,
    }));
    return list.sort((a, b) => b.count - a.count).slice(0, 6);
  }, [completedTx]);

  // Monthly breakdown for charts
  const monthlyStats = useMemo(() => {
    const map = new Map<string, { usd: number; bdt: number; profit: number }>();
    completedTx.forEach((t) => {
      const monthKey = t.date.slice(0, 7); // YYYY-MM
      const existing = map.get(monthKey) || { usd: 0, bdt: 0, profit: 0 };
      existing.usd += t.sendUsd;
      existing.bdt += t.actualSend;
      existing.profit += t.profit;
      map.set(monthKey, existing);
    });

    const months = Array.from(map.entries())
      .map(([month, val]) => ({
        month,
        ...val,
      }))
      .sort((a, b) => (a.month > b.month ? 1 : -1));

    if (months.length === 0) {
      return [{ month: new Date().toISOString().slice(0, 7), usd: 0, bdt: 0, profit: 0 }];
    }
    return months;
  }, [completedTx]);

  // Max values for chart normalization
  const maxMonthlyProfit = Math.max(...monthlyStats.map((m) => m.profit), 100);
  const maxMonthlyUsd = Math.max(...monthlyStats.map((m) => m.usd), 500);

  return (
    <div className="space-y-6">
      {/* Top Welcome / Status Strip */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b border-slate-200">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Financial Dashboard
          </h2>
          <p className="text-xs sm:text-sm text-slate-600">
            Real-time accounting overview of cross-border USD inflows, BDT payouts, and net profits.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            id="dashboard-pin-sync-btn"
            onClick={() => setIsSyncModalOpen(true)}
            className="px-3 py-1.5 rounded-lg border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 text-xs font-bold flex items-center space-x-1.5 shadow-sm transition"
            title="মোবাইল ও পিসিতে ডাটা সিঙ্ক করুন"
          >
            <Cloud className="w-3.5 h-3.5 text-emerald-700" />
            <span>{syncPin ? `PIN: ${syncPin}` : 'PIN Sync (ডাটা সিঙ্ক)'}</span>
          </button>

          <button
            id="dashboard-personal-expense-btn"
            onClick={() => setActiveTab('personal-expense')}
            className="px-3 py-1.5 rounded-lg border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-semibold flex items-center space-x-1.5 shadow-sm transition"
          >
            <Wallet className="w-3.5 h-3.5 text-amber-700" />
            <span>Personal Expense</span>
          </button>

          <button
            onClick={() => setActiveTab('deposits')}
            className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center space-x-1.5 shadow-sm transition"
          >
            <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-700" />
            <span>Record Deposit</span>
          </button>

          <button
            id="dashboard-import-prev-month-btn"
            onClick={() => setActiveTab('previous-month-import')}
            className="px-3 py-1.5 rounded-lg border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 text-xs font-bold flex items-center space-x-1.5 shadow-2xs transition"
            title="Import previous month accounts and transactions"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
            <span>আগের মাসের হিসাব</span>
          </button>

          <button
            onClick={() => setActiveTab('new-transaction')}
            className="px-3.5 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center space-x-1.5 shadow-sm shadow-emerald-700/20 transition"
          >
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>New Send Payout</span>
          </button>
        </div>
      </div>

      {/* Multi-Device PIN Sync Guide Banner (Clean Professional White & Emerald) */}
      <div className="bg-white text-slate-900 p-3.5 sm:p-4 rounded-2xl shadow-2xs border border-emerald-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-start sm:items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-200">
            <Cloud className="w-5 h-5" />
          </div>
          <div className="space-y-0.5">
            <div className="flex items-center space-x-2">
              <span className="font-bold text-sm text-slate-900">
                মোবাইল ও পিসিতে ১২২টি একাউন্ট সিঙ্ক (Cross-Device PIN Sync)
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                নিরাপদ
              </span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              মোবাইলের কোনো হিসাব নষ্ট হবে না। একটি সহজ PIN দিয়ে যে কোনো পিসি বা অন্য ডিভাইসে তাৎক্ষণিক সব হিসাব ওপেন করুন।
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsSyncModalOpen(true)}
          className="self-start sm:self-auto px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs flex items-center space-x-1.5 shadow-2xs transition whitespace-nowrap active:scale-95"
        >
          <Zap className="w-3.5 h-3.5" />
          <span>{syncPin ? `সিঙ্ক স্ট্যাটাস (${syncPin})` : 'পিন সেট ও সিঙ্ক করুন'}</span>
        </button>
      </div>

      {/* Previous Month Import Strip */}
      <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center shrink-0 border border-emerald-200">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-xs sm:text-sm text-slate-900">
                আগের মাসের হিসাব ইমপোর্ট ও ব্যালেন্স ক্যারি-ওভার (Import Previous Month)
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                CSV / Excel / Rollover
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              গত মাসের লেনদেনের শিট বা মাস শেষের অবশিষ্ট ডলার ফান্ড এক ক্লিকে অ্যাকাউন্টে যুক্ত করুন।
            </p>
          </div>
        </div>

        <button
          onClick={() => setActiveTab('previous-month-import')}
          className="self-start sm:self-auto px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs flex items-center space-x-1.5 shadow-2xs transition active:scale-95 whitespace-nowrap"
        >
          <span>হিসাব ইমপোর্ট করুন</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* TOP KPI CARDS (Requirement 16) */}
      {/* 1. Today vs This Month vs Total Balance */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
        {/* Today's USD */}
        <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-sm flex flex-col justify-between">
          <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
            Today's USD
          </span>
          <span className="text-lg font-mono font-bold text-emerald-900 mt-1">
            {formatUSD(todayStats.usd)}
          </span>
          <span className="text-[10px] text-slate-400 font-medium">
            {todayStats.count} txns today
          </span>
        </div>

        {/* Today's BDT */}
        <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-sm flex flex-col justify-between">
          <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
            Today's BDT
          </span>
          <span className="text-lg font-mono font-bold text-slate-900 mt-1">
            {formatBDT(todayStats.bdt)}
          </span>
          <span className="text-[10px] text-slate-400 font-medium">
            Payout amount
          </span>
        </div>

        {/* Today's Profit */}
        <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200 shadow-sm flex flex-col justify-between">
          <span className="text-[10px] uppercase font-bold text-emerald-800 tracking-wider">
            Today's Profit
          </span>
          <span className="text-lg font-mono font-bold text-emerald-950 mt-1">
            {formatBDT(todayStats.profit)}
          </span>
          <span className="text-[10px] text-emerald-700 font-medium">
            Net earnings
          </span>
        </div>

        {/* This Month USD */}
        <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-sm flex flex-col justify-between">
          <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
            Month USD
          </span>
          <span className="text-lg font-mono font-bold text-emerald-900 mt-1">
            {formatUSD(thisMonthStats.usd)}
          </span>
          <span className="text-[10px] text-slate-400 font-medium">
            {thisMonthStats.count} txns
          </span>
        </div>

        {/* This Month BDT */}
        <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-sm flex flex-col justify-between">
          <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
            Month BDT
          </span>
          <span className="text-lg font-mono font-bold text-slate-900 mt-1">
            {formatBDT(thisMonthStats.bdt)}
          </span>
          <span className="text-[10px] text-slate-400 font-medium">
            Total payout
          </span>
        </div>

        {/* This Month Profit */}
        <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200 shadow-sm flex flex-col justify-between">
          <span className="text-[10px] uppercase font-bold text-emerald-800 tracking-wider">
            Month Profit
          </span>
          <span className="text-lg font-mono font-bold text-emerald-950 mt-1">
            {formatBDT(thisMonthStats.profit)}
          </span>
          <span className="text-[10px] text-emerald-700 font-medium">
            Current month
          </span>
        </div>

        {/* Total USD Balance (Hero - Clean Professional White) */}
        <div className="col-span-2 sm:col-span-1 p-3.5 rounded-xl bg-white text-slate-900 shadow-2xs flex flex-col justify-between border-2 border-emerald-500/50">
          <span className="text-[10px] uppercase font-bold text-emerald-800 tracking-wider">
            USD Balance
          </span>
          <span className="text-xl font-mono font-bold text-emerald-700 mt-1">
            {formatUSD(remainingUsdBalance)}
          </span>
          <span className="text-[10px] text-slate-500">
            Rec: {formatUSD(totalDepositedUsd)}
          </span>
        </div>

        {/* Total Profit (Hero - Clean Emerald Light) */}
        <div className="col-span-2 sm:col-span-1 p-3.5 rounded-xl bg-emerald-50/80 border border-emerald-300 text-emerald-950 shadow-2xs flex flex-col justify-between">
          <span className="text-[10px] uppercase font-bold text-emerald-800 tracking-wider">
            Total Profit
          </span>
          <span className="text-xl font-mono font-bold text-emerald-800 mt-1">
            {formatBDT(totalProfit)}
          </span>
          <span className="text-[10px] text-emerald-700">
            Charge + Comm.
          </span>
        </div>
      </div>

      {/* Kaka's Fund Reconciliation & Personal Expense Strip */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-2 border-b border-slate-100">
          <div className="flex items-center space-x-2">
            <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-700 flex items-center justify-center font-bold">
              <Wallet className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                কাকার ফান্ড ও ব্যক্তিগত খরচ খতিয়ান (Kaka's Fund Reconciliation)
              </h3>
              <p className="text-[11px] text-slate-500">
                জমা ফান্ড, কাস্টমারদের পাঠানো টাকা এবং নিজের খরচের ক্লিয়ার হিসাব
              </p>
            </div>
          </div>

          <button
            onClick={() => setActiveTab('personal-expense')}
            className="self-start sm:self-auto px-3 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-xs font-bold transition flex items-center space-x-1.5"
          >
            <span>খরচের খতিয়ান দেখুন ({personalExpenses.length})</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">
              ১. মোট প্রাপ্ত ফান্ড
            </span>
            <span className="text-base font-bold font-mono text-slate-900 mt-1 block">
              {formatUSD(totalDepositedUsd)}
            </span>
            <span className="text-[10px] text-slate-500">৳{totalDepositedBdt.toLocaleString()} BDT</span>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">
              ২. কাস্টমারদের পাঠানো
            </span>
            <span className="text-base font-bold font-mono text-emerald-700 mt-1 block">
              {formatUSD(totalSentUsd)}
            </span>
            <span className="text-[10px] text-slate-500">৳{totalSentBdt.toLocaleString()} BDT</span>
          </div>

          <div className="p-3 bg-amber-50/70 rounded-xl border border-amber-200">
            <span className="text-[10px] text-amber-800 font-bold uppercase tracking-wider block">
              ৩. নিজের ব্যক্তিগত খরচ
            </span>
            <span className="text-base font-bold font-mono text-amber-900 mt-1 block">
              {formatUSD(totalPersonalExpenseUsd)}
            </span>
            <span className="text-[10px] text-amber-700 font-medium">৳{totalPersonalExpenseBdt.toLocaleString()} BDT</span>
          </div>

          <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-300">
            <span className="text-[10px] text-emerald-800 font-bold uppercase tracking-wider block">
              ৪. প্রকৃত অবশিষ্ট ক্যাশ
            </span>
            <span className="text-base font-bold font-mono text-emerald-950 mt-1 block">
              {formatUSD(netAvailableUsdBalance)}
            </span>
            <span className="text-[10px] text-emerald-700 font-medium">হাতে অবশিষ্ট ফান্ড</span>
          </div>
        </div>
      </div>

      {/* 30-Day Cross-Border Transaction Volume Line Chart (Recharts) */}
      <TransactionVolumeTrendChart />

      {/* 6-Month Profit vs Personal Expenses Trend Chart */}
      <ProfitExpensesTrendChart />

      {/* REFERENCE PERFORMANCE (Requirement 16 & 7) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
            Reference Performance
          </h3>
          <span className="text-xs text-slate-500">
            Kaka vs Humaiun Kaka's Assistant
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {referenceSummaries.map((ref) => (
            <div
              key={ref.referenceName}
              className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center space-x-2.5">
                  <div
                    className={`w-9 h-9 rounded-xl font-bold flex items-center justify-center text-xs ${
                      ref.referenceName === 'Kaka'
                        ? 'bg-blue-100 text-blue-900'
                        : 'bg-purple-100 text-purple-900'
                    }`}
                  >
                    {ref.referenceName.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-slate-900">{ref.referenceName}</h4>
                    <span className="text-xs text-slate-500">
                      {ref.transactionCount} completed transactions
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setActiveTab('reports');
                  }}
                  className="text-xs text-emerald-700 hover:text-emerald-900 font-bold"
                >
                  Generate Statement &rarr;
                </button>
              </div>

              {/* 3 Core Stats: USD | BDT | Profit */}
              <div className="grid grid-cols-3 gap-3 text-center font-mono">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-[10px] font-sans font-bold text-slate-500 uppercase block">
                    USD Sent
                  </span>
                  <span className="text-base font-bold text-slate-900 block mt-1">
                    {formatUSD(ref.totalUsdSent)}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-[10px] font-sans font-bold text-slate-500 uppercase block">
                    BDT Sent
                  </span>
                  <span className="text-base font-bold text-slate-900 block mt-1">
                    {formatBDT(ref.totalBdtSent)}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                  <span className="text-[10px] font-sans font-bold text-emerald-800 uppercase block">
                    Profit
                  </span>
                  <span className="text-base font-bold text-emerald-950 block mt-1">
                    {formatBDT(ref.totalProfit)}
                  </span>
                </div>
              </div>

              {/* Secondary Breakdown */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span>
                  Bank Charge: <strong className="font-mono text-slate-700">{formatBDT(ref.totalBankCharge)}</strong>
                </span>
                <span>
                  Commission: <strong className="font-mono text-emerald-700">{formatBDT(ref.totalCommission)}</strong>
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CHARTS SECTION (Requirement 16) */}
      {/* 1. Monthly Profit | 2. USD Sent by Reference | 3. BDT Sent by Reference | 4. Bank-wise Transactions | 5. Monthly USD Volume */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Chart 1: Monthly Profit Trend */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="flex items-center space-x-2">
              <BarChart3 className="w-4 h-4 text-emerald-700" />
              <h3 className="text-sm font-bold text-slate-900">1. Monthly Profit Trend</h3>
            </div>
            <span className="text-[11px] font-mono text-emerald-700 font-bold">
              {formatBDT(totalProfit)} total
            </span>
          </div>

          <div className="h-44 flex items-end space-x-3 pt-6 px-2">
            {monthlyStats.map((item) => {
              const heightPct = Math.min(100, Math.max(15, (item.profit / maxMonthlyProfit) * 100));
              return (
                <div key={item.month} className="flex-1 flex flex-col items-center group relative">
                  {/* Tooltip on hover */}
                  <div className="opacity-0 group-hover:opacity-100 transition absolute -top-8 bg-slate-900 text-white text-[10px] font-mono py-1 px-2 rounded shadow whitespace-nowrap pointer-events-none z-10">
                    {formatBDT(item.profit)}
                  </div>
                  <div className="w-full bg-slate-100 rounded-t-lg h-32 flex items-end">
                    <div
                      style={{ height: `${heightPct}%` }}
                      className="w-full bg-emerald-700 hover:bg-emerald-600 rounded-t-lg transition-all duration-300"
                    ></div>
                  </div>
                  <span className="text-[10px] font-mono text-slate-500 mt-2">
                    {item.month}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Chart 2 & 3: USD & BDT by Reference */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="flex items-center space-x-2">
              <PieChart className="w-4 h-4 text-blue-700" />
              <h3 className="text-sm font-bold text-slate-900">2 & 3. Share by Reference</h3>
            </div>
            <span className="text-[11px] text-slate-500">USD & BDT split</span>
          </div>

          <div className="space-y-4 pt-1">
            {referenceSummaries.map((ref) => {
              const usdShare = totalSentUsd > 0 ? (ref.totalUsdSent / totalSentUsd) * 100 : 50;
              return (
                <div key={ref.referenceName} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-800">{ref.referenceName}</span>
                    <span className="font-mono text-slate-600">
                      {formatUSD(ref.totalUsdSent)} ({usdShare.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                    <div
                      style={{ width: `${usdShare}%` }}
                      className={`h-full rounded-full ${
                        ref.referenceName === 'Kaka' ? 'bg-blue-600' : 'bg-purple-600'
                      }`}
                    ></div>
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                    <span>BDT: {formatBDT(ref.totalBdtSent)}</span>
                    <span>Profit: {formatBDT(ref.totalProfit)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Chart 4 & 5: Bank-wise Transactions & Monthly USD Volume */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="flex items-center space-x-2">
              <Building className="w-4 h-4 text-slate-700" />
              <h3 className="text-sm font-bold text-slate-900">4. Bank-Wise Payouts</h3>
            </div>
            <span className="text-[11px] text-slate-500">Top banks</span>
          </div>

          <div className="space-y-2.5">
            {bankDistribution.map((b) => (
              <div key={b.bank} className="flex items-center justify-between text-xs">
                <div className="flex items-center space-x-2 truncate max-w-[170px]">
                  <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                  <span className="font-semibold text-slate-800 truncate">{b.bank}</span>
                </div>
                <div className="text-right font-mono">
                  <span className="font-bold text-slate-900">{formatUSD(b.usd)}</span>
                  <span className="text-[10px] text-slate-400 ml-1.5">({b.count} txns)</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* RECENT TRANSACTIONS TABLE */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Recent Payout Transactions</h3>
            <p className="text-xs text-slate-500">Last 5 recorded transactions</p>
          </div>
          <button
            onClick={() => setActiveTab('transactions')}
            className="text-xs font-bold text-emerald-700 hover:text-emerald-900 flex items-center space-x-1"
          >
            <span>View All</span>
            <span>&rarr;</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
                <th className="py-2.5 px-3">Date</th>
                <th className="py-2.5 px-3">ID</th>
                <th className="py-2.5 px-3">Recipient</th>
                <th className="py-2.5 px-3">Bank</th>
                <th className="py-2.5 px-3 text-right">USD</th>
                <th className="py-2.5 px-3 text-right">Expected BDT</th>
                <th className="py-2.5 px-3 text-right">Actual Sent</th>
                <th className="py-2.5 px-3 text-right">Bank Charge</th>
                <th className="py-2.5 px-3 text-right">Commission</th>
                <th className="py-2.5 px-3 text-right text-emerald-900">Profit</th>
                <th className="py-2.5 px-3 text-center">Reference</th>
                <th className="py-2.5 px-3 text-center">Status</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {recentTransactions.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-6 text-center text-slate-400">
                    No transactions recorded yet.
                  </td>
                </tr>
              ) : (
                recentTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50">
                    <td className="py-2.5 px-3 font-medium text-slate-700 whitespace-nowrap">
                      {formatDate(tx.date)}
                    </td>
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-900 whitespace-nowrap">
                      {tx.id}
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-slate-900">
                      {tx.recipientName}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap">
                      {tx.bankName}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                      {formatUSD(tx.sendUsd)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-600 whitespace-nowrap">
                      {formatBDT(tx.expectedBdt)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                      {formatBDT(tx.actualSend)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-700 whitespace-nowrap">
                      {formatBDT(tx.bankCharge)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-emerald-700 whitespace-nowrap">
                      {formatBDT(tx.commission)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-800 whitespace-nowrap bg-emerald-50/40">
                      {formatBDT(tx.profit)}
                    </td>
                    <td className="py-2.5 px-3 text-center whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700">
                        {tx.referenceBy}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center whitespace-nowrap">
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        <CheckCircle2 className="w-2.5 h-2.5 mr-0.5" /> {tx.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
