import React from 'react';
import {
  LayoutDashboard,
  PlusCircle,
  Receipt,
  ArrowDownLeft,
  Users,
  Building2,
  FileText,
  UserCheck,
  Download,
  Settings,
  X,
  CreditCard,
  Percent,
  Wallet,
  Cloud,
  FileSpreadsheet,
} from 'lucide-react';
import { useAccounting } from '../../context/AccountingContext';
import { ActiveTab } from '../../types';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const {
    activeTab,
    setActiveTab,
    completedTransactionsCount,
    savedAccounts,
    deposits,
    personalExpenses,
    settings,
    setIsSyncModalOpen,
    syncPin,
  } = useAccounting();

  const navItems: Array<{
    id: ActiveTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: string | number;
    description?: string;
  }> = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
    },
    {
      id: 'new-transaction',
      label: 'New Send Entry',
      icon: PlusCircle,
      description: 'Record BDT payout',
    },
    {
      id: 'transactions',
      label: 'Transactions',
      icon: Receipt,
      badge: completedTransactionsCount,
    },
    {
      id: 'deposits',
      label: 'Deposit / Joma',
      icon: ArrowDownLeft,
      badge: deposits.length,
      description: 'Incoming USD source funds',
    },
    {
      id: 'personal-expense',
      label: 'Personal Expense',
      icon: Wallet,
      badge: personalExpenses.length > 0 ? personalExpenses.length : undefined,
      description: "Kaka's fund drawings",
    },
    {
      id: 'saved-accounts',
      label: 'Saved Accounts',
      icon: Users,
      badge: savedAccounts.length,
    },
    {
      id: 'sources',
      label: 'Source Ledger',
      icon: Building2,
      description: 'Kaka & sources track',
    },
    {
      id: 'reports',
      label: 'Reports & Statements',
      icon: FileText,
      description: 'Date range & reference export',
    },
    {
      id: 'profile',
      label: 'My Account & Profit',
      icon: UserCheck,
      description: 'Full earnings breakdown',
    },
    {
      id: 'export-import',
      label: 'Export & Import',
      icon: Download,
      description: 'Backup, CSV & Excel export',
    },
    {
      id: 'previous-month-import',
      label: 'Import Prev Month',
      icon: FileSpreadsheet,
      description: 'আগের মাসের হিসাব ইমপোর্ট',
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: Settings,
      description: 'Rates, references & banks',
    },
  ];

  const handleSelect = (tab: ActiveTab) => {
    setActiveTab(tab);
    onClose();
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm lg:hidden transition-opacity"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 left-0 bottom-0 z-50 w-64 bg-slate-900 text-slate-200 flex flex-col transition-transform duration-200 ease-in-out lg:static lg:translate-x-0 ${
          isOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <img
              src="/logo.jpg"
              alt="Personal Manager Logo"
              className="w-8 h-8 rounded-lg object-cover shadow-sm shadow-emerald-700/30 border border-emerald-500/30"
            />
            <div>
              <span className="font-bold text-sm tracking-tight text-white block">
                Personal Manager
              </span>
              <span className="text-[11px] text-slate-400 font-medium">
                USD / BDT Operations
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Commission Indicator */}
        <div className="px-4 py-2.5 bg-slate-950/60 border-b border-slate-800/80 flex items-center justify-between text-xs">
          <div className="flex items-center text-slate-400 space-x-1.5">
            <Percent className="w-3.5 h-3.5 text-emerald-400" />
            <span>Commission:</span>
          </div>
          <span className="font-semibold text-emerald-400 font-mono">
            ৳{settings.commissionPerUsd.toFixed(2)} / USD
          </span>
        </div>

        {/* Navigation List */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                id={`nav-item-${item.id}`}
                onClick={() => handleSelect(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs sm:text-sm font-medium transition text-left ${
                  isActive
                    ? 'bg-emerald-700 text-white font-semibold shadow-sm shadow-emerald-700/20'
                    : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <Icon
                    className={`w-4 h-4 flex-shrink-0 ${
                      isActive ? 'text-white' : 'text-slate-400'
                    }`}
                  />
                  <div>
                    <span className="block leading-tight">{item.label}</span>
                    {item.description && (
                      <span
                        className={`block text-[10px] ${
                          isActive ? 'text-emerald-100' : 'text-slate-500'
                        }`}
                      >
                        {item.description}
                      </span>
                    )}
                  </div>
                </div>

                {item.badge !== undefined && (
                  <span
                    className={`px-2 py-0.5 text-[11px] rounded-full font-semibold font-mono ${
                      isActive
                        ? 'bg-emerald-800 text-white'
                        : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Multi-Device PIN Cloud Sync Quick Access */}
        <div className="p-3 border-t border-slate-800 bg-emerald-950/30">
          <button
            onClick={() => {
              setIsSyncModalOpen(true);
              onClose();
            }}
            className="w-full py-2 px-3 rounded-xl bg-emerald-700/80 hover:bg-emerald-600 text-white text-xs font-bold flex items-center justify-between transition shadow-sm"
          >
            <div className="flex items-center space-x-2">
              <Cloud className="w-4 h-4 text-emerald-300" />
              <span>Multi-Device PIN Sync</span>
            </div>
            <span className="text-[10px] bg-emerald-900 px-1.5 py-0.5 rounded text-emerald-200 font-mono">
              {syncPin ? syncPin : 'Sync'}
            </span>
          </button>
        </div>

        {/* References Footer Summary */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/40 text-[11px] text-slate-400">
          <div className="flex items-center justify-between mb-1">
            <span className="font-semibold text-slate-300">Active References:</span>
            <span className="font-mono text-emerald-400">{settings.references.length}</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {settings.references.slice(0, 2).map((ref) => (
              <span
                key={ref}
                className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px] truncate max-w-[110px]"
              >
                {ref}
              </span>
            ))}
          </div>
        </div>
      </aside>
    </>
  );
}
