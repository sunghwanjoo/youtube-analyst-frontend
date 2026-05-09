"use client";
import { X, Mail, Lock } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function PaywallModal({ open, onClose }: Props) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl p-8 max-w-sm w-full mx-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-end mb-2">
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="text-center space-y-4">
          <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mx-auto">
            <Lock className="w-7 h-7 text-red-600" />
          </div>
          <div>
            <h2 className="text-lg font-bold">유료 기능입니다</h2>
            <p className="text-sm text-gray-500 mt-1">
              이 기능은 유료 버전에서 이용하실 수 있습니다.
            </p>
          </div>
          <div className="bg-gray-50 rounded-xl p-4">
            <p className="text-xs text-gray-400 mb-2">문의하기</p>
            <a
              href="mailto:jusingsing@naver.com"
              className="flex items-center justify-center gap-2 text-red-600 font-semibold hover:underline"
            >
              <Mail className="w-4 h-4" />
              jusingsing@naver.com
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
