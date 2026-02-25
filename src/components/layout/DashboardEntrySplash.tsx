"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";

const SPLASH_DURATION_MS = 5000;

export function DashboardEntrySplash() {
  const [elapsed, setElapsed] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const startedAt = performance.now();
    const interval = window.setInterval(() => {
      const nextElapsed = Math.min(performance.now() - startedAt, SPLASH_DURATION_MS);
      setElapsed(nextElapsed);
      if (nextElapsed >= SPLASH_DURATION_MS) {
        window.clearInterval(interval);
        setVisible(false);
      }
    }, 50);

    return () => window.clearInterval(interval);
  }, []);

  const progress = useMemo(() => Math.min((elapsed / SPLASH_DURATION_MS) * 100, 100), [elapsed]);
  const secondsLeft = useMemo(
    () => Math.max(0, Math.ceil((SPLASH_DURATION_MS - elapsed) / 1000)),
    [elapsed]
  );

  if (!visible) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/75 backdrop-blur-md">
      <div className="w-full max-w-sm rounded-3xl border border-cyan-400/30 bg-slate-900/70 p-8 shadow-[0_30px_80px_rgba(2,132,199,0.35)]">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl border border-cyan-300/50 bg-cyan-50 shadow-[0_0_60px_rgba(34,211,238,0.45)]">
          <Image src="/logo.png" alt="E-Clinic" width={58} height={58} className="h-14 w-14 object-contain" />
        </div>

        <div className="mt-6 text-center">
          <p className="text-sm uppercase tracking-[0.22em] text-cyan-200">Carregando ambiente</p>
          <p className="mt-2 text-lg font-semibold text-white">Preparando seu dashboard</p>
        </div>

        <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-700/80">
          <div
            className="h-2 rounded-full bg-gradient-to-r from-cyan-300 via-cyan-400 to-teal-300 transition-[width] duration-75"
            style={{ width: `${progress}%` }}
          />
        </div>

        <p className="mt-3 text-center text-xs text-slate-300">
          Iniciando modulos clinicos... {secondsLeft}s
        </p>
      </div>
    </div>
  );
}
