import React from 'react';
import {
  DollarSign,
  PlusCircle,
  ArrowDownLeft,
  ArrowUpRight,
  Menu,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react';
import { useAccounting } from '../../context/AccountingContext';
import { formatBDT, formatUSD } from '../../utils/calculations';
import { GlobalSearchBar } from './GlobalSearchBar';

interface HeaderProps {
  onToggleSidebar: () => void;
  isSidebarOpen: boolean;
}

export function Header({ onToggleSidebar }: HeaderProps) {
  const {
    remainingUsdBalance,
    totalProfit,
    setActiveTab,
  } = useAccounting();

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left: Mobile Hamburger & Title */}
          <div className="flex items-center space-x-3">
            <button
              id="btn-toggle-sidebar"
              onClick={onToggleSidebar}
              className="lg:hidden p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition"
              aria-label="Toggle Navigation"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-2.5">
              <img
                src="/logo.jpg"
                alt="Personal Manager Logo"
                className="w-9 h-9 rounded-xl object-cover shadow-sm shadow-emerald-700/20 border border-emerald-600/30"
              />
              <div>
                <div className="flex items-center space-x-1.5">
                  <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight leading-tight">
                    Personal Manager
                  </h1>
                  <span className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-800 border border-emerald-200">
                    <ShieldCheck className="w-3 h-3 mr-0.5" /> USD / BDT Ledger
                  </span>
                </div>
                <p className="hidden sm:block text-xs text-slate-500 font-medium">
                  Financial Remittance & Accounting Manager
                </p>
              </div>
            </div>
          </div>

          {/* Center: Global Search Bar */}
          <div className="flex-1 max-w-xs sm:max-w-sm md:max-w-md mx-2 sm:mx-4">
            <GlobalSearchBar />
          </div>

          {/* Right: Balance Pill & Quick Action Buttons */}
          <div className="flex items-center space-x-2 sm:space-x-4">
            {/* Live USD Balance pill */}
            <div
              className={`flex items-center space-x-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg border text-xs sm:text-sm font-semibold transition ${
                remainingUsdBalance >= 0
                  ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
                  : 'bg-rose-50 border-rose-200 text-rose-950'
              }`}
              title="Remaining USD Balance (Total Received - Total Sent)"
            >
              <span className="text-slate-500 text-[10px] sm:text-[11px] uppercase tracking-wider font-semibold">
                <span className="hidden xs:inline">USD </span>Bal:
              </span>
              <span className="font-mono text-xs sm:text-sm md:text-base font-bold text-emerald-900">
                {formatUSD(remainingUsdBalance)}
              </span>
            </div>

            {/* Quick Profit Pill (Desktop) */}
            <div className="hidden md:flex items-center space-x-2 px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-800 text-xs sm:text-sm">
              <TrendingUp className="w-4 h-4 text-emerald-700" />
              <span className="text-slate-500 text-[11px] uppercase tracking-wider font-semibold">
                Total Profit:
              </span>
              <span className="font-mono font-bold text-slate-900">
                {formatBDT(totalProfit)}
              </span>
            </div>

            {/* Action buttons (Visible on sm+ screens; mobile uses bottom navigation) */}
            <div className="hidden sm:flex items-center space-x-1.5 sm:space-x-2">
              <button
                id="btn-header-new-deposit"
                onClick={() => setActiveTab('deposits')}
                className="inline-flex items-center px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-300 text-slate-700 hover:bg-slate-100 hover:border-slate-400 transition"
              >
                <ArrowDownLeft className="w-3.5 h-3.5 mr-1 text-emerald-700" />
                <span>Joma / Deposit</span>
              </button>

              <button
                id="btn-header-new-tx"
                onClick={() => setActiveTab('new-transaction')}
                className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-700 hover:bg-emerald-800 text-white shadow-sm shadow-emerald-700/20 transition"
              >
                <ArrowUpRight className="w-3.5 h-3.5 mr-1" />
                <span>New Send</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
