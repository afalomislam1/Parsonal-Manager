import React, { useState, useMemo } from 'react';
import {
  FileText,
  Calendar,
  Filter,
  FileSpreadsheet,
  Printer,
  Download,
  Building,
  CheckCircle2,
  TrendingUp,
  DollarSign,
  UserCheck,
  Percent,
} from 'lucide-react';
import { useAccounting } from '../../context/AccountingContext';
import { Transaction } from '../../types';
import {
  formatBDT,
  formatDate,
  formatUSD,
  roundTo,
} from '../../utils/calculations';
import { exportTransactionsCSV } from '../../utils/storage';

export function ReportsView() {
  const { transactions, settings } = useAccounting();

  // Date Range state (Default to current month)
  const now = new Date();
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .slice(0, 10);
  const todayDate = now.toISOString().slice(0, 10);

  const [fromDate, setFromDate] = useState<string>(firstDayOfMonth);
  const [toDate, setToDate] = useState<string>(todayDate);
  const [selectedReference, setSelectedReference] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Completed' | 'Pending'>('Completed');

  // Filter transactions
  const reportTransactions = useMemo(() => {
    return transactions.filter((t) => {
      if (fromDate && t.date < fromDate) return false;
      if (toDate && t.date > toDate) return false;
      if (selectedReference !== 'All' && t.referenceBy !== selectedReference) return false;
      if (statusFilter !== 'All' && t.status !== statusFilter) return false;
      return true;
    }).sort((a, b) => (a.date < b.date ? 1 : -1));
  }, [transactions, fromDate, toDate, selectedReference, statusFilter]);

  // Aggregate totals
  const completedList = useMemo(
    () => reportTransactions.filter((t) => t.status === 'Completed'),
    [reportTransactions]
  );

  const totalUsd = roundTo(completedList.reduce((s, t) => s + t.sendUsd, 0), 2);
  const totalExpectedBdt = roundTo(completedList.reduce((s, t) => s + t.expectedBdt, 0), 2);
  const totalActualSent = roundTo(completedList.reduce((s, t) => s + t.actualSend, 0), 2);
  const totalBankCharge = roundTo(completedList.reduce((s, t) => s + t.bankCharge, 0), 2);
  const totalCommission = roundTo(completedList.reduce((s, t) => s + t.commission, 0), 2);
  const totalProfit = roundTo(completedList.reduce((s, t) => s + t.profit, 0), 2);

  // Breakdown by Reference within the date range
  const referenceBreakdown = useMemo(() => {
    const refs = Array.from(
      new Set([...settings.references, ...reportTransactions.map((t) => t.referenceBy)])
    ).filter(Boolean);

    return refs.map((ref) => {
      const items = completedList.filter((t) => t.referenceBy === ref);
      return {
        referenceName: ref,
        count: items.length,
        usd: roundTo(items.reduce((s, t) => s + t.sendUsd, 0), 2),
        bdt: roundTo(items.reduce((s, t) => s + t.actualSend, 0), 2),
        expectedBdt: roundTo(items.reduce((s, t) => s + t.expectedBdt, 0), 2),
        bankCharge: roundTo(items.reduce((s, t) => s + t.bankCharge, 0), 2),
        commission: roundTo(items.reduce((s, t) => s + t.commission, 0), 2),
        profit: roundTo(items.reduce((s, t) => s + t.profit, 0), 2),
      };
    });
  }, [completedList, reportTransactions, settings.references]);

  // Date range formatted label
  const dateRangeLabel = `${formatDate(fromDate)} to ${formatDate(toDate)}`;

  const reportTitle =
    selectedReference === 'All'
      ? 'PERSONAL TRANSACTION ACCOUNT REPORT'
      : `${selectedReference.toUpperCase()} ACCOUNT REPORT`;

  const handleExportCSV = () => {
    const prefix = selectedReference === 'All' ? 'personal-report' : `${selectedReference.toLowerCase().replace(/\s+/g, '-')}-report`;
    exportTransactionsCSV(
      reportTransactions,
      `${prefix}-${fromDate}-to-${toDate}.csv`,
      selectedReference !== 'All' ? `${selectedReference} Account` : undefined,
      dateRangeLabel
    );
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Screen Controls & Header (Hidden on print) */}
      <div className="print:hidden space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b border-slate-200">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Reports & Account Statements
            </h2>
            <p className="text-xs sm:text-sm text-slate-600">
              Generate periodic statement reports for your personal accounting or to provide directly to Kaka.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              id="btn-report-excel"
              onClick={handleExportCSV}
              className="px-3.5 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center space-x-1.5 shadow-sm transition"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
              <span>Export Excel / CSV</span>
            </button>

            <button
              id="btn-report-print"
              onClick={handlePrint}
              className="px-3.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center space-x-1.5 shadow-sm transition"
            >
              <Printer className="w-4 h-4" />
              <span>Export PDF / Print</span>
            </button>
          </div>
        </div>

        {/* Filter Configuration Card */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">From Date</label>
              <input
                type="date"
                id="input-report-from"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">To Date</label>
              <input
                type="date"
                id="input-report-to"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Filter by Reference
              </label>
              <select
                id="select-report-reference"
                value={selectedReference}
                onChange={(e) => setSelectedReference(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-bold text-slate-900 bg-white"
              >
                <option value="All">All References Combined</option>
                {settings.references.map((r) => (
                  <option key={r} value={r}>
                    {r} Statement Only
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-900 bg-white"
              >
                <option value="Completed">Completed Only (Official)</option>
                <option value="All">All Statuses (Audit)</option>
                <option value="Pending">Pending Only</option>
              </select>
            </div>
          </div>

          {/* Quick preset buttons */}
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 text-xs">
            <span className="text-slate-500 font-semibold">Quick Presets:</span>
            <button
              onClick={() => {
                setFromDate(todayDate);
                setToDate(todayDate);
              }}
              className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold"
            >
              Today
            </button>
            <button
              onClick={() => {
                setFromDate(firstDayOfMonth);
                setToDate(todayDate);
              }}
              className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold"
            >
              This Month
            </button>
            <button
              onClick={() => {
                setFromDate('');
                setToDate('');
              }}
              className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold"
            >
              All Time
            </button>
            <div className="h-4 w-px bg-slate-200 mx-1"></div>
            {settings.references.map((r) => (
              <button
                key={r}
                onClick={() => setSelectedReference(r)}
                className={`px-2.5 py-1 rounded text-[11px] font-semibold transition ${
                  selectedReference === r
                    ? 'bg-emerald-700 text-white'
                    : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                }`}
              >
                {r} Report
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Printable Report Document Container */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-lg p-6 sm:p-8 space-y-6 print:border-none print:shadow-none print:p-0">
        {/* Document Formal Header */}
        <div className="border-b-2 border-slate-900 pb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2 py-0.5 rounded bg-slate-900 text-white font-mono text-xs font-bold">
                OFFICIAL STATEMENT
              </span>
              <span className="text-xs text-slate-500 font-medium">Cross-Border Operations</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 mt-1">
              {reportTitle}
            </h1>
            <p className="text-xs text-slate-600 mt-0.5">
              USD to BDT Remittance Payouts, Charges & Profit Breakdown
            </p>
          </div>

          <div className="text-right text-xs space-y-1">
            <div className="font-semibold text-slate-800">
              Period: <span className="font-bold text-slate-900">{dateRangeLabel}</span>
            </div>
            <div className="text-slate-500">
              Reference Filter: <span className="font-bold text-slate-700">{selectedReference}</span>
            </div>
            <div className="text-slate-400 font-mono text-[11px]">
              Generated: {new Date().toLocaleDateString('en-GB')} {new Date().toLocaleTimeString()}
            </div>
          </div>
        </div>

        {/* High-Level KPI Summary Tiles */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-[10px] uppercase font-bold text-slate-500 block">
              Total Completed Txns
            </span>
            <span className="text-xl font-mono font-bold text-slate-900 block mt-1">
              {completedList.length}
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-[10px] uppercase font-bold text-slate-500 block">
              Total USD Sent
            </span>
            <span className="text-xl font-mono font-bold text-emerald-900 block mt-1">
              {formatUSD(totalUsd)}
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-[10px] uppercase font-bold text-slate-500 block">
              Actual BDT Sent
            </span>
            <span className="text-xl font-mono font-bold text-slate-900 block mt-1">
              {formatBDT(totalActualSent)}
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-[10px] uppercase font-bold text-slate-500 block">
              Total Bank Charge
            </span>
            <span className="text-xl font-mono font-bold text-slate-800 block mt-1">
              {formatBDT(totalBankCharge)}
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-[10px] uppercase font-bold text-slate-500 block">
              Total Commission
            </span>
            <span className="text-xl font-mono font-bold text-emerald-700 block mt-1">
              {formatBDT(totalCommission)}
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-300">
            <span className="text-[10px] uppercase font-bold text-emerald-800 block">
              Total Profit
            </span>
            <span className="text-xl font-mono font-bold text-emerald-900 block mt-1">
              {formatBDT(totalProfit)}
            </span>
          </div>
        </div>

        {/* Reference Breakdown Section (If All Selected) */}
        {selectedReference === 'All' && referenceBreakdown.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Reference-Wise Sub-Totals
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {referenceBreakdown.map((rb) => (
                <div
                  key={rb.referenceName}
                  className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-1.5 text-xs font-mono"
                >
                  <div className="flex items-center justify-between pb-1.5 border-b border-slate-200 font-sans">
                    <span className="font-bold text-slate-900 text-sm">{rb.referenceName}</span>
                    <span className="px-2 py-0.5 rounded bg-slate-200 text-slate-700 text-[11px] font-mono">
                      {rb.count} txns
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-sans text-slate-500">USD Sent:</span>
                    <span className="font-bold text-slate-900">{formatUSD(rb.usd)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-sans text-slate-500">Actual BDT Sent:</span>
                    <span className="font-bold text-slate-900">{formatBDT(rb.bdt)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-sans text-slate-500">Bank Charge:</span>
                    <span className="font-semibold text-slate-700">{formatBDT(rb.bankCharge)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-sans text-slate-500">Commission:</span>
                    <span className="font-semibold text-emerald-700">{formatBDT(rb.commission)}</span>
                  </div>
                  <div className="flex items-center justify-between pt-1 border-t border-slate-200">
                    <span className="font-sans font-bold text-emerald-900">Total Profit:</span>
                    <span className="font-bold text-emerald-800 text-sm">{formatBDT(rb.profit)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Detailed Transactions Table */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Detailed Transaction Ledger
            </h3>
            <span className="text-xs text-slate-500 font-mono">
              {reportTransactions.length} Record(s) in this period
            </span>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left border-collapse text-[11px]">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider text-[10px] border-b border-slate-300">
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">TX ID</th>
                  <th className="py-2.5 px-3">Recipient</th>
                  <th className="py-2.5 px-3">Account & Bank</th>
                  <th className="py-2.5 px-3 text-right">USD</th>
                  <th className="py-2.5 px-3 text-right">Rate</th>
                  <th className="py-2.5 px-3 text-right">Expected BDT</th>
                  <th className="py-2.5 px-3 text-right">Actual Sent</th>
                  <th className="py-2.5 px-3 text-right">Bank Charge</th>
                  <th className="py-2.5 px-3 text-right">Commission</th>
                  <th className="py-2.5 px-3 text-right">Profit</th>
                  <th className="py-2.5 px-3 text-center">Reference</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-200">
                {reportTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="py-6 text-center text-slate-400">
                      No transactions recorded in this date range.
                    </td>
                  </tr>
                ) : (
                  reportTransactions.map((tx) => (
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
                      <td className="py-2.5 px-3 text-slate-600">
                        <div>{tx.bankName}</div>
                        <div className="font-mono text-[10px] text-slate-500">
                          {tx.accountNumber}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                        {formatUSD(tx.sendUsd)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-600 whitespace-nowrap">
                        ৳{tx.dollarRate}
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
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-800 whitespace-nowrap">
                        {formatBDT(tx.profit)}
                      </td>
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-semibold">
                          {tx.referenceBy}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>

              {reportTransactions.length > 0 && (
                <tfoot className="bg-slate-100 font-bold border-t-2 border-slate-300 text-slate-900">
                  <tr>
                    <td colSpan={4} className="py-3 px-3 uppercase tracking-wider text-xs">
                      Grand Total:
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-xs text-emerald-900">
                      {formatUSD(totalUsd)}
                    </td>
                    <td className="py-3 px-3"></td>
                    <td className="py-3 px-3 text-right font-mono text-xs">
                      {formatBDT(totalExpectedBdt)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-xs">
                      {formatBDT(totalActualSent)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-xs text-slate-700">
                      {formatBDT(totalBankCharge)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-xs text-emerald-700">
                      {formatBDT(totalCommission)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-xs text-emerald-900">
                      {formatBDT(totalProfit)}
                    </td>
                    <td className="py-3 px-3 text-center text-xs">
                      {completedList.length} txns
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>

        {/* Formal Signature / Verification Block for Printed Reports */}
        <div className="pt-8 border-t border-slate-200 hidden print:grid grid-cols-2 gap-8 text-xs">
          <div>
            <div className="border-b border-slate-400 w-48 mb-1"></div>
            <span className="text-slate-600 font-bold">Prepared By / Accountant</span>
          </div>
          <div className="text-right">
            <div className="border-b border-slate-400 w-48 ml-auto mb-1"></div>
            <span className="text-slate-600 font-bold">Verified By / Reference</span>
          </div>
        </div>
      </div>
    </div>
  );
}
