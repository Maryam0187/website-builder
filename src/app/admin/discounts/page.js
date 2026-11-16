"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AdminDiscountsRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/admin/settings#discounts");
  }, [router]);
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#070b16] text-blue-100">
      Opening discounts…
    </div>
  );
}
