import { Suspense } from "react";
import EditPageClient from "./EditPageClient";

export default function EditPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#070f1f] text-blue-100">
          Loading your editor…
        </div>
      }
    >
      <EditPageClient />
    </Suspense>
  );
}
