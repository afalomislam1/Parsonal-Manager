import React, { useState } from 'react';
import { X, Save, AlertCircle, Calculator, Building2, Check } from 'lucide-react';
import { DepositRecord } from '../../types';
import { useAccounting } from '../../context/AccountingContext';
import {
  computeDepositBDT,
  computeDepositUSD,
  cleanNumericInput,
  formatBDT,
  formatUSD,
  roundTo,
} from '../../utils/calculations';

interface EditDepositModalProps {
  deposit: DepositRecord;
  onClose: () => void;
}

export function EditDepositModal({ deposit, onClose }: EditDepositModalProps) {
  const { updateDeposit, settings } = useAccounting();

  const [date, setDate] = useState<string>(deposit.date);
  const [senderName, setSenderName] = useState<string>(deposit.senderName);
  const [bdtAmountInput, setBdtAmountInput] = useState<string>(String(deposit.bdtAmount));
  const [usdAmountInput, setUsdAmountInput] = useState<string>(String(deposit.usdAmount));
  const [receivingRate, setReceivingRate] = useState<string>(String(deposit.receivingRate));
  const [receivingMethod, setReceivingMethod] = useState<string>(deposit.receivingMethod);
  const [note, setNote] = useState<string>(deposit.note || '');
  const [error, setError] = useState<string | null>(null);

  const popularBanks = [
    'Islami Bank Bangladesh',
    'Southeast Bank',
    'IFIC Bank',
    'Bank Asia',
    'Dutch-Bangla Bank',
    'City Bank',
  ];

  const numRate = parseFloat(receivingRate) || 0;
  const numBdt = parseFloat(bdtAmountInput) || 0;
  const numUsd = parseFloat(usdAmountInput) || 0;

  const handleBdtChange = (val: string) => {
    const cleaned = cleanNumericInput(val);
    setBdtAmountInput(cleaned);
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
    if (parsedRate > 0 && numBdt > 0) {
      setUsdAmountInput(String(roundTo(numBdt / parsedRate, 2)));
    }
  };

  const handleUsdChange = (val: string) => {
    const cleaned = cleanNumericInput(val);
    setUsdAmountInput(cleaned);
    const parsedUsd = parseFloat(cleaned) || 0;
    if (numRate > 0 && parsedUsd > 0) {
      setBdtAmountInput(String(roundTo(parsedUsd * numRate, 2)));
    } else {
      setBdtAmountInput('');
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!senderName.trim()) {
      setError('প্রেরক বা সোর্সের নাম আবশ্যক (Sender name is required)');
      return;
    }
    if (numUsd <= 0 || numRate <= 0) {
      setError('সঠিক টাকার পরিমাণ ও রেট দিন (Must be greater than 0)');
      return;
    }

    updateDeposit(deposit.id, {
      date,
      senderName: senderName.trim(),
      usdAmount: numUsd,
      receivingRate: numRate,
      receivingMethod: receivingMethod.trim(),
      note: note.trim() || undefined,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full p-5 sm:p-6 space-y-4 my-8">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900">
              জমা রেকর্ড এডিট করুন (Edit Deposit {deposit.id})
            </h3>
            <p className="text-xs text-slate-500">
              টাকা, রেট ও মোট জমা ডলার পরিবর্তন করুন।
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                তারিখ (Date)
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 focus:ring-2 focus:ring-emerald-600"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                সোর্স / প্রেরক (Sender)
              </label>
              <input
                type="text"
                list="deposit-edit-sources"
                value={senderName}
                onChange={(e) => setSenderName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 focus:ring-2 focus:ring-emerald-600"
                required
              />
              <datalist id="deposit-edit-sources">
                {settings.references.map((r) => (
                  <option key={r} value={r} />
                ))}
              </datalist>
            </div>
          </div>

          {/* Bank Quick Chips */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
            <label className="block text-xs font-bold text-slate-700">
              জমা ব্যাংক (Bank / Channel)
            </label>
            <div className="flex flex-wrap gap-1">
              {popularBanks.map((b) => {
                const isSelected = receivingMethod.toLowerCase().includes(b.toLowerCase());
                return (
                  <button
                    key={b}
                    type="button"
                    onClick={() => setReceivingMethod(b)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition ${
                      isSelected
                        ? 'bg-emerald-700 text-white border-emerald-700'
                        : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {b}
                  </button>
                );
              })}
            </div>
            <input
              type="text"
              value={receivingMethod}
              onChange={(e) => setReceivingMethod(e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs text-slate-900 focus:ring-2 focus:ring-emerald-600"
              required
            />
          </div>

          {/* Amount and Rate Fields with Number Keyboard */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                টাকা (BDT ৳)
              </label>
              <input
                type="text"
                inputMode="decimal"
                pattern="[0-9]*[.]?[0-9]*"
                autoComplete="off"
                value={bdtAmountInput}
                onChange={(e) => handleBdtChange(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-mono font-bold text-slate-900 focus:ring-2 focus:ring-emerald-600"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                ডলার রেট (Rate ৳)
              </label>
              <input
                type="text"
                inputMode="decimal"
                pattern="[0-9]*[.]?[0-9]*"
                autoComplete="off"
                value={receivingRate}
                onChange={(e) => handleRateChange(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-mono font-bold text-slate-900 focus:ring-2 focus:ring-emerald-600"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                মোট ডলার (USD $)
              </label>
              <input
                type="text"
                inputMode="decimal"
                pattern="[0-9]*[.]?[0-9]*"
                autoComplete="off"
                value={usdAmountInput}
                onChange={(e) => handleUsdChange(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-emerald-300 bg-emerald-50/50 text-xs font-mono font-bold text-emerald-900 focus:ring-2 focus:ring-emerald-600"
                required
              />
            </div>
          </div>

          {/* Live Result Strip */}
          <div className="p-3 bg-emerald-900 text-white rounded-xl flex items-center justify-between text-xs">
            <span className="text-emerald-200">মোট জমা ডলার:</span>
            <span className="font-mono font-bold text-base text-white">
              {formatUSD(numUsd)}
            </span>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              নোট বা বিবরণ (Optional Note)
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 focus:ring-2 focus:ring-emerald-600"
            />
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition"
            >
              বাতিল (Cancel)
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center space-x-1.5 shadow-sm transition"
            >
              <Save className="w-3.5 h-3.5" />
              <span>আপডেট সেভ করুন (Save Changes)</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
