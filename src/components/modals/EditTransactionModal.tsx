import React, { useState } from 'react';
import { X, Save, AlertCircle } from 'lucide-react';
import { Transaction } from '../../types';
import { useAccounting } from '../../context/AccountingContext';
import {
  computeBankCharge,
  computeCommission,
  computeExpectedBDT,
  computeProfit,
  formatBDT,
  formatUSD,
} from '../../utils/calculations';

interface EditTransactionModalProps {
  transaction: Transaction;
  onClose: () => void;
}

export function EditTransactionModal({ transaction, onClose }: EditTransactionModalProps) {
  const { settings, updateTransaction } = useAccounting();

  const [date, setDate] = useState<string>(transaction.date);
  const [recipientName, setRecipientName] = useState<string>(transaction.recipientName);
  const [accountNumber, setAccountNumber] = useState<string>(transaction.accountNumber);
  const [bankName, setBankName] = useState<string>(transaction.bankName);
  const [sendUsd, setSendUsd] = useState<string>(String(transaction.sendUsd));
  const [dollarRate, setDollarRate] = useState<string>(String(transaction.dollarRate));
  const [actualSend, setActualSend] = useState<string>(String(transaction.actualSend));
  const [referenceBy, setReferenceBy] = useState<string>(transaction.referenceBy);
  const [note, setNote] = useState<string>(transaction.note || '');
  const [status, setStatus] = useState<Transaction['status']>(transaction.status);
  const [error, setError] = useState<string | null>(null);

  const numSendUsd = parseFloat(sendUsd) || 0;
  const numDollarRate = parseFloat(dollarRate) || 0;
  const numActualSend = parseFloat(actualSend) || 0;

  const expectedBdt = computeExpectedBDT(numSendUsd, numDollarRate);
  const bankCharge = computeBankCharge(expectedBdt, numActualSend);
  const commission = computeCommission(numSendUsd, settings.commissionPerUsd);
  const profit = computeProfit(bankCharge, commission);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipientName.trim() || !accountNumber.trim()) {
      setError('Recipient name and account number are required.');
      return;
    }
    if (numSendUsd <= 0 || numDollarRate <= 0) {
      setError('USD and dollar rate must be greater than 0.');
      return;
    }

    updateTransaction(transaction.id, {
      date,
      recipientName: recipientName.trim(),
      accountNumber: accountNumber.trim(),
      bankName: bankName.trim(),
      sendUsd: numSendUsd,
      dollarRate: numDollarRate,
      actualSend: numActualSend,
      referenceBy,
      note: note.trim(),
      status,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-5 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white z-10">
          <div>
            <span className="text-xs font-mono text-emerald-700 font-bold px-2 py-0.5 rounded bg-emerald-50 border border-emerald-200">
              {transaction.id}
            </span>
            <h3 className="text-lg font-bold text-slate-900 mt-1">Edit Send Transaction</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-5 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
            <div className="sm:col-span-4">
              <label className="block text-xs font-bold text-slate-700 mb-1">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs text-slate-900"
              />
            </div>

            <div className="sm:col-span-5">
              <label className="block text-xs font-bold text-slate-700 mb-1">Reference / Source</label>
              <div className="flex flex-wrap gap-1.5">
                {settings.references.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setReferenceBy(r)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition ${
                      referenceBy === r
                        ? 'bg-emerald-700 text-white shadow-xs ring-1 ring-emerald-500'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            <div className="sm:col-span-3">
              <label className="block text-xs font-bold text-slate-700 mb-1">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-900 bg-white"
              >
                <option value="Completed">Completed</option>
                <option value="Pending">Pending</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Recipient Name</label>
              <input
                type="text"
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Account Number</label>
              <input
                type="text"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-mono text-slate-900"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Bank Name</label>
            <select
              value={bankName}
              onChange={(e) => setBankName(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs text-slate-900 bg-white"
            >
              {settings.banks.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Send USD ($)</label>
              <input
                type="number"
                step="any"
                value={sendUsd}
                onChange={(e) => setSendUsd(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-mono font-bold text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Dollar Rate (BDT)</label>
              <input
                type="number"
                step="any"
                value={dollarRate}
                onChange={(e) => setDollarRate(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-mono font-bold text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Actual Send (BDT)</label>
              <input
                type="number"
                step="any"
                value={actualSend}
                onChange={(e) => setActualSend(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-mono font-bold text-slate-900"
              />
            </div>
          </div>

          {/* Computed Summary Preview */}
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <div>
              <span className="text-slate-500 block text-[10px]">Expected BDT:</span>
              <span className="font-bold font-mono">{formatBDT(expectedBdt)}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px]">Bank Charge:</span>
              <span className="font-bold font-mono text-slate-800">{formatBDT(bankCharge)}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px]">Commission:</span>
              <span className="font-bold font-mono text-emerald-700">{formatBDT(commission)}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px]">Profit:</span>
              <span className="font-bold font-mono text-emerald-800">{formatBDT(profit)}</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Note</label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs text-slate-900"
            />
          </div>

          <div className="pt-3 border-t border-slate-200 flex items-center justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center space-x-1.5"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Update Transaction</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
