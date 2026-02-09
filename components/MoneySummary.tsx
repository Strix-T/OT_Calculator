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

  const regularItems = [
    { label: "Regular pay", value: calc.totals.regularPay },
    { label: "Regular tax", value: calc.totals.regularTax },
    { label: "Regular total", value: calc.totals.regularTotal },
  ];

  const overtimeItems = [
    { label: `${thresholdLabel} pay`, value: calc.totals.overtimePay },
    { label: `${thresholdLabel} tax`, value: calc.totals.overtimeTax },
    { label: `${thresholdLabel} total`, value: calc.totals.overtimeTotal },
  ];

  const netItem = { label: "Net total", value: calc.totals.netTotal, highlight: true };

  const Row = ({
    label,
    value,
    highlight,
  }: {
    label: string;
    value: number;
    highlight?: boolean;
  }) => (
    <div
      className={`flex items-center justify-between rounded border px-3 py-2 ${
        highlight ? "border-black bg-black text-white" : "border-gray-200 bg-gray-50 text-gray-800"
      }`}
    >
      <span>{label}</span>
      <span className="font-semibold tabular-nums">${value.toFixed(2)}</span>
    </div>
  );

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
        <div className="space-y-2">
          {regularItems.map((item) => (
            <Row key={item.label} label={item.label} value={item.value} />
          ))}
        </div>

        <div className="space-y-2">
          {overtimeItems.map((item) => (
            <Row key={item.label} label={item.label} value={item.value} />
          ))}
        </div>

        <div className="sm:col-span-2">
          <Row label={netItem.label} value={netItem.value} highlight={netItem.highlight} />
        </div>
      </div>
    </section>
  );
}
