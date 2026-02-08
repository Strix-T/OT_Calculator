import { CalcResult, PayMode } from "./types";

export function calcFromHours(params: {
  hours: number[];
  payRate: number;
  taxPercent: number;
  mode: PayMode;
  threshold?: number; // default 9.5
}): CalcResult {
  const threshold = params.threshold ?? 9.5;
  const multiplier = params.mode === "triple" ? 1.5 : 2.5;
  const DAILY_BASE_HOURS = 8;
  const DAILY_TIME_AND_HALF_MULTIPLIER = 1.5;

  const rows = params.hours.map((h) => {
    const regularHours = Math.min(h, threshold);
    const overtimeHours = Math.max(0, h - threshold);
    return { hours: h, regularHours, overtimeHours };
  });

  const totalRegularHours = rows.reduce((a, r) => a + r.regularHours, 0);
  const totalOvertimeHours = rows.reduce((a, r) => a + r.overtimeHours, 0);

  // Regular pay is computed per-day:
  // - up to 8h at base rate
  // - all hours over 8h at 1.5× (independent of the 9.5 threshold)
  const regularPay = rows.reduce((sum, r) => {
    const baseHours = Math.min(r.hours, DAILY_BASE_HOURS);
    const timeAndHalfHours = Math.max(0, r.hours - DAILY_BASE_HOURS);
    return (
      sum +
      baseHours * params.payRate +
      timeAndHalfHours * params.payRate * DAILY_TIME_AND_HALF_MULTIPLIER
    );
  }, 0);

  const overtimePay = totalOvertimeHours * params.payRate * multiplier;
  const grossSubtotal = regularPay + overtimePay;

  const taxRate = params.taxPercent / 100;

  const regularTax = regularPay * taxRate;
  const overtimeTax = overtimePay * taxRate;
  const tax = regularTax + overtimeTax;

  const regularTotal = regularPay - regularTax;
  const overtimeTotal = overtimePay - overtimeTax;
  const netTotal = regularTotal + overtimeTotal;

  return {
    threshold,
    multiplier,
    rows,
    totals: {
      totalRegularHours,
      totalOvertimeHours,
      regularPay,
      regularTax,
      regularTotal,
      overtimePay,
      overtimeTax,
      overtimeTotal,
      grossSubtotal,
      tax,
      netTotal,
    },
  };
}
