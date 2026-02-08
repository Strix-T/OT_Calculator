'use client';

import { CalcResult, PayMode } from "@/lib/types";

type Props = {
  calc: CalcResult;
  mode: PayMode;
  payRate: number;
  taxPercent: number;
};

export default function MoneySummary({ calc, mode, payRate, taxPercent }: Props) {
  const thresholdLabel = calc.threshold.toFixed(1);

  const items = [
    { label: "Regular pay", value: calc.totals.regularPay },
    { label: `${thresholdLabel} pay`, value: calc.totals.overtimePay },
    { label: "Regular tax", value: calc.totals.regularTax },
    { label: `${thresholdLabel} tax`, value: calc.totals.overtimeTax },
    { label: "Regular total", value: calc.totals.regularTotal },
    { label: `${thresholdLabel} total`, value: calc.totals.overtimeTotal },
    { label: "Net total", value: calc.totals.netTotal, highlight: true, fullWidth: true },
  ];

  return (
    <section className="space-y-3 rounded-lg border bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Summary</h2>
          <p className="text-sm text-gray-600">
            Mode: {mode === "triple" ? "Triple (1.5×)" : "Quad (2.5×)"} • Pay rate ${payRate.toFixed(2)} • Tax {taxPercent.toFixed(2)}%
          </p>
        </div>
        <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
          Threshold {calc.threshold.toFixed(1)}h
        </span>
      </div>

      <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
        {items.map((item) => (
          <div
            key={item.label}
            className={`flex items-center justify-between rounded border px-3 py-2 ${
              item.highlight
                ? "border-black bg-black text-white"
                : "border-gray-200 bg-gray-50 text-gray-800"
            } ${item.fullWidth ? "sm:col-span-2" : ""}`}
          >
            <span>{item.label}</span>
            <span className="font-semibold tabular-nums">${item.value.toFixed(2)}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
