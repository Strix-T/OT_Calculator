import { PayMode } from "@/lib/types";
import { ChangeEvent } from "react";

type Props = {
  userId: string;
  payRate: number | "";
  taxPercent: number | "";
  mode: PayMode;
  loading: boolean;
  hasImage?: boolean;
  warnings: string[];
  error?: string | null;
  imagePreview?: string | null;
  onUserIdChange: (value: string) => void;
  onPayRateChange: (value: number | "") => void;
  onTaxPercentChange: (value: number | "") => void;
  onModeChange: (value: PayMode) => void;
  onFileChange: (file: File | null) => void;
  onParse: () => void;
};

export default function TimecardUploader(props: Props) {
  const {
    userId,
    payRate,
    taxPercent,
    mode,
    loading,
    hasImage = false,
    warnings,
    error,
    imagePreview,
    onUserIdChange,
    onPayRateChange,
    onTaxPercentChange,
    onModeChange,
    onFileChange,
    onParse,
  } = props;

  const handleFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    onFileChange(file);
  };

  const canParse = Boolean(userId) && hasImage && !loading;

  return (
    <section className="space-y-4 rounded-lg border bg-white p-4 shadow-sm">
      <div>
        <h1 className="text-xl font-semibold">Timecard OT Calculator</h1>
        <p className="text-sm text-gray-600">Upload screenshot → parse hours → compute OT</p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="space-y-1">
          <span className="text-sm font-medium">User ID (required)</span>
          <input
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-black focus:ring-1 focus:ring-black"
            value={userId}
            onChange={(e) => onUserIdChange(e.target.value)}
            placeholder="e.g., 1234"
            inputMode="text"
          />
        </label>
        <label className="space-y-1">
          <span className="text-sm font-medium">Pay rate ($/hr)</span>
          <input
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-black focus:ring-1 focus:ring-black"
            type="number"
            step="0.01"
            min="0"
            value={payRate}
            onChange={(e) => {
              const v = e.target.value;
              onPayRateChange(v === "" ? "" : Number(v));
            }}
          />
        </label>
        <label className="space-y-1">
          <span className="text-sm font-medium">Tax %</span>
          <input
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-black focus:ring-1 focus:ring-black"
            type="number"
            step="0.01"
            min="0"
            value={taxPercent}
            onChange={(e) => {
              const v = e.target.value;
              onTaxPercentChange(v === "" ? "" : Number(v));
            }}
          />
        </label>
        <div className="space-y-2">
          <span className="text-sm font-medium">Pay mode</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onModeChange("triple")}
              className={`flex-1 rounded border px-3 py-2 text-sm transition ${
                mode === "triple" ? "border-black bg-black text-white" : "border-gray-300 bg-white"
              }`}
            >
              Triple (1.5×)
            </button>
            <button
              type="button"
              onClick={() => onModeChange("quad")}
              className={`flex-1 rounded border px-3 py-2 text-sm transition ${
                mode === "quad" ? "border-black bg-black text-white" : "border-gray-300 bg-white"
              }`}
            >
              Quad (2.5×)
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-[2fr_1fr]">
        <label className="space-y-1">
          <span className="text-sm font-medium">Upload timecard screenshot</span>
          <input
            type="file"
            accept="image/*"
            onChange={handleFile}
            className="w-full text-sm"
          />
        </label>
        <div className="flex items-end">
          <button
            type="button"
            onClick={onParse}
            disabled={!canParse || loading}
            className="inline-flex w-full items-center justify-center rounded-md bg-black px-4 py-2 text-sm font-medium text-white transition disabled:opacity-50"
          >
            {loading ? "Reading image…" : "Parse Screenshot"}
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </div>
      )}

      {imagePreview && (
        <div className="overflow-hidden rounded border bg-gray-50">
          <div className="border-b px-3 py-1 text-xs font-semibold text-gray-600">Preview</div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imagePreview} alt="Uploaded preview" className="max-h-72 w-full object-contain" />
        </div>
      )}

      {warnings.length > 0 && (
        <div className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          <div className="font-semibold">Warnings</div>
          <ul className="list-disc pl-5">
            {warnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </div>
      )}

    </section>
  );
}
