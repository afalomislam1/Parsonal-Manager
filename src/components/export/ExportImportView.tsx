import React, { useRef, useState } from 'react';
import {
  Download,
  Upload,
  FileSpreadsheet,
  Database,
  CheckCircle,
  AlertCircle,
  ShieldCheck,
  FileText,
  Calendar,
  Layers,
  ArrowDownLeft,
  ArrowUpRight,
  Wallet,
  Cloud,
  Zap,
} from 'lucide-react';
import { useAccounting } from '../../context/AccountingContext';
import {
  exportJSONBackup,
  importJSONBackup,
  exportTransactionsCSV,
  exportPersonalExpensesCSV,
} from '../../utils/storage';
import { formatDate } from '../../utils/calculations';

export function ExportImportView() {
  const {
    transactions,
    deposits,
    savedAccounts,
    personalExpenses,
    settings,
    setIsSyncModalOpen,
    syncPin,
    setActiveTab,
  } = useAccounting();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleDownloadJSON = () => {
    exportJSONBackup({
      transactions,
      deposits,
      savedAccounts,
      personalExpenses,
      settings,
      version: 1,
      exportedAt: new Date().toISOString(),
    });
    setStatus({
      type: 'success',
      message: 'Full backup file downloaded successfully! Store it in a safe place.',
    });
  };

  const handleImportJSON = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      await importJSONBackup(file);
      setStatus({
        type: 'success',
        message: 'Data successfully restored! Refreshing application...',
      });
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (err: any) {
      setStatus({
        type: 'error',
        message: err.message || 'Error restoring backup file. Please verify JSON format.',
      });
    }
  };

  const handleExportTransactionsCSV = () => {
    exportTransactionsCSV(
      transactions,
      `transactions-export-${new Date().toISOString().slice(0, 10)}.csv`
    );
    setStatus({
      type: 'success',
      message: `Exported ${transactions.length} transactions to CSV spreadsheet format.`,
    });
  };

  const handleExportExpensesCSV = () => {
    exportPersonalExpensesCSV(
      personalExpenses,
      `personal-expenses-${new Date().toISOString().slice(0, 10)}.csv`
    );
    setStatus({
      type: 'success',
      message: `Exported ${personalExpenses.length} personal expense records to CSV spreadsheet.`,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b border-slate-200">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Data Export & Backup Center
          </h2>
          <p className="text-xs sm:text-sm text-slate-600">
            Ensure long-term security of your financial accounting records with instant backups, CSV spreadsheets, and restoration tools.
          </p>
        </div>
      </div>

      {status && (
        <div
          className={`p-4 rounded-xl border flex items-center space-x-2 text-xs font-semibold ${
            status.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}
        >
          {status.type === 'success' ? (
            <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
          )}
          <span>{status.message}</span>
        </div>
      )}

      {/* Multi-Device PIN Cloud Sync Banner */}
      <div className="bg-gradient-to-br from-emerald-950 via-slate-900 to-emerald-900 text-white p-5 rounded-3xl shadow-md border border-emerald-800/40 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-start sm:items-center space-x-3.5">
          <div className="w-11 h-11 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/30">
            <Cloud className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="font-bold text-base text-white">
                মোবাইল ও পিসিতে ডাটা সিঙ্ক (Multi-Device PIN Sync)
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-400 text-slate-950">
                Live Cloud Sync
              </span>
            </div>
            <p className="text-xs text-emerald-100/80 leading-relaxed max-w-xl">
              মোবাইলের ১২২টি একাউন্ট ও লেনদেন অন্য কোনো পিসি বা ডিভাইসে এক ক্লিকে পাওয়ার জন্য একটি PIN কোড তৈরি করে ক্লাউডে ব্যাকআপ রাখুন।
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsSyncModalOpen(true)}
          className="self-start sm:self-auto px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center space-x-2 shadow-lg shadow-emerald-500/25 transition whitespace-nowrap active:scale-95"
        >
          <Zap className="w-4 h-4" />
          <span>{syncPin ? `সিঙ্ক ম্যানেজ করুন (${syncPin})` : 'পিন দিয়ে সিঙ্ক করুন'}</span>
        </button>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
            Transactions Stored
          </span>
          <span className="text-2xl font-mono font-bold text-slate-900 mt-1 block">
            {transactions.length}
          </span>
          <span className="text-[11px] text-slate-400 mt-0.5 block">
            Ready for export or backup
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
            Deposits Stored
          </span>
          <span className="text-2xl font-mono font-bold text-slate-900 mt-1 block">
            {deposits.length}
          </span>
          <span className="text-[11px] text-slate-400 mt-0.5 block">
            Source records
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
            Saved Accounts
          </span>
          <span className="text-2xl font-mono font-bold text-slate-900 mt-1 block">
            {savedAccounts.length}
          </span>
          <span className="text-[11px] text-slate-400 mt-0.5 block">
            Frequent recipients
          </span>
        </div>
      </div>

      {/* Main Action Modules */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Module: Previous Month Import */}
        <div className="bg-gradient-to-br from-emerald-50 to-white rounded-2xl border-2 border-emerald-300 p-6 shadow-sm space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full inline-block mb-1">
                নয়া ফিচার
              </span>
              <h3 className="text-base font-bold text-slate-900">
                Import Previous Month's Accounts (আগের মাসের হিসাব ইমপোর্ট)
              </h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              পূর্ববর্তী মাসের লেনদেনের হিসাব, একাউন্ট নম্বর, ব্যাংক এবং ডলার রেট সংবলিত CSV/Excel ফাইল এক ক্লিকে অ্যাকাউন্টে ইমপোর্ট করুন অথবা মাস শেষের অবশিষ্ট ব্যালেন্স রোলওভার করুন।
            </p>
            <div className="p-3 bg-white/80 rounded-xl text-[11px] text-emerald-900 font-mono border border-emerald-200/60">
              সাপোর্ট: CSV ফাইল • দ্রুত টেক্সট কপি-পেস্ট • ওপেনিং ব্যালেন্স
            </div>
          </div>

          <button
            onClick={() => setActiveTab('previous-month-import')}
            className="w-full py-2.5 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center justify-center space-x-2 shadow-sm transition"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>আগের মাসের হিসাব ইমপোর্ট সেকশনে যান &rarr;</span>
          </button>
        </div>

        {/* Module 1: Backup Download */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
              <Database className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900">
              Full System Backup (JSON)
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Downloads a snapshot containing all send transactions, deposit records, saved recipient accounts, bank lists, and commission configuration.
            </p>
            <div className="p-3 bg-slate-50 rounded-xl text-[11px] text-slate-500 font-mono">
              Format: Standard UTF-8 JSON • Compatible with any device
            </div>
          </div>

          <button
            onClick={handleDownloadJSON}
            className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center justify-center space-x-2 shadow-sm transition"
          >
            <Download className="w-4 h-4" />
            <span>Download Complete Backup File</span>
          </button>
        </div>

        {/* Module 2: Restore Data */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center font-bold">
              <Upload className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900">
              Restore from Backup
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Upload a previously exported JSON backup file to instantly restore your accounting history. Validation guarantees that corrupt or invalid files are rejected.
            </p>
            <div className="p-3 bg-slate-50 rounded-xl text-[11px] text-slate-500 font-mono">
              Action: Merges and restores verified records safely
            </div>
          </div>

          <div>
            <input
              type="file"
              ref={fileInputRef}
              accept=".json"
              onChange={handleImportJSON}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-2.5 px-4 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center justify-center space-x-2 shadow-sm transition"
            >
              <Upload className="w-4 h-4" />
              <span>Select & Restore Backup File</span>
            </button>
          </div>
        </div>

        {/* Module 3: CSV / Excel Export */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900">
              Export Transactions to CSV / Excel
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Export all payment transactions into Microsoft Excel, Google Sheets, or Apple Numbers format. Includes formulas, Bank Charge, Commission, and Profit columns.
            </p>
          </div>

          <button
            onClick={handleExportTransactionsCSV}
            className="w-full py-2.5 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center justify-center space-x-2 shadow-sm transition"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Export Transactions (CSV)</span>
          </button>
        </div>

        {/* Module 4: Personal Expenses CSV */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
              <Wallet className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900">
              Export Personal Expenses (CSV)
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Export all personal expense records taken from Kaka's fund, including date, time, BDT amount, exchange dollar rate, USD equivalent, and purpose.
            </p>
          </div>

          <button
            onClick={handleExportExpensesCSV}
            className="w-full py-2.5 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold flex items-center justify-center space-x-2 shadow-sm transition"
          >
            <Wallet className="w-4 h-4" />
            <span>Export Personal Expenses ({personalExpenses.length})</span>
          </button>
        </div>

        {/* Module 5: Security & Privacy Guarantee */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-3">
          <div className="flex items-center space-x-2 text-slate-900 font-bold text-sm">
            <ShieldCheck className="w-5 h-5 text-emerald-700" />
            <span>Privacy & Storage Notice</span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            This is your private accounting manager. All calculations, records, references, and recipients are stored locally in your browser storage. Downloading periodic backup copies ensures you can easily transfer or access your data across different devices without risk of data loss.
          </p>
        </div>
      </div>
    </div>
  );
}
