"use client";

import { Suspense } from "react";
import { LogbookView } from "@/components/logbook/logbook-view";

export default function LogbookPage() {
  return (
    <Suspense>
      <LogbookView />
    </Suspense>
  );
}
