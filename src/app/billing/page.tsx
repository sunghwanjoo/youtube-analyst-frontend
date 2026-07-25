"use client";
import { useState } from "react";
import Script from "next/script";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2 } from "lucide-react";
import { PAID_PLAN_PRICE_KRW } from "@/lib/pricing";

declare global {
  interface Window {
    TossPayments?: (clientKey: string) => {
      payment: (opts: { customerKey: string }) => {
        requestBillingAuth: (opts: Record<string, unknown>) => Promise<void>;
      };
    };
  }
}

export default function BillingPage() {
  const { data: session, isPending } = useSession();
  const router = useRouter();
  const [sdkReady, setSdkReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubscribe = async () => {
    if (!session || !window.TossPayments) return;
    const clientKey = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY;
    if (!clientKey) {
      setError("결제 설정이 완료되지 않았습니다. 잠시 후 다시 시도해주세요.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const tossPayments = window.TossPayments(clientKey);
      const payment = tossPayments.payment({ customerKey: session.user.id });
      await payment.requestBillingAuth({
        method: "CARD",
        successUrl: `${window.location.origin}/billing/success`,
        failUrl: `${window.location.origin}/billing/fail`,
        customerName: session.user.name,
        customerEmail: session.user.email,
      });
    } catch (e: any) {
      setError(e.message || "결제창을 여는 중 오류가 발생했습니다.");
      setLoading(false);
    }
  };

  if (isPending) return null;

  if (!session) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center">
        <p className="text-muted-foreground mb-4">로그인 후 이용할 수 있습니다.</p>
        <Button onClick={() => router.push("/login?next=/billing")} className="bg-red-600 hover:bg-red-700">
          로그인하기
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto py-16 text-center">
      <Script src="https://js.tosspayments.com/v2" onReady={() => setSdkReady(true)} />

      <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-5">
        <Sparkles className="w-7 h-7 text-red-600" />
      </div>
      <h1 className="text-xl font-bold mb-2">유료 플랜으로 업그레이드</h1>
      <p className="text-muted-foreground text-sm mb-6">
        SEO 제목 생성, 스크립트 추출 & 재구성, 예약 발행까지 전부 이용하세요
      </p>

      <div className="bg-gray-50 rounded-xl p-6 mb-6">
        <div className="text-3xl font-bold">
          {PAID_PLAN_PRICE_KRW.toLocaleString()}원
          <span className="text-sm font-normal text-muted-foreground"> / 월</span>
        </div>
        <p className="text-xs text-muted-foreground mt-1">매월 자동 결제, 언제든 해지 가능</p>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm mb-4">
          {error}
        </div>
      )}

      <Button
        onClick={handleSubscribe}
        disabled={!sdkReady || loading}
        className="h-11 w-full bg-red-600 hover:bg-red-700"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "카드 등록하고 시작하기"}
      </Button>
    </div>
  );
}
