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
          className="fixed inset-0 z-40 bg-slate-900/30 backdrop-blur-xs lg:hidden transition-opacity"
        />
      )}

      {/* Sidebar Container: Clean Professional White */}
      <aside
        className={`fixed top-0 left-0 bottom-0 z-50 w-64 bg-white text-slate-800 border-r border-slate-200/90 flex flex-col transition-transform duration-200 ease-in-out lg:static lg:translate-x-0 shadow-sm ${
          isOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-white">
          <div className="flex items-center space-x-2.5">
            <img
              src="/logo.jpg"
              alt="Personal Manager Logo"
              className="w-8 h-8 rounded-lg object-cover shadow-2xs border border-emerald-600/20"
            />
            <div>
              <span className="font-bold text-sm tracking-tight text-slate-900 block leading-tight">
                Personal Manager
              </span>
              <span className="text-[11px] text-slate-500 font-medium">
                USD / BDT Operations
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Commission Indicator */}
        <div className="px-4 py-2.5 bg-slate-50/70 border-b border-slate-100 flex items-center justify-between text-xs">
          <div className="flex items-center text-slate-600 space-x-1.5">
            <Percent className="w-3.5 h-3.5 text-emerald-600" />
            <span className="font-medium">Commission:</span>
          </div>
          <span className="font-bold text-emerald-700 font-mono text-[11px] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/60">
            ৳{settings.commissionPerUsd.toFixed(2)} / USD
          </span>
        </div>

        {/* Navigation List */}
        <nav className="flex-1 overflow-y-auto px-3 py-3.5 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                id={`nav-item-${item.id}`}
                onClick={() => handleSelect(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs sm:text-sm font-medium transition text-left group ${
                  isActive
                    ? 'bg-emerald-600 text-white font-semibold shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
                }`}
              >
                <div className="flex items-center space-x-2.5 min-w-0">
                  <Icon
                    className={`w-4 h-4 flex-shrink-0 transition-colors ${
                      isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-600'
                    }`}
                  />
                  <div className="truncate">
                    <span className="block leading-tight truncate">{item.label}</span>
                    {item.description && (
                      <span
                        className={`block text-[10px] leading-tight truncate ${
                          isActive ? 'text-emerald-100' : 'text-slate-400'
                        }`}
                      >
                        {item.description}
                      </span>
                    )}
                  </div>
                </div>

                {item.badge !== undefined && (
                  <span
                    className={`ml-2 px-1.5 py-0.5 text-[10px] rounded-md font-semibold font-mono flex-shrink-0 ${
                      isActive
                        ? 'bg-emerald-700 text-white'
                        : 'bg-slate-100 text-slate-600 group-hover:bg-slate-200'
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
        <div className="p-3 border-t border-slate-100 bg-slate-50/60">
          <button
            onClick={() => {
              setIsSyncModalOpen(true);
              onClose();
            }}
            className="w-full py-2 px-3 rounded-xl bg-white hover:bg-emerald-50 text-slate-800 border border-slate-200/80 hover:border-emerald-300 text-xs font-semibold flex items-center justify-between transition shadow-2xs group"
          >
            <div className="flex items-center space-x-2">
              <Cloud className="w-4 h-4 text-emerald-600 group-hover:scale-105 transition-transform" />
              <span>Multi-Device PIN Sync</span>
            </div>
            <span className="text-[10px] bg-emerald-100 px-1.5 py-0.5 rounded text-emerald-800 font-mono font-bold">
              {syncPin ? syncPin : 'Sync'}
            </span>
          </button>
        </div>

        {/* References Footer Summary */}
        <div className="p-3 border-t border-slate-100 bg-white text-[11px] text-slate-500">
          <div className="flex items-center justify-between mb-1">
            <span className="font-semibold text-slate-700">Active References:</span>
            <span className="font-mono text-emerald-700 font-bold">{settings.references.length}</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {settings.references.slice(0, 2).map((ref) => (
              <span
                key={ref}
                className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] truncate max-w-[110px]"
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
