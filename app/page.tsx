"use client";

import { useEffect, useMemo, useState } from "react";
import MoneySummary from "@/components/MoneySummary";
import ResultsTable from "@/components/ResultsTable";
import TimecardUploader from "@/components/TimecardUploader";
import { calcFromHours } from "@/lib/calc";
import { PayMode, ParseApiResponse } from "@/lib/types";

const THRESHOLD = 9.5;
const DEFAULT_PAY_RATE = 45.74;

export default function Page() {
   const [userId, setUserId] = useState("");
   const [payRate, setPayRate] = useState<number | "">(DEFAULT_PAY_RATE);
   const [taxPercent, setTaxPercent] = useState<number | "">(0);
   const [mode, setMode] = useState<PayMode>("triple");
   const [imageFile, setImageFile] = useState<File | null>(null);
   const [imagePreview, setImagePreview] = useState<string | null>(null);
   const [parsedHours, setParsedHours] = useState<number[]>([]);
   const [editableHours, setEditableHours] = useState<number[]>([]);
   const [warnings, setWarnings] = useState<string[]>([]);
   const [loading, setLoading] = useState(false);
   const [error, setError] = useState<string | null>(null);
   const [rawResponse, setRawResponse] = useState<ParseApiResponse | null>(null);
   const [confidence, setConfidence] = useState<number | null>(null);

   useEffect(() => {
     const storedPay = localStorage.getItem("ot-payRate");
     const storedTax = localStorage.getItem("ot-taxPercent");
     const storedMode = localStorage.getItem("ot-mode") as PayMode | null;
     const storedUser = localStorage.getItem("ot-userId");

     if (storedPay !== null) {
       if (storedPay === "") setPayRate("");
       else {
         const n = Number(storedPay);
         setPayRate(Number.isFinite(n) ? n : "");
       }
     }
     if (storedTax !== null) {
       if (storedTax === "") setTaxPercent("");
       else {
         const n = Number(storedTax);
         setTaxPercent(Number.isFinite(n) ? n : "");
       }
     }
     if (storedMode === "triple" || storedMode === "quad") setMode(storedMode);
     if (storedUser) setUserId(storedUser);
   }, []);

   useEffect(() => {
     localStorage.setItem("ot-payRate", payRate === "" ? "" : String(payRate || 0));
   }, [payRate]);

   useEffect(() => {
     localStorage.setItem("ot-taxPercent", taxPercent === "" ? "" : String(taxPercent || 0));
   }, [taxPercent]);

   useEffect(() => {
     localStorage.setItem("ot-mode", mode);
   }, [mode]);

   useEffect(() => {
     if (userId) localStorage.setItem("ot-userId", userId);
   }, [userId]);

   const payRateNum = typeof payRate === "number" && Number.isFinite(payRate) ? payRate : 0;
   const taxPercentNum =
     typeof taxPercent === "number" && Number.isFinite(taxPercent) ? taxPercent : 0;

   const calc = useMemo(
     () =>
       calcFromHours({
         hours: editableHours,
         payRate: payRateNum,
         taxPercent: taxPercentNum,
         mode,
         threshold: THRESHOLD,
       }),
     [editableHours, payRateNum, taxPercentNum, mode]
   );

   const handleFileChange = (file: File | null) => {
     if (imagePreview) URL.revokeObjectURL(imagePreview);
     setImageFile(file);
     setWarnings([]);
     setError(null);
     setImagePreview(file ? URL.createObjectURL(file) : null);
   };

   const handleHourChange = (index: number, value: number) => {
     setEditableHours((prev) => {
       const next = [...prev];
       next[index] = Number.isFinite(value) && value >= 0 ? value : 0;
       return next;
     });
   };

   const handleAddRow = () => {
     setEditableHours((prev) => [...prev, 0]);
   };

   const handleResetHours = () => {
     setEditableHours(parsedHours);
   };

   const handleParse = async () => {
     if (!imageFile) {
       setError("Please choose an image first.");
       return;
     }
     if (!userId.trim()) {
       setError("User ID is required.");
       return;
     }
     setLoading(true);
     setError(null);
     try {
       const fd = new FormData();
       fd.append("userId", userId);
       fd.append("image", imageFile);

      const res = await fetch("/api/parse-timecard", { method: "POST", body: fd });
       const json = await res.json();

       if (!res.ok) {
         setError(json?.error ?? "Failed to submit screenshot.");
         setWarnings(Array.isArray(json?.warnings) ? json.warnings : []);
         return;
       }

      const hoursRaw: unknown[] = Array.isArray(json.hours) ? json.hours : [];
      const hours = hoursRaw
        .map((n: unknown) =>
          typeof n === "number" || typeof n === "string" ? Number(n) : Number.NaN
        )
        .filter((n) => Number.isFinite(n) && n >= 0)
        .map((n) => Number(n.toFixed(2)));

      const nextWarnings = Array.isArray(json.warnings) ? [...json.warnings] : [];
      if (hours.length && hours.length < 3) {
        nextWarnings.push("Fewer than 3 rows extracted — double-check the screenshot.");
      }

      setParsedHours(hours);
      setEditableHours(hours);
      setWarnings(nextWarnings);
       setRawResponse(json);
       setConfidence(typeof json.confidence === "number" ? json.confidence : null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unexpected error");
     } finally {
       setLoading(false);
     }
   };

   return (
     <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-4 p-4 sm:p-6">
       <TimecardUploader
         userId={userId}
         payRate={payRate}
         taxPercent={taxPercent}
         mode={mode}
         loading={loading}
         hasImage={Boolean(imageFile)}
        warnings={warnings}
        error={error}
        imagePreview={imagePreview}
         onUserIdChange={setUserId}
         onPayRateChange={setPayRate}
         onTaxPercentChange={setTaxPercent}
         onModeChange={setMode}
         onFileChange={handleFileChange}
         onParse={handleParse}
       />

       <ResultsTable
         hours={editableHours}
         rows={calc.rows}
         parsedHours={parsedHours}
         threshold={THRESHOLD}
         onHourChange={handleHourChange}
         onReset={handleResetHours}
         onAddRow={handleAddRow}
       />

       <MoneySummary calc={calc} mode={mode} payRate={payRateNum} taxPercent={taxPercentNum} />

       {rawResponse && (
         <section className="space-y-2 rounded-lg border bg-white p-4 text-sm shadow-sm">
           <div className="flex items-center justify-between">
             <h3 className="font-semibold">Model output (debug)</h3>
             {confidence !== null && (
               <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
                 Confidence {Math.round(confidence * 100)}%
               </span>
             )}
           </div>
           <pre className="max-h-64 overflow-auto rounded bg-gray-900 px-3 py-2 text-xs text-gray-100">
             {JSON.stringify(rawResponse, null, 2)}
           </pre>
         </section>
       )}
     </main>
   );
 }
