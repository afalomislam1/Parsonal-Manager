import React, { useState, useEffect, useRef } from 'react';
import {
  CheckCircle,
  Clock,
  DollarSign,
  Info,
  Layers,
  Save,
  Search,
  UserCheck,
  AlertCircle,
  Building,
  RotateCcw,
  Sparkles,
  Edit2,
  Trash2,
  Plus,
  ArrowRight,
} from 'lucide-react';
import { useAccounting } from '../../context/AccountingContext';
import {
  computeBankCharge,
  computeCommission,
  computeExpectedBDT,
  computeProfit,
  formatBDT,
  formatUSD,
  getTodayDateString,
} from '../../utils/calculations';
import { SavedAccount, Transaction } from '../../types';
import { EditTransactionModal } from '../modals/EditTransactionModal';
import { ConfirmDeleteModal } from '../modals/ConfirmDeleteModal';

export function NewTransactionView() {
  const {
    settings,
    savedAccounts,
    createTransaction,
    deleteTransaction,
    transactions,
    setActiveTab,
    draftTransaction,
    setDraftTransaction,
  } = useAccounting();

  // Form State
  const [date, setDate] = useState<string>(draftTransaction?.date || getTodayDateString());
  const [recipientName, setRecipientName] = useState<string>(draftTransaction?.recipientName || '');
  const [accountNumber, setAccountNumber] = useState<string>(draftTransaction?.accountNumber || '');
  const [bankName, setBankName] = useState<string>(draftTransaction?.bankName || settings.banks[0] || 'Dutch-Bangla Bank');
  const [sendUsd, setSendUsd] = useState<string>(draftTransaction?.sendUsd ? String(draftTransaction.sendUsd) : '');
  const [dollarRate, setDollarRate] = useState<string>(
    draftTransaction?.dollarRate 
      ? String(draftTransaction.dollarRate) 
      : (settings.defaultDollarRate ? String(settings.defaultDollarRate) : '123')
  );
  const [actualSend, setActualSend] = useState<string>(draftTransaction?.sendAmount ? String(draftTransaction.sendAmount) : '');
  const [referenceBy, setReferenceBy] = useState<string>(
    draftTransaction?.referenceBy || settings.references[0] || 'Kaka'
  );
  const [note, setNote] = useState<string>(draftTransaction?.note || '');
  const [saveAccount, setSaveAccount] = useState<boolean>(true);
  const [status, setStatus] = useState<'Completed' | 'Pending'>('Completed');

  // Autocomplete UI state
  const [showSuggestions, setShowSuggestions] = useState<boolean>(false);
  const [searchFilter, setSearchFilter] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const suggestionRef = useRef<HTMLDivElement>(null);

  // Submitted transaction state for immediate edit & delete
  const [submittedTxId, setSubmittedTxId] = useState<string | null>(null);
  const [isEditingSubmitted, setIsEditingSubmitted] = useState<boolean>(false);
  const [isDeletingSubmitted, setIsDeletingSubmitted] = useState<boolean>(false);

  // Find active submitted transaction from context
  const activeSubmittedTx = submittedTxId 
    ? transactions.find((t) => t.id === submittedTxId) || null 
    : null;

  // Clear draft once loaded
  useEffect(() => {
    if (draftTransaction) {
      setDraftTransaction(null);
    }
  }, []);

  // Parse numeric values
  const numSendUsd = parseFloat(sendUsd) || 0;
  const numDollarRate = parseFloat(dollarRate) || 0;

  // Real-time automatic calculations
  const expectedBdt = computeExpectedBDT(numSendUsd, numDollarRate);
  const numActualSend = actualSend !== '' ? parseFloat(actualSend) || 0 : expectedBdt;
  const bankCharge = computeBankCharge(expectedBdt, numActualSend);
  const commission = computeCommission(numSendUsd, settings.commissionPerUsd);
  const totalProfit = computeProfit(bankCharge, commission);

  // Auto-fill actualSend when expectedBdt changes and actualSend wasn't manually touched yet
  const [actualSendTouched, setActualSendTouched] = useState<boolean>(Boolean(draftTransaction?.sendAmount));

  useEffect(() => {
    if (!actualSendTouched && expectedBdt > 0) {
      setActualSend(String(expectedBdt));
    }
  }, [expectedBdt, actualSendTouched]);

  // Autocomplete suggestions based on recipient name typing
  const filteredSavedAccounts = React.useMemo(() => {
    if (!recipientName.trim()) return [];
    const query = recipientName.toLowerCase();
    return savedAccounts.filter(
      (acc) =>
        acc.recipientName.toLowerCase().includes(query) ||
        acc.accountNumber.toLowerCase().includes(query)
    );
  }, [recipientName, savedAccounts]);

  // Click outside listener to close autocomplete
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (suggestionRef.current && !suggestionRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectAccount = (acc: SavedAccount) => {
    setRecipientName(acc.recipientName);
    setAccountNumber(acc.accountNumber);
    setBankName(acc.bankName);
    setShowSuggestions(false);
  };

  const handleReset = () => {
    setDate(getTodayDateString());
    setRecipientName('');
    setAccountNumber('');
    setBankName(settings.banks[0] || 'Dutch-Bangla Bank');
    setSendUsd('');
    setDollarRate(settings.defaultDollarRate ? String(settings.defaultDollarRate) : '123');
    setActualSend('');
    setReferenceBy(settings.references[0] || 'Kaka');
    setNote('');
    setActualSendTouched(false);
    setErrorMessage(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    // Validation
    if (!recipientName.trim()) {
      setErrorMessage('Recipient name is required.');
      return;
    }
    if (!accountNumber.trim()) {
      setErrorMessage('Account number is required.');
      return;
    }
    if (!numSendUsd || numSendUsd <= 0) {
      setErrorMessage('Please enter a valid Send USD amount greater than 0.');
      return;
    }
    if (!numDollarRate || numDollarRate <= 0) {
      setErrorMessage('Please enter a valid Dollar Rate (BDT per USD).');
      return;
    }
    if (isNaN(numActualSend) || numActualSend < 0) {
      setErrorMessage('Please enter a valid actual send amount in BDT.');
      return;
    }

    try {
      const newTx = createTransaction({
        date,
        recipientName,
        accountNumber,
        bankName,
        sendUsd: numSendUsd,
        dollarRate: numDollarRate,
        actualSend: numActualSend,
        referenceBy,
        note,
        saveAccount,
        status,
      });

      setSubmittedTxId(newTx.id);
      setSuccessMessage(
        `Transaction ${newTx.id} saved successfully! Profit of ${formatBDT(newTx.profit)} recorded.`
      );
      handleReset();
      // Scroll to top of form
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setErrorMessage('Failed to save transaction. Please check your inputs.');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b border-slate-200">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            New Send Transaction Entry
          </h2>
          <p className="text-xs sm:text-sm text-slate-600">
            Record BDT payout with automatic charge, commission, and profit computation.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            type="button"
            id="btn-view-all-tx"
            onClick={() => setActiveTab('transactions')}
            className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-semibold transition"
          >
            View All Transactions
          </button>
        </div>
      </div>

      {/* Submitted Transaction Post-Action Card (Allows Instant Edit & Delete) */}
      {activeSubmittedTx && (
        <div className="p-4 rounded-2xl bg-emerald-50/90 border-2 border-emerald-300 shadow-md space-y-3 animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2.5 border-b border-emerald-200">
            <div className="flex items-start sm:items-center space-x-2.5">
              <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center flex-shrink-0 mt-0.5 sm:mt-0">
                <CheckCircle className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-emerald-200 text-emerald-950">
                    {activeSubmittedTx.id}
                  </span>
                  <span className="text-sm font-bold text-emerald-950">
                    লেনদেন সফলভাবে সম্পন্ন হয়েছে! (Transaction Recorded)
                  </span>
                </div>
                <p className="text-xs text-emerald-800 mt-0.5">
                  <strong>{activeSubmittedTx.recipientName}</strong> • {activeSubmittedTx.bankName} (A/C: {activeSubmittedTx.accountNumber})
                </p>
              </div>
            </div>

            {/* Edit & Delete Action Buttons */}
            <div className="flex items-center space-x-2">
              <button
                type="button"
                id="btn-edit-submitted-tx"
                onClick={() => setIsEditingSubmitted(true)}
                className="px-3.5 py-2 rounded-lg bg-white hover:bg-emerald-100 border border-emerald-300 text-emerald-900 text-xs font-bold flex items-center space-x-1.5 shadow-sm transition active:scale-95"
                title="Edit this transaction"
              >
                <Edit2 className="w-4 h-4 text-emerald-700" />
                <span>Edit (এডিট)</span>
              </button>

              <button
                type="button"
                id="btn-delete-submitted-tx"
                onClick={() => setIsDeletingSubmitted(true)}
                className="px-3.5 py-2 rounded-lg bg-white hover:bg-rose-100 border border-rose-300 text-rose-700 text-xs font-bold flex items-center space-x-1.5 shadow-sm transition active:scale-95"
                title="Delete this transaction"
              >
                <Trash2 className="w-4 h-4 text-rose-600" />
                <span>Delete (মুছে ফেলুন)</span>
              </button>

              <button
                type="button"
                onClick={() => setSubmittedTxId(null)}
                className="px-3 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center space-x-1 shadow-sm transition"
                title="Close and record next"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden xs:inline">Next Entry</span>
              </button>
            </div>
          </div>

          {/* Quick Financial Snapshot */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs bg-white/90 p-3 rounded-xl border border-emerald-200/80">
            <div>
              <span className="text-slate-500 text-[10px] uppercase font-bold block">Sent USD & Rate:</span>
              <span className="font-mono font-bold text-slate-900 text-sm">
                {formatUSD(activeSubmittedTx.sendUsd)} @ ৳{activeSubmittedTx.dollarRate}
              </span>
            </div>
            <div>
              <span className="text-slate-500 text-[10px] uppercase font-bold block">Actual Sent (BDT):</span>
              <span className="font-mono font-bold text-slate-900 text-sm">
                {formatBDT(activeSubmittedTx.actualSend)}
              </span>
            </div>
            <div>
              <span className="text-slate-500 text-[10px] uppercase font-bold block">Bank Charge:</span>
              <span className="font-mono font-semibold text-slate-700 text-sm">
                {formatBDT(activeSubmittedTx.bankCharge)}
              </span>
            </div>
            <div>
              <span className="text-emerald-800 text-[10px] uppercase font-bold block">Net Profit:</span>
              <span className="font-mono font-bold text-emerald-700 text-sm">
                +{formatBDT(activeSubmittedTx.profit)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Alert Banners */}
      {successMessage && !activeSubmittedTx && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-start space-x-3 animate-fade-in">
          <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-semibold">{successMessage}</p>
            <div className="mt-2 flex space-x-3">
              <button
                onClick={() => setActiveTab('transactions')}
                className="text-xs font-bold text-emerald-800 underline hover:text-emerald-950"
              >
                Go to Transactions History &rarr;
              </button>
            </div>
          </div>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 flex items-start space-x-3">
          <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm font-semibold">{errorMessage}</p>
        </div>
      )}

      {/* Main Grid: Form Left, Real-Time Financial Calculations Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Input Form (8 cols) */}
        <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 p-5 sm:p-6 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Row 1: Date & Reference By */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  1. Date <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  id="input-tx-date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-900 text-sm focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  9. Reference / Request By <span className="text-rose-500">*</span>
                </label>
                <select
                  id="select-tx-reference"
                  value={referenceBy}
                  onChange={(e) => setReferenceBy(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-900 text-sm font-semibold focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 transition bg-white"
                >
                  {settings.references.map((ref) => (
                    <option key={ref} value={ref}>
                      {ref}
                    </option>
                  ))}
                </select>
                <span className="text-[11px] text-slate-500 mt-1 block">
                  Who requested this transaction
                </span>
              </div>
            </div>

            {/* Row 2: Recipient Name with Autocomplete */}
            <div className="relative" ref={suggestionRef}>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                2. Received / Recipient Name <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  id="input-tx-recipient"
                  placeholder="e.g. Rahim, Md. Kabir, etc."
                  value={recipientName}
                  onChange={(e) => {
                    setRecipientName(e.target.value);
                    setShowSuggestions(true);
                  }}
                  onFocus={() => setShowSuggestions(true)}
                  required
                  autoComplete="off"
                  className="w-full px-3 py-2 pr-10 rounded-lg border border-slate-300 text-slate-900 text-sm focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 transition"
                />
                <UserCheck className="w-4 h-4 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
              </div>

              {/* Autocomplete Suggestions Popup */}
              {showSuggestions && filteredSavedAccounts.length > 0 && (
                <div className="absolute z-20 left-0 right-0 mt-1 bg-white rounded-xl border border-slate-200 shadow-xl max-h-60 overflow-y-auto divide-y divide-slate-100">
                  <div className="p-2 bg-slate-50 text-[11px] font-semibold text-slate-500 flex items-center justify-between">
                    <span>Saved Recipients Matching "{recipientName}":</span>
                    <span className="text-emerald-700">Click to auto-fill details</span>
                  </div>
                  {filteredSavedAccounts.map((acc) => (
                    <button
                      type="button"
                      key={acc.id}
                      onClick={() => handleSelectAccount(acc)}
                      className="w-full text-left px-3.5 py-2.5 hover:bg-emerald-50/70 transition flex items-center justify-between group"
                    >
                      <div>
                        <div className="font-semibold text-sm text-slate-900 group-hover:text-emerald-900">
                          {acc.recipientName}
                        </div>
                        <div className="text-xs text-slate-500 font-mono">
                          {acc.bankName} • Acc: {acc.accountNumber}
                        </div>
                      </div>
                      <span className="text-[11px] px-2 py-0.5 rounded bg-slate-100 text-slate-600 group-hover:bg-emerald-100 group-hover:text-emerald-800">
                        {acc.totalTransactions} prior txns
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Row 3: Account Number & Bank Name */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  3. Account Number <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  id="input-tx-account"
                  placeholder="e.g. 123456789"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-900 text-sm font-mono focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  4. Bank Name <span className="text-rose-500">*</span>
                </label>
                <select
                  id="select-tx-bank"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-900 text-sm focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 transition bg-white"
                >
                  {settings.banks.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Save this account checkbox */}
            <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between">
              <label className="flex items-center space-x-2 text-xs font-medium text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  id="checkbox-save-account"
                  checked={saveAccount}
                  onChange={(e) => setSaveAccount(e.target.checked)}
                  className="rounded text-emerald-700 focus:ring-emerald-600 w-4 h-4"
                />
                <span>Save this account for 1-click future auto-fill</span>
              </label>
              <span className="text-[11px] text-slate-400">Duplicate safe</span>
            </div>

            {/* Row 4: Send USD & Dollar Rate */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  5. Send USD ($) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-slate-400 font-bold">$</span>
                  <input
                    type="number"
                    id="input-tx-usd"
                    step="any"
                    min="0"
                    placeholder="300"
                    value={sendUsd}
                    onChange={(e) => setSendUsd(e.target.value)}
                    required
                    className="w-full pl-8 pr-3 py-2 rounded-lg border border-slate-300 text-slate-900 text-base font-semibold font-mono focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  6. Dollar Rate (BDT / USD) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-slate-400 font-bold">৳</span>
                  <input
                    type="number"
                    id="input-tx-rate"
                    step="any"
                    min="0"
                    placeholder="123"
                    value={dollarRate}
                    onChange={(e) => setDollarRate(e.target.value)}
                    required
                    className="w-full pl-8 pr-3 py-2 rounded-lg border border-slate-300 text-slate-900 text-base font-semibold font-mono focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 transition"
                  />
                </div>
              </div>
            </div>

            {/* Row 5: Expected BDT (Readonly Auto) & Actual Send (Send Amount) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                    7. Expected BDT
                  </label>
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                    USD × Rate
                  </span>
                </div>
                <div className="w-full px-3 py-2 rounded-lg bg-slate-100 border border-slate-200 text-slate-800 text-base font-bold font-mono">
                  {formatBDT(expectedBdt)}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                    8. Send Amount (Actual BDT) <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-[10px] text-slate-500">Bank transfer amount</span>
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-slate-400 font-bold">৳</span>
                  <input
                    type="number"
                    id="input-tx-actual-send"
                    step="any"
                    min="0"
                    placeholder="e.g. 36850"
                    value={actualSend}
                    onChange={(e) => {
                      setActualSend(e.target.value);
                      setActualSendTouched(true);
                    }}
                    required
                    className="w-full pl-8 pr-3 py-2 rounded-lg border border-slate-300 text-slate-900 text-base font-bold font-mono focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 transition"
                  />
                </div>
              </div>
            </div>

            {/* Status and Note */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-1">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Status
                </label>
                <select
                  id="select-tx-status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-900 text-sm font-semibold bg-white"
                >
                  <option value="Completed">Completed (Counted in Profit)</option>
                  <option value="Pending">Pending</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  10. Optional Note
                </label>
                <input
                  type="text"
                  id="input-tx-note"
                  placeholder="e.g. Reference note, urgent payout..."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-900 text-sm focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 transition"
                />
              </div>
            </div>

            {/* Form Actions */}
            <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
              <button
                type="button"
                id="btn-tx-reset"
                onClick={handleReset}
                className="px-3.5 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 flex items-center transition"
              >
                <RotateCcw className="w-3.5 h-3.5 mr-1" /> Reset Form
              </button>

              <button
                type="submit"
                id="btn-tx-submit"
                className="px-6 py-2.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-sm shadow-md shadow-emerald-700/20 flex items-center transition"
              >
                <Save className="w-4 h-4 mr-1.5" /> Save Transaction
              </button>
            </div>
          </form>
        </div>

        {/* Right: Live Calculation & Profit Summary Card (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-slate-900 text-slate-100 rounded-xl p-5 shadow-lg border border-slate-800">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <span className="font-bold text-sm text-white uppercase tracking-wider">
                  Live Financial Calculation
                </span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-emerald-400">
                Auto-calculated
              </span>
            </div>

            {/* Calculation Breakdown Rows */}
            <div className="space-y-3 font-mono text-sm">
              <div className="flex items-center justify-between text-slate-300">
                <span className="text-xs font-sans text-slate-400">Send USD:</span>
                <span className="font-bold">{formatUSD(numSendUsd)}</span>
              </div>

              <div className="flex items-center justify-between text-slate-300">
                <span className="text-xs font-sans text-slate-400">Dollar Rate:</span>
                <span>{numDollarRate ? `৳${numDollarRate}` : '৳0'}</span>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-slate-200">
                <span className="text-xs font-sans text-slate-400">Expected BDT:</span>
                <span className="font-bold text-slate-100">{formatBDT(expectedBdt)}</span>
              </div>

              <div className="flex items-center justify-between text-slate-200">
                <span className="text-xs font-sans text-slate-400">Actual Send (BDT):</span>
                <span className="font-bold text-slate-100">{formatBDT(numActualSend)}</span>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-800/80 border border-slate-700/60 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-sans font-bold text-slate-200 block">
                      Bank Charge
                    </span>
                    <span className="text-[10px] font-sans text-slate-400">
                      Expected BDT - Actual Send
                    </span>
                  </div>
                  <span className={`font-bold text-base ${bankCharge >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {formatBDT(bankCharge)}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-700/60">
                  <div>
                    <span className="text-xs font-sans font-bold text-slate-200 block">
                      Commission
                    </span>
                    <span className="text-[10px] font-sans text-slate-400">
                      ${numSendUsd} × ৳{settings.commissionPerUsd.toFixed(2)}/USD
                    </span>
                  </div>
                  <span className="font-bold text-base text-emerald-400">
                    {formatBDT(commission)}
                  </span>
                </div>
              </div>

              {/* Total Profit Hero Box */}
              <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-950/80 to-slate-900 border-2 border-emerald-500/50 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-sans uppercase tracking-wider font-bold text-emerald-300 block">
                      Total Profit
                    </span>
                    <span className="text-[11px] font-sans text-slate-400">
                      Bank Charge + Commission
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl sm:text-3xl font-bold font-mono text-emerald-300 block leading-tight">
                      {formatBDT(totalProfit)}
                    </span>
                    <span className="text-[10px] font-sans text-slate-400">
                      ({formatBDT(bankCharge)} + {formatBDT(commission)})
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Note about calculation guarantee */}
            <div className="mt-4 p-2.5 rounded bg-slate-950/60 border border-slate-800 text-[11px] text-slate-400 space-y-1">
              <div className="flex items-center space-x-1 text-slate-300 font-semibold">
                <Info className="w-3.5 h-3.5 text-emerald-400" />
                <span>Profit Calculation Rule:</span>
              </div>
              <p>
                Total Profit is strictly calculated as <strong>Bank Charge + Commission</strong>. You never need to enter profit manually.
              </p>
            </div>
          </div>

          {/* Quick Reference Badge Card */}
          <div className="p-4 rounded-xl bg-white border border-slate-200 text-xs text-slate-600 shadow-sm space-y-2">
            <span className="font-bold text-slate-800 uppercase tracking-wider block text-[11px]">
              Assigned Reference / Source:
            </span>
            <div className="flex items-center justify-between p-2 rounded bg-slate-50 border border-slate-100">
              <span className="font-bold text-slate-900">{referenceBy}</span>
              <span className="text-emerald-700 font-medium">Auto-aggregated in reports</span>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Modal for post-submission edit */}
      {isEditingSubmitted && activeSubmittedTx && (
        <EditTransactionModal
          transaction={activeSubmittedTx}
          onClose={() => setIsEditingSubmitted(false)}
        />
      )}

      {/* Delete Confirmation Modal for post-submission delete */}
      {isDeletingSubmitted && activeSubmittedTx && (
        <ConfirmDeleteModal
          title="Delete Transaction"
          message={`Are you sure you want to delete transaction ${activeSubmittedTx.id} for ${activeSubmittedTx.recipientName}? This will permanently remove its profit calculation and release the USD/BDT allocation.`}
          itemId={activeSubmittedTx.id}
          onConfirm={() => {
            deleteTransaction(activeSubmittedTx.id);
            setSubmittedTxId(null);
            setIsDeletingSubmitted(false);
            setSuccessMessage(`Transaction ${activeSubmittedTx.id} was deleted successfully.`);
          }}
          onClose={() => setIsDeletingSubmitted(false)}
        />
      )}
    </div>
  );
}
