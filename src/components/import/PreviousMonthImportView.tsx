import React, { useState, useRef } from 'react';
import {
  Upload,
  FileSpreadsheet,
  Download,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowRight,
  Database,
  Layers,
  Sparkles,
  Info,
  DollarSign,
  Plus,
  Trash2,
  Check,
  RefreshCw,
  FileText,
} from 'lucide-react';
import { useAccounting } from '../../context/AccountingContext';
import {
  formatBDT,
  formatUSD,
  formatNumber,
  getTodayDateString,
  computeExpectedBDT,
  computeBankCharge,
  computeCommission,
  computeProfit,
  roundTo,
} from '../../utils/calculations';

interface ParsedImportRow {
  id: string;
  date: string;
  recipientName: string;
  accountNumber: string;
  bankName: string;
  sendUsd: number;
  dollarRate: number;
  actualSend: number;
  referenceBy: string;
  note: string;
  selected: boolean;
  isValid: boolean;
  errorMessage?: string;
}

export function PreviousMonthImportView() {
  const {
    settings,
    transactions,
    importTransactionsList,
    createDeposit,
    setActiveTab,
    setTransactionSearchFilter,
  } = useAccounting();

  const [activeMode, setActiveMode] = useState<'csv' | 'paste' | 'rollover'>('csv');
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().slice(0, 7); // YYYY-MM of previous month
  });

  // Mode 1: CSV State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [parsedRows, setParsedRows] = useState<ParsedImportRow[]>([]);
  const [isParsing, setIsParsing] = useState<boolean>(false);
  const [importStatus, setImportStatus] = useState<{
    type: 'success' | 'error';
    message: string;
    count?: number;
  } | null>(null);

  // Mode 2: Quick Paste State
  const [pasteContent, setPasteContent] = useState<string>('');
  const [pasteDefaultReference, setPasteDefaultReference] = useState<string>(
    settings.references[0] || 'Kaka'
  );

  // Mode 3: Rollover Balance State
  const [rolloverSender, setRolloverSender] = useState<string>(settings.references[0] || 'Kaka');
  const [rolloverUsd, setRolloverUsd] = useState<string>('');
  const [rolloverRate, setRolloverRate] = useState<string>(
    settings.defaultDollarRate ? String(settings.defaultDollarRate) : '123'
  );
  const [rolloverMethod, setRolloverMethod] = useState<string>('Cash / Carry-over');
  const [rolloverNote, setRolloverNote] = useState<string>('Previous Month Closing Balance Rollover');

  // Month options for dropdown: previous 6 months
  const monthOptions = React.useMemo(() => {
    const list: Array<{ value: string; label: string }> = [];
    const d = new Date();
    for (let i = 1; i <= 6; i++) {
      const past = new Date(d.getFullYear(), d.getMonth() - i, 1);
      const val = past.toISOString().slice(0, 7);
      const monthLabel = past.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      list.push({ value: val, label: monthLabel });
    }
    return list;
  }, []);

  // Download Sample Template CSV
  const handleDownloadTemplate = () => {
    const headers = [
      'Date',
      'Recipient Name',
      'Account Number',
      'Bank Name',
      'Send USD',
      'Dollar Rate',
      'Actual Send BDT',
      'Reference / Source',
      'Note',
    ];
    const sampleRows = [
      [
        `${selectedMonth}-05`,
        'Kabir Hossain',
        '2050123456789',
        'Islami Bank Bangladesh',
        '300',
        '123.50',
        '37000',
        settings.references[0] || 'Kaka',
        'Family monthly allowance',
      ],
      [
        `${selectedMonth}-12`,
        'Md. Faruk Ahmed',
        '01711223344',
        'bKash (Personal)',
        '150',
        '123.00',
        '18400',
        settings.references[0] || 'Kaka',
        'Emergency bill payment',
      ],
      [
        `${selectedMonth}-20`,
        'Shahidul Islam',
        '151100987654',
        'Dutch-Bangla Bank',
        '500',
        '124.00',
        '61900',
        settings.references[1] || settings.references[0] || 'Kaka',
        'Shop supply invoice',
      ],
    ];

    const csvContent =
      '\uFEFF' +
      [headers.join(','), ...sampleRows.map((r) => r.map((c) => `"${c}"`).join(','))].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `previous-month-template-${selectedMonth}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Parse CSV File
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsParsing(true);
    setImportStatus(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        if (!text) {
          throw new Error('File is empty.');
        }

        const lines = text
          .split(/\r?\n/)
          .map((l) => l.trim())
          .filter((l) => l.length > 0);

        if (lines.length <= 1) {
          throw new Error('File does not contain data rows.');
        }

        // Parse header
        const headerCols = lines[0].split(',').map((h) => h.replace(/^["']|["']$/g, '').trim().toLowerCase());
        
        const dateIdx = headerCols.findIndex((h) => h.includes('date') || h.includes('তারিখ'));
        const nameIdx = headerCols.findIndex((h) => h.includes('recipient') || h.includes('name') || h.includes('নাম'));
        const accIdx = headerCols.findIndex((h) => h.includes('account') || h.includes('acc') || h.includes('একাউন্ট'));
        const bankIdx = headerCols.findIndex((h) => h.includes('bank') || h.includes('ব্যাংক'));
        const usdIdx = headerCols.findIndex((h) => h.includes('usd') || h.includes('dollar') || h.includes('ডলার'));
        const rateIdx = headerCols.findIndex((h) => h.includes('rate') || h.includes('রেট'));
        const sendBdtIdx = headerCols.findIndex((h) => h.includes('actual') || h.includes('send amount') || h.includes('bdt') || h.includes('টাকা'));
        const refIdx = headerCols.findIndex((h) => h.includes('ref') || h.includes('source') || h.includes('রেফারেন্স'));
        const noteIdx = headerCols.findIndex((h) => h.includes('note') || h.includes('remark') || h.includes('মন্তব্য'));

        const parsed: ParsedImportRow[] = [];

        for (let i = 1; i < lines.length; i++) {
          const raw = lines[i];
          // Handle quoted commas regex
          const cols: string[] = [];
          let current = '';
          let inQuotes = false;
          for (let charIdx = 0; charIdx < raw.length; charIdx++) {
            const c = raw[charIdx];
            if (c === '"' || c === "'") {
              inQuotes = !inQuotes;
            } else if (c === ',' && !inQuotes) {
              cols.push(current.trim());
              current = '';
            } else {
              current += c;
            }
          }
          cols.push(current.trim());

          const clean = (idx: number, fallback = '') =>
            idx >= 0 && cols[idx] !== undefined ? cols[idx].replace(/^["']|["']$/g, '').trim() : fallback;

          const recipientName = clean(nameIdx, `Recipient ${i}`);
          const accountNumber = clean(accIdx, 'N/A');
          const bankName = clean(bankIdx, settings.banks[0] || 'Dutch-Bangla Bank');
          const rawDate = clean(dateIdx);
          const date = rawDate && /^\d{4}-\d{2}-\d{2}$/.test(rawDate) ? rawDate : `${selectedMonth}-${String((i % 28) + 1).padStart(2, '0')}`;
          const sendUsd = parseFloat(clean(usdIdx, '0').replace(/[^0-9.]/g, '')) || 0;
          const dollarRate = parseFloat(clean(rateIdx, '123').replace(/[^0-9.]/g, '')) || parseFloat(settings.defaultDollarRate ? String(settings.defaultDollarRate) : '123');
          const rawActualSend = parseFloat(clean(sendBdtIdx, '0').replace(/[^0-9.]/g, ''));
          const expectedBdt = computeExpectedBDT(sendUsd, dollarRate);
          const actualSend = !isNaN(rawActualSend) && rawActualSend > 0 ? rawActualSend : expectedBdt;
          const referenceBy = clean(refIdx, settings.references[0] || 'Kaka');
          const note = clean(noteIdx, `Imported from ${selectedMonth} accounts`);

          const isValid = recipientName.trim().length > 0 && sendUsd > 0 && dollarRate > 0;
          let errorMessage: string | undefined;
          if (!recipientName) errorMessage = 'Missing name';
          else if (sendUsd <= 0) errorMessage = 'Invalid USD';
          else if (dollarRate <= 0) errorMessage = 'Invalid Rate';

          parsed.push({
            id: `ROW-${i}-${Date.now().toString(36)}`,
            date,
            recipientName,
            accountNumber,
            bankName,
            sendUsd,
            dollarRate,
            actualSend,
            referenceBy,
            note,
            selected: isValid,
            isValid,
            errorMessage,
          });
        }

        setParsedRows(parsed);
      } catch (err: any) {
        setImportStatus({
          type: 'error',
          message: err.message || 'Error parsing CSV file. Please check format.',
        });
      } finally {
        setIsParsing(false);
      }
    };
    reader.readAsText(file);
    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Toggle selection
  const handleToggleRow = (id: string) => {
    setParsedRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, selected: !r.selected } : r))
    );
  };

  const handleToggleAll = (select: boolean) => {
    setParsedRows((prev) =>
      prev.map((r) => (r.isValid ? { ...r, selected: select } : r))
    );
  };

  // Execute Import
  const handleExecuteImport = () => {
    const toImport = parsedRows.filter((r) => r.selected && r.isValid);
    if (toImport.length === 0) {
      setImportStatus({
        type: 'error',
        message: 'No valid rows selected for import.',
      });
      return;
    }

    const payload = toImport.map((r) => ({
      date: r.date,
      recipientName: r.recipientName,
      accountNumber: r.accountNumber,
      bankName: r.bankName,
      sendUsd: r.sendUsd,
      dollarRate: r.dollarRate,
      actualSend: r.actualSend,
      referenceBy: r.referenceBy,
      note: r.note,
    }));

    const res = importTransactionsList(payload);

    setImportStatus({
      type: 'success',
      message: `সফলভাবে ${res.successful}টি পূর্ববর্তী মাসের লেনদেন ইমপোর্ট সম্পন্ন হয়েছে! (Successfully imported ${res.successful} transactions for ${selectedMonth})`,
      count: res.successful,
    });

    setParsedRows([]);
  };

  // Parse Text Paste
  const handleParsePaste = () => {
    if (!pasteContent.trim()) {
      setImportStatus({
        type: 'error',
        message: 'Please paste records first.',
      });
      return;
    }

    const lines = pasteContent
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    const parsed: ParsedImportRow[] = [];

    lines.forEach((line, i) => {
      // Split by tab or pipe or comma
      const parts = line.includes('\t')
        ? line.split('\t')
        : line.includes('|')
        ? line.split('|')
        : line.split(',');

      const cleanCol = (idx: number, fallback = '') =>
        parts[idx] !== undefined ? parts[idx].trim() : fallback;

      if (parts.length >= 2) {
        // Expected formats:
        // Format A: Date, Recipient, Acc, Bank, USD, Rate, ActualBDT
        // Format B: Recipient, Acc, Bank, USD, Rate
        // Format C: Recipient, USD, Rate
        let date = `${selectedMonth}-15`;
        let recipientName = cleanCol(0);
        let accountNumber = cleanCol(1, 'N/A');
        let bankName = cleanCol(2, settings.banks[0] || 'Dutch-Bangla Bank');
        let sendUsd = 0;
        let dollarRate = parseFloat(settings.defaultDollarRate ? String(settings.defaultDollarRate) : '123');
        let actualSend = 0;

        if (/^\d{4}-\d{2}-\d{2}$/.test(parts[0].trim())) {
          // Has date first
          date = parts[0].trim();
          recipientName = cleanCol(1);
          accountNumber = cleanCol(2, 'N/A');
          bankName = cleanCol(3, settings.banks[0] || 'Dutch-Bangla Bank');
          sendUsd = parseFloat(cleanCol(4, '0').replace(/[^0-9.]/g, '')) || 0;
          dollarRate = parseFloat(cleanCol(5, '123').replace(/[^0-9.]/g, '')) || dollarRate;
          actualSend = parseFloat(cleanCol(6, '0').replace(/[^0-9.]/g, '')) || 0;
        } else {
          // No date
          sendUsd = parseFloat(cleanCol(3, '0').replace(/[^0-9.]/g, '')) || 0;
          dollarRate = parseFloat(cleanCol(4, '123').replace(/[^0-9.]/g, '')) || dollarRate;
          actualSend = parseFloat(cleanCol(5, '0').replace(/[^0-9.]/g, '')) || 0;
        }

        const expectedBdt = computeExpectedBDT(sendUsd, dollarRate);
        if (!actualSend || isNaN(actualSend)) actualSend = expectedBdt;

        const isValid = recipientName.trim().length > 0 && sendUsd > 0;

        parsed.push({
          id: `PASTE-${i}-${Date.now().toString(36)}`,
          date,
          recipientName,
          accountNumber,
          bankName,
          sendUsd,
          dollarRate,
          actualSend,
          referenceBy: pasteDefaultReference,
          note: `Bulk pasted for ${selectedMonth}`,
          selected: isValid,
          isValid,
        });
      }
    });

    if (parsed.length === 0) {
      setImportStatus({
        type: 'error',
        message: 'Could not extract valid records from pasted text.',
      });
      return;
    }

    setParsedRows(parsed);
    setActiveMode('csv'); // Switch to preview
  };

  // Mode 3: Save Rollover Deposit
  const handleSaveRollover = (e: React.FormEvent) => {
    e.preventDefault();
    const usd = parseFloat(rolloverUsd);
    const rate = parseFloat(rolloverRate);

    if (isNaN(usd) || usd <= 0) {
      setImportStatus({
        type: 'error',
        message: 'Please enter a valid unspent USD rollover amount.',
      });
      return;
    }

    if (isNaN(rate) || rate <= 0) {
      setImportStatus({
        type: 'error',
        message: 'Please enter a valid dollar rate for the rollover balance.',
      });
      return;
    }

    const depDate = `${selectedMonth}-28`;

    createDeposit({
      date: depDate,
      senderName: rolloverSender,
      usdAmount: usd,
      receivingRate: rate,
      receivingMethod: rolloverMethod,
      note: `${rolloverNote} (${selectedMonth})`,
    });

    setImportStatus({
      type: 'success',
      message: `পূর্ববর্তী মাসের অবশিষ্ট ${formatUSD(usd)} (৳${formatBDT(usd * rate)}) সফলভাবে জমা হিসেবে যুক্ত হয়েছে!`,
    });

    setRolloverUsd('');
  };

  // Group existing transactions by month
  const monthlyHistory = React.useMemo(() => {
    const map = new Map<string, { count: number; usd: number; bdt: number; profit: number }>();
    transactions.forEach((t) => {
      const monthKey = t.date.slice(0, 7);
      const cur = map.get(monthKey) || { count: 0, usd: 0, bdt: 0, profit: 0 };
      cur.count += 1;
      cur.usd += t.sendUsd;
      cur.bdt += t.actualSend;
      cur.profit += t.profit;
      map.set(monthKey, cur);
    });

    return Array.from(map.entries()).sort((a, b) => (a[0] > b[0] ? -1 : 1));
  }, [transactions]);

  const selectedCount = parsedRows.filter((r) => r.selected && r.isValid).length;
  const totalPreviewUsd = parsedRows
    .filter((r) => r.selected && r.isValid)
    .reduce((s, r) => s + r.sendUsd, 0);
  const totalPreviewBdt = parsedRows
    .filter((r) => r.selected && r.isValid)
    .reduce((s, r) => s + r.actualSend, 0);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header Strip */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-200">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Import Previous Month's Accounts
            </h2>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300">
              আগের মাসের হিসাব ইমপোর্ট
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
            Import past cross-border payout lists, roll over unspent balances, or bulk-upload historical records.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={() => setActiveTab('transactions')}
            className="px-3.5 py-1.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition"
          >
            View All Transactions
          </button>
        </div>
      </div>

      {/* Status Alerts */}
      {importStatus && (
        <div
          className={`p-4 rounded-2xl border flex items-start space-x-3 text-xs font-semibold ${
            importStatus.type === 'success'
              ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
              : 'bg-rose-50 border-rose-300 text-rose-900'
          }`}
        >
          {importStatus.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
          )}
          <div className="flex-1">
            <p>{importStatus.message}</p>
            {importStatus.type === 'success' && (
              <div className="mt-2 flex space-x-3">
                <button
                  onClick={() => setActiveTab('transactions')}
                  className="text-xs font-bold text-emerald-800 underline hover:text-emerald-950"
                >
                  Go to Transaction History &rarr;
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Target Month Selector & Quick Actions */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
              Target Accounting Month (কোন মাসের হিসাব):
            </span>
            <div className="flex items-center space-x-2 mt-0.5">
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-900 font-bold text-sm bg-white focus:ring-2 focus:ring-emerald-600"
              >
                {monthOptions.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label} ({m.value})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={handleDownloadTemplate}
            className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center space-x-1.5 transition"
            title="Download CSV format template"
          >
            <Download className="w-3.5 h-3.5 text-slate-600" />
            <span>Download CSV Template</span>
          </button>
        </div>
      </div>

      {/* Import Method Tabs */}
      <div className="flex border-b border-slate-200 space-x-2">
        <button
          onClick={() => setActiveMode('csv')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition flex items-center space-x-2 ${
            activeMode === 'csv'
              ? 'border-emerald-600 text-emerald-800 bg-emerald-50/50'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>Upload CSV / Excel File</span>
        </button>

        <button
          onClick={() => setActiveMode('paste')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition flex items-center space-x-2 ${
            activeMode === 'paste'
              ? 'border-emerald-600 text-emerald-800 bg-emerald-50/50'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Quick Bulk Text / Copy-Paste</span>
        </button>

        <button
          onClick={() => setActiveMode('rollover')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition flex items-center space-x-2 ${
            activeMode === 'rollover'
              ? 'border-emerald-600 text-emerald-800 bg-emerald-50/50'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <DollarSign className="w-4 h-4" />
          <span>Month-End Balance Rollover (উদ্বৃত্ত জমা)</span>
        </button>
      </div>

      {/* TAB 1: CSV FILE UPLOAD */}
      {activeMode === 'csv' && (
        <div className="space-y-5">
          {parsedRows.length === 0 ? (
            <div className="bg-white rounded-2xl border-2 border-dashed border-slate-300 p-8 text-center space-y-4 hover:border-emerald-500 transition">
              <input
                type="file"
                ref={fileInputRef}
                accept=".csv,.txt"
                onChange={handleFileUpload}
                className="hidden"
              />
              <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                <Upload className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Select Previous Month's CSV or Excel File
                </h3>
                <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                  Upload file containing: Recipient Name, Account Number, Bank Name, Send USD, Dollar Rate, and Actual Send BDT.
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs flex items-center space-x-2 shadow-sm transition"
                >
                  <Upload className="w-4 h-4" />
                  <span>Choose CSV File</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadTemplate}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center space-x-2 transition"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Sample Template</span>
                </button>
              </div>
            </div>
          ) : (
            /* PREVIEW TABLE OF PARSED ROWS */
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden space-y-4 p-5">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-200">
                <div>
                  <h3 className="font-bold text-base text-slate-900">
                    Preview Parsed Records ({selectedCount} of {parsedRows.length} selected)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Review and verify calculation columns before saving to ledger.
                  </p>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => handleToggleAll(true)}
                    className="px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                  >
                    Select All
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggleAll(false)}
                    className="px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                  >
                    Deselect All
                  </button>
                  <button
                    type="button"
                    onClick={() => setParsedRows([])}
                    className="px-2.5 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-lg"
                  >
                    Clear File
                  </button>
                </div>
              </div>

              {/* Summary of Parsed Batch */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Valid Rows</span>
                  <span className="font-bold text-slate-900 text-sm">{selectedCount} Transactions</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Total USD</span>
                  <span className="font-bold text-slate-900 text-sm font-mono">{formatUSD(totalPreviewUsd)}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Total BDT</span>
                  <span className="font-bold text-slate-900 text-sm font-mono">{formatBDT(totalPreviewBdt)}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Target Month</span>
                  <span className="font-bold text-emerald-800 text-sm">{selectedMonth}</span>
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto max-h-96 border border-slate-200 rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-700 uppercase font-bold tracking-wider sticky top-0 z-10 text-[10px]">
                    <tr>
                      <th className="p-3 w-10">
                        <input
                          type="checkbox"
                          checked={selectedCount === parsedRows.filter((r) => r.isValid).length}
                          onChange={(e) => handleToggleAll(e.target.checked)}
                          className="rounded text-emerald-700"
                        />
                      </th>
                      <th className="p-3">Date</th>
                      <th className="p-3">Recipient & Bank</th>
                      <th className="p-3 text-right">Send USD</th>
                      <th className="p-3 text-right">Rate</th>
                      <th className="p-3 text-right">Actual Send BDT</th>
                      <th className="p-3">Ref</th>
                      <th className="p-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    {parsedRows.map((row) => (
                      <tr
                        key={row.id}
                        className={`hover:bg-slate-50 transition ${
                          !row.isValid ? 'bg-rose-50/50' : row.selected ? 'bg-emerald-50/30' : ''
                        }`}
                      >
                        <td className="p-3">
                          <input
                            type="checkbox"
                            disabled={!row.isValid}
                            checked={row.selected}
                            onChange={() => handleToggleRow(row.id)}
                            className="rounded text-emerald-700"
                          />
                        </td>
                        <td className="p-3 text-slate-600 font-sans">{row.date}</td>
                        <td className="p-3 font-sans">
                          <div className="font-bold text-slate-900">{row.recipientName}</div>
                          <div className="text-[11px] text-slate-500 font-mono">
                            {row.bankName} • {row.accountNumber}
                          </div>
                        </td>
                        <td className="p-3 text-right font-bold text-slate-900">
                          {formatUSD(row.sendUsd)}
                        </td>
                        <td className="p-3 text-right text-slate-700">৳{row.dollarRate}</td>
                        <td className="p-3 text-right font-bold text-emerald-800">
                          {formatBDT(row.actualSend)}
                        </td>
                        <td className="p-3 font-sans">
                          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-bold">
                            {row.referenceBy}
                          </span>
                        </td>
                        <td className="p-3 font-sans">
                          {row.isValid ? (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                              Valid
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[10px] font-bold">
                              {row.errorMessage || 'Invalid'}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Confirm Import Action */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setParsedRows([])}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleExecuteImport}
                  disabled={selectedCount === 0}
                  className="px-6 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs flex items-center space-x-2 shadow-md shadow-emerald-700/20 transition disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                  <span>Import {selectedCount} Records to History</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: QUICK BULK TEXT / PASTE */}
      {activeMode === 'paste' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div>
            <h3 className="font-bold text-base text-slate-900">
              Bulk Text Paste (দ্রুত তালিকা পেস্ট করুন)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Copy and paste rows from Excel, Google Sheets, or WhatsApp message. Supports tab, comma, or pipe separator.
            </p>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-1 font-mono">
            <span className="font-bold text-slate-800 font-sans block text-[11px] uppercase">
              Supported Columns Format:
            </span>
            <p className="text-[11px]">Date | Recipient Name | Account Number | Bank | USD | DollarRate | ActualSendBDT</p>
            <p className="text-[11px] text-slate-500">Example: 2026-08-10, Md. Kabir, 2050123456, Islami Bank, 250, 123.5, 30875</p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Paste Your Records:
            </label>
            <textarea
              rows={8}
              value={pasteContent}
              onChange={(e) => setPasteContent(e.target.value)}
              placeholder="Kabir Hossain	2050123456789	Islami Bank	300	123.50	37000&#10;Faruk Ahmed	01711223344	bKash	150	123.00	18400"
              className="w-full p-3 rounded-xl border border-slate-300 font-mono text-xs focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 transition"
            />
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2">
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold text-slate-700">Default Reference:</span>
              <div className="flex space-x-1">
                {settings.references.map((ref) => (
                  <button
                    key={ref}
                    type="button"
                    onClick={() => setPasteDefaultReference(ref)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                      pasteDefaultReference === ref
                        ? 'bg-emerald-700 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {ref}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={handleParsePaste}
              className="px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs flex items-center space-x-2 shadow-sm transition"
            >
              <Sparkles className="w-4 h-4" />
              <span>Preview & Verify Pasted Records</span>
            </button>
          </div>
        </div>
      )}

      {/* TAB 3: MONTH-END BALANCE ROLLOVER */}
      {activeMode === 'rollover' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-5">
          <div>
            <h3 className="font-bold text-base text-slate-900">
              Month-End Unspent Balance Rollover (পূর্ববর্তী মাসের উদ্বৃত্ত জমা)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              If Kaka or a fund source had remaining unspent USD at the end of last month, record it as an opening deposit to balance the ledger.
            </p>
          </div>

          <form onSubmit={handleSaveRollover} className="space-y-4 max-w-xl">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                1. Fund Source / Reference <span className="text-rose-500">*</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {settings.references.map((ref) => (
                  <button
                    key={ref}
                    type="button"
                    onClick={() => setRolloverSender(ref)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 ${
                      rolloverSender === ref
                        ? 'bg-emerald-700 text-white shadow-xs ring-2 ring-emerald-500/40'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                    }`}
                  >
                    <span>{ref}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  2. Remaining USD Amount ($) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-slate-400 font-bold">$</span>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    placeholder="e.g. 1500"
                    value={rolloverUsd}
                    onChange={(e) => setRolloverUsd(e.target.value)}
                    required
                    className="w-full pl-8 pr-3 py-2 rounded-lg border border-slate-300 text-sm font-bold font-mono focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  3. Exchange Rate (BDT / USD) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-slate-400 font-bold">৳</span>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    placeholder="123"
                    value={rolloverRate}
                    onChange={(e) => setRolloverRate(e.target.value)}
                    required
                    className="w-full pl-8 pr-3 py-2 rounded-lg border border-slate-300 text-sm font-bold font-mono focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600"
                  />
                </div>
              </div>
            </div>

            {rolloverUsd && rolloverRate && (
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs flex items-center justify-between">
                <span className="text-emerald-900 font-semibold">Total Rollover Value in BDT:</span>
                <span className="font-mono font-bold text-emerald-900 text-base">
                  {formatBDT((parseFloat(rolloverUsd) || 0) * (parseFloat(rolloverRate) || 0))}
                </span>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                4. Description / Note
              </label>
              <input
                type="text"
                value={rolloverNote}
                onChange={(e) => setRolloverNote(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="px-6 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs flex items-center space-x-2 shadow-sm transition"
              >
                <Check className="w-4 h-4" />
                <span>Save Rollover Balance to Ledger</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Historical Months Stored */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4 text-emerald-700" />
            <span className="font-bold text-sm text-slate-900">
              Recorded Historical Months in System (বর্তমান সংরক্ষিত মাসের হিসাব)
            </span>
          </div>
          <span className="text-xs text-slate-500 font-medium">
            {monthlyHistory.length} months active
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {monthlyHistory.map(([monthKey, stat]) => (
            <div
              key={monthKey}
              className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1.5 hover:bg-slate-100/70 transition"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-slate-900">{monthKey}</span>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 font-bold">
                  {stat.count} txns
                </span>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-600 font-mono">
                <span>Sent: {formatUSD(stat.usd)}</span>
                <span className="text-emerald-700 font-bold">+{formatBDT(stat.profit)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
