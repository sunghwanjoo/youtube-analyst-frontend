"use client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Props {
  open: boolean;
  onClose: () => void;
  type: "viral" | "longrun";
}

export function ScoreModal({ open, onClose, type }: Props) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>
            {type === "viral" ? "떡상지수란?" : "롱런지수란?"}
          </DialogTitle>
        </DialogHeader>
        {type === "viral" ? (
          <div className="space-y-3 text-sm text-muted-foreground">
            <p className="font-mono bg-gray-50 p-3 rounded text-center text-base font-semibold text-foreground">
              떡상지수 = (조회수 ÷ 구독자수) ÷ 경과일
            </p>
            <p>
              업로드 후 짧은 시간 안에 구독자 수 대비 폭발적인 조회수를 기록한
              영상을 찾아냅니다.
            </p>
            <p>
              <strong>예시:</strong> 구독자 1만 채널에서 하루 만에 조회수 100만
              → 떡상지수 100
            </p>
            <p className="text-xs">기본 정렬 기준으로 사용됩니다.</p>
          </div>
        ) : (
          <div className="space-y-3 text-sm text-muted-foreground">
            <p className="font-mono bg-gray-50 p-3 rounded text-center text-base font-semibold text-foreground">
              롱런지수 = 조회수 ÷ 구독자수
            </p>
            <p>
              업로드 시점과 관계없이 구독자 수 대비 전체 조회수를 기록한
              영상을 찾아냅니다.
            </p>
            <p>
              <strong>예시:</strong> 구독자 1만 채널에서 조회수 100만 → 롱런지수 100
            </p>
            <p className="text-xs">오래된 영상 중 꾸준히 잘 되는 콘텐츠 발견에 유용합니다.</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
