"use client";

import { Suspense } from "react";
import { KnowledgeHub } from "@/components/knowledge/knowledge-hub";

export default function KnowledgePage() {
  return (
    <Suspense fallback={null}>
      <KnowledgeHub />
    </Suspense>
  );
}
