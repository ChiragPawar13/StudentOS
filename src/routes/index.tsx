import { createFileRoute, ClientOnly } from "@tanstack/react-router";
import { lazy, Suspense } from "react";

const StudentOS = lazy(() => import("@/components/StudentOS"));

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "StudentOS — AI Exam Tutor" },
      { name: "description", content: "AI tutor that writes exam-ready answers from your own notes." },
      { property: "og:title", content: "StudentOS — AI Exam Tutor" },
      { property: "og:description", content: "AI tutor that writes exam-ready answers from your own notes." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <ClientOnly fallback={<div className="min-h-screen bg-background" />}>
      <Suspense fallback={<div className="min-h-screen bg-background" />}>
        <StudentOS />
      </Suspense>
    </ClientOnly>
  );
}
