/**
 * Core financial calculations for USD/BDT cross-border accounting.
 * Strictly adheres to business rules:
 * - Expected BDT = USD * Dollar Rate
 * - Bank Charge = Expected BDT - Actual Send Amount
 * - Commission = USD * Commission Rate (default 0.50 BDT / USD)
 * - Profit = Bank Charge + Commission (NOT minus! Always Bank Charge + Commission)
 * - USD Balance = Total Deposited USD - Total Completed Sent USD
 */

export function roundTo(val: number, decimals: number = 2): number {
  const factor = Math.pow(10, decimals);
  return Math.round((val + Number.EPSILON) * factor) / factor;
}

export function computeExpectedBDT(sendUsd: number, dollarRate: number): number {
  if (isNaN(sendUsd) || isNaN(dollarRate) || sendUsd < 0 || dollarRate < 0) return 0;
  return roundTo(sendUsd * dollarRate, 2);
}

export function computeBankCharge(expectedBdt: number, actualSend: number): number {
  if (isNaN(expectedBdt) || isNaN(actualSend)) return 0;
  return roundTo(expectedBdt - actualSend, 2);
}

export function computeCommission(sendUsd: number, commissionRate: number): number {
  if (isNaN(sendUsd) || isNaN(commissionRate) || sendUsd < 0) return 0;
  return roundTo(sendUsd * commissionRate, 2);
}

export function computeProfit(bankCharge: number, commission: number): number {
  if (isNaN(bankCharge) || isNaN(commission)) return 0;
  // CRITICAL RULE: Profit = Bank Charge + Commission
  return roundTo(bankCharge + commission, 2);
}

export function computeDepositBDT(usdAmount: number, receivingRate: number): number {
  if (isNaN(usdAmount) || isNaN(receivingRate) || usdAmount < 0 || receivingRate < 0) return 0;
  return roundTo(usdAmount * receivingRate, 2);
}

export function formatBDT(amount: number, showDecimalIfZero = false): string {
  if (amount === undefined || amount === null || isNaN(amount)) return '৳0';
  const hasDecimals = amount % 1 !== 0;
  const formatted = new Intl.NumberFormat('en-BD', {
    minimumFractionDigits: hasDecimals || showDecimalIfZero ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(amount);
  return `৳${formatted}`;
}

export function formatUSD(amount: number, showDecimalIfZero = false): string {
  if (amount === undefined || amount === null || isNaN(amount)) return '$0';
  const hasDecimals = amount % 1 !== 0;
  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: hasDecimals || showDecimalIfZero ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(amount);
  return `$${formatted}`;
}

export function formatNumber(amount: number, minDecimals = 0, maxDecimals = 2): string {
  if (amount === undefined || amount === null || isNaN(amount)) return '0';
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: minDecimals,
    maximumFractionDigits: maxDecimals,
  }).format(amount);
}

export function formatDate(dateString: string): string {
  if (!dateString) return '-';
  try {
    const parts = dateString.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const d = new Date(year, month, day);
      return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    }
    return dateString;
  } catch {
    return dateString;
  }
}

export function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
