"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Copy, Save, Loader2 } from "lucide-react";
import type { GeneratedTitle, ScriptVersion } from "@/lib/api";

export interface WorkshopEditableData {
  keyword: string;
  sourceTitle: string;
  sourceDescription: string;
  sourceThumbnailUrl?: string | null;
  sourceScript: string;
  generatedTitles: GeneratedTitle[];
  generatedScripts: ScriptVersion[];
}

interface Props {
  data: WorkshopEditableData;
  onSave: (data: WorkshopEditableData) => void;
  saving?: boolean;
  saveLabel?: string;
}

export function WorkshopEditor({ data, onSave, saving, saveLabel = "저장" }: Props) {
  const [state, setState] = useState<WorkshopEditableData>(data);

  const updateTitle = (i: number, title: string) => {
    setState((s) => {
      const titles = [...s.generatedTitles];
      titles[i] = { ...titles[i], title };
      return { ...s, generatedTitles: titles };
    });
  };

  const updateScript = (i: number, script: string) => {
    setState((s) => {
      const scripts = [...s.generatedScripts];
      scripts[i] = { ...scripts[i], script };
      return { ...s, generatedScripts: scripts };
    });
  };

  return (
    <div className="space-y-6">
      {/* 원본 */}
      <div className="rounded-lg border p-4 space-y-3">
        <p className="text-sm font-medium text-muted-foreground">원본 영상</p>
        <div className="flex gap-3">
          {state.sourceThumbnailUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={state.sourceThumbnailUrl} alt="" className="w-32 h-20 object-cover rounded shrink-0" />
          )}
          <div className="flex-1 space-y-1.5">
            <Input
              value={state.sourceTitle}
              onChange={(e) => setState((s) => ({ ...s, sourceTitle: e.target.value }))}
              className="h-8 text-sm font-medium"
            />
            <textarea
              className="w-full h-16 rounded-md border p-2 text-xs text-muted-foreground"
              placeholder="원본 설명란"
              value={state.sourceDescription}
              onChange={(e) => setState((s) => ({ ...s, sourceDescription: e.target.value }))}
            />
          </div>
        </div>
        <details>
          <summary className="text-xs text-muted-foreground cursor-pointer">원본 스크립트 보기/수정</summary>
          <textarea
            className="w-full h-32 rounded-md border p-2 text-xs mt-2"
            value={state.sourceScript}
            onChange={(e) => setState((s) => ({ ...s, sourceScript: e.target.value }))}
          />
        </details>
      </div>

      {/* 재구성된 제목+스크립트 (버전별 1:1 매핑) */}
      <div className="space-y-3">
        <p className="text-sm font-medium">재구성된 버전들 (채널마다 하나씩 매핑해서 쓰세요)</p>
        {state.generatedTitles.map((t, i) => (
          <div key={i} className="rounded-lg border p-4 space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant={t.title_type === "variation" ? "secondary" : "default"} className="text-xs">
                버전 {i + 1}
              </Badge>
              <Badge className="text-xs bg-red-600">{t.seo_score}점</Badge>
            </div>
            <Input value={t.title} onChange={(e) => updateTitle(i, e.target.value)} className="h-9 font-medium" />
            <textarea
              className="w-full h-28 rounded-md border p-2 text-sm"
              value={state.generatedScripts[i]?.script ?? ""}
              onChange={(e) => updateScript(i, e.target.value)}
            />
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() =>
                navigator.clipboard.writeText(`${t.title}\n\n${state.generatedScripts[i]?.script ?? ""}`)
              }
            >
              <Copy className="w-3.5 h-3.5" />
            </Button>
          </div>
        ))}
      </div>

      <Button className="bg-red-600 hover:bg-red-700 gap-2" disabled={saving} onClick={() => onSave(state)}>
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        {saveLabel}
      </Button>
    </div>
  );
}
