"use client";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { signIn } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Play } from "lucide-react";

function LoginContent() {
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/";

  const handleGoogleLogin = () => {
    signIn.social({ provider: "google", callbackURL: next });
  };

  return (
    <div className="flex flex-col items-center justify-center py-32 text-center">
      <div className="flex items-center gap-2 font-bold text-red-600 text-2xl mb-8">
        <Play className="w-7 h-7 fill-red-600" />
        YouTube Analyst
      </div>
      <h1 className="text-xl font-bold mb-2">로그인</h1>
      <p className="text-gray-500 text-sm mb-6">
        구글 계정으로 로그인하고 검색을 시작하세요
      </p>
      <Button onClick={handleGoogleLogin} className="h-11 px-6 bg-red-600 hover:bg-red-700">
        Google로 계속하기
      </Button>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  );
}
