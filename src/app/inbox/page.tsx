"use client";

import { Suspense } from "react";
import { InboxView } from "@/components/inbox/inbox-view";

export default function InboxPage() {
  return (
    <Suspense fallback={null}>
      <InboxView />
    </Suspense>
  );
}
