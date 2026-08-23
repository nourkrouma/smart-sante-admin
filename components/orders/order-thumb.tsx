"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";

type OrderThumbProps = {
  src: string;
  alt: string;
  className?: string;
};

export function OrderThumb({ src, alt, className = "" }: OrderThumbProps) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const hasSrc = src.trim().length > 0;

  if (!hasSrc || failed) {
    return (
      <div
        className={`flex items-center justify-center bg-background text-xs text-muted ${className}`}
      >
        —
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden bg-background ${className}`}>
      {!loaded ? (
        <div className="absolute inset-0 flex items-center justify-center">
          <Loader2
            size={14}
            strokeWidth={2}
            className="animate-spin text-muted"
            aria-hidden
          />
        </div>
      ) : null}
      {/* Native img: order photos may come from hosts not listed in next.config */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        className={`size-full object-cover transition-opacity duration-200 ${
          loaded ? "opacity-100" : "opacity-0"
        }`}
        onLoad={() => setLoaded(true)}
        onError={() => setFailed(true)}
      />
    </div>
  );
}
