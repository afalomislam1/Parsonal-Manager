import React, { useState, useMemo } from 'react';
import {
  ArrowDownLeft,
  Plus,
  Save,
  RotateCcw,
  CheckCircle,
  AlertCircle,
  Building,
  Trash2,
  Edit2,
  Landmark,
  Layers,
  ArrowUpRight,
  TrendingDown,
  TrendingUp,
  Calculator,
  Check,
  Building2,
  Wallet,
} from 'lucide-react';
import { useAccounting } from '../../context/AccountingContext';
import {
  computeDepositBDT,
  computeDepositUSD,
  cleanNumericInput,
  formatBDT,
  formatDate,
  formatUSD,
  getTodayDateString,
  roundTo,
} from '../../utils/calculations';
import { DepositRecord } from '../../types';
import { ConfirmDeleteModal } from '../modals/ConfirmDeleteModal';
import { EditDepositModal } from '../modals/EditDepositModal';

export function DepositView() {
  const {
    deposits,
    createDeposit,
    updateDeposit,
    deleteDeposit,
    totalDepositedUsd,
    totalDepositedBdt,
    totalSentUsd,
    remainingUsdBalance,
    sourceLedger,
    settings,
  } = useAccounting();

  // Mode: 'bdt-first' (User types Taka BDT & Rate -> Auto computes USD) or 'usd-first'
  const [calcMode, setCalcMode] = useState<'bdt-first' | 'usd-first'>('bdt-first');

  // Form inputs
  const [date, setDate] = useState<string>(getTodayDateString());
  const [senderName, setSenderName] = useState<string>('Kaka');
  const [bdtAmountInput, setBdtAmountInput] = useState<string>('');
  const [usdAmountInput, setUsdAmountInput] = useState<string>('');
  const [receivingRate, setReceivingRate] = useState<string>(
    settings.defaultDollarRate ? String(settings.defaultDollarRate) : '125'
  );
  const [receivingMethod, setReceivingMethod] = useState<string>('Islami Bank Bangladesh');
  const [note, setNote] = useState<string>('');

  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Edit / Delete states
  const [editingDeposit, setEditingDeposit] = useState<DepositRecord | null>(null);
  const [deletingDepositId, setDeletingDepositId] = useState<string | null>(null);

  // Quick selectable popular receiving banks (specifically requested by user)
  const popularBanks = [
    'Islami Bank Bangladesh',
    'Southeast Bank',
    'IFIC Bank',
    'Bank Asia',
    'Dutch-Bangla Bank',
    'City Bank',
  ];

  // Bank stats for Kaka's incoming funds
  const kakaBankStats = useMemo(() => {
    const kakaDeps = deposits.filter((d) => {
      const s = (d.senderName || '').toLowerCase();
      return s.includes('kaka') || s.includes('humaiun');
    });
    const targetDeps = kakaDeps.length > 0 ? kakaDeps : deposits;

    const islamiList = targetDeps.filter((d) => (d.receivingMethod || '').toLowerCase().includes('islami'));
    const southeastList = targetDeps.filter((d) => (d.receivingMethod || '').toLowerCase().includes('southeast'));
    const ificList = targetDeps.filter((d) => (d.receivingMethod || '').toLowerCase().includes('ific'));
    const othersList = targetDeps.filter((d) => {
      const m = (d.receivingMethod || '').toLowerCase();
      return !m.includes('islami') && !m.includes('southeast') && !m.includes('ific');
    });

    const sumGroup = (list: DepositRecord[]) => ({
      count: list.length,
      bdt: list.reduce((acc, d) => acc + d.bdtAmount, 0),
      usd: list.reduce((acc, d) => acc + d.usdAmount, 0),
    });

    return {
      islami: sumGroup(islamiList),
      southeast: sumGroup(southeastList),
      ific: sumGroup(ificList),
      others: sumGroup(othersList),
      total: sumGroup(targetDeps),
    };
  }, [deposits]);

  // Calculations
  const numRate = parseFloat(receivingRate) || 0;
  const numBdt = parseFloat(bdtAmountInput) || 0;
  const numUsd = parseFloat(usdAmountInput) || 0;

  // Derive calculated amounts based on mode
  let finalUsd = 0;
  let finalBdt = 0;

  if (calcMode === 'bdt-first') {
    finalBdt = numBdt;
    finalUsd = numRate > 0 ? computeDepositUSD(numBdt, numRate) : 0;
  } else {
    finalUsd = numUsd;
    finalBdt = numRate > 0 ? computeDepositBDT(numUsd, numRate) : 0;
  }

  // Handlers for inputs with numeric keyboard and Bengali numeral conversion
  const handleBdtChange = (val: string) => {
    const cleaned = cleanNumericInput(val);
    setBdtAmountInput(cleaned);
    setCalcMode('bdt-first');
    const parsedBdt = parseFloat(cleaned) || 0;
    if (numRate > 0 && parsedBdt > 0) {
      setUsdAmountInput(String(roundTo(parsedBdt / numRate, 2)));
    } else {
      setUsdAmountInput('');
    }
  };

  const handleRateChange = (val: string) => {
    const cleaned = cleanNumericInput(val);
    setReceivingRate(cleaned);
    const parsedRate = parseFloat(cleaned) || 0;
    if (parsedRate > 0) {
      if (calcMode === 'bdt-first' && numBdt > 0) {
        setUsdAmountInput(String(roundTo(numBdt / parsedRate, 2)));
      } else if (calcMode === 'usd-first' && numUsd > 0) {
        setBdtAmountInput(String(roundTo(numUsd * parsedRate, 2)));
      }
    }
  };

  const handleUsdChange = (val: string) => {
    const cleaned = cleanNumericInput(val);
    setUsdAmountInput(cleaned);
    setCalcMode('usd-first');
    const parsedUsd = parseFloat(cleaned) || 0;
    if (numRate > 0 && parsedUsd > 0) {
      setBdtAmountInput(String(roundTo(parsedUsd * numRate, 2)));
    } else {
      setBdtAmountInput('');
    }
  };

  const handleReset = () => {
    setDate(getTodayDateString());
    setSenderName('Kaka');
    setBdtAmountInput('');
    setUsdAmountInput('');
    setReceivingRate(settings.defaultDollarRate ? String(settings.defaultDollarRate) : '125');
    setReceivingMethod('Islami Bank Bangladesh');
    setNote('');
    setCalcMode('bdt-first');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!senderName.trim()) {
      setErrorMessage('অনুগ্রহ করে প্রেরক বা ফান্ডের সোর্স নাম দিন (Sender name is required)');
      return;
    }

    if (finalUsd <= 0 || finalBdt <= 0) {
      setErrorMessage('অনুগ্রহ করে সঠিক টাকার পরিমাণ দিন (Enter a valid amount)');
      return;
    }

    if (numRate <= 0) {
      setErrorMessage('অনুগ্রহ করে সঠিক ডলার রেট দিন (Enter a valid rate)');
      return;
    }

    if (!receivingMethod.trim()) {
      setErrorMessage('ব্যাংক বা জমা মাধ্যম নির্বাচন করুন (Select receiving bank)');
      return;
    }

    try {
      const dep = createDeposit({
        date,
        senderName: senderName.trim(),
        usdAmount: finalUsd,
        receivingRate: numRate,
        receivingMethod: receivingMethod.trim(),
        note: note.trim(),
      });

      setSuccessMessage(
        `✅ সফল হয়েছে! ${senderName}-এর থেকে জমা: ৳${formatBDT(finalBdt)} @ ৳${numRate} = মোট ${formatUSD(finalUsd)} USD ফান্ডে যুক্ত হয়েছে (ID: ${dep.id})`
      );
      handleReset();
    } catch {
      setErrorMessage('জমা সেভ করতে সমস্যা হয়েছে। দয়া করে ইনপুট চেক করুন।');
    }
  };

  return (
    <div className="space-y-5">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Deposit / Joma (টাকা জমা ও ডলার হিসাব)
            </h2>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
              Incoming Funds
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            কাকা বা সোর্স থেকে ব্যাংকে আসা টাকার পরিমাণ ও রেট লিখে স্বয়ংক্রিয়ভাবে মোট জমা ডলার হিসাব করুন।
          </p>
        </div>
      </div>

      {/* Prominent USD Balance & Fund Summary Cards (Professional Clean White) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        <div className="bg-white text-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              বর্তমান অবশিষ্ট ডলার (Running USD Balance)
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 font-mono">
              জমা - পাঠানো
            </span>
          </div>
          <div className="my-2">
            <div className="text-2xl sm:text-3xl font-mono font-bold text-emerald-700">
              {formatUSD(remainingUsdBalance)}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              মোট জমা: <span className="font-semibold text-slate-800">{formatUSD(totalDepositedUsd)}</span> • মোট পাঠানো: <span className="font-semibold text-slate-800">{formatUSD(totalSentUsd)}</span>
            </p>
          </div>
          <div className="text-[11px] text-slate-500 font-mono">
            BDT সমমূল্য (@ ৳{numRate || 125} রেট): ≈ {formatBDT(remainingUsdBalance * (numRate || 125))}
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-600">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              মোট প্রাপ্ত ডলার (Total USD Received)
            </span>
            <ArrowDownLeft className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="my-2">
            <div className="text-2xl font-mono font-bold text-slate-900">
              {formatUSD(totalDepositedUsd)}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              মোট বিডিটি টাকা: <span className="font-mono font-bold text-slate-800">{formatBDT(totalDepositedBdt)}</span>
            </p>
          </div>
          <span className="text-[11px] text-slate-400 font-medium">
            সর্বমোট {deposits.length}টি জমা এন্ট্রি
          </span>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-600">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              মোট পাঠানো হয়েছে (Total USD Sent)
            </span>
            <ArrowUpRight className="w-4 h-4 text-blue-600" />
          </div>
          <div className="my-2">
            <div className="text-2xl font-mono font-bold text-slate-900">
              {formatUSD(totalSentUsd)}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              ফান্ড ব্যবহার: <span className="font-mono font-bold text-slate-800">
                {totalDepositedUsd > 0 ? `${roundTo((totalSentUsd / totalDepositedUsd) * 100, 1)}%` : '0%'}
              </span>
            </p>
          </div>
          <span className="text-[11px] text-slate-400 font-medium">
            গ্রাহকদের একাউন্টে পাঠানো পে-আউট
          </span>
        </div>
      </div>

      {/* Kaka's Bank Deposits Breakdown Overview (Specifically for Islami, Southeast, IFIC & Other Banks) */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 pb-2.5 border-b border-slate-100">
          <div className="flex items-center space-x-2">
            <Landmark className="w-4 h-4 text-emerald-700" />
            <h3 className="text-sm font-bold text-slate-900">
              কাকার ব্যাংকভিত্তিক জমার হিসাব (Kaka's Bank Deposit Breakdown)
            </h3>
          </div>
          <span className="text-xs text-slate-500 font-mono">
            সর্বমোট কাকার জমা: <span className="font-bold text-emerald-800">{formatUSD(kakaBankStats.total.usd)}</span> ({formatBDT(kakaBankStats.total.bdt)})
          </span>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Islami Bank */}
          <div
            onClick={() => setReceivingMethod('Islami Bank Bangladesh')}
            className={`p-3 rounded-xl border transition cursor-pointer text-left ${
              receivingMethod.toLowerCase().includes('islami')
                ? 'bg-emerald-50/70 border-emerald-400 ring-1 ring-emerald-300'
                : 'bg-slate-50/70 border-slate-200/80 hover:bg-slate-100/70'
            }`}
          >
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-700">
              <span>ইসলামী ব্যাংক (Islami)</span>
              <span className="font-mono text-[10px] text-emerald-700 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                {kakaBankStats.islami.count} টি
              </span>
            </div>
            <div className="text-lg font-bold font-mono text-emerald-700 mt-1">
              {formatUSD(kakaBankStats.islami.usd)}
            </div>
            <div className="text-[11px] text-slate-500 font-mono mt-0.5">
              {formatBDT(kakaBankStats.islami.bdt)}
            </div>
          </div>

          {/* Southeast Bank */}
          <div
            onClick={() => setReceivingMethod('Southeast Bank')}
            className={`p-3 rounded-xl border transition cursor-pointer text-left ${
              receivingMethod.toLowerCase().includes('southeast')
                ? 'bg-emerald-50/70 border-emerald-400 ring-1 ring-emerald-300'
                : 'bg-slate-50/70 border-slate-200/80 hover:bg-slate-100/70'
            }`}
          >
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-700">
              <span>সাউথইস্ট ব্যাংক (Southeast)</span>
              <span className="font-mono text-[10px] text-emerald-700 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                {kakaBankStats.southeast.count} টি
              </span>
            </div>
            <div className="text-lg font-bold font-mono text-emerald-700 mt-1">
              {formatUSD(kakaBankStats.southeast.usd)}
            </div>
            <div className="text-[11px] text-slate-500 font-mono mt-0.5">
              {formatBDT(kakaBankStats.southeast.bdt)}
            </div>
          </div>

          {/* IFIC Bank */}
          <div
            onClick={() => setReceivingMethod('IFIC Bank')}
            className={`p-3 rounded-xl border transition cursor-pointer text-left ${
              receivingMethod.toLowerCase().includes('ific')
                ? 'bg-emerald-50/70 border-emerald-400 ring-1 ring-emerald-300'
                : 'bg-slate-50/70 border-slate-200/80 hover:bg-slate-100/70'
            }`}
          >
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-700">
              <span>আইএফআইসি ব্যাংক (IFIC)</span>
              <span className="font-mono text-[10px] text-emerald-700 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                {kakaBankStats.ific.count} টি
              </span>
            </div>
            <div className="text-lg font-bold font-mono text-emerald-700 mt-1">
              {formatUSD(kakaBankStats.ific.usd)}
            </div>
            <div className="text-[11px] text-slate-500 font-mono mt-0.5">
              {formatBDT(kakaBankStats.ific.bdt)}
            </div>
          </div>

          {/* Other Banks */}
          <div
            className="p-3 rounded-xl border bg-slate-50/70 border-slate-200/80 text-left"
          >
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-700">
              <span>অন্যান্য ব্যাংক (Others)</span>
              <span className="font-mono text-[10px] text-slate-600 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                {kakaBankStats.others.count} টি
              </span>
            </div>
            <div className="text-lg font-bold font-mono text-slate-900 mt-1">
              {formatUSD(kakaBankStats.others.usd)}
            </div>
            <div className="text-[11px] text-slate-500 font-mono mt-0.5">
              {formatBDT(kakaBankStats.others.bdt)}
            </div>
          </div>
        </div>
      </div>

      {/* New Deposit Form: Enhanced for Kaka's Bank Deposits & Rate Calculation */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-3 border-b border-slate-200 mb-4 gap-2">
          <div className="flex items-center space-x-2">
            <ArrowDownLeft className="w-5 h-5 text-emerald-700" />
            <h3 className="text-base font-bold text-slate-900">
              কাকার জমা হিসাব যুক্ত করুন (Record New Deposit)
            </h3>
          </div>

          {/* Mode Switcher */}
          <div className="inline-flex p-1 bg-slate-100 rounded-xl text-xs font-semibold">
            <button
              type="button"
              onClick={() => setCalcMode('bdt-first')}
              className={`px-3 py-1 rounded-lg transition ${
                calcMode === 'bdt-first'
                  ? 'bg-white text-emerald-900 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              টাকা (BDT) লিখে ডলার বের করুন
            </button>
            <button
              type="button"
              onClick={() => setCalcMode('usd-first')}
              className={`px-3 py-1 rounded-lg transition ${
                calcMode === 'usd-first'
                  ? 'bg-white text-emerald-900 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              ডলার ($) লিখে টাকা বের করুন
            </button>
          </div>
        </div>

        {successMessage && (
          <div className="p-3.5 mb-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-950 flex items-center space-x-2 text-xs font-semibold animate-fade-in">
            <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {errorMessage && (
          <div className="p-3.5 mb-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-950 flex items-center space-x-2 text-xs font-semibold animate-fade-in">
            <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Row 1: Date & Sender Source */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5 items-end">
            <div className="sm:col-span-4">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                তারিখ (Deposit Date) <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                id="input-dep-date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 font-medium focus:ring-2 focus:ring-emerald-600 focus:bg-white"
              />
            </div>

            <div className="sm:col-span-8">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                ফান্ড প্রেরক / সোর্স (Sender / Source) <span className="text-rose-500">*</span>
              </label>
              <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                {settings.references.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setSenderName(r)}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold border transition ${
                      senderName === r
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
              <input
                type="text"
                id="input-dep-sender"
                placeholder="বা নতুন প্রেরকের নাম লিখুন (e.g. Kaka, Dubai Partner...)"
                value={senderName}
                onChange={(e) => setSenderName(e.target.value)}
                required
                className="w-full px-3 py-1.5 rounded-xl border border-slate-300 text-xs text-slate-900 focus:ring-2 focus:ring-emerald-600"
              />
            </div>
          </div>

          {/* Row 2: Bank Selection (Featuring Islami, Southeast, IFIC & others) */}
          <div className="p-3.5 bg-slate-50/80 rounded-2xl border border-slate-200/80 space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                টাকা জমার ব্যাংক / একাউন্ট (Receiving Bank / Channel) <span className="text-rose-500">*</span>
              </label>
              <span className="text-[11px] text-slate-500">
                যে ব্যাংকে কাকা টাকা পাঠিয়েছেন
              </span>
            </div>

            {/* Quick 1-Click Bank Chips (Specifically featuring Islami, Southeast, IFIC) */}
            <div className="flex flex-wrap gap-1.5">
              {popularBanks.map((bank) => {
                const isSelected = receivingMethod.toLowerCase().includes(bank.toLowerCase());
                const isPriorityBank = bank.includes('Islami') || bank.includes('Southeast') || bank.includes('IFIC');
                return (
                  <button
                    key={bank}
                    type="button"
                    onClick={() => setReceivingMethod(bank)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center space-x-1.5 border transition ${
                      isSelected
                        ? 'bg-emerald-700 text-white border-emerald-700 shadow-2xs font-bold'
                        : isPriorityBank
                        ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900 hover:bg-emerald-100 font-bold'
                        : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <Building2 className={`w-3.5 h-3.5 ${isSelected ? 'text-emerald-200' : isPriorityBank ? 'text-emerald-700' : 'text-slate-400'}`} />
                    <span>{bank}</span>
                    {isSelected && <Check className="w-3 h-3 text-white ml-0.5" />}
                  </button>
                );
              })}
            </div>

            {/* Or Select from Full Bank Dropdown */}
            <div className="pt-1 flex items-center gap-2">
              <select
                id="select-dep-bank-dropdown"
                value={receivingMethod}
                onChange={(e) => setReceivingMethod(e.target.value)}
                className="flex-1 px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-emerald-600"
              >
                {settings.banks.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 3: Financial Calculations with Decimal Number Keyboard & Presets */}
          <div className="p-4 bg-emerald-50/30 rounded-2xl border border-emerald-200/70 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5 items-end">
              {/* Field 1: BDT Taka Amount */}
              <div className="sm:col-span-5">
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                    টাকার পরিমাণ (BDT Amount ৳) <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-[10px] text-emerald-800 font-semibold">Numbers Keyboard</span>
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-400 font-bold text-sm">৳</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    pattern="[0-9]*[.]?[0-9]*"
                    autoComplete="off"
                    id="input-dep-bdt"
                    placeholder="যেমন: 500000 বা 1250000"
                    value={bdtAmountInput}
                    onChange={(e) => handleBdtChange(e.target.value)}
                    required={calcMode === 'bdt-first'}
                    className={`w-full pl-8 pr-3 py-2.5 rounded-xl border text-slate-900 text-base font-mono font-bold focus:ring-2 focus:ring-emerald-600 focus:outline-none transition ${
                      calcMode === 'bdt-first'
                        ? 'bg-white border-emerald-400 shadow-2xs ring-1 ring-emerald-300'
                        : 'bg-slate-50 border-slate-300'
                    }`}
                  />
                </div>
                {/* Quick Taka Amount Chips */}
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {[500000, 1000000, 1250000, 1500000, 2000000].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => handleBdtChange(String(amt))}
                      className="px-2 py-0.5 rounded-md bg-white hover:bg-emerald-50 text-[10px] font-mono font-semibold text-slate-700 border border-slate-200 transition"
                    >
                      ৳{(amt / 100000).toFixed(amt % 100000 === 0 ? 0 : 2)}L
                    </button>
                  ))}
                </div>
              </div>

              {/* Field 2: Receiving Dollar Rate */}
              <div className="sm:col-span-3">
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                    ডলার রেট (Rate ৳) <span className="text-rose-500">*</span>
                  </label>
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-400 font-bold text-sm">৳</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    pattern="[0-9]*[.]?[0-9]*"
                    autoComplete="off"
                    id="input-dep-rate"
                    placeholder="125"
                    value={receivingRate}
                    onChange={(e) => handleRateChange(e.target.value)}
                    required
                    className="w-full pl-8 pr-3 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 text-base font-mono font-bold focus:ring-2 focus:ring-emerald-600 focus:outline-none transition"
                  />
                </div>
                {/* Quick Rate Chips */}
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {['122', '123', '124', '125', '126'].map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => handleRateChange(r)}
                      className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-semibold border transition ${
                        receivingRate === r
                          ? 'bg-emerald-700 text-white border-emerald-700'
                          : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              {/* Field 3: USD Amount ($) */}
              <div className="sm:col-span-4">
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                    মোট জমা ডলার (USD Amount $) <span className="text-rose-500">*</span>
                  </label>
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-400 font-bold text-sm">$</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    pattern="[0-9]*[.]?[0-9]*"
                    autoComplete="off"
                    id="input-dep-usd"
                    placeholder="4000"
                    value={usdAmountInput}
                    onChange={(e) => handleUsdChange(e.target.value)}
                    required={calcMode === 'usd-first'}
                    className={`w-full pl-8 pr-3 py-2.5 rounded-xl border text-slate-900 text-base font-mono font-bold focus:ring-2 focus:ring-emerald-600 focus:outline-none transition ${
                      calcMode === 'usd-first'
                        ? 'bg-white border-emerald-400 shadow-2xs ring-1 ring-emerald-300'
                        : 'bg-emerald-50/70 border-emerald-300'
                    }`}
                  />
                </div>
                <span className="text-[10px] text-emerald-800 font-semibold mt-1.5 block">
                  {calcMode === 'bdt-first' ? 'স্বয়ংক্রিয়ভাবে হিসাবকৃত (টাকা ÷ রেট)' : 'সরাসরি ডলার লিখুন'}
                </span>
              </div>
            </div>

            {/* Live Calculation Result Highlight (Professional Clean White & Emerald) */}
            <div className="mt-3 p-4 sm:p-5 bg-white rounded-2xl border-2 border-emerald-500/60 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-3 text-slate-900 animate-fade-in">
              <div className="flex items-start sm:items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-200">
                  <Calculator className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[11px] text-slate-500 block uppercase font-bold tracking-wider">
                    সেই রেটের উপরে মোট কত ডলার জমা হয়েছে (Total USD Credited):
                  </span>
                  <div className="text-2xl sm:text-3xl font-mono font-bold text-emerald-700 flex flex-wrap items-baseline gap-2 mt-0.5">
                    <span>{formatUSD(finalUsd)}</span>
                    <span className="text-xs font-normal text-slate-500 font-sans">
                      ({formatBDT(finalBdt)} @ ৳{numRate || 0} রেটে)
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 text-xs font-mono space-y-1 md:text-right">
                {finalBdt > 0 && numRate > 0 ? (
                  <>
                    <div className="text-slate-800 font-bold">
                      হিসাব: ৳{formatBDT(finalBdt).replace('৳', '')} ÷ ৳{numRate} = <span className="text-emerald-700">{formatUSD(finalUsd)}</span>
                    </div>
                    <div className="text-[11px] text-slate-500 font-sans">
                      ব্যাংক: <span className="font-semibold text-slate-700">{receivingMethod}</span> • সোর্স: <span className="font-semibold text-slate-700">{senderName}</span>
                    </div>
                  </>
                ) : (
                  <div className="text-slate-500 font-sans text-xs">
                    টাকার পরিমাণ ও ডলার রেট লিখলে মোট জমা ডলার এখানে সরাসরি হিসাব হবে।
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Row 4: Optional Note & Submission */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              নোট বা বিবরণ (Optional Note)
            </label>
            <input
              type="text"
              id="input-dep-note"
              placeholder="যেমন: কাকার পাঠানো ফান্ড, স্লিপ বা ট্রাঞ্চ নম্বর..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 focus:ring-2 focus:ring-emerald-600"
            />
          </div>

          <div className="pt-2 flex items-center justify-between border-t border-slate-100">
            <button
              type="button"
              id="btn-dep-reset"
              onClick={handleReset}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 flex items-center transition"
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1.5" /> রিসেট (Reset)
            </button>

            <button
              type="submit"
              id="btn-dep-submit"
              className="px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 active:scale-[0.99] text-white text-xs font-bold flex items-center space-x-2 shadow-md shadow-emerald-700/20 transition"
            >
              <Save className="w-4 h-4" />
              <span>জমা রেকর্ড সংরক্ষণ করুন (Save Deposit)</span>
            </button>
          </div>
        </form>
      </div>

      {/* Source Ledger Section */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-200">
          <div className="flex items-center space-x-2">
            <Landmark className="w-5 h-5 text-emerald-700" />
            <h3 className="text-base font-bold text-slate-900">Source / Sender Ledger (সোর্স লেজার)</h3>
          </div>
          <span className="text-xs text-slate-500 font-medium">
            Aggregated by incoming funding source
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
                <th className="py-2.5 px-3">Source Name</th>
                <th className="py-2.5 px-3 text-right">Total USD Received</th>
                <th className="py-2.5 px-3 text-right">Average Rate</th>
                <th className="py-2.5 px-3 text-right">Total BDT Value</th>
                <th className="py-2.5 px-3 text-center">Deposits Count</th>
                <th className="py-2.5 px-3 text-right">Last Deposit Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sourceLedger.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-4 text-center text-slate-400">
                    No source ledger data recorded yet.
                  </td>
                </tr>
              ) : (
                sourceLedger.map((s) => (
                  <tr key={s.sourceName} className="hover:bg-slate-50">
                    <td className="py-3 px-3 font-bold text-slate-900 text-sm">
                      {s.sourceName}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-emerald-900 text-sm">
                      {formatUSD(s.totalUsdReceived)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-slate-600">
                      ৳{s.averageRate.toFixed(2)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                      {formatBDT(s.totalBdtValue)}
                    </td>
                    <td className="py-3 px-3 text-center font-mono font-semibold">
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                        {s.depositCount}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right font-medium text-slate-500">
                      {formatDate(s.lastDepositDate)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Deposit Records History: Mobile Cards (<md) + Desktop Table (>=md) */}
      
      {/* Mobile Card List (< md) */}
      <div className="md:hidden space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-sm font-bold text-slate-900">Deposit History Records (জমা তালিকা)</h3>
          <span className="text-xs text-slate-500 font-mono">{deposits.length} Records</span>
        </div>

        {deposits.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-6 text-center text-slate-400 text-xs">
            এখনো কোনো জমা রেকর্ড যোগ করা হয়নি।
          </div>
        ) : (
          deposits.map((dep) => (
            <div
              key={dep.id}
              className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-900">
                    {dep.id}
                  </span>
                  <span className="text-xs text-slate-500 font-medium">{formatDate(dep.date)}</span>
                </div>
                <span className="text-xs font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded">
                  {dep.senderName}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-100 text-xs">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">USD Received (মোট ডলার)</span>
                  <span className="font-mono font-bold text-emerald-900 text-sm">
                    {formatUSD(dep.usdAmount)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Rate (রেট)</span>
                  <span className="font-mono font-bold text-slate-800 text-sm">
                    ৳{dep.receivingRate}
                  </span>
                </div>
                <div className="col-span-2 pt-1 border-t border-slate-200/60 flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold text-slate-500">মোট টাকা (BDT Amount)</span>
                  <span className="font-mono font-bold text-slate-900 text-sm">
                    {formatBDT(dep.bdtAmount)}
                  </span>
                </div>
              </div>

              <div className="text-xs text-slate-600">
                <span className="text-slate-400">Bank: </span>
                <span className="font-semibold text-slate-800">{dep.receivingMethod}</span>
                {dep.note && (
                  <p className="text-[11px] text-slate-500 italic mt-0.5">নোট: {dep.note}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingDeposit(dep)}
                  className="min-h-[44px] px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold flex items-center justify-center space-x-1.5 transition active:scale-95"
                >
                  <Edit2 className="w-3.5 h-3.5 text-slate-600" />
                  <span>Edit (এডিট)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDeletingDepositId(dep.id)}
                  className="min-h-[44px] px-3 py-2 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold flex items-center justify-center space-x-1.5 transition active:scale-95"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                  <span>Delete (মুছে ফেলুন)</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Deposit Records History Table (hidden on mobile, visible on md+) */}
      <div className="hidden md:block bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900">Deposit History Records (জমা তালিকা)</h3>
          <span className="text-xs text-slate-500 font-mono">
            {deposits.length} Records
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
                <th className="py-2.5 px-3">তারিখ (Date)</th>
                <th className="py-2.5 px-3">DEP ID</th>
                <th className="py-2.5 px-3">সোর্স (Source)</th>
                <th className="py-2.5 px-3 text-right">মোট টাকা (BDT)</th>
                <th className="py-2.5 px-3 text-right">রেট (Rate)</th>
                <th className="py-2.5 px-3 text-right">মোট জমা ডলার (USD)</th>
                <th className="py-2.5 px-3">জমা ব্যাংক (Bank / Channel)</th>
                <th className="py-2.5 px-3">নোট (Note)</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {deposits.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    এখনো কোনো জমা রেকর্ড যোগ করা হয়নি।
                  </td>
                </tr>
              ) : (
                deposits.map((dep) => (
                  <tr key={dep.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-3 font-medium text-slate-700 whitespace-nowrap">
                      {formatDate(dep.date)}
                    </td>
                    <td className="py-3 px-3 font-mono font-bold text-slate-900 whitespace-nowrap">
                      {dep.id}
                    </td>
                    <td className="py-3 px-3 font-bold text-slate-900">
                      {dep.senderName}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                      {formatBDT(dep.bdtAmount)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-slate-600 whitespace-nowrap">
                      ৳{dep.receivingRate}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-emerald-900 whitespace-nowrap">
                      {formatUSD(dep.usdAmount)}
                    </td>
                    <td className="py-3 px-3 font-semibold text-slate-800 whitespace-nowrap">
                      {dep.receivingMethod}
                    </td>
                    <td className="py-3 px-3 text-slate-500 italic max-w-xs truncate">
                      {dep.note || '-'}
                    </td>
                    <td className="py-3 px-3 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end space-x-1">
                        <button
                          id={`btn-edit-dep-${dep.id}`}
                          onClick={() => setEditingDeposit(dep)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
                          title="Edit deposit"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          id={`btn-delete-dep-${dep.id}`}
                          onClick={() => setDeletingDepositId(dep.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                          title="Delete deposit"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Deposit Modal */}
      {editingDeposit && (
        <EditDepositModal
          deposit={editingDeposit}
          onClose={() => setEditingDeposit(null)}
        />
      )}

      {/* Delete Modal */}
      {deletingDepositId && (
        <ConfirmDeleteModal
          title="Delete Deposit Record"
          message="Are you sure you want to delete this deposit? This will reduce the running USD balance accordingly."
          itemId={deletingDepositId}
          onConfirm={() => deleteDeposit(deletingDepositId)}
          onClose={() => setDeletingDepositId(null)}
        />
      )}
    </div>
  );
}
