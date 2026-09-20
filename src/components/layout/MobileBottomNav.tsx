import React from 'react';
import {
  LayoutDashboard,
  Receipt,
  Plus,
  ArrowDownLeft,
  Settings,
} from 'lucide-react';
import { useAccounting } from '../../context/AccountingContext';
import { ActiveTab } from '../../types';

export function MobileBottomNav() {
  const { activeTab, setActiveTab, completedTransactionsCount } = useAccounting();

  const navButtons: Array<{
    id: ActiveTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number;
    highlight?: boolean;
  }> = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
    },
    {
      id: 'transactions',
      label: 'Transactions',
      icon: Receipt,
      badge: completedTransactionsCount,
    },
    {
      id: 'new-transaction',
      label: 'New Send',
      icon: Plus,
      highlight: true,
    },
    {
      id: 'deposits',
      label: 'Deposits',
      icon: ArrowDownLeft,
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: Settings,
    },
  ];

  return (
    <nav
      id="mobile-bottom-nav"
      className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 lg:hidden shadow-lg safe-area-bottom"
    >
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-2">
        {navButtons.map((btn) => {
          const isActive = activeTab === btn.id;
          const Icon = btn.icon;

          if (btn.highlight) {
            return (
              <button
                key={btn.id}
                id={`btn-bottom-nav-${btn.id}`}
                onClick={() => setActiveTab(btn.id)}
                className="flex flex-col items-center justify-center -mt-5 relative group active:scale-95 transition"
              >
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-transform ${
                    isActive
                      ? 'bg-emerald-800 text-white ring-4 ring-emerald-100 shadow-emerald-700/30'
                      : 'bg-emerald-700 hover:bg-emerald-800 text-white shadow-emerald-700/20'
                  }`}
                >
                  <Icon className="w-6 h-6" />
                </div>
                <span
                  className={`text-[10px] font-bold mt-1 tracking-tight ${
                    isActive ? 'text-emerald-800' : 'text-slate-600'
                  }`}
                >
                  {btn.label}
                </span>
              </button>
            );
          }

          return (
            <button
              key={btn.id}
              id={`btn-bottom-nav-${btn.id}`}
              onClick={() => setActiveTab(btn.id)}
              className={`flex flex-col items-center justify-center flex-1 h-full py-1.5 transition active:scale-95 relative ${
                isActive
                  ? 'text-emerald-800 font-bold'
                  : 'text-slate-500 hover:text-slate-800 font-medium'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5]' : 'stroke-2'}`} />
                {Boolean(btn.badge && btn.badge > 0) && (
                  <span className="absolute -top-1.5 -right-2 px-1 min-w-[14px] h-[14px] rounded-full bg-emerald-700 text-white text-[9px] font-bold flex items-center justify-center">
                    {btn.badge! > 99 ? '99+' : btn.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] mt-1 leading-none">{btn.label}</span>
              {isActive && (
                <span className="w-1 h-1 rounded-full bg-emerald-700 mt-0.5" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
