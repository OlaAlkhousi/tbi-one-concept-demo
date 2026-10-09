"use client";

import { Suspense } from "react";
import { HoursView } from "@/components/hours/hours-view";

export default function HoursPage() {
  return (
    <Suspense>
      <HoursView />
    </Suspense>
  );
}
