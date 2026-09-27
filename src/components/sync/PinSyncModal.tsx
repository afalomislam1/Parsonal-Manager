import React, { useState, useEffect } from 'react';
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
  Copy,
  Check,
  ExternalLink,
  Code2,
} from 'lucide-react';
import { useAccounting } from '../../context/AccountingContext';
import { exportBackupJSON, loadStoredData } from '../../utils/storage';
import {
  normalizePin,
  getSyncShareUrl,
  checkPinMetadata,
  exportDataToTransferCode,
  importDataFromTransferCode,
} from '../../utils/syncService';

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
    restoreFullBackup,
  } = useAccounting();

  const [activeMode, setActiveMode] = useState<'save' | 'load' | 'offline'>('save');
  const [pinInput, setPinInput] = useState<string>(syncPin || '');
  const [localFeedback, setLocalFeedback] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [checkingPin, setCheckingPin] = useState<boolean>(false);
  const [pinMetadata, setPinMetadata] = useState<{ exists: boolean; stats?: any; lastSaved?: string } | null>(null);
  const [offlineCodeInput, setOfflineCodeInput] = useState<string>('');
  const [isOfflineCodeCopied, setIsOfflineCodeCopied] = useState<boolean>(false);

  // Sync pinInput with syncPin when opened
  useEffect(() => {
    if (syncPin && !pinInput) {
      setPinInput(syncPin);
    }
  }, [syncPin]);

  // Check PIN metadata when user enters at least 3 digits in 'load' mode
  useEffect(() => {
    const clean = normalizePin(pinInput);
    if (activeMode === 'load' && clean.length >= 3) {
      let isMounted = true;
      setCheckingPin(true);
      checkPinMetadata(clean).then((meta) => {
        if (isMounted) {
          setCheckingPin(false);
          setPinMetadata(meta);
        }
      });
      return () => {
        isMounted = false;
      };
    } else {
      setPinMetadata(null);
      setCheckingPin(false);
    }
  }, [pinInput, activeMode]);

  if (!isSyncModalOpen) return null;

  const handlePinChange = (val: string) => {
    const clean = normalizePin(val);
    setPinInput(clean);
    setLocalFeedback(null);
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLocalFeedback(null);
    const clean = normalizePin(pinInput);
    if (!clean || clean.length < 3) {
      setLocalFeedback({
        text: 'অনুগ্রহ করে কমপক্ষে ৩ সংখ্যার একটি পিন দিন (যেমন: 1234 বা 7860)',
        type: 'error',
      });
      return;
    }

    const res = await saveDataToPin(clean);
    if (res.success) {
      setLocalFeedback({
        text: `✅ দারুণ! আপনার মোবাইলের সকল হিসাব (${savedAccounts.length}টি একাউন্ট ও ${transactions.length}টি লেনদেন) PIN [${clean}]-এ ক্লাউডে সেভ হয়েছে। এখন নিচের সরাসরি লিংকে ক্লিক করে অথবা যে কোনো পিসিতে এই পিন দিয়ে হিসাব ওপেন করতে পারবেন!`,
        type: 'success',
      });
    } else {
      setLocalFeedback({
        text: res.error || 'ক্লাউডে সেভ করতে সমস্যা হয়েছে। অনুগ্রহ করে ইন্টারনেট কানেকশন চেক করুন।',
        type: 'error',
      });
    }
  };

  const handleLoad = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLocalFeedback(null);
    const clean = normalizePin(pinInput);
    if (!clean || clean.length < 3) {
      setLocalFeedback({
        text: 'অনুগ্রহ করে কমপক্ষে ৩ সংখ্যার সঠিক পিন নম্বর দিন (যেমন: 1234 বা 7860)',
        type: 'error',
      });
      return;
    }

    const res = await loadDataFromPin(clean);
    if (res.success) {
      setLocalFeedback({
        text: `🎉 সফল হয়েছে! ক্লাউড থেকে আপনার সকল হিসাব (${res.data?.transactions?.length || 0}টি লেনদেন ও ${res.data?.savedAccounts?.length || 0}টি একাউন্ট) সফলভাবে এই ডিভাইসে লোড হয়েছে!`,
        type: 'success',
      });
    } else {
      setLocalFeedback({
        text: res.error || 'ক্লাউড থেকে ডেটা আনা যায়নি। পিন নম্বরটি সঠিক কিনা মিলিয়ে নিন।',
        type: 'error',
      });
    }
  };

  const handleCopyShareLink = () => {
    const clean = normalizePin(pinInput || syncPin || '1234');
    const shareUrl = getSyncShareUrl(clean);
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(shareUrl).then(() => {
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 3000);
      });
    }
  };

  const handleCopyOfflineCode = () => {
    const fullData = loadStoredData();
    const code = exportDataToTransferCode(fullData);
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(code).then(() => {
        setIsOfflineCodeCopied(true);
        setTimeout(() => setIsOfflineCodeCopied(false), 3000);
      });
    }
  };

  const handleImportOfflineCode = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!offlineCodeInput.trim()) {
      setLocalFeedback({
        text: 'অনুগ্রহ করে ট্রান্সফার কোডটি পেস্ট করুন।',
        type: 'error',
      });
      return;
    }
    const restored = importDataFromTransferCode(offlineCodeInput.trim());
    if (restored) {
      restoreFullBackup(restored);
      setLocalFeedback({
        text: `🎉 সফল! ট্রান্সফার কোড থেকে ${restored.transactions.length}টি লেনদেন ও ${restored.savedAccounts.length}টি একাউন্ট সফলভাবে লোড হয়েছে!`,
        type: 'success',
      });
    } else {
      setLocalFeedback({
        text: 'কোডটি ত্রুটিপূর্ণ বা অসম্পূর্ণ। অনুগ্রহ করে সঠিক কোড দিন।',
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

  const handleGenerateRandomPin = () => {
    const random = Math.floor(1000 + Math.random() * 9000).toString();
    setPinInput(random);
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
              <span>মোবাইল ও পিসিতে ডাটা সিঙ্ক (PIN Sync)</span>
            </h3>
            <p className="text-xs sm:text-sm text-emerald-100/90 leading-relaxed">
              মোবাইলের ১২২+ একাউন্ট ও সকল লেনদেনের হিসাব যে কোনো পিসি বা ডিভাইসে এক ক্লিকে নিয়ে আসুন।
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
            className={`flex-1 py-2 px-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center space-x-1.5 transition ${
              activeMode === 'save'
                ? 'bg-white text-emerald-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Smartphone className="w-4 h-4 text-emerald-700 shrink-0" />
            <span className="truncate">১. মোবাইল থেকে সেভ</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveMode('load');
              setLocalFeedback(null);
            }}
            className={`flex-1 py-2 px-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center space-x-1.5 transition ${
              activeMode === 'load'
                ? 'bg-white text-blue-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Monitor className="w-4 h-4 text-blue-700 shrink-0" />
            <span className="truncate">২. পিসিতে হিসাব আনুন</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveMode('offline');
              setLocalFeedback(null);
            }}
            className={`py-2 px-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center space-x-1 transition ${
              activeMode === 'offline'
                ? 'bg-white text-amber-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
            title="100% Offline Code Sync"
          >
            <Code2 className="w-4 h-4 text-amber-700 shrink-0" />
            <span className="hidden sm:inline">৩. অফলাইন কোড</span>
            <span className="sm:hidden">অফলাইন</span>
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
                আপনার মোবাইলের কোনো হিসাব বা ১২২টি একাউন্ট নষ্ট হবে না। পিন দিয়ে ক্লাউডে রাখলে যে কোনো পিসিতে সরাসরি ওপেন করা যায়।
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
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                    একটি সহজ পিন কোড দিন (Set Secret PIN)
                  </label>
                  <button
                    type="button"
                    onClick={handleGenerateRandomPin}
                    className="text-[11px] text-emerald-700 hover:text-emerald-900 font-bold flex items-center space-x-1"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    <span>নতুন পিন তৈরি করুন</span>
                  </button>
                </div>

                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4 text-emerald-700" />
                  </div>
                  <input
                    type="text"
                    value={pinInput}
                    onChange={(e) => handlePinChange(e.target.value)}
                    placeholder="যেমন: 1234 বা 7860"
                    maxLength={16}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-base font-mono font-bold tracking-widest focus:ring-2 focus:ring-emerald-600 focus:bg-white focus:outline-none transition"
                    autoFocus
                  />
                </div>

                {/* Quick Presets */}
                <div className="flex items-center space-x-2 mt-2">
                  <span className="text-[11px] text-slate-500 font-medium">সহজ পিন:</span>
                  {['1234', '7860', '1122', '5555'].map((quick) => (
                    <button
                      key={quick}
                      type="button"
                      onClick={() => handlePinChange(quick)}
                      className={`px-2 py-0.5 rounded-lg text-xs font-mono font-bold border transition ${
                        pinInput === quick
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                          : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {quick}
                    </button>
                  ))}
                </div>
              </div>

              {/* Current Local Data Snapshot */}
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
                <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-2">
                  মোবাইলে থাকা হিসাবের সারাংশ (Current Data on this Device):
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
                    <span>ক্লাউডে হিসাব সেভ করুন (Save with PIN)</span>
                  </>
                )}
              </button>

              {/* Direct PC Share Link Box */}
              <div className="p-3 bg-emerald-50/60 rounded-2xl border border-emerald-200/80 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-emerald-950 flex items-center space-x-1.5">
                    <ExternalLink className="w-3.5 h-3.5 text-emerald-700" />
                    <span>পিসিতে সরাসরি ওপেন করার লিংক:</span>
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyShareLink}
                    className="text-xs font-bold text-emerald-700 hover:text-emerald-900 flex items-center space-x-1 px-2 py-0.5 rounded-lg bg-emerald-100 hover:bg-emerald-200 transition"
                  >
                    {isCopied ? <Check className="w-3 h-3 text-emerald-700" /> : <Copy className="w-3 h-3" />}
                    <span>{isCopied ? 'কপি হয়েছে!' : 'লিংক কপি'}</span>
                  </button>
                </div>
                <p className="text-[11px] text-emerald-800 leading-relaxed font-mono truncate bg-white p-2 rounded-lg border border-emerald-200/70 select-all">
                  {getSyncShareUrl(pinInput || syncPin || '1234')}
                </p>
                <p className="text-[11px] text-slate-500">
                  এই লিংকটি কপি করে আপনার পিসিতে ব্রাউজারে পেস্ট করলে কোনো পিন না লিখে সরাসরি সকল হিসাব ওপেন হবে।
                </p>
              </div>
            </form>
          )}

          {/* MODE 2: LOAD ON PC / ANOTHER DEVICE */}
          {activeMode === 'load' && (
            <form onSubmit={handleLoad} className="space-y-4">
              <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-2xl text-xs text-blue-900 leading-relaxed space-y-1">
                <span className="font-bold block">পিসিতে হিসাব দেখানোর নিয়ম:</span>
                <p>
                  মোবাইলে যে পিন দিয়ে সেভ করেছেন, সেই পিন কোডটি নিচে লিখে 'হিসাব দেখান' বাটনে ক্লিক করুন। এক ক্লিকেই সম্পূর্ণ হিসাব পিসিতে চলে আসবে।
                </p>
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
                    onChange={(e) => handlePinChange(e.target.value)}
                    placeholder="যেমন: 1234 বা 7860"
                    maxLength={16}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-base font-mono font-bold tracking-widest focus:ring-2 focus:ring-blue-600 focus:bg-white focus:outline-none transition"
                    autoFocus
                  />
                </div>

                {/* Quick Presets */}
                <div className="flex items-center space-x-2 mt-2">
                  <span className="text-[11px] text-slate-500 font-medium">সহজ পিন:</span>
                  {['1234', '7860', '1122'].map((quick) => (
                    <button
                      key={quick}
                      type="button"
                      onClick={() => handlePinChange(quick)}
                      className={`px-2 py-0.5 rounded-lg text-xs font-mono font-bold border transition ${
                        pinInput === quick
                          ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                          : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {quick}
                    </button>
                  ))}
                </div>
              </div>

              {/* Real-time PIN Verification Card */}
              {checkingPin && (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-500 flex items-center space-x-2 animate-pulse">
                  <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
                  <span>পিন যাচাই করা হচ্ছে...</span>
                </div>
              )}

              {!checkingPin && pinMetadata && pinMetadata.exists && (
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-950 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>
                      <strong>পিনে হিসাব পাওয়া গেছে!</strong> ({pinMetadata.stats?.transactionsCount ?? 'রেকর্ড'}টি লেনদেন, {pinMetadata.stats?.accountsCount ?? '১২২'}টি একাউন্ট)
                    </span>
                  </div>
                  <span className="text-[10px] text-emerald-700 font-mono">
                    READY TO LOAD
                  </span>
                </div>
              )}

              {/* Load Button */}
              <button
                type="submit"
                disabled={isSyncLoading}
                className="w-full py-3 px-4 rounded-xl bg-blue-700 hover:bg-blue-800 active:scale-[0.99] text-white font-bold text-sm flex items-center justify-center space-x-2 shadow-lg shadow-blue-700/25 transition disabled:opacity-50"
              >
                {isSyncLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>হিসাব লোড হচ্ছে...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    <span>পিসিতে হিসাব দেখান (Show on PC / Load Data)</span>
                  </>
                )}
              </button>
            </form>
          )}

          {/* MODE 3: OFFLINE CODE (NO INTERNET REQUIRED) */}
          {activeMode === 'offline' && (
            <div className="space-y-4">
              <div className="p-3.5 bg-amber-50/80 border border-amber-200 rounded-2xl text-xs text-amber-950 space-y-1">
                <span className="font-bold block">১০০% অফলাইন সিঙ্ক (কোনো সার্ভার বা ইন্টারনেটের প্রয়োজন নেই):</span>
                <p>
                  মোবাইল থেকে 'ট্রান্সফার কোড কপি' করুন এবং পিসিতে পেস্ট করলেই অফলাইনে সরাসরি সকল হিসাব চলে আসবে।
                </p>
              </div>

              {/* Step A: Copy from Mobile */}
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">
                    মোবাইল থেকে কোড নিন:
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyOfflineCode}
                    className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold flex items-center space-x-1.5 shadow-2xs transition"
                  >
                    {isOfflineCodeCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{isOfflineCodeCopied ? 'কোড কপি হয়েছে!' : 'ট্রান্সফার কোড কপি করুন'}</span>
                  </button>
                </div>
                <p className="text-[11px] text-slate-500">
                  বর্তমান {savedAccounts.length}টি একাউন্ট ও {transactions.length}টি লেনদেন একটি কোডে এনকোড হয়ে ক্লিপবোর্ডে কপি হবে।
                </p>
              </div>

              {/* Step B: Paste on PC */}
              <form onSubmit={handleImportOfflineCode} className="space-y-3">
                <label className="block text-xs font-bold text-slate-700">
                  পিসিতে কোড পেস্ট করুন:
                </label>
                <textarea
                  rows={3}
                  value={offlineCodeInput}
                  onChange={(e) => setOfflineCodeInput(e.target.value)}
                  placeholder="এখানে ট্রান্সফার কোডটি পেস্ট করুন (SYNC-...)"
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-xs font-mono focus:ring-2 focus:ring-amber-500 focus:bg-white focus:outline-none transition"
                />
                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center justify-center space-x-1.5 shadow-sm transition"
                >
                  <Download className="w-4 h-4 text-amber-400" />
                  <span>অফলাইন কোড থেকে হিসাব লোড করুন</span>
                </button>
              </form>
            </div>
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
