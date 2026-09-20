import React, { useState, useMemo } from 'react';
import {
  UserCheck,
  TrendingUp,
  DollarSign,
  Receipt,
  Percent,
  Calendar,
  Layers,
  ShieldCheck,
  CheckCircle,
  Building,
  ArrowUpRight,
  Sparkles,
} from 'lucide-react';
import { useAccounting } from '../../context/AccountingContext';
import {
  formatBDT,
  formatDate,
  formatUSD,
  roundTo,
} from '../../utils/calculations';

export function ProfileView() {
  const {
    transactions,
    referenceSummaries,
    todayStats,
    thisMonthStats,
    settings,
  } = useAccounting();

  // Custom date filter for profile analysis
  const [profileFromDate, setProfileFromDate] = useState<string>('');
  const [profileToDate, setProfileToDate] = useState<string>('');

  // Filtered completed transactions
  const activeCompletedTransactions = useMemo(() => {
    return transactions.filter((t) => {
      if (t.status !== 'Completed') return false;
      if (profileFromDate && t.date < profileFromDate) return false;
      if (profileToDate && t.date > profileToDate) return false;
      return true;
    });
  }, [transactions, profileFromDate, profileToDate]);

  const totalUsdSent = useMemo(
    () => roundTo(activeCompletedTransactions.reduce((s, t) => s + t.sendUsd, 0), 2),
    [activeCompletedTransactions]
  );
  const totalBdtSent = useMemo(
    () => roundTo(activeCompletedTransactions.reduce((s, t) => s + t.actualSend, 0), 2),
    [activeCompletedTransactions]
  );
  const totalBankCharge = useMemo(
    () => roundTo(activeCompletedTransactions.reduce((s, t) => s + t.bankCharge, 0), 2),
    [activeCompletedTransactions]
  );
  const totalCommission = useMemo(
    () => roundTo(activeCompletedTransactions.reduce((s, t) => s + t.commission, 0), 2),
    [activeCompletedTransactions]
  );
  const totalProfit = useMemo(
    () => roundTo(activeCompletedTransactions.reduce((s, t) => s + t.profit, 0), 2),
    [activeCompletedTransactions]
  );
  const totalTransactionsCount = activeCompletedTransactions.length;

  // Reference breakdown for this filtered period
  const filteredRefSummaries = useMemo(() => {
    const refs = Array.from(
      new Set([...settings.references, ...activeCompletedTransactions.map((t) => t.referenceBy)])
    ).filter(Boolean);

    return refs.map((ref) => {
      const txs = activeCompletedTransactions.filter((t) => t.referenceBy === ref);
      return {
        name: ref,
        usd: roundTo(txs.reduce((s, t) => s + t.sendUsd, 0), 2),
        bdt: roundTo(txs.reduce((s, t) => s + t.actualSend, 0), 2),
        profit: roundTo(txs.reduce((s, t) => s + t.profit, 0), 2),
        charge: roundTo(txs.reduce((s, t) => s + t.bankCharge, 0), 2),
        commission: roundTo(txs.reduce((s, t) => s + t.commission, 0), 2),
        count: txs.length,
      };
    });
  }, [activeCompletedTransactions, settings.references]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              My Profile & Profit Ledger
            </h2>
            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold">
              Accountant Master
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-600">
            Personal financial statement and earnings performance across all requests.
          </p>
        </div>

        {/* Date Filter Bar */}
        <div className="flex items-center space-x-2 bg-white p-2 rounded-xl border border-slate-200 shadow-sm text-xs">
          <Calendar className="w-3.5 h-3.5 text-slate-400" />
          <input
            type="date"
            value={profileFromDate}
            onChange={(e) => setProfileFromDate(e.target.value)}
            className="px-2 py-1 rounded border border-slate-200 text-slate-800 text-xs"
            title="Filter Start"
          />
          <span className="text-slate-400">to</span>
          <input
            type="date"
            value={profileToDate}
            onChange={(e) => setProfileToDate(e.target.value)}
            className="px-2 py-1 rounded border border-slate-200 text-slate-800 text-xs"
            title="Filter End"
          />
          {(profileFromDate || profileToDate) && (
            <button
              onClick={() => {
                setProfileFromDate('');
                setProfileToDate('');
              }}
              className="text-xs text-rose-600 font-bold hover:underline"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Main Top 6 Master KPI Metric Cards (Requirement 8) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-800 to-emerald-950 text-white shadow-md">
          <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-300 block">
            TOTAL PROFIT
          </span>
          <span className="text-xl sm:text-2xl font-mono font-bold block mt-1">
            {formatBDT(totalProfit)}
          </span>
          <span className="text-[10px] text-emerald-200/80 block mt-0.5">
            Charge + Commission
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block">
            TOTAL COMMISSION
          </span>
          <span className="text-xl sm:text-2xl font-mono font-bold text-emerald-700 block mt-1">
            {formatBDT(totalCommission)}
          </span>
          <span className="text-[10px] text-slate-400 block mt-0.5 font-mono">
            ৳{settings.commissionPerUsd}/USD
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block">
            TOTAL BANK CHARGE
          </span>
          <span className="text-xl sm:text-2xl font-mono font-bold text-slate-900 block mt-1">
            {formatBDT(totalBankCharge)}
          </span>
          <span className="text-[10px] text-slate-400 block mt-0.5">
            Difference saved
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block">
            TOTAL USD SENT
          </span>
          <span className="text-xl sm:text-2xl font-mono font-bold text-emerald-900 block mt-1">
            {formatUSD(totalUsdSent)}
          </span>
          <span className="text-[10px] text-slate-400 block mt-0.5">
            Completed volume
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block">
            TOTAL BDT SENT
          </span>
          <span className="text-xl sm:text-2xl font-mono font-bold text-slate-900 block mt-1">
            {formatBDT(totalBdtSent)}
          </span>
          <span className="text-[10px] text-slate-400 block mt-0.5">
            Bank transfers
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block">
            TRANSACTIONS
          </span>
          <span className="text-xl sm:text-2xl font-mono font-bold text-slate-900 block mt-1">
            {totalTransactionsCount}
          </span>
          <span className="text-[10px] text-slate-400 block mt-0.5">
            Completed payouts
          </span>
        </div>
      </div>

      {/* Time Horizon Windows: Today vs This Month */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Today Box */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
              <h3 className="text-sm font-bold text-slate-900">Today's Performance</h3>
            </div>
            <span className="text-xs text-slate-500 font-mono">
              {todayStats.count} transaction(s) today
            </span>
          </div>

          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="p-3 rounded-xl bg-slate-50">
              <span className="text-[10px] text-slate-500 uppercase font-bold block">
                Today Profit
              </span>
              <span className="text-base sm:text-lg font-bold font-mono text-emerald-800 block mt-1">
                {formatBDT(todayStats.profit)}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-slate-50">
              <span className="text-[10px] text-slate-500 uppercase font-bold block">
                Today USD
              </span>
              <span className="text-base sm:text-lg font-bold font-mono text-emerald-900 block mt-1">
                {formatUSD(todayStats.usd)}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-slate-50">
              <span className="text-[10px] text-slate-500 uppercase font-bold block">
                Today BDT
              </span>
              <span className="text-base sm:text-lg font-bold font-mono text-slate-900 block mt-1">
                {formatBDT(todayStats.bdt)}
              </span>
            </div>
          </div>
        </div>

        {/* This Month Box */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
              <h3 className="text-sm font-bold text-slate-900">This Month's Performance</h3>
            </div>
            <span className="text-xs text-slate-500 font-mono">
              {thisMonthStats.count} transaction(s) this month
            </span>
          </div>

          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="p-3 rounded-xl bg-slate-50">
              <span className="text-[10px] text-slate-500 uppercase font-bold block">
                This Month Profit
              </span>
              <span className="text-base sm:text-lg font-bold font-mono text-emerald-800 block mt-1">
                {formatBDT(thisMonthStats.profit)}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-slate-50">
              <span className="text-[10px] text-slate-500 uppercase font-bold block">
                This Month USD
              </span>
              <span className="text-base sm:text-lg font-bold font-mono text-emerald-900 block mt-1">
                {formatUSD(thisMonthStats.usd)}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-slate-50">
              <span className="text-[10px] text-slate-500 uppercase font-bold block">
                This Month BDT
              </span>
              <span className="text-base sm:text-lg font-bold font-mono text-slate-900 block mt-1">
                {formatBDT(thisMonthStats.bdt)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Reference-Wise Breakdown Cards (Requirement 8) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
            Reference-Wise Detailed Breakdown
          </h3>
          <span className="text-xs text-slate-500">
            Kaka vs Humaiun Kaka's Assistant
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredRefSummaries.map((ref) => (
            <div
              key={ref.name}
              className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4"
            >
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-900 font-bold flex items-center justify-center text-xs">
                    {ref.name.slice(0, 2).toUpperCase()}
                  </div>
                  <h4 className="text-base font-bold text-slate-900">{ref.name}</h4>
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-slate-100 font-mono text-xs text-slate-700 font-semibold">
                  {ref.count} Txns
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-xs font-mono">
                <div className="p-2.5 rounded-lg bg-slate-50">
                  <span className="text-[10px] font-sans text-slate-500 block uppercase">
                    USD Sent
                  </span>
                  <span className="text-sm font-bold text-slate-900">{formatUSD(ref.usd)}</span>
                </div>

                <div className="p-2.5 rounded-lg bg-slate-50">
                  <span className="text-[10px] font-sans text-slate-500 block uppercase">
                    BDT Sent
                  </span>
                  <span className="text-sm font-bold text-slate-900">{formatBDT(ref.bdt)}</span>
                </div>

                <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200">
                  <span className="text-[10px] font-sans text-emerald-800 block uppercase font-bold">
                    My Profit
                  </span>
                  <span className="text-sm font-bold text-emerald-900">{formatBDT(ref.profit)}</span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span>Bank Charge: <strong>{formatBDT(ref.charge)}</strong></span>
                <span>Commission: <strong>{formatBDT(ref.commission)}</strong></span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
