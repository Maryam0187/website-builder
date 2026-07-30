import { Suspense } from "react";
import CheckEmailClient from "./CheckEmailClient";

export default function CheckEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#040b1a] text-blue-100">
          Loading…
        </div>
      }
    >
      <CheckEmailClient />
    </Suspense>
  );
}
