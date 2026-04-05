"use client";
import dynamic from "next/dynamic";
import { SmoothScroll } from "./SmoothScroll";

const CustomCursor = dynamic(
  () => import("./CustomCursor").then((m) => m.CustomCursor),
  { ssr: false }
);

export function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <SmoothScroll>
      <CustomCursor />
      {children}
    </SmoothScroll>
  );
}
