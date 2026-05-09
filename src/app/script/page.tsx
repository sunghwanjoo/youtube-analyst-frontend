"use client";
import { Lock, Mail } from "lucide-react";

export default function ScriptPage() {
  return (
    <div className="flex flex-col items-center justify-center py-32 text-center">
      <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-5">
        <Lock className="w-8 h-8 text-red-600" />
      </div>
      <h1 className="text-xl font-bold mb-2">스크립트 추출 & 재구성</h1>
      <p className="text-gray-500 text-sm mb-6">이 기능은 유료 버전에서 이용하실 수 있습니다.</p>
      <div className="bg-gray-50 rounded-xl px-8 py-5">
        <p className="text-xs text-gray-400 mb-2">유료 버전 문의</p>
        <a
          href="mailto:jusingsing@naver.com"
          className="flex items-center gap-2 text-red-600 font-semibold hover:underline"
        >
          <Mail className="w-4 h-4" />
          jusingsing@naver.com
        </a>
      </div>
    </div>
  );
}
