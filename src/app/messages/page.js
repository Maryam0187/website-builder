import { Suspense } from "react";
import MessagesPage from "./MessagesClient";

export default function Page() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-zinc-50">Loading…</div>}>
      <MessagesPage />
    </Suspense>
  );
}
