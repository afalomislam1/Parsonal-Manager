import React, { useState, useMemo, useEffect } from 'react';
import {
  Search,
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

  // Scroll to focused transaction if navigated from search
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
  }, [focusedTransactionId]);

  // Sorting
  const [sortField, setSortField] = useState<keyof Transaction>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Modals state
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [deletingTransactionId, setDeletingTransactionId] = useState<string | null>(null);

  // Available unique banks in current transactions
  const existingBanks = useMemo(() => {
    return Array.from(new Set(transactions.map((t) => t.bankName))).filter(Boolean);
  }, [transactions]);

  // Filtered and sorted transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      // Search
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

      // Reference filter
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
    }).sort((a, b) => {
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
  const totalExpectedBdt = useMemo(
    () => filteredCompleted.reduce((s, t) => s + t.expectedBdt, 0),
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
    const rangeStr = fromDate || toDate ? `${fromDate || 'Start'} to ${toDate || 'End'}` : undefined;
    exportTransactionsCSV(
      filteredTransactions,
      `transactions-export-${new Date().toISOString().slice(0, 10)}.csv`,
      referenceFilter !== 'All' ? referenceFilter : undefined,
      rangeStr
    );
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
    searchTerm ||
    referenceFilter !== 'All' ||
    statusFilter !== 'All' ||
    bankFilter !== 'All' ||
    fromDate ||
    toDate;

  return (
    <div className="space-y-6">
      {/* Top Title & Header Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b border-slate-200">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Transaction History
          </h2>
          <p className="text-xs sm:text-sm text-slate-600">
            Complete record of all cross-border BDT send payouts, bank charges, and profits.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            id="btn-export-csv"
            onClick={handleExportCSV}
            className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center space-x-1.5 shadow-sm transition"
            title="Export filtered records to CSV / Excel"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
            <span>Export CSV / Excel</span>
          </button>

          <button
            id="btn-add-new-tx"
            onClick={() => setActiveTab('new-transaction')}
            className="px-3.5 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center space-x-1.5 shadow-sm shadow-emerald-700/20 transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Transaction</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-3">
        {/* Search query highlight banner if filtered */}
        {searchTerm && (
          <div className="flex items-center justify-between px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-950">
            <div className="flex items-center space-x-2">
              <Search className="w-3.5 h-3.5 text-emerald-700" />
              <span>
                Filtered by search query: <strong className="font-mono bg-white px-1.5 py-0.5 rounded border border-emerald-300 text-emerald-900">{searchTerm}</strong>
              </span>
            </div>
            <button
              onClick={() => {
                setSearchTerm('');
                setTransactionSearchFilter('');
                setFocusedTransactionId(null);
              }}
              className="text-emerald-700 hover:text-emerald-950 font-bold underline text-[11px]"
            >
              Clear Search
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          {/* Search Box */}
          <div className="lg:col-span-2 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
            <input
              type="text"
              id="input-tx-search"
              placeholder="Search recipient, ID, account, note..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setTransactionSearchFilter(e.target.value);
              }}
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 text-xs text-slate-900 focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 transition"
            />
          </div>

          {/* Reference Filter */}
          <div>
            <select
              id="select-filter-reference"
              value={referenceFilter}
              onChange={(e) => setReferenceFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-800 bg-white focus:ring-2 focus:ring-emerald-600 transition"
            >
              <option value="All">All References</option>
              {settings.references.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              id="select-filter-status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-800 bg-white focus:ring-2 focus:ring-emerald-600 transition"
            >
              <option value="All">All Statuses</option>
              <option value="Completed">Completed</option>
              <option value="Pending">Pending</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>

          {/* Bank Filter */}
          <div>
            <select
              id="select-filter-bank"
              value={bankFilter}
              onChange={(e) => setBankFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs text-slate-800 bg-white focus:ring-2 focus:ring-emerald-600 transition"
            >
              <option value="All">All Banks</option>
              {existingBanks.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>

          {/* Date range inputs */}
          <div className="flex items-center space-x-1.5">
            <input
              type="date"
              id="filter-from-date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              title="From Date"
              className="w-1/2 px-2 py-2 rounded-lg border border-slate-300 text-[11px] text-slate-900"
            />
            <span className="text-xs text-slate-400">to</span>
            <input
              type="date"
              id="filter-to-date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              title="To Date"
              className="w-1/2 px-2 py-2 rounded-lg border border-slate-300 text-[11px] text-slate-900"
            />
          </div>
        </div>

        {/* Active filter counter & clear */}
        {hasActiveFilters && (
          <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs text-slate-500">
            <span>
              Showing <strong>{filteredTransactions.length}</strong> of {transactions.length} transactions
            </span>
            <button
              onClick={clearFilters}
              className="text-emerald-700 font-bold hover:underline"
            >
              Reset All Filters
            </button>
          </div>
        )}
      </div>

      {/* Transaction Records: Mobile Cards (<md) + Desktop Table (>=md) */}

      {/* Mobile Card List (< md) */}
      <div className="md:hidden space-y-3">
        {filteredTransactions.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-500">
            <AlertCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="font-semibold text-sm text-slate-700">No transactions found</p>
            <p className="text-xs text-slate-400 mt-1">
              {hasActiveFilters ? 'Try adjusting your filters.' : 'Tap New Transaction to record one.'}
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
                className={`bg-white rounded-xl border p-4 shadow-sm space-y-3 transition-all duration-300 ${
                  isFocused
                    ? 'border-emerald-500 ring-2 ring-emerald-500 bg-emerald-50/60 shadow-md scale-[1.01]'
                    : isCancelled
                    ? 'opacity-60 bg-slate-50 border-slate-200'
                    : 'border-slate-200'
                }`}
              >
                {/* Top Strip: ID, Date, Reference & Status */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-900">
                      {tx.id}
                    </span>
                    <span className="text-xs text-slate-500 font-medium">
                      {formatDate(tx.date)}
                    </span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                        tx.referenceBy === 'Kaka'
                          ? 'bg-blue-50 text-blue-800 border border-blue-200'
                          : 'bg-purple-50 text-purple-800 border border-purple-200'
                      }`}
                    >
                      {tx.referenceBy}
                    </span>
                    {tx.status === 'Completed' && (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        <CheckCircle2 className="w-3 h-3 mr-0.5" /> Done
                      </span>
                    )}
                    {tx.status === 'Pending' && (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                        <Clock className="w-3 h-3 mr-0.5" /> Pending
                      </span>
                    )}
                    {tx.status === 'Cancelled' && (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800">
                        <Ban className="w-3 h-3 mr-0.5" /> Cancelled
                      </span>
                    )}
                  </div>
                </div>

                {/* Recipient & Account */}
                <div>
                  <h4 className="font-bold text-sm text-slate-900">{tx.recipientName}</h4>
                  <p className="text-xs text-slate-600 font-mono mt-0.5">
                    {tx.bankName} • {tx.accountNumber}
                  </p>
                  {tx.note && (
                    <p className="text-[11px] text-slate-400 italic mt-1">
                      Note: {tx.note}
                    </p>
                  )}
                </div>

                {/* Financial Summary Grid */}
                <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-100 text-xs">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">USD & Rate</span>
                    <span className="font-mono font-bold text-slate-800">
                      {formatUSD(tx.sendUsd)} @ ৳{tx.dollarRate}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Actual Sent (BDT)</span>
                    <span className="font-mono font-bold text-slate-900">
                      {formatBDT(tx.actualSend)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Bank Charge</span>
                    <span className="font-mono font-semibold text-slate-700">
                      {formatBDT(tx.bankCharge)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-emerald-800 block">Net Profit</span>
                    <span className="font-mono font-bold text-emerald-700">
                      +{formatBDT(tx.profit)}
                    </span>
                  </div>
                </div>

                {/* Mobile Action Buttons (Min 44px height for touch ergonomics) */}
                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setEditingTransaction(tx)}
                    className="min-h-[44px] px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold flex items-center justify-center space-x-1.5 transition active:scale-95"
                  >
                    <Edit2 className="w-4 h-4 text-slate-600" />
                    <span>Edit (এডিট)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDeletingTransactionId(tx.id)}
                    className="min-h-[44px] px-3 py-2 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold flex items-center justify-center space-x-1.5 transition active:scale-95"
                  >
                    <Trash2 className="w-4 h-4 text-rose-600" />
                    <span>Delete (মুছে ফেলুন)</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Desktop Table (hidden on mobile, visible on md+) */}
      <div className="hidden md:block bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                <th
                  onClick={() => handleSort('date')}
                  className="py-3 px-3 cursor-pointer hover:bg-slate-100 whitespace-nowrap"
                >
                  <div className="flex items-center space-x-1">
                    <span>Date</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('id')}
                  className="py-3 px-3 cursor-pointer hover:bg-slate-100 whitespace-nowrap"
                >
                  <div className="flex items-center space-x-1">
                    <span>TX ID</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('recipientName')}
                  className="py-3 px-3 cursor-pointer hover:bg-slate-100"
                >
                  Recipient Details
                </th>
                <th
                  onClick={() => handleSort('bankName')}
                  className="py-3 px-3 cursor-pointer hover:bg-slate-100"
                >
                  Bank
                </th>
                <th
                  onClick={() => handleSort('sendUsd')}
                  className="py-3 px-3 text-right cursor-pointer hover:bg-slate-100 whitespace-nowrap"
                >
                  USD
                </th>
                <th className="py-3 px-3 text-right whitespace-nowrap">Rate</th>
                <th className="py-3 px-3 text-right whitespace-nowrap">Expected BDT</th>
                <th className="py-3 px-3 text-right whitespace-nowrap">Actual Sent</th>
                <th className="py-3 px-3 text-right whitespace-nowrap">Bank Charge</th>
                <th className="py-3 px-3 text-right whitespace-nowrap">Commission</th>
                <th
                  onClick={() => handleSort('profit')}
                  className="py-3 px-3 text-right cursor-pointer hover:bg-slate-100 whitespace-nowrap text-emerald-800"
                >
                  Profit
                </th>
                <th className="py-3 px-3 text-center whitespace-nowrap">Reference</th>
                <th className="py-3 px-3 text-center whitespace-nowrap">Status</th>
                <th className="py-3 px-3 text-right whitespace-nowrap">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={14} className="py-12 text-center text-slate-500">
                    <AlertCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="font-semibold text-sm text-slate-700">No transactions found</p>
                    <p className="text-xs text-slate-400 mt-1">
                      {hasActiveFilters ? 'Try adjusting your filters.' : 'Click New Transaction to record one.'}
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
                      className={`hover:bg-slate-50/80 transition-all duration-300 ${
                        isFocused
                          ? 'bg-emerald-50/90 ring-2 ring-emerald-500/80 font-medium'
                          : isCancelled
                          ? 'bg-slate-50/60 opacity-60'
                          : ''
                      }`}
                    >
                      <td className="py-3 px-3 whitespace-nowrap font-medium text-slate-700">
                        {formatDate(tx.date)}
                      </td>

                      <td className="py-3 px-3 whitespace-nowrap font-mono font-bold text-slate-900">
                        {tx.id}
                      </td>

                      <td className="py-3 px-3">
                        <div className="font-semibold text-slate-900">{tx.recipientName}</div>
                        <div className="text-[11px] font-mono text-slate-500">
                          Acc: {tx.accountNumber}
                        </div>
                        {tx.note && (
                          <div className="text-[10px] text-slate-400 italic truncate max-w-[150px]">
                            {tx.note}
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-3 text-slate-700 whitespace-nowrap">
                        {tx.bankName}
                      </td>

                      <td className="py-3 px-3 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                        {formatUSD(tx.sendUsd)}
                      </td>

                      <td className="py-3 px-3 text-right font-mono text-slate-600 whitespace-nowrap">
                        ৳{tx.dollarRate}
                      </td>

                      <td className="py-3 px-3 text-right font-mono text-slate-600 whitespace-nowrap">
                        {formatBDT(tx.expectedBdt)}
                      </td>

                      <td className="py-3 px-3 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                        {formatBDT(tx.actualSend)}
                      </td>

                      <td className="py-3 px-3 text-right font-mono font-semibold text-slate-700 whitespace-nowrap">
                        {formatBDT(tx.bankCharge)}
                      </td>

                      <td className="py-3 px-3 text-right font-mono text-emerald-700 font-semibold whitespace-nowrap">
                        {formatBDT(tx.commission)}
                      </td>

                      <td className="py-3 px-3 text-right font-mono font-bold text-emerald-800 whitespace-nowrap bg-emerald-50/40">
                        {formatBDT(tx.profit)}
                      </td>

                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold ${
                            tx.referenceBy === 'Kaka'
                              ? 'bg-blue-50 text-blue-800 border border-blue-200'
                              : 'bg-purple-50 text-purple-800 border border-purple-200'
                          }`}
                        >
                          {tx.referenceBy}
                        </span>
                      </td>

                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        {tx.status === 'Completed' && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            <CheckCircle2 className="w-3 h-3 mr-0.5" /> Done
                          </span>
                        )}
                        {tx.status === 'Pending' && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                            <Clock className="w-3 h-3 mr-0.5" /> Pending
                          </span>
                        )}
                        {tx.status === 'Cancelled' && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800">
                            <Ban className="w-3 h-3 mr-0.5" /> Cancelled
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end space-x-1">
                          <button
                            id={`btn-edit-tx-${tx.id}`}
                            onClick={() => setEditingTransaction(tx)}
                            className="p-1 rounded text-slate-500 hover:text-slate-900 hover:bg-slate-200 transition"
                            title="Edit transaction"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            id={`btn-delete-tx-${tx.id}`}
                            onClick={() => setDeletingTransactionId(tx.id)}
                            className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
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

            {/* Summary Footer for Filtered Items */}
            {filteredTransactions.length > 0 && (
              <tfoot className="bg-slate-100 border-t-2 border-slate-300 font-bold text-slate-900">
                <tr>
                  <td colSpan={4} className="py-3 px-3 text-xs uppercase tracking-wider">
                    Total ({filteredCompleted.length} Completed Txns):
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-sm text-emerald-900">
                    {formatUSD(totalUsd)}
                  </td>
                  <td className="py-3 px-3"></td>
                  <td className="py-3 px-3 text-right font-mono text-xs">
                    {formatBDT(totalExpectedBdt)}
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-sm text-slate-900">
                    {formatBDT(totalActualSend)}
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-xs text-slate-700">
                    {formatBDT(totalBankCharge)}
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-xs text-emerald-700">
                    {formatBDT(totalCommission)}
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-sm text-emerald-900 bg-emerald-100/60">
                    {formatBDT(totalProfit)}
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
