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
  const isClosing = elapsed >= SPLASH_DURATION_MS - 450;

  if (!visible) {
    return null;
  }

  return (
    <div
      className={`fixed inset-0 z-[120] flex items-center justify-center transition-opacity duration-500 ${
        isClosing ? "opacity-0" : "opacity-100"
      }`}
    >
      <div className="absolute inset-0 bg-[linear-gradient(145deg,rgba(2,18,36,0.8),rgba(5,30,54,0.66))] backdrop-blur-sm" />

      <div className="relative z-10 w-full max-w-sm px-8 text-center">
        <div className="relative mx-auto flex h-24 w-24 items-center justify-center">
          <span className="absolute inset-0 rounded-full border border-cyan-300/45 animate-pulse" />
          <span className="absolute -inset-3 rounded-full border border-cyan-200/25 animate-[spin_8s_linear_infinite]" />
          <Image
            src="/logo-off.png"
            alt="E-Clinic"
            width={76}
            height={76}
            className="h-[4.2rem] w-[4.2rem] object-contain drop-shadow-[0_0_26px_rgba(125,211,252,0.58)]"
          />
        </div>

        <p className="mt-7 text-xs uppercase tracking-[0.24em] text-cyan-200">Entrando no sistema</p>
        <p className="mt-2 text-lg font-semibold text-white">Preparando seu ambiente clinico</p>

        <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-cyan-900/50">
          <div
            className="h-1.5 rounded-full bg-gradient-to-r from-cyan-300 via-cyan-400 to-teal-300 transition-[width] duration-75"
            style={{ width: `${progress}%` }}
          />
        </div>

        <p className="mt-3 text-xs text-slate-200/90">Carregando modulos... {secondsLeft}s</p>
      </div>
    </div>
  );
}
