"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function FocusPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/tasks");
  }, [router]);

  return (
    <div className="max-w-4xl mx-auto px-6 py-20 text-center text-xs text-zinc-500">
      Redirecting to Tasks...
    </div>
  );
}
