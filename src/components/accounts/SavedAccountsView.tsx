import React, { useState, useMemo } from 'react';
import {
  Users,
  Search,
  Plus,
  ArrowUpRight,
  Edit2,
  Trash2,
  Building,
  CheckCircle,
  AlertCircle,
  X,
  Save,
  Copy,
  Check,
  ChevronLeft,
  ChevronRight,
  Filter,
} from 'lucide-react';
import { useAccounting } from '../../context/AccountingContext';
import { SavedAccount } from '../../types';
import { formatBDT, formatDate, formatUSD } from '../../utils/calculations';
import { ConfirmDeleteModal } from '../modals/ConfirmDeleteModal';

export function SavedAccountsView() {
  const {
    savedAccounts,
    deleteAccount,
    updateAccount,
    saveOrUpdateAccount,
    settings,
    setDraftTransaction,
    setActiveTab,
  } = useAccounting();

  const [search, setSearch] = useState<string>('');
  const [selectedBankFilter, setSelectedBankFilter] = useState<string>('ALL');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 20;

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [editingAcc, setEditingAcc] = useState<SavedAccount | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState<boolean>(false);

  // New account form state
  const [newName, setNewName] = useState<string>('');
  const [newAccNo, setNewAccNo] = useState<string>('');
  const [newBank, setNewBank] = useState<string>(settings.banks[0] || 'Islami Bank Bangladesh');
  const [formError, setFormError] = useState<string | null>(null);

  // Unique banks currently in saved accounts for quick filtering
  const availableBanks = useMemo(() => {
    const bankSet = new Set<string>();
    savedAccounts.forEach((acc) => {
      if (acc.bankName) bankSet.add(acc.bankName);
    });
    return Array.from(bankSet).sort();
  }, [savedAccounts]);

  const filteredAccounts = useMemo(() => {
    return savedAccounts.filter((a) => {
      // Bank filter
      if (selectedBankFilter !== 'ALL' && a.bankName !== selectedBankFilter) {
        return false;
      }
      // Search filter
      if (search.trim()) {
        const q = search.toLowerCase();
        const matches =
          a.recipientName.toLowerCase().includes(q) ||
          a.accountNumber.toLowerCase().includes(q) ||
          a.bankName.toLowerCase().includes(q);
        if (!matches) return false;
      }
      return true;
    });
  }, [savedAccounts, search, selectedBankFilter]);

  // Total pages and paginated slice
  const totalPages = Math.max(1, Math.ceil(filteredAccounts.length / pageSize));
  const paginatedAccounts = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredAccounts.slice(start, start + pageSize);
  }, [filteredAccounts, currentPage, pageSize]);

  const handleCopyAcc = (id: string, text: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  const handleUseAccount = (acc: SavedAccount) => {
    setDraftTransaction({
      date: new Date().toISOString().slice(0, 10),
      recipientName: acc.recipientName,
      accountNumber: acc.accountNumber,
      bankName: acc.bankName,
      sendUsd: '',
      dollarRate: '',
      sendAmount: '',
      referenceBy: settings.references[0] || 'Kaka',
      note: '',
      saveAccount: false,
    });
    setActiveTab('new-transaction');
  };

  const handleCreateAccount = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const trimmedName = newName.trim();
    const trimmedAcc = newAccNo.trim();
    if (!trimmedName || !trimmedAcc) {
      setFormError('Recipient name and account number are required.');
      return;
    }

    // Check duplicate
    const exists = savedAccounts.some(
      (a) =>
        a.recipientName.toLowerCase() === trimmedName.toLowerCase() &&
        a.accountNumber === trimmedAcc
    );
    if (exists) {
      setFormError('An account with this recipient name and account number already exists.');
      return;
    }

    saveOrUpdateAccount(trimmedName, trimmedAcc, newBank);
    setShowAddModal(false);
    setNewName('');
    setNewAccNo('');
    setNewBank(settings.banks[0] || 'Islami Bank Bangladesh');
  };

  const handleUpdateAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAcc) return;
    updateAccount(editingAcc.id, {
      recipientName: editingAcc.recipientName.trim(),
      accountNumber: editingAcc.accountNumber.trim(),
      bankName: editingAcc.bankName.trim(),
    });
    setEditingAcc(null);
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Customer & Saved Accounts
            </h2>
            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
              {savedAccounts.length}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
            Recipient directory with banking details and instant auto-fill for sending money.
          </p>
        </div>

        <button
          id="btn-add-account"
          onClick={() => setShowAddModal(true)}
          className="px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center justify-center space-x-1.5 shadow-sm shadow-emerald-700/20 active:scale-95 transition"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Account</span>
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-3 sm:p-4 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
            <input
              type="text"
              id="input-search-accounts"
              placeholder="Search by receiver name, bank, or account number..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-900 focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 outline-none"
            />
            {search && (
              <button
                onClick={() => {
                  setSearch('');
                  setCurrentPage(1);
                }}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <div className="relative w-full sm:w-56">
              <select
                id="select-bank-filter"
                value={selectedBankFilter}
                onChange={(e) => {
                  setSelectedBankFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-3 pr-8 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-700 focus:ring-2 focus:ring-emerald-600 outline-none cursor-pointer"
              >
                <option value="ALL">All Banks ({savedAccounts.length})</option>
                {availableBanks.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Count summary & pagination hint */}
        <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
          <span>
            Showing <strong>{filteredAccounts.length}</strong> of <strong>{savedAccounts.length}</strong> recipients
          </span>
          {totalPages > 1 && (
            <span>
              Page <strong>{currentPage}</strong> of <strong>{totalPages}</strong>
            </span>
          )}
        </div>
      </div>

      {/* Mobile Card List View (Phones & Small Tablets) */}
      <div className="block md:hidden space-y-3">
        {paginatedAccounts.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-400 shadow-sm">
            <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="font-bold text-slate-700 text-sm">No recipients found</p>
            <p className="text-xs text-slate-400 mt-1">Try adjusting your search or bank filter.</p>
          </div>
        ) : (
          paginatedAccounts.map((acc) => (
            <div
              key={acc.id}
              className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm hover:border-slate-300 transition space-y-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-bold text-slate-900 text-sm">{acc.recipientName}</div>
                  <div className="inline-flex items-center gap-1.5 mt-1 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[11px] font-semibold">
                    <Building className="w-3 h-3 text-slate-500" />
                    <span>{acc.bankName}</span>
                  </div>
                </div>

                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => setEditingAcc(acc)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
                    title="Edit Customer"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setDeletingId(acc.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                    title="Delete Customer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Account Number with 1-tap Copy */}
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <div>
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                    Account Number
                  </span>
                  <span className="font-mono font-bold text-xs text-slate-800 break-all">
                    {acc.accountNumber}
                  </span>
                </div>
                <button
                  onClick={() => handleCopyAcc(acc.id, acc.accountNumber)}
                  className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-emerald-700 hover:border-emerald-300 transition flex items-center gap-1 text-[10px] font-bold"
                  title="Copy Account Number"
                >
                  {copiedId === acc.id ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-600">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>

              {/* Stats & Action */}
              <div className="flex items-center justify-between pt-1">
                <div className="text-[11px] text-slate-500">
                  {acc.totalTransactions > 0 ? (
                    <span>
                      <strong>{acc.totalTransactions}</strong> txns • {formatBDT(acc.totalBdtSent)}
                    </span>
                  ) : (
                    <span>Ready for transfer</span>
                  )}
                </div>

                <button
                  onClick={() => handleUseAccount(acc)}
                  className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center space-x-1.5 border border-emerald-200 active:scale-95 transition"
                >
                  <ArrowUpRight className="w-3.5 h-3.5" />
                  <span>Send Money</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
                <th className="py-3 px-4">Recipient Name</th>
                <th className="py-3 px-4">Account Number</th>
                <th className="py-3 px-4">Bank Name</th>
                <th className="py-3 px-4 text-center">Total Txns</th>
                <th className="py-3 px-4 text-right">Total USD Sent</th>
                <th className="py-3 px-4 text-right">Total BDT Sent</th>
                <th className="py-3 px-4 text-right">Last Used</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {paginatedAccounts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="font-semibold text-slate-600 text-sm">No saved accounts found</p>
                    <p className="text-xs text-slate-400 mt-1">
                      Try adjusting your search or bank filter.
                    </p>
                  </td>
                </tr>
              ) : (
                paginatedAccounts.map((acc) => (
                  <tr key={acc.id} className="hover:bg-slate-50 transition">
                    <td className="py-3 px-4 font-bold text-slate-900 text-sm">
                      {acc.recipientName}
                    </td>

                    <td className="py-3 px-4 font-mono font-bold text-slate-700">
                      <div className="flex items-center space-x-1.5">
                        <span>{acc.accountNumber}</span>
                        <button
                          onClick={() => handleCopyAcc(acc.id, acc.accountNumber)}
                          className="p-1 rounded text-slate-400 hover:text-slate-700 transition"
                          title="Copy account number"
                        >
                          {copiedId === acc.id ? (
                            <Check className="w-3 h-3 text-emerald-600" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      </div>
                    </td>

                    <td className="py-3 px-4 text-slate-700 font-medium">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-slate-100 text-slate-800 text-[11px] font-semibold">
                        {acc.bankName}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-center font-mono">
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-800 font-semibold text-[11px]">
                        {acc.totalTransactions}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                      {formatUSD(acc.totalUsdSent)}
                    </td>

                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                      {formatBDT(acc.totalBdtSent)}
                    </td>

                    <td className="py-3 px-4 text-right text-slate-500 font-medium whitespace-nowrap">
                      {formatDate(acc.lastUsed)}
                    </td>

                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end space-x-1.5">
                        <button
                          id={`btn-use-account-${acc.id}`}
                          onClick={() => handleUseAccount(acc)}
                          className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-[11px] flex items-center space-x-1 border border-emerald-200 transition"
                          title="Use account in New Transaction"
                        >
                          <ArrowUpRight className="w-3 h-3" />
                          <span>Send Money</span>
                        </button>

                        <button
                          id={`btn-edit-account-${acc.id}`}
                          onClick={() => setEditingAcc(acc)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
                          title="Edit"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          id={`btn-delete-account-${acc.id}`}
                          onClick={() => setDeletingId(acc.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                          title="Delete"
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

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between bg-white rounded-2xl border border-slate-200 p-3 sm:p-4 shadow-sm">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 flex items-center gap-1 transition"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Previous</span>
          </button>

          <div className="text-xs font-semibold text-slate-600">
            Page {currentPage} of {totalPages}
          </div>

          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 flex items-center gap-1 transition"
          >
            <span>Next</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Add New Account Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-base font-bold text-slate-900">Add New Customer Account</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-900 text-xs font-semibold flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleCreateAccount} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Recipient Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. ABU RAIHAN"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 focus:ring-2 focus:ring-emerald-600 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Account Number <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. 4580010027069"
                  value={newAccNo}
                  onChange={(e) => setNewAccNo(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-mono text-slate-900 focus:ring-2 focus:ring-emerald-600 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Bank Name <span className="text-rose-500">*</span>
                </label>
                <select
                  value={newBank}
                  onChange={(e) => setNewBank(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 bg-white focus:ring-2 focus:ring-emerald-600 outline-none"
                >
                  {settings.banks.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center space-x-1 shadow-sm transition"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Account</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Account Modal */}
      {editingAcc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-base font-bold text-slate-900">Edit Customer Account</h3>
              <button
                onClick={() => setEditingAcc(null)}
                className="p-1 text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateAccount} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Recipient Name
                </label>
                <input
                  type="text"
                  value={editingAcc.recipientName}
                  onChange={(e) =>
                    setEditingAcc({ ...editingAcc, recipientName: e.target.value })
                  }
                  required
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 focus:ring-2 focus:ring-emerald-600 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Account Number
                </label>
                <input
                  type="text"
                  value={editingAcc.accountNumber}
                  onChange={(e) =>
                    setEditingAcc({ ...editingAcc, accountNumber: e.target.value })
                  }
                  required
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-mono text-slate-900 focus:ring-2 focus:ring-emerald-600 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Bank Name</label>
                <select
                  value={editingAcc.bankName}
                  onChange={(e) =>
                    setEditingAcc({ ...editingAcc, bankName: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 bg-white focus:ring-2 focus:ring-emerald-600 outline-none"
                >
                  {settings.banks.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setEditingAcc(null)}
                  className="px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center space-x-1 shadow-sm transition"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Update Account</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingId && (
        <ConfirmDeleteModal
          title="Delete Customer Account"
          message="Are you sure you want to remove this account from saved autocomplete suggestions? Past transactions will remain intact."
          itemId={deletingId}
          onConfirm={() => deleteAccount(deletingId)}
          onClose={() => setDeletingId(null)}
        />
      )}
    </div>
  );
}
