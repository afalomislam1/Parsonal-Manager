import React, { useState } from 'react';
import { AccountingProvider, useAccounting } from './context/AccountingContext';
import { Header } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';
import { DashboardView } from './components/dashboard/DashboardView';
import { NewTransactionView } from './components/transactions/NewTransactionView';
import { TransactionListView } from './components/transactions/TransactionListView';
import { DepositView } from './components/deposits/DepositView';
import { SavedAccountsView } from './components/accounts/SavedAccountsView';
import { PersonalExpenseView } from './components/expenses/PersonalExpenseView';
import { SourcesLedgerView } from './components/sources/SourcesLedgerView';
import { ReportsView } from './components/reports/ReportsView';
import { ProfileView } from './components/profile/ProfileView';
import { ExportImportView } from './components/export/ExportImportView';
import { SettingsView } from './components/settings/SettingsView';
import { MobileBottomNav } from './components/layout/MobileBottomNav';

function AppContent() {
  const { activeTab } = useAccounting();
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);

  const renderActiveView = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardView />;
      case 'new-transaction':
        return <NewTransactionView />;
      case 'transactions':
        return <TransactionListView />;
      case 'deposits':
        return <DepositView />;
      case 'saved-accounts':
        return <SavedAccountsView />;
      case 'personal-expense':
        return <PersonalExpenseView />;
      case 'sources':
        return <SourcesLedgerView />;
      case 'reports':
        return <ReportsView />;
      case 'profile':
        return <ProfileView />;
      case 'export-import':
        return <ExportImportView />;
      case 'settings':
        return <SettingsView />;
      default:
        return <DashboardView />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar Navigation (Desktop & Mobile Drawer) */}
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <Header
          isSidebarOpen={isSidebarOpen}
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        />

        <main className="flex-1 p-3.5 sm:p-6 lg:p-8 pb-24 lg:pb-8 max-w-7xl w-full mx-auto">
          {renderActiveView()}
        </main>
      </div>

      {/* Mobile Bottom Quick-Action Bar */}
      <MobileBottomNav />
    </div>
  );
}

export default function App() {
  return (
    <AccountingProvider>
      <AppContent />
    </AccountingProvider>
  );
}
