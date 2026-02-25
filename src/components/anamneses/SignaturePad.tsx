"use client";

import { useEffect, useRef, type PointerEvent } from "react";
import { Button } from "@/components/ui/button";

export function SignaturePad({
  value,
  onChange,
  error,
}: {
  value: string;
  onChange: (value: string) => void;
  error?: string | null;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      const ratio = window.devicePixelRatio || 1;
      const { width, height } = canvas.getBoundingClientRect();
      canvas.width = Math.max(1, Math.floor(width * ratio));
      canvas.height = Math.max(1, Math.floor(height * ratio));
      const context = canvas.getContext("2d");
      if (!context) return;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      context.lineWidth = 2;
      context.lineCap = "round";
      context.strokeStyle = "#111827";
    };

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, []);

  const startDrawing = (event: PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    const rect = canvas.getBoundingClientRect();
    context.beginPath();
    context.moveTo(event.clientX - rect.left, event.clientY - rect.top);
    drawingRef.current = true;
    canvas.setPointerCapture(event.pointerId);
  };

  const moveDrawing = (event: PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    const rect = canvas.getBoundingClientRect();
    context.lineTo(event.clientX - rect.left, event.clientY - rect.top);
    context.stroke();
  };

  const stopDrawing = (event: PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.releasePointerCapture(event.pointerId);
    onChange(canvas.toDataURL("image/png"));
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    context.clearRect(0, 0, canvas.width, canvas.height);
    onChange("");
  };

  return (
    <div className="space-y-2">
      <div className="rounded-xl border border-dashed p-2">
        <canvas
          ref={canvasRef}
          className="h-36 w-full touch-none"
          onPointerDown={startDrawing}
          onPointerMove={moveDrawing}
          onPointerUp={stopDrawing}
          onPointerLeave={stopDrawing}
        />
      </div>
      <div className="flex items-center justify-between">
        <input type="hidden" name="signature_data" value={value} />
        <Button type="button" variant="outline" size="sm" onClick={clearCanvas}>
          Limpar assinatura
        </Button>
      </div>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
