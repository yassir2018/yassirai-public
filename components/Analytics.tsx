"use client";
import { useEffect } from "react";

const TRACK_URL = "https://app.yassirai.com/api/public/track";

export function Analytics({ page, lang }: { page: string; lang: string }) {
  useEffect(() => {
    fetch(TRACK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ page, type: "page", lang }),
    }).catch(() => {});
  }, [page, lang]);

  return null;
}

export function trackEvent(slug: string, type: "template" | "project", lang: string) {
  fetch(TRACK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ page: `/${type}/${slug}`, slug, type, lang }),
  }).catch(() => {});
}
