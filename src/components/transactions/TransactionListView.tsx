import React, { useState, useMemo, useEffect } from 'react';
import {
  Filter,
  ArrowUpDown,
  Download,
  Printer,
  Edit2,
  Trash2,
  Calendar,
  Layers,
  ChevronDown,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle2,
  Clock,
  Ban,
  Plus,
  Search,
  X,
  Tag,
  Building,
  DollarSign,
  ArrowUpRight,
  Sparkles,
} from 'lucide-react';
import { useAccounting } from '../../context/AccountingContext';
import { Transaction } from '../../types';
import {
  formatBDT,
  formatDate,
  formatUSD,
  formatNumber,
} from '../../utils/calculations';
import { exportTransactionsCSV } from '../../utils/storage';
import { EditTransactionModal } from '../modals/EditTransactionModal';
import { ConfirmDeleteModal } from '../modals/ConfirmDeleteModal';

export function TransactionListView() {
  const {
    transactions,
    deleteTransaction,
    settings,
    setActiveTab,
    transactionSearchFilter,
    setTransactionSearchFilter,
    focusedTransactionId,
    setFocusedTransactionId,
  } = useAccounting();

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState<string>(transactionSearchFilter || '');
  const [referenceFilter, setReferenceFilter] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [bankFilter, setBankFilter] = useState<string>('All');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');

  // Synchronize local searchTerm with global search filter
  useEffect(() => {
    if (transactionSearchFilter !== undefined) {
      setSearchTerm(transactionSearchFilter);
    }
  }, [transactionSearchFilter]);

  // Scroll to focused transaction
  useEffect(() => {
    if (focusedTransactionId) {
      const scrollTimer = setTimeout(() => {
        const el =
          document.getElementById(`tx-row-${focusedTransactionId}`) ||
          document.getElementById(`tx-card-${focusedTransactionId}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);

      const clearTimer = setTimeout(() => {
        setFocusedTransactionId(null);
      }, 6000);

      return () => {
        clearTimeout(scrollTimer);
        clearTimeout(clearTimer);
      };
    }
  }, [focusedTransactionId, setFocusedTransactionId]);

  // Sorting
  const [sortField, setSortField] = useState<keyof Transaction>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Modals state
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [deletingTransactionId, setDeletingTransactionId] = useState<string | null>(null);
  const [isExportSuccess, setIsExportSuccess] = useState<boolean>(false);

  // Available unique banks in current transactions
  const existingBanks = useMemo(() => {
    return Array.from(new Set(transactions.map((t) => t.bankName))).filter(Boolean);
  }, [transactions]);

  // Filtered and sorted transactions
  const filteredTransactions = useMemo(() => {
    return transactions
      .filter((t) => {
        // Search term
        if (searchTerm.trim()) {
          const q = searchTerm.toLowerCase();
          const match =
            t.id.toLowerCase().includes(q) ||
            t.recipientName.toLowerCase().includes(q) ||
            t.accountNumber.toLowerCase().includes(q) ||
            t.bankName.toLowerCase().includes(q) ||
            t.referenceBy.toLowerCase().includes(q) ||
            (t.note && t.note.toLowerCase().includes(q));
          if (!match) return false;
        }

        // Source / Reference filter
        if (referenceFilter !== 'All' && t.referenceBy !== referenceFilter) {
          return false;
        }

        // Status filter
        if (statusFilter !== 'All' && t.status !== statusFilter) {
          return false;
        }

        // Bank filter
        if (bankFilter !== 'All' && t.bankName !== bankFilter) {
          return false;
        }

        // Date Range filter
        if (fromDate && t.date < fromDate) {
          return false;
        }
        if (toDate && t.date > toDate) {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        let valA: any = a[sortField];
        let valB: any = b[sortField];

        if (typeof valA === 'string') {
          valA = valA.toLowerCase();
          valB = (valB || '').toLowerCase();
        }

        if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
        if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
  }, [
    transactions,
    searchTerm,
    referenceFilter,
    statusFilter,
    bankFilter,
    fromDate,
    toDate,
    sortField,
    sortDirection,
  ]);

  // Totals for filtered Completed items
  const filteredCompleted = useMemo(
    () => filteredTransactions.filter((t) => t.status === 'Completed'),
    [filteredTransactions]
  );

  const totalUsd = useMemo(
    () => filteredCompleted.reduce((s, t) => s + t.sendUsd, 0),
    [filteredCompleted]
  );
  const totalActualSend = useMemo(
    () => filteredCompleted.reduce((s, t) => s + t.actualSend, 0),
    [filteredCompleted]
  );
  const totalBankCharge = useMemo(
    () => filteredCompleted.reduce((s, t) => s + t.bankCharge, 0),
    [filteredCompleted]
  );
  const totalCommission = useMemo(
    () => filteredCompleted.reduce((s, t) => s + t.commission, 0),
    [filteredCompleted]
  );
  const totalProfit = useMemo(
    () => filteredCompleted.reduce((s, t) => s + t.profit, 0),
    [filteredCompleted]
  );

  const handleSort = (field: keyof Transaction) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const handleExportCSV = () => {
    if (filteredTransactions.length === 0) return;
    const rangeStr = fromDate || toDate ? `${fromDate || 'Start'} to ${toDate || 'End'}` : undefined;
    
    let filterSlug = '';
    if (referenceFilter !== 'All') {
      filterSlug += `_${referenceFilter.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
    }
    const filename = `transactions${filterSlug || '_all'}_${new Date().toISOString().slice(0, 10)}.csv`;

    exportTransactionsCSV(
      filteredTransactions,
      filename,
      referenceFilter !== 'All' ? referenceFilter : undefined,
      rangeStr
    );

    setIsExportSuccess(true);
    setTimeout(() => {
      setIsExportSuccess(false);
    }, 2500);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setTransactionSearchFilter('');
    setReferenceFilter('All');
    setStatusFilter('All');
    setBankFilter('All');
    setFromDate('');
    setToDate('');
    setFocusedTransactionId(null);
  };

  const hasActiveFilters =
    Boolean(searchTerm) ||
    referenceFilter !== 'All' ||
    statusFilter !== 'All' ||
    bankFilter !== 'All' ||
    Boolean(fromDate) ||
    Boolean(toDate);

  return (
    <div className="space-y-5">
      {/* Top Header Strip: Minimalist, Clean & Professional */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-200/80">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Transaction History
            </h2>
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
              {filteredTransactions.length}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Cross-border remittance records, BDT payouts, and net profits.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {/* Enhanced Export to CSV Button with dynamic feedback */}
          <button
            id="btn-export-csv"
            onClick={handleExportCSV}
            disabled={filteredTransactions.length === 0}
            className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center space-x-1.5 shadow-2xs transition active:scale-95 ${
              isExportSuccess
                ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                : filteredTransactions.length === 0
                ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
                : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900'
            }`}
            title={`Download ${filteredTransactions.length} records as CSV for personal record keeping`}
          >
            {isExportSuccess ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-800 font-bold">Downloaded CSV!</span>
              </>
            ) : (
              <>
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
                <span>Export CSV</span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-md bg-slate-100 text-slate-600 ml-0.5">
                  {filteredTransactions.length}
                </span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('previous-month-import')}
            className="px-3 py-1.5 rounded-xl border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 text-xs font-semibold flex items-center space-x-1.5 shadow-2xs transition active:scale-95"
            title="Import previous month accounts (আগের মাসের হিসাব ইমপোর্ট)"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
            <span>Import Prev Month</span>
          </button>

          <button
            id="btn-add-new-tx"
            onClick={() => setActiveTab('new-transaction')}
            className="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center space-x-1.5 shadow-sm transition active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Send Payout</span>
          </button>
        </div>
      </div>

      {/* High-End Minimal KPI Metric Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-3">
        <div className="p-3 sm:p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
            Total USD Volume
          </span>
          <span className="text-base sm:text-lg font-mono font-bold text-slate-900 mt-0.5 block">
            {formatUSD(totalUsd)}
          </span>
          <span className="text-[10px] text-slate-400">
            {filteredCompleted.length} completed txns
          </span>
        </div>

        <div className="p-3 sm:p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
            Total BDT Payout
          </span>
          <span className="text-base sm:text-lg font-mono font-bold text-slate-900 mt-0.5 block">
            {formatBDT(totalActualSend)}
          </span>
          <span className="text-[10px] text-slate-400">
            Charges: {formatBDT(totalBankCharge)}
          </span>
        </div>

        <div className="p-3 sm:p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 shadow-2xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 block">
            Net Profit Earned
          </span>
          <span className="text-base sm:text-lg font-mono font-bold text-emerald-950 mt-0.5 block">
            {formatBDT(totalProfit)}
          </span>
          <span className="text-[10px] text-emerald-700 font-medium">
            Comm: {formatBDT(totalCommission)}
          </span>
        </div>

        <div className="p-3 sm:p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
            Active Filter Scope
          </span>
          <span className="text-sm font-semibold text-slate-800 mt-1 block truncate">
            {referenceFilter !== 'All' ? referenceFilter : 'All Cross-Border'}
          </span>
          <span className="text-[10px] text-slate-400">
            {hasActiveFilters ? 'Filters applied' : 'Showing all records'}
          </span>
        </div>
      </div>

      {/* QUICK SOURCE FUND & STATUS FILTER PILLS */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Quick Filter by Source Fund:
          </span>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="text-[11px] font-bold text-emerald-700 hover:text-emerald-900 transition flex items-center space-x-1"
            >
              <X className="w-3 h-3" />
              <span>Reset Filters</span>
            </button>
          )}
        </div>

        <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
          {/* All */}
          <button
            onClick={() => {
              setReferenceFilter('All');
              setStatusFilter('All');
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
              referenceFilter === 'All' && statusFilter === 'All'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200/80'
            }`}
          >
            All Transactions
          </button>

          {/* Dynamic Reference Sources from settings */}
          {settings.references.map((ref) => (
            <button
              key={ref}
              onClick={() => {
                setReferenceFilter(ref);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition flex items-center space-x-1.5 ${
                referenceFilter === ref
                  ? 'bg-emerald-800 text-white shadow-sm'
                  : 'bg-white hover:bg-emerald-50 text-slate-700 border border-slate-200/80'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${referenceFilter === ref ? 'bg-emerald-300' : 'bg-emerald-600'}`} />
              <span>{ref}</span>
            </button>
          ))}

          {/* Completed Status */}
          <button
            onClick={() => setStatusFilter(statusFilter === 'Completed' ? 'All' : 'Completed')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition flex items-center space-x-1.5 ${
              statusFilter === 'Completed'
                ? 'bg-emerald-800 text-white shadow-sm'
                : 'bg-white hover:bg-emerald-50 text-emerald-900 border border-emerald-200/80'
            }`}
          >
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            <span>Completed Only</span>
          </button>

          {/* Pending Status */}
          <button
            onClick={() => setStatusFilter(statusFilter === 'Pending' ? 'All' : 'Pending')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition flex items-center space-x-1.5 ${
              statusFilter === 'Pending'
                ? 'bg-amber-700 text-white shadow-sm'
                : 'bg-white hover:bg-amber-50 text-amber-900 border border-amber-200/80'
            }`}
          >
            <Clock className="w-3 h-3 text-amber-600" />
            <span>Pending</span>
          </button>
        </div>
      </div>

      {/* Minimal Secondary Filter Controls Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-3 sm:p-4 shadow-2xs space-y-3">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
          {/* Source / Reference Dropdown */}
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
              Source Fund
            </label>
            <select
              value={referenceFilter}
              onChange={(e) => setReferenceFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white text-xs font-medium text-slate-800 focus:ring-2 focus:ring-slate-900 focus:bg-white focus:outline-none transition"
            >
              <option value="All">All Sources</option>
              {settings.references.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          {/* Status Dropdown */}
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white text-xs font-medium text-slate-800 focus:ring-2 focus:ring-slate-900 focus:bg-white focus:outline-none transition"
            >
              <option value="All">All Statuses</option>
              <option value="Completed">Completed</option>
              <option value="Pending">Pending</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>

          {/* Bank Dropdown */}
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
              Bank / Method
            </label>
            <select
              value={bankFilter}
              onChange={(e) => setBankFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white text-xs font-medium text-slate-800 focus:ring-2 focus:ring-slate-900 focus:bg-white focus:outline-none transition"
            >
              <option value="All">All Banks</option>
              {existingBanks.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>

          {/* Date Range */}
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
              From Date
            </label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white text-xs text-slate-800 focus:ring-2 focus:ring-slate-900 focus:bg-white focus:outline-none transition"
            />
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
              To Date
            </label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white text-xs text-slate-800 focus:ring-2 focus:ring-slate-900 focus:bg-white focus:outline-none transition"
            />
          </div>
        </div>

        {/* Minimal Subtle Search Input */}
        <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
            <input
              type="text"
              id="input-tx-search"
              placeholder="Quick search by name, ID, or account..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setTransactionSearchFilter(e.target.value);
              }}
              className="w-full pl-8 pr-7 py-1.5 bg-slate-50/50 hover:bg-white focus:bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-slate-900 focus:outline-none transition"
            />
            {searchTerm && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setTransactionSearchFilter('');
                }}
                className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="text-[11px] text-slate-400 font-mono">
            Showing {filteredTransactions.length} of {transactions.length}
          </div>
        </div>
      </div>

      {/* MOBILE CARDS VIEW (<md) */}
      <div className="md:hidden space-y-3">
        {filteredTransactions.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200/80 p-8 text-center text-slate-500">
            <AlertCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="font-semibold text-sm text-slate-700">No transactions match filters</p>
            <p className="text-xs text-slate-400 mt-1">
              {hasActiveFilters ? 'Try changing your search or source filter.' : 'Tap New Send to record a transaction.'}
            </p>
          </div>
        ) : (
          filteredTransactions.map((tx) => {
            const isCancelled = tx.status === 'Cancelled';
            const isFocused = tx.id === focusedTransactionId;

            return (
              <div
                key={tx.id}
                id={`tx-card-${tx.id}`}
                className={`bg-white rounded-2xl border p-4 shadow-2xs space-y-3 transition-all ${
                  isFocused
                    ? 'border-emerald-500 ring-2 ring-emerald-500/50 bg-emerald-50/30'
                    : isCancelled
                    ? 'opacity-60 bg-slate-50 border-slate-200/80'
                    : 'border-slate-200/80 hover:border-slate-300'
                }`}
              >
                {/* Header row */}
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-2">
                    <span className="font-mono font-bold text-slate-900 px-2 py-0.5 rounded-lg bg-slate-100">
                      {tx.id}
                    </span>
                    <span className="text-slate-500 text-[11px]">{formatDate(tx.date)}</span>
                  </div>

                  <div className="flex items-center space-x-1.5">
                    {/* Status */}
                    {tx.status === 'Completed' && (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        <CheckCircle2 className="w-3 h-3 mr-0.5" /> Done
                      </span>
                    )}
                    {tx.status === 'Pending' && (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-800">
                        <Clock className="w-3 h-3 mr-0.5" /> Pending
                      </span>
                    )}
                    {tx.status === 'Cancelled' && (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-rose-100 text-rose-800">
                        <Ban className="w-3 h-3 mr-0.5" /> Cancelled
                      </span>
                    )}
                  </div>
                </div>

                {/* Recipient & Bank */}
                <div>
                  <div className="flex items-baseline justify-between">
                    <h4 className="font-bold text-sm text-slate-900">{tx.recipientName}</h4>
                    <span className="text-xs font-semibold text-slate-600">
                      Source: <strong className="text-slate-800">{tx.referenceBy}</strong>
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 font-mono mt-0.5">
                    {tx.bankName} • {tx.accountNumber}
                  </p>
                  {tx.note && (
                    <p className="text-[11px] text-slate-400 italic mt-1">Note: {tx.note}</p>
                  )}
                </div>

                {/* Numbers Grid */}
                <div className="grid grid-cols-2 gap-2 bg-slate-50/70 p-2.5 rounded-xl border border-slate-100 text-xs">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      USD & Rate
                    </span>
                    <span className="font-mono font-bold text-slate-900">
                      {formatUSD(tx.sendUsd)} @ ৳{tx.dollarRate}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      Actual Sent (BDT)
                    </span>
                    <span className="font-mono font-bold text-slate-900">
                      {formatBDT(tx.actualSend)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      Bank Charge
                    </span>
                    <span className="font-mono text-slate-600">{formatBDT(tx.bankCharge)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 block">
                      Net Profit
                    </span>
                    <span className="font-mono font-bold text-emerald-700">
                      +{formatBDT(tx.profit)}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setEditingTransaction(tx)}
                    className="min-h-[40px] px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold flex items-center justify-center space-x-1.5 transition active:scale-95"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-slate-600" />
                    <span>Edit</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDeletingTransactionId(tx.id)}
                    className="min-h-[40px] px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-semibold flex items-center justify-center space-x-1.5 transition active:scale-95"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            );
          })
        )}

        {/* Mobile quick CSV export bottom summary bar */}
        {filteredTransactions.length > 0 && (
          <div className="pt-2 flex items-center justify-between bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs">
            <div>
              <span className="text-xs font-bold text-slate-800 block">
                {filteredTransactions.length} Transactions
              </span>
              <span className="text-[10px] text-slate-400">
                {referenceFilter !== 'All' ? referenceFilter : 'All records'}
              </span>
            </div>
            <button
              onClick={handleExportCSV}
              className={`px-3 py-2 rounded-xl border text-xs font-semibold flex items-center space-x-1.5 shadow-2xs transition active:scale-95 ${
                isExportSuccess
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-800 font-bold'
                  : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-800'
              }`}
            >
              {isExportSuccess ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Downloaded!</span>
                </>
              ) : (
                <>
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Export CSV</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* DESKTOP TABLE VIEW (>=md): Minimalist, Crisp, Professional */}
      <div className="hidden md:block bg-white rounded-3xl border border-slate-200/80 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                <th
                  onClick={() => handleSort('date')}
                  className="py-3.5 px-4 cursor-pointer hover:bg-slate-100 whitespace-nowrap"
                >
                  <div className="flex items-center space-x-1">
                    <span>Date</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('id')}
                  className="py-3.5 px-3 cursor-pointer hover:bg-slate-100 whitespace-nowrap"
                >
                  <div className="flex items-center space-x-1">
                    <span>ID</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('recipientName')}
                  className="py-3.5 px-4 cursor-pointer hover:bg-slate-100"
                >
                  Recipient & Account
                </th>
                <th
                  onClick={() => handleSort('bankName')}
                  className="py-3.5 px-3 cursor-pointer hover:bg-slate-100 whitespace-nowrap"
                >
                  Bank
                </th>
                <th
                  onClick={() => handleSort('sendUsd')}
                  className="py-3.5 px-3 text-right cursor-pointer hover:bg-slate-100 whitespace-nowrap"
                >
                  USD
                </th>
                <th className="py-3.5 px-3 text-right whitespace-nowrap">Rate</th>
                <th className="py-3.5 px-3 text-right whitespace-nowrap">Actual Sent (BDT)</th>
                <th className="py-3.5 px-3 text-right whitespace-nowrap">Bank Charge</th>
                <th className="py-3.5 px-3 text-right whitespace-nowrap">Commission</th>
                <th
                  onClick={() => handleSort('profit')}
                  className="py-3.5 px-3 text-right cursor-pointer hover:bg-slate-100 whitespace-nowrap text-emerald-800 font-bold"
                >
                  Profit
                </th>
                <th className="py-3.5 px-3 text-center whitespace-nowrap">Source</th>
                <th className="py-3.5 px-3 text-center whitespace-nowrap">Status</th>
                <th className="py-3.5 px-4 text-right whitespace-nowrap">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={13} className="py-12 text-center text-slate-500">
                    <AlertCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="font-semibold text-sm text-slate-700">No transactions found</p>
                    <p className="text-xs text-slate-400 mt-1">
                      {hasActiveFilters ? 'Try adjusting your search or source filters.' : 'Click New Send Payout to record one.'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((tx) => {
                  const isCancelled = tx.status === 'Cancelled';
                  const isPending = tx.status === 'Pending';
                  const isFocused = tx.id === focusedTransactionId;

                  return (
                    <tr
                      key={tx.id}
                      id={`tx-row-${tx.id}`}
                      className={`hover:bg-slate-50/70 transition-colors ${
                        isFocused
                          ? 'bg-emerald-50/70 ring-1 ring-emerald-500'
                          : isCancelled
                          ? 'bg-slate-50/60 opacity-60'
                          : ''
                      }`}
                    >
                      <td className="py-3.5 px-4 whitespace-nowrap text-slate-600 font-medium">
                        {formatDate(tx.date)}
                      </td>

                      <td className="py-3.5 px-3 whitespace-nowrap font-mono font-bold text-slate-900">
                        {tx.id}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900">{tx.recipientName}</div>
                        <div className="text-[11px] font-mono text-slate-400">
                          {tx.accountNumber}
                        </div>
                        {tx.note && (
                          <div className="text-[10px] text-slate-400 italic truncate max-w-[140px]">
                            {tx.note}
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-3 text-slate-700 whitespace-nowrap">
                        {tx.bankName}
                      </td>

                      <td className="py-3.5 px-3 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                        {formatUSD(tx.sendUsd)}
                      </td>

                      <td className="py-3.5 px-3 text-right font-mono text-slate-500 whitespace-nowrap">
                        ৳{tx.dollarRate}
                      </td>

                      <td className="py-3.5 px-3 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                        {formatBDT(tx.actualSend)}
                      </td>

                      <td className="py-3.5 px-3 text-right font-mono text-slate-600 whitespace-nowrap">
                        {formatBDT(tx.bankCharge)}
                      </td>

                      <td className="py-3.5 px-3 text-right font-mono text-emerald-700 whitespace-nowrap">
                        {formatBDT(tx.commission)}
                      </td>

                      <td className="py-3.5 px-3 text-right font-mono font-bold text-emerald-800 whitespace-nowrap bg-emerald-50/30">
                        +{formatBDT(tx.profit)}
                      </td>

                      {/* Source */}
                      <td className="py-3.5 px-3 text-center whitespace-nowrap">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold ${
                            tx.referenceBy === 'Kaka'
                              ? 'bg-blue-50 text-blue-800 border border-blue-200/80'
                              : 'bg-purple-50 text-purple-800 border border-purple-200/80'
                          }`}
                        >
                          {tx.referenceBy}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-3 text-center whitespace-nowrap">
                        {tx.status === 'Completed' && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            <CheckCircle2 className="w-3 h-3 mr-0.5" /> Done
                          </span>
                        )}
                        {tx.status === 'Pending' && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-800">
                            <Clock className="w-3 h-3 mr-0.5" /> Pending
                          </span>
                        )}
                        {tx.status === 'Cancelled' && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-rose-100 text-rose-800">
                            <Ban className="w-3 h-3 mr-0.5" /> Cancelled
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end space-x-1">
                          <button
                            id={`btn-edit-tx-${tx.id}`}
                            onClick={() => setEditingTransaction(tx)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition"
                            title="Edit transaction"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            id={`btn-delete-tx-${tx.id}`}
                            onClick={() => setDeletingTransactionId(tx.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                            title="Delete transaction"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>

            {/* Clean Total Summary Footer */}
            {filteredTransactions.length > 0 && (
              <tfoot className="bg-slate-50/80 border-t border-slate-200 font-bold text-slate-900">
                <tr>
                  <td colSpan={5} className="py-3 px-4 text-xs font-semibold text-slate-600">
                    Total Summary ({filteredCompleted.length} Completed):
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-sm text-slate-900">
                    {formatUSD(totalUsd)}
                  </td>
                  <td className="py-3 px-3"></td>
                  <td className="py-3 px-3 text-right font-mono text-sm text-slate-900">
                    {formatBDT(totalActualSend)}
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-xs text-slate-600">
                    {formatBDT(totalBankCharge)}
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-xs text-emerald-700">
                    {formatBDT(totalCommission)}
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-sm text-emerald-900 bg-emerald-100/50">
                    +{formatBDT(totalProfit)}
                  </td>
                  <td colSpan={3}></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Edit Modal */}
      {editingTransaction && (
        <EditTransactionModal
          transaction={editingTransaction}
          onClose={() => setEditingTransaction(null)}
        />
      )}

      {/* Confirm Delete Modal */}
      {deletingTransactionId && (
        <ConfirmDeleteModal
          title="Delete Transaction Record"
          message="Are you sure you want to permanently delete this transaction? This will recalculate all profits and source balance totals."
          itemId={deletingTransactionId}
          onConfirm={() => deleteTransaction(deletingTransactionId)}
          onClose={() => setDeletingTransactionId(null)}
        />
      )}
    </div>
  );
}
