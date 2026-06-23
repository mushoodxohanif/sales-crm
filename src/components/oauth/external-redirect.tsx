"use client";

import { useEffect } from "react";

export function ExternalRedirect({ url }: { url: string }) {
  useEffect(() => {
    window.location.href = url;
  }, [url]);

  return <p className="text-muted-foreground text-sm">Redirecting…</p>;
}
