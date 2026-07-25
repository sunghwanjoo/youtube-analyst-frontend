"use client";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

function SuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [state, setState] = useState<"loading" | "done" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const authKey = searchParams.get("authKey");
    const customerKey = searchParams.get("customerKey");
    if (!authKey || !customerKey) {
      setState("error");
      setMessage("잘못된 접근입니다.");
      return;
    }

    fetch("/api/billing/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ authKey, customerKey }),
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || "등록 실패");
        setState("done");
      })
      .catch((e) => {
        setState("error");
        setMessage(e.message);
      });
  }, [searchParams]);

  return (
    <div className="flex flex-col items-center justify-center py-32 text-center">
      {state === "loading" && (
        <>
          <Loader2 className="w-10 h-10 animate-spin text-red-600 mb-4" />
          <p className="text-muted-foreground">결제를 처리하고 있어요...</p>
        </>
      )}
      {state === "done" && (
        <>
          <CheckCircle2 className="w-12 h-12 text-green-600 mb-4" />
          <h1 className="text-xl font-bold mb-2">구독이 시작되었어요!</h1>
          <p className="text-muted-foreground text-sm mb-6">이제 모든 기능을 이용하실 수 있습니다.</p>
          <Button onClick={() => router.push("/")} className="bg-red-600 hover:bg-red-700">
            시작하기
          </Button>
        </>
      )}
      {state === "error" && (
        <>
          <XCircle className="w-12 h-12 text-red-600 mb-4" />
          <h1 className="text-xl font-bold mb-2">결제 처리 중 문제가 발생했어요</h1>
          <p className="text-muted-foreground text-sm mb-6">{message}</p>
          <Button onClick={() => router.push("/billing")} variant="outline">
            다시 시도하기
          </Button>
        </>
      )}
    </div>
  );
}

export default function BillingSuccessPage() {
  return (
    <Suspense>
      <SuccessContent />
    </Suspense>
  );
}
