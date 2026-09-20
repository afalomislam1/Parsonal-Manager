import React, { useState } from 'react';
import {
  Building2,
  DollarSign,
  Plus,
  Landmark,
  Calendar,
  Layers,
  ArrowDownLeft,
  Search,
} from 'lucide-react';
import { useAccounting } from '../../context/AccountingContext';
import {
  formatBDT,
  formatDate,
  formatUSD,
  roundTo,
} from '../../utils/calculations';

export function SourcesLedgerView() {
  const { sourceLedger, deposits, setActiveTab } = useAccounting();
  const [selectedSource, setSelectedSource] = useState<string | null>(null);

  const activeSourceDeposits = React.useMemo(() => {
    if (!selectedSource) return deposits;
    return deposits.filter(
      (d) => d.senderName.toLowerCase() === selectedSource.toLowerCase()
    );
  }, [deposits, selectedSource]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b border-slate-200">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Source & Sender Ledger
          </h2>
          <p className="text-xs sm:text-sm text-slate-600">
            Account summaries tracking total USD sent by each funding source (e.g. Kaka, Dubai partners).
          </p>
        </div>

        <button
          onClick={() => setActiveTab('deposits')}
          className="px-3.5 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center space-x-1.5 shadow-sm shadow-emerald-700/20"
        >
          <ArrowDownLeft className="w-3.5 h-3.5" />
          <span>New Source Deposit</span>
        </button>
      </div>

      {/* Source Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sourceLedger.map((s) => {
          const isSelected = selectedSource === s.sourceName;
          return (
            <div
              key={s.sourceName}
              onClick={() => setSelectedSource(isSelected ? null : s.sourceName)}
              className={`p-5 rounded-2xl border transition cursor-pointer shadow-sm ${
                isSelected
                  ? 'bg-emerald-50/70 border-emerald-500 ring-2 ring-emerald-500/20'
                  : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold text-xs">
                    {s.sourceName.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">{s.sourceName}</h3>
                    <span className="text-[11px] text-slate-500">
                      {s.depositCount} deposits recorded
                    </span>
                  </div>
                </div>

                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    isSelected
                      ? 'bg-emerald-700 text-white'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {isSelected ? 'Viewing Deposits' : 'Click to Filter'}
                </span>
              </div>

              <div className="mt-3 space-y-2 font-mono text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-sans text-slate-500">Total USD Received:</span>
                  <span className="font-bold text-sm text-emerald-900">
                    {formatUSD(s.totalUsdReceived)}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="font-sans text-slate-500">Average Rate:</span>
                  <span className="font-semibold text-slate-700">৳{s.averageRate.toFixed(2)}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="font-sans text-slate-500">Total BDT Value:</span>
                  <span className="font-bold text-slate-900">{formatBDT(s.totalBdtValue)}</span>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px]">
                  <span className="font-sans text-slate-400">Last Deposit Date:</span>
                  <span className="font-sans text-slate-600 font-medium">
                    {formatDate(s.lastDepositDate)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Source History Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              {selectedSource ? `Deposit History for "${selectedSource}"` : 'All Sources Deposit Ledger History'}
            </h3>
            <span className="text-xs text-slate-500">
              Showing {activeSourceDeposits.length} deposits
            </span>
          </div>

          {selectedSource && (
            <button
              onClick={() => setSelectedSource(null)}
              className="text-xs font-bold text-emerald-700 hover:underline"
            >
              Clear filter (Show all)
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-white text-slate-600 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
                <th className="py-2.5 px-3">Date</th>
                <th className="py-2.5 px-3">ID</th>
                <th className="py-2.5 px-3">Source Name</th>
                <th className="py-2.5 px-3 text-right">USD Amount</th>
                <th className="py-2.5 px-3 text-right">Rate</th>
                <th className="py-2.5 px-3 text-right">BDT Amount</th>
                <th className="py-2.5 px-3">Receiving Method</th>
                <th className="py-2.5 px-3">Note</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {activeSourceDeposits.map((d) => (
                <tr key={d.id} className="hover:bg-slate-50">
                  <td className="py-3 px-3 font-medium text-slate-700 whitespace-nowrap">
                    {formatDate(d.date)}
                  </td>
                  <td className="py-3 px-3 font-mono font-bold text-slate-900 whitespace-nowrap">
                    {d.id}
                  </td>
                  <td className="py-3 px-3 font-bold text-slate-900">{d.senderName}</td>
                  <td className="py-3 px-3 text-right font-mono font-bold text-emerald-900 whitespace-nowrap">
                    {formatUSD(d.usdAmount)}
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-slate-600 whitespace-nowrap">
                    ৳{d.receivingRate}
                  </td>
                  <td className="py-3 px-3 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                    {formatBDT(d.bdtAmount)}
                  </td>
                  <td className="py-3 px-3 text-slate-700 whitespace-nowrap">
                    {d.receivingMethod}
                  </td>
                  <td className="py-3 px-3 text-slate-500 italic truncate max-w-xs">
                    {d.note || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
