import React, { useState, useEffect, useRef } from 'react';
import {
  CheckCircle,
  RotateCcw,
  Sparkles,
  Edit2,
  Trash2,
  Plus,
  UserCheck,
  Building,
  Save,
  Clock,
  ArrowRight,
  FileSpreadsheet,
  AlertCircle,
  Wallet,
} from 'lucide-react';
import { useAccounting } from '../../context/AccountingContext';
import {
  computeBankCharge,
  computeCommission,
  computeExpectedBDT,
  computeProfit,
  cleanNumericInput,
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
    remainingUsdBalance,
  } = useAccounting();

  // Form State
  const [date, setDate] = useState<string>(draftTransaction?.date || getTodayDateString());
  const [recipientName, setRecipientName] = useState<string>(draftTransaction?.recipientName || '');
  const [accountNumber, setAccountNumber] = useState<string>(draftTransaction?.accountNumber || '');
  const [bankName, setBankName] = useState<string>(
    draftTransaction?.bankName || settings.banks[0] || 'Dutch-Bangla Bank'
  );
  const [sendUsd, setSendUsd] = useState<string>(
    draftTransaction?.sendUsd ? String(draftTransaction.sendUsd) : ''
  );
  const [dollarRate, setDollarRate] = useState<string>(
    draftTransaction?.dollarRate
      ? String(draftTransaction.dollarRate)
      : settings.defaultDollarRate
      ? String(settings.defaultDollarRate)
      : '123'
  );
  const [actualSend, setActualSend] = useState<string>(
    draftTransaction?.sendAmount ? String(draftTransaction.sendAmount) : ''
  );
  const [referenceBy, setReferenceBy] = useState<string>(
    draftTransaction?.referenceBy || settings.references[0] || 'Kaka'
  );
  const [note, setNote] = useState<string>(draftTransaction?.note || '');
  const [saveAccount, setSaveAccount] = useState<boolean>(true);
  const [status, setStatus] = useState<'Completed' | 'Pending'>('Completed');

  // Autocomplete UI state
  const [showSuggestions, setShowSuggestions] = useState<boolean>(false);
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
  const [actualSendTouched, setActualSendTouched] = useState<boolean>(
    Boolean(draftTransaction?.sendAmount)
  );

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
    } catch (err) {
      setErrorMessage('Failed to save transaction. Please check your inputs.');
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-4">
      {/* Top Header: Compact & Professional */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 pb-2.5 border-b border-slate-200">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
              New Send Entry
            </h2>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
              BDT Payout
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Record recipient payment with real-time automatic charge, commission, and profit computation.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={() => setActiveTab('previous-month-import')}
            className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center space-x-1.5 shadow-2xs transition"
            title="Import previous month accounts"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
            <span>Import Prev Month</span>
          </button>

          <button
            type="button"
            id="btn-view-all-tx"
            onClick={() => setActiveTab('transactions')}
            className="px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold shadow-2xs transition"
          >
            All Transactions
          </button>
        </div>
      </div>

      {/* Submitted Transaction Compact Banner */}
      {activeSubmittedTx && (
        <div className="p-3 sm:p-3.5 rounded-xl bg-emerald-50 border border-emerald-300 shadow-2xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 animate-fade-in">
          <div className="flex items-center space-x-2.5">
            <div className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
              <CheckCircle className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-mono text-xs font-bold px-1.5 py-0.5 rounded bg-emerald-200 text-emerald-950">
                  {activeSubmittedTx.id}
                </span>
                <span className="text-xs font-bold text-emerald-950">
                  লেনদেন সম্পন্ন হয়েছে! ({activeSubmittedTx.recipientName} • {formatUSD(activeSubmittedTx.sendUsd)} &rarr; {formatBDT(activeSubmittedTx.actualSend)})
                </span>
                <span className="text-xs font-bold text-emerald-800 font-mono">
                  +Profit: {formatBDT(activeSubmittedTx.profit)}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-1.5 self-end sm:self-auto">
            <button
              type="button"
              onClick={() => setIsEditingSubmitted(true)}
              className="px-2.5 py-1 rounded-md bg-white border border-emerald-300 text-emerald-900 text-xs font-semibold flex items-center space-x-1 hover:bg-emerald-100 transition"
            >
              <Edit2 className="w-3 h-3 text-emerald-700" />
              <span>Edit</span>
            </button>
            <button
              type="button"
              onClick={() => setIsDeletingSubmitted(true)}
              className="px-2.5 py-1 rounded-md bg-white border border-rose-300 text-rose-700 text-xs font-semibold flex items-center space-x-1 hover:bg-rose-100 transition"
            >
              <Trash2 className="w-3 h-3 text-rose-600" />
              <span>Delete</span>
            </button>
            <button
              type="button"
              onClick={() => setSubmittedTxId(null)}
              className="px-2.5 py-1 rounded-md bg-emerald-700 text-white text-xs font-bold hover:bg-emerald-800 transition"
            >
              Next Entry
            </button>
          </div>
        </div>
      )}

      {errorMessage && (
        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 flex items-center space-x-2 text-xs font-semibold">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Modern, Compact Side-by-Side Layout (No excessive scrolling) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Side: Ergonomic Input Form (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-2xs">
          <form onSubmit={handleSubmit} className="space-y-3.5">
            {/* Row 1: Date & Reference By (Selection Chips, NOT Dropdown) */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
              <div className="sm:col-span-4">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Date <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  id="input-tx-date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-slate-900 text-xs font-medium focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 transition"
                />
              </div>

              {/* Reference / Source: Fast Selection Chips */}
              <div className="sm:col-span-8">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Reference / Source Fund <span className="text-rose-500">*</span>
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {settings.references.map((ref) => {
                    const isSelected = referenceBy === ref;
                    return (
                      <button
                        key={ref}
                        type="button"
                        onClick={() => setReferenceBy(ref)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center space-x-1.5 ${
                          isSelected
                            ? 'bg-emerald-700 text-white shadow-xs ring-2 ring-emerald-500/50'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200/80'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            isSelected ? 'bg-emerald-300' : 'bg-slate-400'
                          }`}
                        />
                        <span>{ref}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Row 2: Recipient Name (with Autocomplete) & Account Number */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="relative" ref={suggestionRef}>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Recipient Name <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    id="input-tx-recipient"
                    placeholder="e.g. Rahim, Md. Kabir"
                    value={recipientName}
                    onChange={(e) => {
                      setRecipientName(e.target.value);
                      setShowSuggestions(true);
                    }}
                    onFocus={() => setShowSuggestions(true)}
                    required
                    autoComplete="off"
                    className="w-full px-2.5 py-1.5 pr-8 rounded-lg border border-slate-300 text-slate-900 text-xs font-semibold focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 transition"
                  />
                  <UserCheck className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2 pointer-events-none" />
                </div>

                {/* Autocomplete Suggestions Popup */}
                {showSuggestions && filteredSavedAccounts.length > 0 && (
                  <div className="absolute z-30 left-0 right-0 mt-1 bg-white rounded-xl border border-slate-200 shadow-xl max-h-52 overflow-y-auto divide-y divide-slate-100">
                    <div className="p-2 bg-slate-50 text-[10px] font-semibold text-slate-500 flex items-center justify-between">
                      <span>Saved matches for "{recipientName}":</span>
                      <span className="text-emerald-700 font-bold">Click to auto-fill</span>
                    </div>
                    {filteredSavedAccounts.map((acc) => (
                      <button
                        type="button"
                        key={acc.id}
                        onClick={() => handleSelectAccount(acc)}
                        className="w-full text-left px-3 py-2 hover:bg-emerald-50/70 transition flex items-center justify-between group"
                      >
                        <div>
                          <div className="font-semibold text-xs text-slate-900 group-hover:text-emerald-900">
                            {acc.recipientName}
                          </div>
                          <div className="text-[11px] text-slate-500 font-mono">
                            {acc.bankName} • Acc: {acc.accountNumber}
                          </div>
                        </div>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 group-hover:bg-emerald-100 group-hover:text-emerald-800">
                          {acc.totalTransactions} prior txns
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Account Number / MFS <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  autoComplete="off"
                  id="input-tx-account"
                  placeholder="e.g. 123456789 or 017..."
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(cleanNumericInput(e.target.value))}
                  required
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-slate-900 text-xs font-mono font-semibold focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 transition"
                />
              </div>
            </div>

            {/* Row 3: Bank Name & Quick Save Checkbox */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
              <div className="sm:col-span-7">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Bank / Channel <span className="text-rose-500">*</span>
                </label>
                <select
                  id="select-tx-bank"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  required
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-slate-900 text-xs font-semibold focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 transition bg-white"
                >
                  {settings.banks.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-5 sm:pt-4">
                <label className="flex items-center space-x-2 text-xs font-medium text-slate-700 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    id="checkbox-save-account"
                    checked={saveAccount}
                    onChange={(e) => setSaveAccount(e.target.checked)}
                    className="rounded text-emerald-700 focus:ring-emerald-600 w-3.5 h-3.5"
                  />
                  <span>Save for 1-click future auto-fill</span>
                </label>
              </div>
            </div>

            {/* Row 4: Core Financials (USD, Rate, Expected BDT, Actual Send BDT) with Decimal Keypad */}
            <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/80 space-y-2.5">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Send USD ($) <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1.5 text-slate-400 font-bold text-xs">$</span>
                    <input
                      type="text"
                      inputMode="decimal"
                      pattern="[0-9]*[.]?[0-9]*"
                      autoComplete="off"
                      id="input-tx-usd"
                      placeholder="300"
                      value={sendUsd}
                      onChange={(e) => setSendUsd(cleanNumericInput(e.target.value))}
                      required
                      className="w-full pl-6 pr-2 py-1.5 rounded-lg border border-slate-300 text-slate-900 text-sm font-bold font-mono focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Dollar Rate (৳) <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1.5 text-slate-400 font-bold text-xs">৳</span>
                    <input
                      type="text"
                      inputMode="decimal"
                      pattern="[0-9]*[.]?[0-9]*"
                      autoComplete="off"
                      id="input-tx-rate"
                      placeholder="123"
                      value={dollarRate}
                      onChange={(e) => setDollarRate(cleanNumericInput(e.target.value))}
                      required
                      className="w-full pl-6 pr-2 py-1.5 rounded-lg border border-slate-300 text-slate-900 text-sm font-bold font-mono focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Expected BDT
                  </label>
                  <div className="w-full px-2 py-1.5 rounded-lg bg-slate-200/70 border border-slate-200 text-slate-800 text-xs font-bold font-mono truncate">
                    {formatBDT(expectedBdt)}
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Actual Send BDT <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1.5 text-slate-400 font-bold text-xs">৳</span>
                    <input
                      type="text"
                      inputMode="decimal"
                      pattern="[0-9]*[.]?[0-9]*"
                      autoComplete="off"
                      id="input-tx-actual-send"
                      placeholder="e.g. 36850"
                      value={actualSend}
                      onChange={(e) => {
                        setActualSend(cleanNumericInput(e.target.value));
                        setActualSendTouched(true);
                      }}
                      required
                      className="w-full pl-6 pr-2 py-1.5 rounded-lg border border-slate-300 text-slate-900 text-sm font-bold font-mono focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 bg-white"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Row 5: Status & Note */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
              <div className="sm:col-span-4">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Status
                </label>
                <select
                  id="select-tx-status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-slate-900 text-xs font-semibold bg-white"
                >
                  <option value="Completed">Completed (Profit Counted)</option>
                  <option value="Pending">Pending</option>
                </select>
              </div>

              <div className="sm:col-span-8">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Note / Remarks (Optional)
                </label>
                <input
                  type="text"
                  id="input-tx-note"
                  placeholder="e.g. Urgent payout, customer reference..."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-slate-900 text-xs focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 transition"
                />
              </div>
            </div>

            {/* Action Buttons: Clean & Compact */}
            <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
              <button
                type="button"
                id="btn-tx-reset"
                onClick={handleReset}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-100 flex items-center transition"
              >
                <RotateCcw className="w-3.5 h-3.5 mr-1" /> Reset
              </button>

              <button
                type="submit"
                id="btn-tx-submit"
                className="px-6 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-md shadow-emerald-700/20 flex items-center space-x-1.5 transition active:scale-95"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save Transaction (লেনদেন সংরক্ষণ)</span>
              </button>
            </div>
          </form>
        </div>

        {/* Right Side: Sticky Live Calculation Card (5 cols) (Professional Clean White) */}
        <div className="lg:col-span-5 sticky top-20 space-y-3">
          <div className="bg-white text-slate-900 rounded-2xl p-4 sm:p-5 shadow-xs border border-slate-200/90 space-y-3">
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                <span className="font-bold text-xs text-slate-900 uppercase tracking-wider">
                  Live Financial Calculation
                </span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold">
                Auto
              </span>
            </div>

            {/* Compact Breakdown */}
            <div className="space-y-2 font-mono text-xs">
              <div className="flex items-center justify-between text-slate-600">
                <span className="font-sans text-slate-500">Send USD:</span>
                <span className="font-bold text-slate-900">{formatUSD(numSendUsd)}</span>
              </div>

              <div className="flex items-center justify-between text-slate-600">
                <span className="font-sans text-slate-500">Dollar Rate:</span>
                <span className="font-bold text-slate-900">{numDollarRate ? `৳${numDollarRate}` : '৳0'}</span>
              </div>

              <div className="flex items-center justify-between pt-1.5 border-t border-slate-100 text-slate-700">
                <span className="font-sans text-slate-500">Expected BDT:</span>
                <span className="font-bold text-slate-900">{formatBDT(expectedBdt)}</span>
              </div>

              <div className="flex items-center justify-between text-slate-700">
                <span className="font-sans text-slate-500">Actual Send (BDT):</span>
                <span className="font-bold text-slate-900">{formatBDT(numActualSend)}</span>
              </div>

              {/* Bank Charge & Commission Box */}
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-sans text-[11px] text-slate-600">Bank Charge (Expected - Actual):</span>
                  <span
                    className={`font-bold ${
                      bankCharge >= 0 ? 'text-emerald-700' : 'text-rose-600'
                    }`}
                  >
                    {formatBDT(bankCharge)}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
                  <span className="font-sans text-[11px] text-slate-600">
                    Commission (${numSendUsd} × ৳{settings.commissionPerUsd.toFixed(2)}):
                  </span>
                  <span className="font-bold text-emerald-700">{formatBDT(commission)}</span>
                </div>
              </div>

              {/* Total Profit Hero Box */}
              <div className="p-3.5 rounded-xl bg-emerald-50/80 border border-emerald-300 text-emerald-950 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-sans uppercase tracking-wider font-bold text-emerald-800 block">
                    Net Profit (মোট লাভ)
                  </span>
                  <span className="text-[10px] font-sans text-emerald-700">
                    Charge + Commission
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-xl sm:text-2xl font-bold font-mono text-emerald-800 block leading-tight">
                    {formatBDT(totalProfit)}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Source Balance indicator */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
              <span className="flex items-center space-x-1">
                <Wallet className="w-3.5 h-3.5 text-emerald-600" />
                <span>Available USD Balance:</span>
              </span>
              <span className="font-mono font-bold text-slate-900">
                {formatUSD(remainingUsdBalance)}
              </span>
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
