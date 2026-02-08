'use client';

import { CalcRow } from "@/lib/types";

type Props = {
  hours: number[];
  rows: CalcRow[];
  parsedHours: number[];
  threshold: number;
  onHourChange: (index: number, value: number) => void;
  onReset: () => void;
  onAddRow?: () => void;
};

export default function ResultsTable({
  hours,
  rows,
  parsedHours,
  threshold,
  onHourChange,
  onReset,
  onAddRow,
}: Props) {
  const showReset = parsedHours.length > 0 && parsedHours.some((h, idx) => h !== hours[idx]);

  return (
    <section className="space-y-3 rounded-lg border bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold">Extracted Hours</h2>
          <p className="text-sm text-gray-600">
            Threshold {threshold.toFixed(1)} hrs → regular vs overtime
          </p>
        </div>
        <div className="flex items-center gap-2">
          {onAddRow && (
            <button
              type="button"
              onClick={onAddRow}
              className="rounded border border-gray-300 px-3 py-2 text-sm font-medium hover:border-black"
            >
              + Add row
            </button>
          )}
          <button
            type="button"
            onClick={onReset}
            disabled={!showReset}
            className="rounded border border-gray-300 px-3 py-2 text-sm font-medium hover:border-black disabled:opacity-50"
          >
            Reset to parsed
          </button>
        </div>
      </div>

      {hours.length === 0 ? (
        <p className="text-sm text-gray-600">Upload & parse an image to see results.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b bg-gray-50 text-xs uppercase text-gray-600">
                <th className="px-2 py-2 text-left">Day</th>
                <th className="px-2 py-2 text-right">Hours</th>
                <th className="px-2 py-2 text-right">Regular (≤{threshold})</th>
                <th className="px-2 py-2 text-right">OT (&gt;{threshold})</th>
              </tr>
            </thead>
            <tbody>
              {hours.map((value, idx) => {
                const row = rows[idx];
                return (
                  <tr key={idx} className="border-b last:border-b-0">
                    <td className="px-2 py-2 font-medium text-gray-800">#{idx + 1}</td>
                    <td className="px-2 py-2 text-right">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={Number.isFinite(value) ? value : ""}
                        onChange={(e) => onHourChange(idx, Number(e.target.value))}
                        className="w-24 rounded border border-gray-300 px-2 py-1 text-right text-sm focus:border-black focus:ring-1 focus:ring-black"
                      />
                    </td>
                    <td className="px-2 py-2 text-right tabular-nums">
                      {row ? row.regularHours.toFixed(2) : "0.00"}
                    </td>
                    <td className="px-2 py-2 text-right tabular-nums">
                      {row ? row.overtimeHours.toFixed(2) : "0.00"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
