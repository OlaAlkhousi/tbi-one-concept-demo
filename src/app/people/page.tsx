"use client";

import { Suspense } from "react";
import { PeopleDirectory } from "@/components/people/people-directory";

export default function PeoplePage() {
  return (
    <Suspense fallback={null}>
      <PeopleDirectory />
    </Suspense>
  );
}
