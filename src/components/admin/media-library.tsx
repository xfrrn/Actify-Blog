"use client";
/* eslint-disable @next/next/no-img-element */
import { useCallback, useEffect, useRef, useState, type ClipboardEvent, type DragEvent } from "react";
import { Upload, ImagePlus, Check, Copy, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Media } from "@/lib/cms-types";
import { adminApi, message } from "./api";
import { Pagination } from "./content-list";

export async function uploadFile(file: File) {
  if (file.size > 10 * 1024 * 1024) throw new Error("图片不能超过 10MB。");
  if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type)) throw new Error("请选择 JPEG、PNG、WebP 或 GIF 图片。");
  return adminApi<Media>("media", { method: "POST", headers: { "Content-Type": file.type, "X-Filename": encodeURIComponent(file.name) }, body: file });
}
export function MediaLibrary({ onSelect }: { onSelect?: (media: Media) => void }) {
  const [items, setItems] = useState<Media[]>([]), [total, setTotal] = useState(0), [page, setPage] = useState(1);
  const [error, setError] = useState(""), [busy, setBusy] = useState(false), [copied, setCopied] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const request = useRef(0);
  const cancelLoad = useCallback(() => { ++request.current; }, []);
  const load = useCallback(async () => {
    const sequence = ++request.current;
    try { const result = await adminApi<{ items: Media[]; total: number }>(`media?page=${page}`); if (sequence === request.current) { setItems(result.items); setTotal(result.total); } }
    catch (error) { if (sequence === request.current) setError(message(error)); }
  }, [page]);
  useEffect(() => { void load(); return cancelLoad; }, [load, cancelLoad]);
  async function upload(files: File[]) {
    if (!files.length || busy) return;
    setBusy(true); setError("");
    try {
      for (const file of files) await uploadFile(file);
      if (page === 1) await load(); else setPage(1);
    } catch (error) { setError(message(error)); await load(); }
    finally { setBusy(false); if (input.current) input.current.value = ""; }
  }
  function paste(event: ClipboardEvent) { const files = [...event.clipboardData.files]; if (files.length) { event.preventDefault(); void upload(files); } }
  function drop(event: DragEvent) { event.preventDefault(); void upload([...event.dataTransfer.files]); }
  async function copy(item: Media) {
    try { await navigator.clipboard.writeText(new URL(item.url, location.origin).href); setCopied(item.id); }
    catch { setError("复制失败，请打开图片后复制地址。"); }
  }
  return <section onPaste={paste} onDragOver={(event) => event.preventDefault()} onDrop={drop} aria-label="图片素材库">
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed bg-muted/20 px-6 py-8 text-center" tabIndex={0}>
      <ImagePlus className="size-6 text-muted-foreground" /><p className="text-sm">拖入图片，或在这里粘贴截图</p><p className="text-xs text-muted-foreground">JPEG、PNG、WebP、GIF · 每张最大 10MB · 上传后拥有公开链接</p>
      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple className="sr-only" aria-label="选择图片文件" onChange={(event) => void upload([...event.target.files || []])} />
      <Button variant="outline" disabled={busy} className="gap-2" onClick={() => input.current?.click()}><Upload className="size-4" />{busy ? "正在上传…" : "选择图片"}</Button>
    </div>
    {error && <p role="alert" className="mt-4 text-sm text-destructive">{error} <a href="/admin/login" target="_blank" rel="noreferrer" className="underline">重新登录</a></p>}
    <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {items.map((item) => <div key={item.id} className="min-w-0 overflow-hidden rounded-xl border">
        <a href={item.url} target="_blank" rel="noreferrer" aria-label={`查看 ${item.name}`} className="block aspect-[4/3] bg-muted/40"><img src={item.url} alt={item.name} loading="lazy" className="size-full object-contain" /></a>
        <div className="space-y-2 p-3"><p className="truncate text-xs font-medium" title={item.name}>{item.name}</p><p className="text-[11px] text-muted-foreground">{item.width} × {item.height} · {Math.ceil(item.size / 1024)} KB</p>
          <div className="flex flex-wrap gap-2"><Button variant="ghost" size="sm" className="h-7 gap-1 px-1.5 text-xs" onClick={() => copy(item)}>{copied === item.id ? <Check className="size-3" /> : <Copy className="size-3" />}{copied === item.id ? "已复制" : "链接"}</Button>{onSelect && <Button size="sm" className="h-7 px-2 text-xs" onClick={() => onSelect(item)}>选择</Button>}</div>
        </div>
      </div>)}
    </div>
    {!items.length && <p className="py-8 text-center text-sm text-muted-foreground">上传第一张图片，用在文章或作品中。</p>}
    <Pagination page={page} total={total} pageSize={24} onChange={setPage} />
  </section>;
}
export function MediaPicker({ onSelect, onClose }: { onSelect: (media: Media) => void; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { dialog.current?.showModal(); }, []);
  return <dialog ref={dialog} onClose={onClose} className="m-auto max-h-[90dvh] w-[min(960px,94vw)] overflow-y-auto rounded-xl border bg-background p-5 text-foreground backdrop:bg-black/40 sm:p-7" aria-labelledby="media-picker-title">
    <div className="mb-6 flex items-center justify-between"><h2 id="media-picker-title" className="text-lg font-semibold">选择图片</h2><Button variant="ghost" size="icon" aria-label="关闭素材库" onClick={onClose}><X className="size-4" /></Button></div>
    <MediaLibrary onSelect={(item) => { onSelect(item); onClose(); }} />
  </dialog>;
}
