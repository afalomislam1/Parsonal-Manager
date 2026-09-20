import React, { useState } from 'react';
import { X, Save, AlertCircle } from 'lucide-react';
import { DepositRecord } from '../../types';
import { useAccounting } from '../../context/AccountingContext';
import { computeDepositBDT, formatBDT, formatUSD } from '../../utils/calculations';

interface EditDepositModalProps {
  deposit: DepositRecord;
  onClose: () => void;
}

export function EditDepositModal({ deposit, onClose }: EditDepositModalProps) {
  const { updateDeposit, settings } = useAccounting();

  const [date, setDate] = useState<string>(deposit.date);
  const [senderName, setSenderName] = useState<string>(deposit.senderName);
  const [usdAmount, setUsdAmount] = useState<string>(String(deposit.usdAmount));
  const [receivingRate, setReceivingRate] = useState<string>(String(deposit.receivingRate));
  const [receivingMethod, setReceivingMethod] = useState<string>(deposit.receivingMethod);
  const [note, setNote] = useState<string>(deposit.note || '');
  const [error, setError] = useState<string | null>(null);

  const numUsd = parseFloat(usdAmount) || 0;
  const numRate = parseFloat(receivingRate) || 0;
  const calculatedBdt = computeDepositBDT(numUsd, numRate);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!senderName.trim()) {
      setError('Sender / Source name is required.');
      return;
    }
    if (numUsd <= 0 || numRate <= 0) {
      setError('USD amount and rate must be greater than 0.');
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
              Edit Deposit Record ({deposit.id})
            </h3>
            <p className="text-xs text-slate-500">
              Update incoming USD deposit details and rate.
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
                Deposit Date
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs text-slate-900 focus:ring-2 focus:ring-emerald-600"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Sender / Source
              </label>
              <input
                type="text"
                list="deposit-edit-sources"
                value={senderName}
                onChange={(e) => setSenderName(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs text-slate-900 focus:ring-2 focus:ring-emerald-600"
                required
              />
              <datalist id="deposit-edit-sources">
                {settings.references.map((r) => (
                  <option key={r} value={r} />
                ))}
              </datalist>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                USD Amount ($)
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={usdAmount}
                onChange={(e) => setUsdAmount(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-mono font-bold text-slate-900 focus:ring-2 focus:ring-emerald-600"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Receiving Rate (BDT / USD)
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={receivingRate}
                onChange={(e) => setReceivingRate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-mono font-bold text-slate-900 focus:ring-2 focus:ring-emerald-600"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Receiving Method / Account
            </label>
            <input
              type="text"
              value={receivingMethod}
              onChange={(e) => setReceivingMethod(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs text-slate-900 focus:ring-2 focus:ring-emerald-600"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Note (Optional)
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs text-slate-900 focus:ring-2 focus:ring-emerald-600"
              placeholder="e.g., Wire confirmation #8372"
            />
          </div>

          {/* Calculated BDT Box */}
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
            <span className="text-xs text-slate-600 font-medium">Calculated BDT Value:</span>
            <span className="text-sm font-mono font-bold text-slate-900">
              {formatBDT(calculatedBdt)}
            </span>
          </div>

          <div className="pt-3 border-t border-slate-200 flex items-center justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center space-x-1.5 shadow-sm shadow-emerald-700/20 transition active:scale-95"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save Changes</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
