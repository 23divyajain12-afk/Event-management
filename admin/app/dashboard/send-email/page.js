"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function DashboardSendEmailRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/send-email");
  }, [router]);
  return null;
}
