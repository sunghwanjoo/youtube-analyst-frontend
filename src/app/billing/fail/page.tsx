"use client";
import { Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

function FailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const message = searchParams.get("message") || "카드 등록이 취소되었거나 실패했어요.";

  return (
    <div className="flex flex-col items-center justify-center py-32 text-center">
      <XCircle className="w-12 h-12 text-red-600 mb-4" />
      <h1 className="text-xl font-bold mb-2">카드 등록에 실패했어요</h1>
      <p className="text-muted-foreground text-sm mb-6">{message}</p>
      <Button onClick={() => router.push("/billing")} variant="outline">
        다시 시도하기
      </Button>
    </div>
  );
}

export default function BillingFailPage() {
  return (
    <Suspense>
      <FailContent />
    </Suspense>
  );
}
