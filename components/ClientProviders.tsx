"use client";
import { SmoothScroll } from "./SmoothScroll";

export function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <SmoothScroll>
      {children}
    </SmoothScroll>
  );
}
