import React, { useState } from 'react';
import {
  Cloud,
  Download,
  Upload,
  Lock,
  Smartphone,
  Monitor,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  FileDown,
  X,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  Info,
} from 'lucide-react';
import { useAccounting } from '../../context/AccountingContext';
import { exportBackupJSON, loadStoredData } from '../../utils/storage';

export function PinSyncModal() {
  const {
    isSyncModalOpen,
    setIsSyncModalOpen,
    syncPin,
    setSyncPin,
    saveDataToPin,
    loadDataFromPin,
    isSyncLoading,
    lastSyncTime,
    syncMessage,
    setSyncMessage,
    transactions,
    savedAccounts,
    deposits,
    personalExpenses,
    autoSyncEnabled,
    setAutoSyncEnabled,
  } = useAccounting();

  const [activeMode, setActiveMode] = useState<'save' | 'load'>('save');
  const [pinInput, setPinInput] = useState<string>(syncPin || '');
  const [localFeedback, setLocalFeedback] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  if (!isSyncModalOpen) return null;

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLocalFeedback(null);
    if (!pinInput.trim() || pinInput.trim().length < 3) {
      setLocalFeedback({
        text: 'অনুগ্রহ করে কমপক্ষে ৩ সংখ্যার একটি পিন দিন (যেমন: 1234 বা 7860)',
        type: 'error',
      });
      return;
    }

    const res = await saveDataToPin(pinInput.trim());
    if (res.success) {
      setLocalFeedback({
        text: `✅ দারুণ! আপনার মোবাইলের ১২২টি একাউন্ট ও সকল লেনদেন PIN [${pinInput.trim()}]-এ ক্লাউডে সেভ হয়েছে। এখন যে কোনো পিসি বা ডিভাইসে এই পিন দিয়ে হিসাব ওপেন করতে পারবেন!`,
        type: 'success',
      });
    } else {
      setLocalFeedback({
        text: res.error || 'ক্লাউডে সেভ করতে সমস্যা হয়েছে।',
        type: 'error',
      });
    }
  };

  const handleLoad = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLocalFeedback(null);
    if (!pinInput.trim()) {
      setLocalFeedback({
        text: 'অনুগ্রহ করে আপনার পিন কোড দিন (Enter your sync PIN)',
        type: 'error',
      });
      return;
    }

    const res = await loadDataFromPin(pinInput.trim());
    if (res.success) {
      setLocalFeedback({
        text: `🎉 সফল হয়েছে! ক্লাউড থেকে আপনার সকল হিসাব (${res.data?.transactions?.length || 0}টি লেনদেন ও ${res.data?.savedAccounts?.length || 0}টি একাউন্ট) সফলভাবে এই ডিভাইসে লোড হয়েছে!`,
        type: 'success',
      });
    } else {
      setLocalFeedback({
        text: res.error || 'ক্লাউড থেকে ডেটা আনা যায়নি। পিন কোড সঠিক আছে কিনা চেক করুন।',
        type: 'error',
      });
    }
  };

  const handleDownloadBackup = () => {
    try {
      const fullData = loadStoredData();
      exportBackupJSON(fullData);
      setLocalFeedback({
        text: '✅ অফলাইন ব্যাকআপ ফাইল (.json) সফলভাবে ডাউনলোড হয়েছে!',
        type: 'success',
      });
    } catch {
      setLocalFeedback({
        text: 'ব্যাকআপ ফাইল ডাউনলোডে সমস্যা হয়েছে।',
        type: 'error',
      });
    }
  };

  const feedbackToDisplay = localFeedback || syncMessage;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Header Strip */}
        <div className="bg-gradient-to-r from-emerald-900 via-emerald-800 to-slate-900 text-white p-5 sm:p-6 flex items-start justify-between relative">
          <div className="space-y-1 pr-6">
            <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-200 border border-emerald-400/30 text-[11px] font-semibold">
              <Cloud className="w-3.5 h-3.5" />
              <span>Multi-Device Cloud PIN Sync</span>
            </div>
            <h3 className="text-lg sm:text-xl font-bold tracking-tight text-white flex items-center space-x-2">
              <span>ডিভাইস ও পিসি সিঙ্ক (PIN Sync)</span>
            </h3>
            <p className="text-xs sm:text-sm text-emerald-100/90 leading-relaxed">
              মোবাইলের ১২২টি একাউন্ট ও লেনদেনের হিসাব যে কোনো পিসি বা অন্য ডিভাইসে এক ক্লিকে নিয়ে আসুন।
            </p>
          </div>

          <button
            onClick={() => {
              setIsSyncModalOpen(false);
              setLocalFeedback(null);
            }}
            className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition"
            aria-label="Close Modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="bg-slate-100 p-1.5 flex border-b border-slate-200">
          <button
            type="button"
            onClick={() => {
              setActiveMode('save');
              setLocalFeedback(null);
            }}
            className={`flex-1 py-2 px-3 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center space-x-2 transition ${
              activeMode === 'save'
                ? 'bg-white text-emerald-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Smartphone className="w-4 h-4 text-emerald-700" />
            <span>১. মোবাইল থেকে সেভ করুন (Save)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveMode('load');
              setLocalFeedback(null);
            }}
            className={`flex-1 py-2 px-3 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center space-x-2 transition ${
              activeMode === 'load'
                ? 'bg-white text-emerald-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Monitor className="w-4 h-4 text-blue-700" />
            <span>২. পিসিতে হিসাব আনুন (Restore)</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {/* Safety Guarantee Notice */}
          <div className="p-3.5 bg-emerald-50 rounded-2xl border border-emerald-200/80 flex items-start space-x-3 text-xs">
            <ShieldCheck className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-bold text-emerald-950 block">
                ১০০% নিরাপদ হিসাবের নিশ্চয়তা
              </span>
              <p className="text-emerald-800 leading-relaxed">
                আপনার মোবাইলের কোনো ডাটা মুছবে না বা নষ্ট হবে না। পিন দিয়ে ক্লাউডে ব্যাকআপ রাখলে যে কোনো সময় যে কোনো ডিভাইস থেকে সম্পূর্ণ হিসাব ফিরিয়ে আনা যাবে।
              </p>
            </div>
          </div>

          {/* Feedback Banner */}
          {feedbackToDisplay && (
            <div
              className={`p-3.5 rounded-2xl border text-xs sm:text-sm leading-relaxed flex items-start space-x-2.5 transition animate-fade-in ${
                feedbackToDisplay.type === 'success'
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-950 font-medium'
                  : feedbackToDisplay.type === 'error'
                  ? 'bg-rose-50 border-rose-300 text-rose-950 font-medium'
                  : 'bg-blue-50 border-blue-300 text-blue-950'
              }`}
            >
              {feedbackToDisplay.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              )}
              <div className="flex-1">{feedbackToDisplay.text}</div>
            </div>
          )}

          {/* MODE 1: SAVE FROM MOBILE */}
          {activeMode === 'save' && (
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  একটি সহজ পিন কোড দিন (Set Your Secret PIN)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4 text-emerald-700" />
                  </div>
                  <input
                    type="text"
                    value={pinInput}
                    onChange={(e) => setPinInput(e.target.value)}
                    placeholder="যেমন: 1234 বা 7860"
                    maxLength={16}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-base font-mono font-bold tracking-widest focus:ring-2 focus:ring-emerald-600 focus:bg-white focus:outline-none transition"
                    autoFocus
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  এই পিন কোডটি মনে রাখুন বা লিখে রাখুন। পিসিতে এই পিনটি দিলেই সব হিসাব চলে আসবে।
                </p>
              </div>

              {/* Current Local Data Snapshot */}
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
                <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-2">
                  মোবাইলে থাকা হিসাবের সারাংশ (Current Data on this Mobile):
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                  <div className="bg-white p-2 rounded-xl border border-slate-200/80 shadow-2xs">
                    <span className="text-slate-500 block text-[10px]">লেনদেন</span>
                    <strong className="text-emerald-800 text-sm font-mono font-bold">
                      {transactions.length} টি
                    </strong>
                  </div>
                  <div className="bg-white p-2 rounded-xl border border-slate-200/80 shadow-2xs">
                    <span className="text-slate-500 block text-[10px]">সেভ একাউন্ট</span>
                    <strong className="text-blue-800 text-sm font-mono font-bold">
                      {savedAccounts.length} টি
                    </strong>
                  </div>
                  <div className="bg-white p-2 rounded-xl border border-slate-200/80 shadow-2xs">
                    <span className="text-slate-500 block text-[10px]">ডিপোজিট</span>
                    <strong className="text-slate-800 text-sm font-mono font-bold">
                      {deposits.length} টি
                    </strong>
                  </div>
                  <div className="bg-white p-2 rounded-xl border border-slate-200/80 shadow-2xs">
                    <span className="text-slate-500 block text-[10px]">ব্যক্তিগত খরচ</span>
                    <strong className="text-amber-800 text-sm font-mono font-bold">
                      {personalExpenses.length} টি
                    </strong>
                  </div>
                </div>
              </div>

              {/* Save Button */}
              <button
                type="submit"
                disabled={isSyncLoading}
                className="w-full py-3 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 active:scale-[0.99] text-white font-bold text-sm flex items-center justify-center space-x-2 shadow-lg shadow-emerald-700/25 transition disabled:opacity-50"
              >
                {isSyncLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>ক্লাউডে সেভ হচ্ছে...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    <span>ক্লাউডে হিসাব সেভ করুন (Upload to Cloud with PIN)</span>
                  </>
                )}
              </button>
            </form>
          )}

          {/* MODE 2: LOAD ON PC / ANOTHER DEVICE */}
          {activeMode === 'load' && (
            <form onSubmit={handleLoad} className="space-y-4">
              <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-2xl text-xs text-blue-900 leading-relaxed">
                <span className="font-bold block mb-1">পিসিতে হিসাব আনার নিয়ম:</span>
                মোবাইলে যে পিন দিয়ে সেভ করেছেন, সেই পিন কোডটি নিচে লিখে 'হিসাব লোড করুন' বাটনে ক্লিক করুন।
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  আপনার পিন কোড লিখুন (Enter PIN)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4 text-blue-700" />
                  </div>
                  <input
                    type="text"
                    value={pinInput}
                    onChange={(e) => setPinInput(e.target.value)}
                    placeholder="যেমন: 1234 বা 7860"
                    maxLength={16}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-base font-mono font-bold tracking-widest focus:ring-2 focus:ring-blue-600 focus:bg-white focus:outline-none transition"
                    autoFocus
                  />
                </div>
              </div>

              {/* Load Button */}
              <button
                type="submit"
                disabled={isSyncLoading}
                className="w-full py-3 px-4 rounded-xl bg-blue-700 hover:bg-blue-800 active:scale-[0.99] text-white font-bold text-sm flex items-center justify-center space-x-2 shadow-lg shadow-blue-700/25 transition disabled:opacity-50"
              >
                {isSyncLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>ক্লাউড থেকে ডেটা আসছে...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    <span>হিসাব লোড করুন (Load All Records with PIN)</span>
                  </>
                )}
              </button>
            </form>
          )}

          {/* Secondary Options Strip */}
          <div className="pt-3 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
            <div className="flex items-center space-x-2">
              <label className="flex items-center space-x-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={autoSyncEnabled}
                  onChange={(e) => setAutoSyncEnabled(e.target.checked)}
                  className="rounded border-slate-300 text-emerald-700 focus:ring-emerald-500 w-4 h-4"
                />
                <span className="text-slate-700 font-medium">অটো-সিঙ্ক চালু রাখুন (Auto-Sync)</span>
              </label>
            </div>

            <button
              type="button"
              onClick={handleDownloadBackup}
              className="text-emerald-700 hover:text-emerald-900 font-bold flex items-center space-x-1 py-1 px-2 rounded-lg hover:bg-emerald-50 transition"
              title="Download offline backup JSON file"
            >
              <FileDown className="w-4 h-4" />
              <span>অফলাইন ফাইল ডাউনলোড (.json)</span>
            </button>
          </div>

          {lastSyncTime && (
            <div className="text-center text-[11px] text-slate-400 font-mono">
              সর্বশেষ ক্লাউড সিঙ্ক: {new Date(lastSyncTime).toLocaleString()} (PIN: {syncPin || pinInput})
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
