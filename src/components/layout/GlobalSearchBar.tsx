import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Search,
  X,
  ArrowRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Tag,
  Building,
  User,
} from 'lucide-react';
import { useAccounting } from '../../context/AccountingContext';
import { Transaction } from '../../types';
import { formatBDT, formatUSD, formatDate } from '../../utils/calculations';

export function GlobalSearchBar() {
  const {
    transactions,
    navigateToTransaction,
    setTransactionSearchFilter,
    setActiveTab,
  } = useAccounting();

  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcut listener (/ or Ctrl+K / Cmd+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing inside an input/textarea
      const activeTag = (document.activeElement?.tagName || '').toLowerCase();
      if (activeTag === 'input' || activeTag === 'textarea' || activeTag === 'select') {
        if (e.key === 'Escape' && isOpen) {
          setIsOpen(false);
          inputRef.current?.blur();
        }
        return;
      }

      if (e.key === '/' || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k')) {
        e.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Click outside listener to close dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter transactions by ID, recipient name, or reference
  const matchingTransactions = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.trim().toLowerCase();
    return transactions.filter((t) => {
      const matchId = t.id.toLowerCase().includes(q);
      const matchRecipient = t.recipientName.toLowerCase().includes(q);
      const matchRef = t.referenceBy.toLowerCase().includes(q);
      const matchBank = t.bankName?.toLowerCase().includes(q);
      const matchAcc = t.accountNumber?.toLowerCase().includes(q);
      return matchId || matchRecipient || matchRef || matchBank || matchAcc;
    });
  }, [transactions, query]);

  // Reset selected index on query change
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Handle keyboard navigation inside search input
  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
      inputRef.current?.blur();
      return;
    }

    if (!isOpen || matchingTransactions.length === 0) {
      if (e.key === 'Enter' && query.trim()) {
        // Navigate to transactions list with current search term
        setTransactionSearchFilter(query.trim());
        setActiveTab('transactions');
        setIsOpen(false);
        inputRef.current?.blur();
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % matchingTransactions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + matchingTransactions.length) % matchingTransactions.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const selected = matchingTransactions[selectedIndex];
      if (selected) {
        handleSelectTransaction(selected.id);
      } else {
        setTransactionSearchFilter(query.trim());
        setActiveTab('transactions');
        setIsOpen(false);
      }
    }
  };

  const handleSelectTransaction = (transactionId: string) => {
    navigateToTransaction(transactionId);
    setIsOpen(false);
    setQuery('');
  };

  const handleViewAllInList = () => {
    setTransactionSearchFilter(query.trim());
    setActiveTab('transactions');
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className="relative flex-1 max-w-xs sm:max-w-sm md:max-w-md">
      {/* Search Input Container */}
      <div className="relative flex items-center">
        <div className="absolute left-3 pointer-events-none text-slate-400">
          <Search className="w-4 h-4" />
        </div>

        <input
          ref={inputRef}
          id="global-header-search-input"
          type="text"
          value={query}
          onFocus={() => setIsOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onKeyDown={handleInputKeyDown}
          placeholder="Search ID, recipient, or reference..."
          aria-label="Global transaction search by ID, recipient, or reference"
          className="w-full pl-9 pr-14 sm:pr-16 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50 hover:bg-white focus:bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all shadow-inner/50"
        />

        {/* Right side controls: Clear button or shortcut badge */}
        <div className="absolute right-2.5 flex items-center space-x-1">
          {query ? (
            <button
              id="btn-clear-global-search"
              type="button"
              onClick={() => {
                setQuery('');
                inputRef.current?.focus();
              }}
              className="p-0.5 text-slate-400 hover:text-slate-600 rounded transition"
              title="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : (
            <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono text-slate-400 bg-slate-100 rounded border border-slate-200">
              /
            </kbd>
          )}
        </div>
      </div>

      {/* Dropdown Results Box */}
      {isOpen && query.trim().length > 0 && (
        <div className="absolute left-0 right-0 top-full mt-1.5 bg-white rounded-2xl border border-slate-200 shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
          {/* Header of results */}
          <div className="px-3.5 py-2 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>
              {matchingTransactions.length > 0 ? (
                <>
                  Found <strong className="text-slate-900">{matchingTransactions.length}</strong> matching transaction{matchingTransactions.length > 1 ? 's' : ''}
                </>
              ) : (
                'No matching transactions found'
              )}
            </span>
            <span className="text-[10px] text-slate-400 hidden sm:inline">
              Use ↑↓ arrows to navigate, ↵ to select
            </span>
          </div>

          {/* Results List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
            {matchingTransactions.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500 space-y-1.5">
                <AlertCircle className="w-6 h-6 text-slate-300 mx-auto" />
                <p className="font-semibold text-slate-700">No transactions match "{query}"</p>
                <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                  Try searching by Transaction ID (e.g. <strong>TRX-000001</strong>), Recipient Name (e.g. <strong>Rahim</strong>), or Reference (e.g. <strong>Kaka</strong>).
                </p>
              </div>
            ) : (
              matchingTransactions.map((tx, idx) => {
                const isSelected = idx === selectedIndex;
                const isCompleted = tx.status === 'Completed';

                return (
                  <button
                    key={tx.id}
                    id={`search-result-${tx.id}`}
                    type="button"
                    onClick={() => handleSelectTransaction(tx.id)}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={`w-full text-left px-3.5 py-2.5 transition flex flex-col space-y-1.5 ${
                      isSelected
                        ? 'bg-emerald-50/80 text-slate-900 border-l-4 border-emerald-600 pl-2.5'
                        : 'hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    {/* Row 1: ID, Reference Badge, Status Badge & Date */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="font-mono text-xs font-bold text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                          {tx.id}
                        </span>
                        <span
                          className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                            tx.referenceBy === 'Kaka'
                              ? 'bg-blue-50 text-blue-800 border border-blue-200'
                              : 'bg-purple-50 text-purple-800 border border-purple-200'
                          }`}
                        >
                          <Tag className="w-2.5 h-2.5 mr-1 text-slate-500" />
                          {tx.referenceBy}
                        </span>
                      </div>

                      <div className="flex items-center space-x-2">
                        <span className="text-[10px] text-slate-400">{formatDate(tx.date)}</span>
                        {isCompleted ? (
                          <span className="inline-flex items-center text-[10px] font-bold text-emerald-700 bg-emerald-100/70 px-1.5 py-0.5 rounded">
                            <CheckCircle2 className="w-2.5 h-2.5 mr-0.5" />
                            Done
                          </span>
                        ) : (
                          <span className="inline-flex items-center text-[10px] font-bold text-amber-700 bg-amber-100/70 px-1.5 py-0.5 rounded">
                            <Clock className="w-2.5 h-2.5 mr-0.5" />
                            {tx.status}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Row 2: Recipient & Bank details vs Financial values */}
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center space-x-1.5 truncate pr-2">
                        <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="font-semibold text-slate-900 truncate">
                          {tx.recipientName}
                        </span>
                        <span className="text-slate-400">•</span>
                        <span className="text-slate-500 text-[11px] truncate">
                          {tx.bankName}
                        </span>
                      </div>

                      <div className="text-right shrink-0 font-mono">
                        <span className="font-bold text-slate-900 text-xs">
                          {formatUSD(tx.sendUsd)}
                        </span>
                        <span className="text-[10px] text-slate-500 ml-1">
                          ({formatBDT(tx.actualSend)})
                        </span>
                      </div>
                    </div>

                    {/* Row 3: Profit tag */}
                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <span className="text-[10px] text-slate-400 font-mono">
                        Acc: {tx.accountNumber}
                      </span>
                      <span className="text-emerald-700 font-semibold font-mono text-[11px] flex items-center">
                        <TrendingUp className="w-3 h-3 mr-0.5 text-emerald-600" />
                        Profit: {formatBDT(tx.profit)}
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Footer Action */}
          {matchingTransactions.length > 0 && (
            <div className="p-2 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-[11px] text-slate-500 pl-2">
                Click any record to jump directly to it
              </span>
              <button
                id="btn-view-all-matching-transactions"
                type="button"
                onClick={handleViewAllInList}
                className="px-2.5 py-1 text-xs font-bold text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 rounded-lg transition inline-flex items-center space-x-1"
              >
                <span>View all in Transactions list</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
