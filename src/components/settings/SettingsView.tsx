import React, { useState, useRef } from 'react';
import {
  Settings,
  Percent,
  DollarSign,
  Users,
  Building,
  Database,
  Download,
  Upload,
  RefreshCw,
  Trash2,
  Plus,
  Save,
  CheckCircle,
  AlertCircle,
  ShieldAlert,
  FileSpreadsheet,
} from 'lucide-react';
import { useAccounting } from '../../context/AccountingContext';
import { exportJSONBackup, importJSONBackup, exportTransactionsCSV } from '../../utils/storage';
import { DEFAULT_BANKS, DEFAULT_REFERENCES } from '../../constants/banks';
import { cleanNumericInput } from '../../utils/calculations';

export function SettingsView() {
  const {
    settings,
    updateSettings,
    transactions,
    deposits,
    savedAccounts,
    personalExpenses,
    resetToDefaultDemo,
  } = useAccounting();

  // Settings form states
  const [commissionRate, setCommissionRate] = useState<string>(
    settings.commissionPerUsd.toString()
  );
  const [dollarRateSetting, setDollarRateSetting] = useState<string>(
    (settings.defaultDollarRate || 123).toString()
  );

  // References management
  const [newReference, setNewReference] = useState<string>('');
  // Banks management
  const [newBank, setNewBank] = useState<string>('');

  const [notification, setNotification] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const [showResetConfirm, setShowResetConfirm] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSaveDollarRate = (e: React.FormEvent) => {
    e.preventDefault();
    const rate = parseFloat(dollarRateSetting);
    if (isNaN(rate) || rate <= 0) {
      setNotification({
        type: 'error',
        message: 'Please enter a valid positive dollar rate.',
      });
      return;
    }

    updateSettings({ defaultDollarRate: rate });
    setNotification({
      type: 'success',
      message: `Default Dollar Rate set to ৳${rate.toFixed(2)} per USD.`,
    });
  };

  const handleSaveCommission = (e: React.FormEvent) => {
    e.preventDefault();
    const rate = parseFloat(commissionRate);
    if (isNaN(rate) || rate < 0) {
      setNotification({
        type: 'error',
        message: 'Please enter a valid non-negative commission rate.',
      });
      return;
    }

    updateSettings({ commissionPerUsd: rate });
    setNotification({
      type: 'success',
      message: `Default commission rate set to ৳${rate.toFixed(2)} per USD.`,
    });
  };

  const handleAddReference = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newReference.trim();
    if (!trimmed) return;
    if (settings.references.includes(trimmed)) {
      setNotification({
        type: 'error',
        message: `Reference "${trimmed}" already exists.`,
      });
      return;
    }

    updateSettings({ references: [...settings.references, trimmed] });
    setNewReference('');
    setNotification({
      type: 'success',
      message: `Reference "${trimmed}" added successfully.`,
    });
  };

  const handleRemoveReference = (refName: string) => {
    if (settings.references.length <= 1) {
      setNotification({
        type: 'error',
        message: 'At least one reference person is required.',
      });
      return;
    }
    updateSettings({
      references: settings.references.filter((r) => r !== refName),
    });
    setNotification({
      type: 'success',
      message: `Reference "${refName}" removed.`,
    });
  };

  const handleAddBank = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newBank.trim();
    if (!trimmed) return;
    if (settings.banks.includes(trimmed)) {
      setNotification({
        type: 'error',
        message: `Bank "${trimmed}" is already in the list.`,
      });
      return;
    }

    updateSettings({ banks: [...settings.banks, trimmed] });
    setNewBank('');
    setNotification({
      type: 'success',
      message: `Bank "${trimmed}" added to bank suggestions.`,
    });
  };

  const handleRemoveBank = (bankName: string) => {
    if (settings.banks.length <= 1) {
      setNotification({
        type: 'error',
        message: 'At least one bank is required in the system.',
      });
      return;
    }
    updateSettings({
      banks: settings.banks.filter((b) => b !== bankName),
    });
    setNotification({
      type: 'success',
      message: `Bank "${bankName}" removed.`,
    });
  };

  const handleExportBackup = () => {
    exportJSONBackup({
      transactions,
      deposits,
      savedAccounts,
      personalExpenses,
      settings,
      version: 1,
      exportedAt: new Date().toISOString(),
    });
    setNotification({
      type: 'success',
      message: 'Complete database JSON backup downloaded successfully.',
    });
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const data = await importJSONBackup(file);
      // Reload page to rehydrate cleanly
      window.location.reload();
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err.message || 'Failed to import backup file.',
      });
    }
  };

  const handleExportAllCSV = () => {
    exportTransactionsCSV(transactions, `complete-all-transactions-${new Date().toISOString().slice(0, 10)}.csv`);
    setNotification({
      type: 'success',
      message: 'All transactions exported to CSV successfully.',
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b border-slate-200">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Settings & Configurations
          </h2>
          <p className="text-xs sm:text-sm text-slate-600">
            Configure financial calculation parameters, reference contacts, bank suggestions, and data backups.
          </p>
        </div>
      </div>

      {notification && (
        <div
          className={`p-3 rounded-xl border flex items-center justify-between text-xs font-semibold ${
            notification.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}
        >
          <div className="flex items-center space-x-2">
            {notification.type === 'success' ? (
              <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            )}
            <span>{notification.message}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="text-slate-400 hover:text-slate-700 ml-4"
          >
            &times;
          </button>
        </div>
      )}

      {/* Grid of Settings Modules */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Module 0: Dollar Rate Configuration */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
          <div className="flex items-center space-x-2 pb-3 border-b border-slate-100">
            <DollarSign className="w-5 h-5 text-emerald-700" />
            <div>
              <h3 className="text-sm font-bold text-slate-900">Default Dollar Rate (ডলার রেট)</h3>
              <p className="text-xs text-slate-500">
                Pre-fills automatically when creating new transactions or deposits
              </p>
            </div>
          </div>

          <form onSubmit={handleSaveDollarRate} className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Default Dollar Rate (BDT per 1 USD)
              </label>
              <div className="relative max-w-xs">
                <span className="absolute left-3 top-2 text-slate-400 font-bold">৳</span>
                <input
                  type="text"
                  inputMode="decimal"
                  pattern="[0-9]*[.]?[0-9]*"
                  autoComplete="off"
                  value={dollarRateSetting}
                  onChange={(e) => setDollarRateSetting(cleanNumericInput(e.target.value))}
                  className="w-full pl-8 pr-3 py-2 rounded-lg border border-slate-300 text-slate-900 text-sm font-mono font-bold focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600"
                  placeholder="123.00"
                />
              </div>
              <span className="text-[11px] text-slate-500 mt-1 block">
                নতুন লেনদেন এন্ট্রি করার সময় এই রেটটি স্বয়ংক্রিয়ভাবে ইনপুট ফিল্ডে বসে যাবে (You can still change it during entry).
              </span>
            </div>

            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center space-x-1.5 shadow-sm shadow-emerald-700/20 transition active:scale-95"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save Dollar Rate (রেট সেভ করুন)</span>
            </button>
          </form>
        </div>

        {/* Module 1: Commission Configuration */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
          <div className="flex items-center space-x-2 pb-3 border-b border-slate-100">
            <Percent className="w-5 h-5 text-emerald-700" />
            <div>
              <h3 className="text-sm font-bold text-slate-900">Commission Rate Settings</h3>
              <p className="text-xs text-slate-500">
                Formula: Commission = Send USD * Rate
              </p>
            </div>
          </div>

          <form onSubmit={handleSaveCommission} className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Default Commission per 1 USD (BDT)
              </label>
              <div className="relative max-w-xs">
                <span className="absolute left-3 top-2 text-slate-400 font-bold">৳</span>
                <input
                  type="text"
                  inputMode="decimal"
                  pattern="[0-9]*[.]?[0-9]*"
                  autoComplete="off"
                  value={commissionRate}
                  onChange={(e) => setCommissionRate(cleanNumericInput(e.target.value))}
                  className="w-full pl-8 pr-3 py-2 rounded-lg border border-slate-300 text-slate-900 text-sm font-mono font-bold"
                />
              </div>
              <span className="text-[11px] text-slate-500 mt-1 block">
                Default is ৳0.50 BDT per dollar (e.g. $1,000 USD = ৳500 Commission).
              </span>
            </div>

            <button
              type="submit"
              className="px-4 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center space-x-1.5 shadow-sm"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Update Commission Rate</span>
            </button>
          </form>
        </div>

        {/* Module 2: References Management */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
          <div className="flex items-center space-x-2 pb-3 border-b border-slate-100">
            <Users className="w-5 h-5 text-emerald-700" />
            <div>
              <h3 className="text-sm font-bold text-slate-900">Manage References</h3>
              <p className="text-xs text-slate-500">
                Primary stakeholders (Kaka, Humaiun Kaka's Assistant, etc.)
              </p>
            </div>
          </div>

          <form onSubmit={handleAddReference} className="flex space-x-2">
            <input
              type="text"
              placeholder="Add new reference name..."
              value={newReference}
              onChange={(e) => setNewReference(e.target.value)}
              className="flex-1 px-3 py-1.5 rounded-lg border border-slate-300 text-xs text-slate-900"
            />
            <button
              type="submit"
              className="px-3.5 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center space-x-1 transition shadow-2xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add</span>
            </button>
          </form>

          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {settings.references.map((ref) => (
              <div
                key={ref}
                className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-900"
              >
                <span>{ref}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveReference(ref)}
                  className="p-1 text-slate-400 hover:text-rose-600 rounded"
                  title="Remove reference"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Module 3: Bangladeshi Banks Management */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
          <div className="flex items-center space-x-2 pb-3 border-b border-slate-100">
            <Building className="w-5 h-5 text-emerald-700" />
            <div>
              <h3 className="text-sm font-bold text-slate-900">Bangladeshi Banks List</h3>
              <p className="text-xs text-slate-500">
                {settings.banks.length} banks available in recipient dropdowns
              </p>
            </div>
          </div>

          <form onSubmit={handleAddBank} className="flex space-x-2">
            <input
              type="text"
              placeholder="Add new bank..."
              value={newBank}
              onChange={(e) => setNewBank(e.target.value)}
              className="flex-1 px-3 py-1.5 rounded-lg border border-slate-300 text-xs text-slate-900"
            />
            <button
              type="submit"
              className="px-3.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center space-x-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Bank</span>
            </button>
          </form>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
            {settings.banks.map((bank) => (
              <div
                key={bank}
                className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-800"
              >
                <span className="truncate pr-2 font-medium">{bank}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveBank(bank)}
                  className="p-1 text-slate-400 hover:text-rose-600 flex-shrink-0"
                  title="Remove bank"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Module 4: Data Safety, Backup & Restore (Section 20 & 21) */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
          <div className="flex items-center space-x-2 pb-3 border-b border-slate-100">
            <Database className="w-5 h-5 text-emerald-700" />
            <div>
              <h3 className="text-sm font-bold text-slate-900">Data Safety, Backup & Import</h3>
              <p className="text-xs text-slate-500">
                Keep your accounting data safe with regular backups and offline copies.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800">Complete JSON Backup</span>
                <button
                  id="btn-export-backup"
                  onClick={handleExportBackup}
                  className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center space-x-1.5 shadow-sm"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Backup</span>
                </button>
              </div>
              <p className="text-[11px] text-slate-500">
                Exports all transactions, deposits, saved accounts, and preferences in standard JSON.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800">Restore From Backup</span>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".json"
                  onChange={handleImportFile}
                  className="hidden"
                />
                <button
                  id="btn-import-backup"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold flex items-center space-x-1.5 shadow-sm"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Import JSON File</span>
                </button>
              </div>
              <p className="text-[11px] text-slate-500">
                Upload a previously exported backup file to restore all records.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800">Export All to CSV</span>
                <button
                  onClick={handleExportAllCSV}
                  className="px-3 py-1.5 rounded-lg border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 text-xs font-bold flex items-center space-x-1.5"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Download CSV</span>
                </button>
              </div>
              <p className="text-[11px] text-slate-500">
                Spreadsheet-compatible format with all formula columns and metadata.
              </p>
            </div>

            {/* Factory Reset */}
            <div className="pt-2 border-t border-slate-200">
              <button
                onClick={() => setShowResetConfirm(true)}
                className="text-xs text-rose-600 hover:text-rose-700 font-semibold flex items-center space-x-1"
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>Reset Application & Reload Initial Demo Data</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Reset Confirmation Modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-sm w-full p-5 space-y-4">
            <div className="flex items-center space-x-3 text-rose-600">
              <ShieldAlert className="w-6 h-6" />
              <h3 className="text-base font-bold text-slate-900">Confirm Factory Reset</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              This will reset all transactions, deposits, and accounts back to sample demo state. Make sure to download a JSON backup first if you want to keep your data.
            </p>
            <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  resetToDefaultDemo();
                  setShowResetConfirm(false);
                  window.location.reload();
                }}
                className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold"
              >
                Yes, Reset All Data
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
