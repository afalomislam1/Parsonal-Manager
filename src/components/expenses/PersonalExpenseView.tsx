import React, { useMemo, useState } from 'react';
import {
  Wallet,
  Plus,
  Search,
  Filter,
  Calendar,
  Clock,
  Edit3,
  Trash2,
  Download,
  DollarSign,
  ArrowDownRight,
  AlertCircle,
  X,
  Tag,
  FileText,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';
import { useAccounting } from '../../context/AccountingContext';
import { PersonalExpense } from '../../types';
import { formatBDT, formatUSD, getTodayDateString, roundTo } from '../../utils/calculations';
import { exportPersonalExpensesCSV } from '../../utils/storage';

const EXPENSE_CATEGORIES = [
  'Personal Cash / হাত খরচ',
  'Family & Household / সংসার খরচ',
  'Medical & Healthcare / চিকিৎসা ও ওষুধ',
  'Food & Grocery / খাবার ও বাজার',
  'Utility & Bills / বিল পরিশোধ',
  'Shopping / কেনাকাটা',
  'Emergency / জরুরি প্রয়োজন',
  'Other / অন্যান্য',
];

export function PersonalExpenseView() {
  const {
    personalExpenses,
    totalPersonalExpenseBdt,
    totalPersonalExpenseUsd,
    totalDepositedUsd,
    totalDepositedBdt,
    totalSentUsd,
    totalSentBdt,
    remainingUsdBalance,
    netAvailableUsdBalance,
    settings,
    createPersonalExpense,
    updatePersonalExpense,
    deletePersonalExpense,
  } = useAccounting();

  // Search and filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedMonth, setSelectedMonth] = useState<string>('All');

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<PersonalExpense | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Form states
  const [formDate, setFormDate] = useState(getTodayDateString());
  const [formTime, setFormTime] = useState(() => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  });
  const [formAmountBdt, setFormAmountBdt] = useState<string>('');
  const [formDollarRate, setFormDollarRate] = useState<string>(
    String(settings.defaultDollarRate || 123)
  );
  const [formCategory, setFormCategory] = useState<string>(EXPENSE_CATEGORIES[0]);
  const [formDescription, setFormDescription] = useState<string>('');
  const [formSourceFund, setFormSourceFund] = useState<string>("Kaka's Fund");
  const [formError, setFormError] = useState<string>('');

  // Open add modal
  const handleOpenAddModal = () => {
    const now = new Date();
    setFormDate(getTodayDateString());
    setFormTime(
      `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
    );
    setFormAmountBdt('');
    setFormDollarRate(String(settings.defaultDollarRate || 123));
    setFormCategory(EXPENSE_CATEGORIES[0]);
    setFormDescription('');
    setFormSourceFund("Kaka's Fund");
    setFormError('');
    setEditingExpense(null);
    setIsAddModalOpen(true);
  };

  // Open edit modal
  const handleOpenEditModal = (expense: PersonalExpense) => {
    setEditingExpense(expense);
    setFormDate(expense.date);
    setFormTime(expense.time || '');
    setFormAmountBdt(String(expense.amountBdt));
    setFormDollarRate(String(expense.dollarRate || settings.defaultDollarRate || 123));
    setFormCategory(expense.category || EXPENSE_CATEGORIES[0]);
    setFormDescription(expense.description || '');
    setFormSourceFund(expense.sourceFund || "Kaka's Fund");
    setFormError('');
    setIsAddModalOpen(true);
  };

  // Live calculation for preview
  const parsedAmountBdt = parseFloat(formAmountBdt) || 0;
  const parsedDollarRate = parseFloat(formDollarRate) || (settings.defaultDollarRate || 123);
  const liveUsdEquivalent = parsedDollarRate > 0 ? roundTo(parsedAmountBdt / parsedDollarRate, 2) : 0;

  // Handle form submit
  const handleSaveExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (parsedAmountBdt <= 0) {
      setFormError('অনুগ্রহ করে সঠিক টাকার পরিমাণ লিখুন (Amount in BDT must be > 0)');
      return;
    }
    if (parsedDollarRate <= 0) {
      setFormError('অনুগ্রহ করে সঠিক ডলার রেট লিখুন');
      return;
    }
    if (!formDescription.trim()) {
      setFormError('খরচের বিবরণ বা কারণ লিখুন (Description is required)');
      return;
    }

    if (editingExpense) {
      updatePersonalExpense(editingExpense.id, {
        date: formDate,
        time: formTime,
        amountBdt: parsedAmountBdt,
        dollarRate: parsedDollarRate,
        category: formCategory,
        description: formDescription.trim(),
        sourceFund: formSourceFund.trim() || "Kaka's Fund",
      });
    } else {
      createPersonalExpense({
        date: formDate,
        time: formTime,
        amountBdt: parsedAmountBdt,
        dollarRate: parsedDollarRate,
        category: formCategory,
        description: formDescription.trim(),
        sourceFund: formSourceFund.trim() || "Kaka's Fund",
      });
    }

    setIsAddModalOpen(false);
    setEditingExpense(null);
  };

  // Available months for filtering
  const availableMonths = useMemo(() => {
    const set = new Set<string>();
    personalExpenses.forEach((e) => {
      if (e.date) set.add(e.date.slice(0, 7));
    });
    return Array.from(set).sort().reverse();
  }, [personalExpenses]);

  // Filtered expense list
  const filteredExpenses = useMemo(() => {
    return personalExpenses.filter((item) => {
      // Search
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesDesc = item.description?.toLowerCase().includes(query);
        const matchesCat = item.category?.toLowerCase().includes(query);
        const matchesId = item.id.toLowerCase().includes(query);
        const matchesAmount = item.amountBdt.toString().includes(query);
        if (!matchesDesc && !matchesCat && !matchesId && !matchesAmount) {
          return false;
        }
      }

      // Category filter
      if (selectedCategory !== 'All' && item.category !== selectedCategory) {
        return false;
      }

      // Month filter
      if (selectedMonth !== 'All' && !item.date.startsWith(selectedMonth)) {
        return false;
      }

      return true;
    });
  }, [personalExpenses, searchQuery, selectedCategory, selectedMonth]);

  // Current month stats
  const currentMonthStr = getTodayDateString().slice(0, 7);
  const thisMonthExpensesBdt = useMemo(() => {
    return personalExpenses
      .filter((e) => e.date?.startsWith(currentMonthStr))
      .reduce((sum, e) => sum + e.amountBdt, 0);
  }, [personalExpenses, currentMonthStr]);

  const thisMonthExpensesUsd = useMemo(() => {
    return personalExpenses
      .filter((e) => e.date?.startsWith(currentMonthStr))
      .reduce((sum, e) => sum + e.amountUsd, 0);
  }, [personalExpenses, currentMonthStr]);

  // Export to CSV
  const handleExportCSV = () => {
    const filename = `personal-expenses-${getTodayDateString()}.csv`;
    exportPersonalExpensesCSV(personalExpenses, filename);
  };

  return (
    <div className="space-y-6">
      {/* Top Header Strip */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-amber-600 text-white flex items-center justify-center shadow-sm">
              <Wallet className="w-4 h-4" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Personal Expense / নিজস্ব খরচ
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            কাকার ফান্ড থেকে ব্যক্তিগত প্রয়োজনে নেওয়া বা খরচের তারিখ, সময় ও টাকার নিখুঁত খতিয়ান।
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {personalExpenses.length > 0 && (
            <button
              id="export-expense-csv-btn"
              onClick={handleExportCSV}
              className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center space-x-1.5 shadow-sm transition"
            >
              <Download className="w-3.5 h-3.5 text-slate-600" />
              <span>Export CSV</span>
            </button>
          )}

          <button
            id="add-personal-expense-btn"
            onClick={handleOpenAddModal}
            className="px-3.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold flex items-center space-x-1.5 shadow-sm shadow-amber-600/20 transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>খরচ এন্ট্রি করুন (Add Expense)</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Total Personal Expense (BDT) */}
        <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-amber-900">
            <span className="text-[11px] uppercase font-bold tracking-wider">
              মোট ব্যক্তিগত খরচ (BDT)
            </span>
            <Wallet className="w-4 h-4 text-amber-700" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-mono font-bold text-amber-950">
              {formatBDT(totalPersonalExpenseBdt)}
            </span>
          </div>
          <span className="text-[11px] text-amber-800 font-medium mt-1">
            কাকার ফান্ড থেকে নিজস্ব ব্যয়
          </span>
        </div>

        {/* Equivalent USD Used */}
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-600">
            <span className="text-[11px] uppercase font-bold tracking-wider">
              সমপরিমাণ ডলার (USD)
            </span>
            <DollarSign className="w-4 h-4 text-emerald-700" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-mono font-bold text-slate-900">
              {formatUSD(totalPersonalExpenseUsd)}
            </span>
          </div>
          <span className="text-[11px] text-slate-500 font-medium mt-1">
            ডলার রেট অনুযায়ী কনভার্টকৃত
          </span>
        </div>

        {/* This Month's Expenses */}
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-600">
            <span className="text-[11px] uppercase font-bold tracking-wider">
              চলতি মাসের খরচ ({currentMonthStr})
            </span>
            <Calendar className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-mono font-bold text-indigo-950">
              {formatBDT(thisMonthExpensesBdt)}
            </span>
          </div>
          <span className="text-[11px] text-slate-500 font-medium mt-1">
            USD: {formatUSD(thisMonthExpensesUsd)} ({personalExpenses.filter((e) => e.date?.startsWith(currentMonthStr)).length} টি এন্ট্রি)
          </span>
        </div>

        {/* Net Available USD Balance in Kaka's Fund (Clean Professional White) */}
        <div className="p-4 rounded-xl bg-white text-slate-900 shadow-2xs flex flex-col justify-between border-2 border-emerald-500/50">
          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase font-bold text-emerald-800 tracking-wider">
              ফান্ডের প্রকৃত ব্যালেন্স (Net USD)
            </span>
            <ShieldCheck className="w-4 h-4 text-emerald-700" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-mono font-bold text-emerald-700">
              {formatUSD(netAvailableUsdBalance)}
            </span>
          </div>
          <span className="text-[11px] text-slate-500 font-medium mt-1">
            জমা - কাস্টমার পেমেন্ট - নিজস্ব খরচ
          </span>
        </div>
      </div>

      {/* Transparency Ledger Health Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-sm">
        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-3 flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>কাকার ফান্ডের স্বচ্ছ হিসাব বিবরণী (Transparency Reconciliation)</span>
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-[11px] text-slate-500 font-medium block">১. কাকা থেকে মোট প্রাপ্তি (Inflows)</span>
            <span className="text-base font-bold text-slate-900 font-mono mt-1 block">
              {formatUSD(totalDepositedUsd)}
            </span>
            <span className="text-[10px] text-slate-400">মোট জমা: {formatBDT(totalDepositedBdt)}</span>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-[11px] text-slate-500 font-medium block">২. কাস্টমারদের পাঠানো হয়েছে (Payouts)</span>
            <span className="text-base font-bold text-emerald-700 font-mono mt-1 block">
              {formatUSD(totalSentUsd)}
            </span>
            <span className="text-[10px] text-slate-400">মোট সেন্ড: {formatBDT(totalSentBdt)}</span>
          </div>

          <div className="p-3 bg-amber-50/70 rounded-xl border border-amber-200">
            <span className="text-[11px] text-amber-800 font-semibold block">৩. নিজের ব্যক্তিগত খরচ (Personal Used)</span>
            <span className="text-base font-bold text-amber-900 font-mono mt-1 block">
              {formatUSD(totalPersonalExpenseUsd)}
            </span>
            <span className="text-[10px] text-amber-700">মোট খরচ: {formatBDT(totalPersonalExpenseBdt)}</span>
          </div>

          <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-300">
            <span className="text-[11px] text-emerald-800 font-bold block">৪. চূড়ান্ত অবশিষ্ট ক্যাশ (Net Available)</span>
            <span className="text-base font-bold text-emerald-900 font-mono mt-1 block">
              {formatUSD(netAvailableUsdBalance)}
            </span>
            <span className="text-[10px] text-emerald-700 font-medium">হাতে অবশিষ্ট ফান্ড</span>
          </div>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row gap-2.5">
          {/* Search box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              id="expense-search-input"
              type="text"
              placeholder="খরচের বিবরণ, ক্যাটাগরি বা আইডি খুঁজুন..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 bg-white"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Category Filter */}
          <div className="flex items-center space-x-1.5 sm:w-56">
            <Filter className="w-4 h-4 text-slate-400 shrink-0" />
            <select
              id="expense-category-filter"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full text-xs rounded-lg border border-slate-300 py-2 px-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
            >
              <option value="All">সকল ক্যাটাগরি (All)</option>
              {EXPENSE_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Month Filter */}
          {availableMonths.length > 0 && (
            <div className="flex items-center space-x-1.5 sm:w-44">
              <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
              <select
                id="expense-month-filter"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-full text-xs rounded-lg border border-slate-300 py-2 px-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              >
                <option value="All">সকল মাস (All)</option>
                {availableMonths.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Expense List / Table */}
      {filteredExpenses.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 sm:p-12 text-center shadow-sm">
          <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-3">
            <Wallet className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900">
            {personalExpenses.length === 0
              ? 'এখনো কোনো ব্যক্তিগত খরচ এন্ট্রি করা হয়নি'
              : 'কোনো ফলাফল পাওয়া যায়নি'}
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 mb-4">
            {personalExpenses.length === 0
              ? 'কাকার টাকা থেকে নিজের কোনো খরচ হয়ে থাকলে নিচে বাটন চেপে এন্ট্রি দিন। তারিখ, সময় ও টাকার পরিমাণ লিখে পরিষ্কার হিসাব রাখুন।'
              : 'আপনার ফিল্টারের সাথে মিলে এমন কোনো খরচের এন্ট্রি পাওয়া যায়নি।'}
          </p>
          {personalExpenses.length === 0 ? (
            <button
              onClick={handleOpenAddModal}
              className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold inline-flex items-center space-x-1.5 shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>প্রথম খরচ এন্ট্রি করুন</span>
            </button>
          ) : (
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('All');
                setSelectedMonth('All');
              }}
              className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 text-xs font-medium hover:bg-slate-50"
            >
              ফিল্টার রিসেট করুন
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-[11px] uppercase font-bold text-slate-700 border-b border-slate-200 tracking-wider">
                <tr>
                  <th className="py-3 px-4">তারিখ ও সময়</th>
                  <th className="py-3 px-4">আইডি ও ফান্ড</th>
                  <th className="py-3 px-4">ক্যাটাগরি</th>
                  <th className="py-3 px-4">খরচের বিবরণ / কারণ</th>
                  <th className="py-3 px-4 text-right">পরিমাণ (BDT)</th>
                  <th className="py-3 px-4 text-right">ডলার রেট</th>
                  <th className="py-3 px-4 text-right">সমপরিমাণ (USD)</th>
                  <th className="py-3 px-4 text-center">একশন</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredExpenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-amber-50/30 transition-colors">
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="font-semibold text-slate-900">{exp.date}</div>
                      <div className="text-[10px] text-slate-400 flex items-center space-x-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span>{exp.time || 'N/A'}</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="font-mono text-[11px] font-bold text-slate-700 block">
                        {exp.id}
                      </span>
                      <span className="inline-block text-[10px] text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                        {exp.sourceFund || "Kaka's Fund"}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-800 border border-slate-200">
                        <Tag className="w-3 h-3 mr-1 text-slate-500" />
                        {exp.category}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 max-w-xs">
                      <p className="text-slate-900 font-medium break-words leading-snug">
                        {exp.description}
                      </p>
                    </td>

                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <span className="font-mono text-sm font-bold text-amber-900">
                        {formatBDT(exp.amountBdt)}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right whitespace-nowrap font-mono text-slate-600">
                      ৳{exp.dollarRate || settings.defaultDollarRate || 123}
                    </td>

                    <td className="py-3.5 px-4 text-right whitespace-nowrap font-mono font-bold text-slate-900">
                      {formatUSD(exp.amountUsd)}
                    </td>

                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center space-x-1.5">
                        <button
                          id={`edit-expense-${exp.id}`}
                          onClick={() => handleOpenEditModal(exp)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-amber-700 hover:bg-amber-50 transition"
                          title="এডিট করুন"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          id={`delete-expense-${exp.id}`}
                          onClick={() => setDeletingId(exp.id)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 transition"
                          title="মুছে ফেলুন"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden divide-y divide-slate-100">
            {filteredExpenses.map((exp) => (
              <div key={exp.id} className="p-4 space-y-2.5">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-mono text-xs font-bold text-slate-800">
                        {exp.id}
                      </span>
                      <span className="text-[10px] font-semibold text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                        {exp.sourceFund || "Kaka's Fund"}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 flex items-center space-x-1.5 mt-0.5">
                      <Calendar className="w-3 h-3" />
                      <span>{exp.date}</span>
                      {exp.time && (
                        <>
                          <span>•</span>
                          <Clock className="w-3 h-3" />
                          <span>{exp.time}</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="font-mono text-base font-bold text-amber-900 block">
                      {formatBDT(exp.amountBdt)}
                    </span>
                    <span className="font-mono text-xs text-slate-600">
                      {formatUSD(exp.amountUsd)} (@৳{exp.dollarRate})
                    </span>
                  </div>
                </div>

                <div className="flex items-center space-x-1.5">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                    <Tag className="w-2.5 h-2.5 mr-1" />
                    {exp.category}
                  </span>
                </div>

                <p className="text-xs text-slate-800 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                  {exp.description}
                </p>

                <div className="flex items-center justify-end space-x-2 pt-1">
                  <button
                    onClick={() => handleOpenEditModal(exp)}
                    className="px-2.5 py-1 text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-md transition flex items-center space-x-1"
                  >
                    <Edit3 className="w-3 h-3" />
                    <span>এডিট</span>
                  </button>
                  <button
                    onClick={() => setDeletingId(exp.id)}
                    className="px-2.5 py-1 text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 rounded-md transition flex items-center space-x-1"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>মুছুন</span>
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Table Footer Summary */}
          <div className="p-3 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between text-xs text-slate-600 gap-2">
            <span>
              মোট এন্ট্রি সংখ্যা: <strong>{filteredExpenses.length}</strong> টি
            </span>
            <div className="flex items-center space-x-4 font-mono">
              <span>
                ফিল্টারকৃত BDT: <strong className="text-amber-900">{formatBDT(filteredExpenses.reduce((s, e) => s + e.amountBdt, 0))}</strong>
              </span>
              <span>
                ফিল্টারকৃত USD: <strong className="text-slate-900">{formatUSD(filteredExpenses.reduce((s, e) => s + e.amountUsd, 0))}</strong>
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Expense Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-lg bg-amber-600 text-white flex items-center justify-center">
                  <Wallet className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {editingExpense ? 'ব্যক্তিগত খরচ এডিট করুন' : 'নতুন ব্যক্তিগত খরচ এন্ট্রি'}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    কাকার ফান্ড থেকে খরচ করা টাকার হিসাব সংরক্ষণ করুন
                  </p>
                </div>
              </div>
              <button
                id="close-expense-modal"
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSaveExpense} className="space-y-4">
              {/* Date & Time Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    খরচের তারিখ (Date) *
                  </label>
                  <input
                    id="form-expense-date"
                    type="date"
                    required
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full text-xs rounded-lg border border-slate-300 py-2 px-3 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    সময় (Time) *
                  </label>
                  <input
                    id="form-expense-time"
                    type="time"
                    required
                    value={formTime}
                    onChange={(e) => setFormTime(e.target.value)}
                    className="w-full text-xs rounded-lg border border-slate-300 py-2 px-3 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Amount BDT & Dollar Rate Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    খরচের পরিমাণ (Amount in BDT) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">
                      ৳
                    </span>
                    <input
                      id="form-expense-amount"
                      type="number"
                      step="any"
                      min="1"
                      required
                      placeholder="e.g. 5000"
                      value={formAmountBdt}
                      onChange={(e) => setFormAmountBdt(e.target.value)}
                      className="w-full text-xs font-mono font-bold rounded-lg border border-slate-300 py-2 pl-7 pr-3 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    ডলার রেট (BDT per USD) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">
                      $1 =
                    </span>
                    <input
                      id="form-expense-rate"
                      type="number"
                      step="0.01"
                      min="1"
                      required
                      placeholder="123.00"
                      value={formDollarRate}
                      onChange={(e) => setFormDollarRate(e.target.value)}
                      className="w-full text-xs font-mono font-bold rounded-lg border border-slate-300 py-2 pl-10 pr-3 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                    />
                  </div>
                </div>
              </div>

              {/* Live USD Calculation Card */}
              {parsedAmountBdt > 0 && (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs flex items-center justify-between">
                  <div className="flex items-center space-x-1.5 text-amber-900">
                    <ArrowDownRight className="w-4 h-4 text-amber-600" />
                    <span>কাকার ফান্ড থেকে কর্তিত হবে (USD Equivalent):</span>
                  </div>
                  <span className="font-mono font-bold text-sm text-amber-950">
                    {formatUSD(liveUsdEquivalent)}
                  </span>
                </div>
              )}

              {/* Category Dropdown */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  খরচের ক্যাটাগরি (Category) *
                </label>
                <select
                  id="form-expense-category"
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  className="w-full text-xs rounded-lg border border-slate-300 py-2 px-3 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                >
                  {EXPENSE_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              {/* Description / Purpose */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  খরচের কারণ বা বিবরণ (Purpose / Note) *
                </label>
                <textarea
                  id="form-expense-description"
                  required
                  rows={2}
                  placeholder="যেমন: জরুরি ওষুধের বিল, বাজার খরচ, ক্যাশ উইথড্রয়াল..."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full text-xs rounded-lg border border-slate-300 py-2 px-3 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                />
              </div>

              {/* Source Fund */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  কোন ফান্ড থেকে নেওয়া (Source Fund)
                </label>
                <input
                  id="form-expense-source"
                  type="text"
                  value={formSourceFund}
                  onChange={(e) => setFormSourceFund(e.target.value)}
                  placeholder="Kaka's Fund"
                  className="w-full text-xs rounded-lg border border-slate-300 py-2 px-3 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                />
              </div>

              {/* Action buttons */}
              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                >
                  বাতিল করুন
                </button>
                <button
                  id="submit-expense-form-btn"
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition shadow-sm"
                >
                  {editingExpense ? 'আপডেট করুন (Save Changes)' : 'খরচ সংরক্ষণ করুন (Save Expense)'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200 space-y-3 animate-in fade-in">
            <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div className="text-center">
              <h3 className="text-sm font-bold text-slate-900">
                আপনি কি নিশ্চিত এই খরচটি মুছে ফেলতে চান?
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                মুছে ফেললে এই এন্ট্রিটি খতিয়ান থেকে স্থায়ীভাবে মুছে যাবে এবং ব্যালেন্স স্বয়ংক্রিয়ভাবে সমন্বয় হবে।
              </p>
            </div>
            <div className="flex items-center justify-center space-x-2 pt-2">
              <button
                onClick={() => setDeletingId(null)}
                className="px-3.5 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                বাতিল
              </button>
              <button
                id="confirm-delete-expense-btn"
                onClick={() => {
                  deletePersonalExpense(deletingId);
                  setDeletingId(null);
                }}
                className="px-4 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold"
              >
                হ্যাঁ, মুছে ফেলুন
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
