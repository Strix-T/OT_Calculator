"use client";

import { useEffect, useMemo, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

const DISMISS_STATE_KEY = "ot-installPromptDismissState";
const LEGACY_DISMISS_UNTIL_KEY = "ot-installPromptDismissedUntil"; // legacy numeric timestamp
const DEFAULT_DISMISS_DAYS = 30;
const STORAGE_VERSION = 2;

function isStandaloneMode() {
  if (typeof window === "undefined") return false;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return Boolean(nav.standalone) || window.matchMedia?.("(display-mode: standalone)")?.matches;
}

function getDismissedUntil(): number {
  try {
    // Migration: clear legacy numeric timestamp so older dismissals
    // don't block the prompt after behavior changes.
    if (localStorage.getItem(LEGACY_DISMISS_UNTIL_KEY)) {
      localStorage.removeItem(LEGACY_DISMISS_UNTIL_KEY);
    }

    const raw = localStorage.getItem(DISMISS_STATE_KEY);
    if (!raw) return 0;

    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return 0;

    const obj = parsed as { v?: unknown; until?: unknown };
    if (obj.v !== STORAGE_VERSION) return 0;

    const until = typeof obj.until === "number" ? obj.until : Number(obj.until);
    return Number.isFinite(until) ? until : 0;
  } catch {
    return 0;
  }
}

function setDismissedForDays(days: number) {
  try {
    const until = Date.now() + Math.max(1, days) * 24 * 60 * 60 * 1000;
    localStorage.setItem(DISMISS_STATE_KEY, JSON.stringify({ v: STORAGE_VERSION, until }));
  } catch {
    // ignore
  }
}

export default function InstallPrompt() {
  const [visible, setVisible] = useState(false);
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [env, setEnv] = useState<{
    isIOS: boolean;
    isAndroid: boolean;
    isSafari: boolean;
  } | null>(null);

  const canInstall = Boolean(deferred);

  const title = useMemo(() => {
    if (env?.isIOS) return "Install on your iPhone";
    if (env?.isAndroid) return "Install on your phone";
    return "Install the app";
  }, [env]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (isStandaloneMode()) return;
    if (getDismissedUntil() > Date.now()) return;

    const ua = window.navigator.userAgent || "";
    const isIOS = /iphone|ipad|ipod/i.test(ua);
    const isAndroid = /android/i.test(ua);
    const isMobile = isIOS || isAndroid;
    if (!isMobile) return;

    // Safari detection (iOS install instructions only really apply to Safari).
    const isSafari =
      /safari/i.test(ua) && !/crios|fxios|edgios|chrome|android/i.test(ua);

    setEnv({ isIOS, isAndroid, isSafari });

    // iOS doesn't fire `beforeinstallprompt`, so show instructions immediately.
    if (isIOS) setVisible(true);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const onBeforeInstallPrompt = (e: Event) => {
      // Don't show if already installed / user dismissed recently.
      if (isStandaloneMode()) return;
      if (getDismissedUntil() > Date.now()) return;

      const ua = window.navigator.userAgent || "";
      const isIOS = /iphone|ipad|ipod/i.test(ua);
      const isAndroid = /android/i.test(ua);
      const isMobile = isIOS || isAndroid;
      if (!isMobile) return;

      // iOS won't reach here; on Android/Chrome we defer the native prompt.
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setVisible(true);
    };

    const onAppInstalled = () => {
      setDeferred(null);
      setVisible(false);
      // Effectively don't show again.
      setDismissedForDays(3650);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt as EventListener);
    window.addEventListener("appinstalled", onAppInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt as EventListener);
      window.removeEventListener("appinstalled", onAppInstalled);
    };
  }, []);

  const close = () => {
    setVisible(false);
  };

  const snooze = (days = DEFAULT_DISMISS_DAYS) => {
    setDismissedForDays(days);
    setVisible(false);
  };

  const handleInstall = async () => {
    if (!deferred) return;
    try {
      await deferred.prompt();
      const choice = await deferred.userChoice;
      if (choice.outcome === "accepted") snooze(3650);
      else snooze(DEFAULT_DISMISS_DAYS);
    } catch {
      snooze(7);
    } finally {
      setDeferred(null);
    }
  };

  if (!visible) return null;
  if (!env) return null;

  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        aria-label="Dismiss install prompt"
        onClick={close}
        className="absolute inset-0 bg-black/40"
      />

      <div className="absolute inset-x-0 bottom-0 p-4 sm:bottom-auto sm:top-6">
        <div className="mx-auto max-w-md rounded-2xl border bg-white p-4 shadow-xl">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-base font-semibold">{title}</div>
              <div className="mt-1 text-sm text-gray-600">
                {env.isIOS ? (
                  env.isSafari ? (
                    <>
                      Tap <span className="font-medium text-gray-800">Share</span>, then{" "}
                      <span className="font-medium text-gray-800">Add to Home Screen</span>.
                    </>
                  ) : (
                    <>
                      To install on iPhone, open this page in{" "}
                      <span className="font-medium text-gray-800">Safari</span>, then tap{" "}
                      <span className="font-medium text-gray-800">Share</span> →{" "}
                      <span className="font-medium text-gray-800">Add to Home Screen</span>.
                    </>
                  )
                ) : (
                  <>Get one-tap access from your home screen.</>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={close}
              className="rounded-md px-2 py-1 text-sm text-gray-500 hover:bg-gray-100"
              aria-label="Close"
            >
              ✕
            </button>
          </div>

          <div className="mt-4 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => snooze()}
              className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium hover:border-black"
            >
              Not now
            </button>

            <button
              type="button"
              onClick={handleInstall}
              disabled={!canInstall}
              className="rounded-md bg-black px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
              title={canInstall ? "Install" : "Install is available on Android/Chrome when eligible"}
            >
              Install
            </button>
          </div>

          {env.isIOS && (
            <div className="mt-3 text-xs text-gray-500">
              Already installed? Open from your home screen for the full app experience.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

