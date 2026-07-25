"use client";
import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import {
  getSearchUsage,
  getChannels,
  syncChannels,
  getSchedules,
  createSchedule,
  updateScheduleStatus,
  deleteSchedule,
  getUploadSessionUrl,
  ScheduledPublish,
} from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, Loader2, Link2, Trash2, X } from "lucide-react";

const STATUS_LABEL: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
  pending: { label: "예약중", variant: "secondary" },
  published: { label: "발행완료", variant: "default" },
  cancelled: { label: "취소됨", variant: "outline" },
};

export default function PublishPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadingScheduleId = useRef<string | null>(null);

  const [channelId, setChannelId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [uploadingId, setUploadingId] = useState<string | null>(null);

  const { data: usage, isLoading: usageLoading } = useQuery({
    queryKey: ["search-usage"],
    queryFn: getSearchUsage,
  });

  const channelsQuery = useQuery({
    queryKey: ["channels"],
    queryFn: getChannels,
    enabled: usage?.plan === "paid",
  });

  const schedulesQuery = useQuery({
    queryKey: ["schedules"],
    queryFn: getSchedules,
    enabled: usage?.plan === "paid",
  });

  const syncMutation = useMutation({
    mutationFn: syncChannels,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["channels"] }),
  });

  const createMutation = useMutation({
    mutationFn: createSchedule,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["schedules"] });
      setTitle("");
      setDescription("");
      setTagsInput("");
      setScheduledAt("");
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: ScheduledPublish["status"] }) =>
      updateScheduleStatus(id, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["schedules"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteSchedule,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["schedules"] }),
  });

  const handleConnectChannel = () => {
    authClient.linkSocial({
      provider: "google",
      scopes: [
        "https://www.googleapis.com/auth/youtube.upload",
        "https://www.googleapis.com/auth/youtube.readonly",
      ],
      callbackURL: "/publish",
    });
  };

  const handleCreateSchedule = () => {
    if (!channelId || !title.trim() || !scheduledAt) return;
    createMutation.mutate({
      channelId,
      title: title.trim(),
      description,
      tags: tagsInput.split(",").map((t) => t.trim()).filter(Boolean),
      scheduledAt: new Date(scheduledAt).toISOString(),
    });
  };

  const startUpload = (scheduleId: string) => {
    uploadingScheduleId.current = scheduleId;
    fileInputRef.current?.click();
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const scheduleId = uploadingScheduleId.current;
    e.target.value = "";
    if (!file || !scheduleId) return;

    setUploadingId(scheduleId);
    try {
      const uploadUrl = await getUploadSessionUrl(scheduleId, file.size, file.type || "video/mp4");
      const putRes = await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type || "video/mp4" },
        body: file,
      });
      if (!putRes.ok) throw new Error(`업로드 실패 (${putRes.status})`);
      await statusMutation.mutateAsync({ id: scheduleId, status: "published" });
    } catch (err: any) {
      alert(err.message || "업로드 중 오류가 발생했습니다.");
    } finally {
      setUploadingId(null);
    }
  };

  if (usageLoading) return null;

  if (usage?.plan !== "paid") {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center">
        <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-5">
          <Upload className="w-8 h-8 text-red-600" />
        </div>
        <h1 className="text-xl font-bold mb-2">예약 발행</h1>
        <p className="text-gray-500 text-sm mb-6">이 기능은 유료 플랜에서 이용하실 수 있습니다.</p>
        <Button onClick={() => router.push("/billing")} className="bg-red-600 hover:bg-red-700">
          유료 플랜 시작하기
        </Button>
      </div>
    );
  }

  const channels = channelsQuery.data ?? [];

  return (
    <div className="space-y-6 max-w-3xl">
      <input ref={fileInputRef} type="file" accept="video/*" className="hidden" onChange={handleFileSelected} />

      <div>
        <h1 className="text-2xl font-bold">예약 발행</h1>
        <p className="text-muted-foreground text-sm mt-1">
          채널을 연결하고 예약을 만들어두면, 준비됐을 때 직접 업로드할 수 있어요
        </p>
      </div>

      {/* 채널 연동 */}
      <div className="rounded-lg border p-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">연결된 채널</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => syncMutation.mutate()} disabled={syncMutation.isPending}>
              {syncMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "채널 목록 새로고침"}
            </Button>
            <Button size="sm" className="bg-red-600 hover:bg-red-700 gap-1.5" onClick={handleConnectChannel}>
              <Link2 className="w-3.5 h-3.5" />
              채널 연결하기
            </Button>
          </div>
        </div>
        {channels.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            연결된 채널이 없어요. &quot;채널 연결하기&quot;로 구글 계정을 연동한 뒤 &quot;채널 목록 새로고침&quot;을 눌러주세요.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {channels.map((ch) => (
              <Badge key={ch.id} variant="secondary" className="text-xs">
                {ch.channelName}
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* 예약 만들기 */}
      <div className="rounded-lg border p-4 space-y-3">
        <p className="text-sm font-medium">새 예약 만들기</p>
        <Select value={channelId} onValueChange={(v) => setChannelId(v ?? "")}>
          <SelectTrigger className="h-9">
            <SelectValue placeholder="채널 선택" />
          </SelectTrigger>
          <SelectContent>
            {channels.map((ch) => (
              <SelectItem key={ch.id} value={ch.id}>{ch.channelName}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input placeholder="제목" value={title} onChange={(e) => setTitle(e.target.value)} className="h-9" />
        <textarea
          className="w-full h-20 rounded-md border p-2 text-sm"
          placeholder="설명란"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <Input
          placeholder="태그 (쉼표로 구분)"
          value={tagsInput}
          onChange={(e) => setTagsInput(e.target.value)}
          className="h-9"
        />
        <Input
          type="datetime-local"
          value={scheduledAt}
          onChange={(e) => setScheduledAt(e.target.value)}
          className="h-9"
        />
        <Button
          className="bg-red-600 hover:bg-red-700"
          disabled={!channelId || !title.trim() || !scheduledAt || createMutation.isPending}
          onClick={handleCreateSchedule}
        >
          {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "예약 만들기"}
        </Button>
      </div>

      {/* 예약 목록 */}
      <div className="space-y-3">
        {(schedulesQuery.data ?? []).map((s) => {
          const channel = channels.find((c) => c.id === s.channelId);
          const status = STATUS_LABEL[s.status];
          return (
            <div key={s.id} className="rounded-lg border p-4 flex items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Badge variant={status.variant} className="text-xs">{status.label}</Badge>
                  <p className="font-medium text-sm">{s.title}</p>
                </div>
                <p className="text-xs text-muted-foreground">
                  {channel?.channelName ?? "알 수 없는 채널"} · {new Date(s.scheduledAt).toLocaleString("ko-KR")}
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {s.status === "pending" && (
                  <>
                    <Button
                      size="sm"
                      className="bg-red-600 hover:bg-red-700 gap-1.5"
                      disabled={uploadingId === s.id}
                      onClick={() => startUpload(s.id)}
                    >
                      {uploadingId === s.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                      지금 업로드
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => statusMutation.mutate({ id: s.id, status: "cancelled" })}
                    >
                      <X className="w-3.5 h-3.5" />
                    </Button>
                  </>
                )}
                <Button variant="ghost" size="icon-sm" onClick={() => deleteMutation.mutate(s.id)}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
