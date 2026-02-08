export type PayMode = "triple" | "quad";

export type ParseApiResponse = {
  hours: number[];
  rawText?: string;
  warnings?: string[];
  confidence?: number;
};

export type CalcRow = {
  hours: number;
  regularHours: number;
  overtimeHours: number;
};

export type CalcTotals = {
  totalRegularHours: number;
  totalOvertimeHours: number;
  regularPay: number;
  regularTax: number;
  regularTotal: number;
  overtimePay: number;
  overtimeTax: number;
  overtimeTotal: number;
  grossSubtotal: number;
  tax: number;
  netTotal: number;
};

export type CalcResult = {
  threshold: number;
  multiplier: number;
  rows: CalcRow[];
  totals: CalcTotals;
};
