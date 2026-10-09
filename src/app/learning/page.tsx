"use client";

import { Suspense } from "react";
import { LearningView } from "@/components/learning/learning-view";

export default function LearningPage() {
  return (
    <Suspense>
      <LearningView />
    </Suspense>
  );
}
