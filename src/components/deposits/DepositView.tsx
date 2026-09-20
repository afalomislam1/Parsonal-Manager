import React, { useState } from 'react';
import {
  ArrowDownLeft,
  Plus,
  Save,
  RotateCcw,
  CheckCircle,
  AlertCircle,
  Building,
  Trash2,
  Edit2,
  Landmark,
  Layers,
  ArrowUpRight,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { useAccounting } from '../../context/AccountingContext';
import {
  computeDepositBDT,
  formatBDT,
  formatDate,
  formatUSD,
  getTodayDateString,
  roundTo,
} from '../../utils/calculations';
import { DepositRecord } from '../../types';
import { ConfirmDeleteModal } from '../modals/ConfirmDeleteModal';
import { EditDepositModal } from '../modals/EditDepositModal';

export function DepositView() {
  const {
    deposits,
    createDeposit,
    updateDeposit,
    deleteDeposit,
    totalDepositedUsd,
    totalDepositedBdt,
    totalSentUsd,
    remainingUsdBalance,
    sourceLedger,
    settings,
  } = useAccounting();

  // Form inputs
  const [date, setDate] = useState<string>(getTodayDateString());
  const [senderName, setSenderName] = useState<string>('Kaka');
  const [usdAmount, setUsdAmount] = useState<string>('');
  const [receivingRate, setReceivingRate] = useState<string>(
    settings.defaultDollarRate ? String(settings.defaultDollarRate) : '125'
  );
  const [receivingMethod, setReceivingMethod] = useState<string>('Bank Asia');
  const [note, setNote] = useState<string>('');

  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Edit / Delete states
  const [editingDeposit, setEditingDeposit] = useState<DepositRecord | null>(null);
  const [deletingDepositId, setDeletingDepositId] = useState<string | null>(null);

  // Live calculation
  const numUsd = parseFloat(usdAmount) || 0;
  const numRate = parseFloat(receivingRate) || 0;
  const calculatedBdt = computeDepositBDT(numUsd, numRate);

  const handleReset = () => {
    setDate(getTodayDateString());
    setSenderName('Kaka');
    setUsdAmount('');
    setReceivingRate(settings.defaultDollarRate ? String(settings.defaultDollarRate) : '125');
    setReceivingMethod('Bank Asia');
    setNote('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!senderName.trim()) {
      setErrorMessage('Sender / Source name is required.');
      return;
    }
    if (numUsd <= 0) {
      setErrorMessage('Please enter a valid USD deposit amount.');
      return;
    }
    if (numRate <= 0) {
      setErrorMessage('Please enter a valid receiving dollar rate.');
      return;
    }

    try {
      const dep = createDeposit({
        date,
        senderName,
        usdAmount: numUsd,
        receivingRate: numRate,
        receivingMethod,
        note,
      });

      setSuccessMessage(
        `Deposit ${dep.id} recorded successfully! Added ${formatUSD(dep.usdAmount)} (${formatBDT(
          dep.bdtAmount
        )}) to USD balance.`
      );
      handleReset();
    } catch {
      setErrorMessage('Failed to record deposit. Please check values.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b border-slate-200">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Deposit / Joma System
          </h2>
          <p className="text-xs sm:text-sm text-slate-600">
            Record incoming USD source deposits and track source fund balances.
          </p>
        </div>
      </div>

      {/* Prominent USD Balance & Fund Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-900 text-white p-5 rounded-2xl border border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Running USD Balance
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-900/60 text-emerald-300 border border-emerald-700/60">
              Formula: Received - Sent
            </span>
          </div>
          <div className="my-2">
            <div className="text-2xl sm:text-3xl font-mono font-bold text-emerald-400">
              {formatUSD(remainingUsdBalance)}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              {formatUSD(totalDepositedUsd)} received - {formatUSD(totalSentUsd)} sent
            </p>
          </div>
          <div className="text-[10px] text-slate-500 font-mono">
            BDT Value @ 125 avg: ≈ {formatBDT(remainingUsdBalance * 125)}
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-600">
            <span className="text-xs font-bold uppercase tracking-wider">Total USD Received</span>
            <ArrowDownLeft className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="my-2">
            <div className="text-2xl font-mono font-bold text-slate-900">
              {formatUSD(totalDepositedUsd)}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Equivalent BDT: <span className="font-mono font-bold text-slate-700">{formatBDT(totalDepositedBdt)}</span>
            </p>
          </div>
          <span className="text-[11px] text-slate-400 font-medium">
            Across {deposits.length} deposit records
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-600">
            <span className="text-xs font-bold uppercase tracking-wider">Total USD Sent (Payouts)</span>
            <ArrowUpRight className="w-4 h-4 text-blue-600" />
          </div>
          <div className="my-2">
            <div className="text-2xl font-mono font-bold text-slate-900">
              {formatUSD(totalSentUsd)}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Current Utilization: <span className="font-mono font-bold text-slate-700">
                {totalDepositedUsd > 0 ? `${roundTo((totalSentUsd / totalDepositedUsd) * 100, 1)}%` : '0%'}
              </span>
            </p>
          </div>
          <span className="text-[11px] text-slate-400 font-medium">
            Deducted from received funds
          </span>
        </div>
      </div>

      {/* New Deposit Form */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-sm">
        <div className="flex items-center space-x-2 pb-3 border-b border-slate-200 mb-4">
          <ArrowDownLeft className="w-5 h-5 text-emerald-700" />
          <h3 className="text-base font-bold text-slate-900">Record New Deposit / Joma</h3>
        </div>

        {successMessage && (
          <div className="p-3 mb-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-center space-x-2 text-xs font-semibold">
            <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {errorMessage && (
          <div className="p-3 mb-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 flex items-center space-x-2 text-xs font-semibold">
            <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                1. Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                id="input-dep-date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                2. Sender / Source Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                id="input-dep-sender"
                placeholder="e.g. Kaka, Dubai Partner..."
                value={senderName}
                onChange={(e) => setSenderName(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-bold text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                6. Receiving Method / Bank <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                id="input-dep-method"
                placeholder="e.g. Bank Asia, Cash, Wire..."
                value={receivingMethod}
                onChange={(e) => setReceivingMethod(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs text-slate-900"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                3. USD Amount ($) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-slate-400 font-bold">$</span>
                <input
                  type="number"
                  id="input-dep-usd"
                  step="any"
                  min="0"
                  placeholder="5000"
                  value={usdAmount}
                  onChange={(e) => setUsdAmount(e.target.value)}
                  required
                  className="w-full pl-8 pr-3 py-2 rounded-lg border border-slate-300 text-slate-900 text-sm font-mono font-bold"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                4. Receiving Dollar Rate (BDT) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-slate-400 font-bold">৳</span>
                <input
                  type="number"
                  id="input-dep-rate"
                  step="any"
                  min="0"
                  placeholder="125"
                  value={receivingRate}
                  onChange={(e) => setReceivingRate(e.target.value)}
                  required
                  className="w-full pl-8 pr-3 py-2 rounded-lg border border-slate-300 text-slate-900 text-sm font-mono font-bold"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                5. BDT Amount (Auto Calculated)
              </label>
              <div className="w-full px-3 py-2 rounded-lg bg-slate-100 border border-slate-200 text-slate-900 text-sm font-mono font-bold flex items-center">
                {formatBDT(calculatedBdt)}
              </div>
              <span className="text-[10px] text-slate-400 mt-0.5 block">
                USD × Receiving Rate
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
              7. Optional Note
            </label>
            <input
              type="text"
              id="input-dep-note"
              placeholder="e.g. Deposit tranche, wire ref #..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs text-slate-900"
            />
          </div>

          <div className="pt-2 flex items-center justify-between">
            <button
              type="button"
              id="btn-dep-reset"
              onClick={handleReset}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 flex items-center"
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1" /> Reset
            </button>

            <button
              type="submit"
              id="btn-dep-submit"
              className="px-5 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center shadow-sm shadow-emerald-700/20"
            >
              <Save className="w-3.5 h-3.5 mr-1.5" /> Save Deposit Record
            </button>
          </div>
        </form>
      </div>

      {/* Source Ledger Section */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-200">
          <div className="flex items-center space-x-2">
            <Landmark className="w-5 h-5 text-emerald-700" />
            <h3 className="text-base font-bold text-slate-900">Source / Sender Ledger</h3>
          </div>
          <span className="text-xs text-slate-500 font-medium">
            Aggregated by incoming funding source
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
                <th className="py-2.5 px-3">Source Name</th>
                <th className="py-2.5 px-3 text-right">Total USD Received</th>
                <th className="py-2.5 px-3 text-right">Average Rate</th>
                <th className="py-2.5 px-3 text-right">Total BDT Value</th>
                <th className="py-2.5 px-3 text-center">Deposits Count</th>
                <th className="py-2.5 px-3 text-right">Last Deposit Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sourceLedger.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-4 text-center text-slate-400">
                    No source ledger data recorded yet.
                  </td>
                </tr>
              ) : (
                sourceLedger.map((s) => (
                  <tr key={s.sourceName} className="hover:bg-slate-50">
                    <td className="py-3 px-3 font-bold text-slate-900 text-sm">
                      {s.sourceName}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-emerald-900 text-sm">
                      {formatUSD(s.totalUsdReceived)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-slate-600">
                      ৳{s.averageRate.toFixed(2)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                      {formatBDT(s.totalBdtValue)}
                    </td>
                    <td className="py-3 px-3 text-center font-mono font-semibold">
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                        {s.depositCount}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right font-medium text-slate-500">
                      {formatDate(s.lastDepositDate)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Deposit Records History: Mobile Cards (<md) + Desktop Table (>=md) */}
      
      {/* Mobile Card List (< md) */}
      <div className="md:hidden space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-sm font-bold text-slate-900">Deposit History Records</h3>
          <span className="text-xs text-slate-500 font-mono">{deposits.length} Records</span>
        </div>

        {deposits.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-6 text-center text-slate-400 text-xs">
            No deposits recorded yet.
          </div>
        ) : (
          deposits.map((dep) => (
            <div
              key={dep.id}
              className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-900">
                    {dep.id}
                  </span>
                  <span className="text-xs text-slate-500 font-medium">{formatDate(dep.date)}</span>
                </div>
                <span className="text-xs font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded">
                  {dep.senderName}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-100 text-xs">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">USD Received</span>
                  <span className="font-mono font-bold text-emerald-900 text-sm">
                    {formatUSD(dep.usdAmount)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Receiving Rate</span>
                  <span className="font-mono font-bold text-slate-800 text-sm">
                    ৳{dep.receivingRate}
                  </span>
                </div>
                <div className="col-span-2 pt-1 border-t border-slate-200/60 flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold text-slate-500">BDT Equivalent</span>
                  <span className="font-mono font-bold text-slate-900 text-sm">
                    {formatBDT(dep.bdtAmount)}
                  </span>
                </div>
              </div>

              <div className="text-xs text-slate-600">
                <span className="text-slate-400">Method: </span>
                <span className="font-medium">{dep.receivingMethod}</span>
                {dep.note && (
                  <p className="text-[11px] text-slate-400 italic mt-0.5">Note: {dep.note}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingDeposit(dep)}
                  className="min-h-[44px] px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold flex items-center justify-center space-x-1.5 transition active:scale-95"
                >
                  <Edit2 className="w-3.5 h-3.5 text-slate-600" />
                  <span>Edit (এডিট)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDeletingDepositId(dep.id)}
                  className="min-h-[44px] px-3 py-2 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold flex items-center justify-center space-x-1.5 transition active:scale-95"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                  <span>Delete (মুছে ফেলুন)</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Deposit Records History Table (hidden on mobile, visible on md+) */}
      <div className="hidden md:block bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900">Deposit History Records</h3>
          <span className="text-xs text-slate-500 font-mono">
            {deposits.length} Records
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
                <th className="py-2.5 px-3">Date</th>
                <th className="py-2.5 px-3">DEP ID</th>
                <th className="py-2.5 px-3">Source Name</th>
                <th className="py-2.5 px-3 text-right">USD Amount</th>
                <th className="py-2.5 px-3 text-right">Rate</th>
                <th className="py-2.5 px-3 text-right">BDT Amount</th>
                <th className="py-2.5 px-3">Method / Bank</th>
                <th className="py-2.5 px-3">Note</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {deposits.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    No deposits recorded yet.
                  </td>
                </tr>
              ) : (
                deposits.map((dep) => (
                  <tr key={dep.id} className="hover:bg-slate-50">
                    <td className="py-3 px-3 font-medium text-slate-700 whitespace-nowrap">
                      {formatDate(dep.date)}
                    </td>
                    <td className="py-3 px-3 font-mono font-bold text-slate-900 whitespace-nowrap">
                      {dep.id}
                    </td>
                    <td className="py-3 px-3 font-bold text-slate-900">
                      {dep.senderName}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-emerald-900 whitespace-nowrap">
                      {formatUSD(dep.usdAmount)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-slate-600 whitespace-nowrap">
                      ৳{dep.receivingRate}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                      {formatBDT(dep.bdtAmount)}
                    </td>
                    <td className="py-3 px-3 text-slate-700 whitespace-nowrap">
                      {dep.receivingMethod}
                    </td>
                    <td className="py-3 px-3 text-slate-500 italic max-w-xs truncate">
                      {dep.note || '-'}
                    </td>
                    <td className="py-3 px-3 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end space-x-1">
                        <button
                          id={`btn-edit-dep-${dep.id}`}
                          onClick={() => setEditingDeposit(dep)}
                          className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
                          title="Edit deposit"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          id={`btn-delete-dep-${dep.id}`}
                          onClick={() => setDeletingDepositId(dep.id)}
                          className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                          title="Delete deposit"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Deposit Modal */}
      {editingDeposit && (
        <EditDepositModal
          deposit={editingDeposit}
          onClose={() => setEditingDeposit(null)}
        />
      )}

      {/* Delete Modal */}
      {deletingDepositId && (
        <ConfirmDeleteModal
          title="Delete Deposit Record"
          message="Are you sure you want to delete this deposit? This will reduce the running USD balance accordingly."
          itemId={deletingDepositId}
          onConfirm={() => deleteDeposit(deletingDepositId)}
          onClose={() => setDeletingDepositId(null)}
        />
      )}
    </div>
  );
}
