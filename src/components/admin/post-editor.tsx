"use client";
import Link from "next/link";
import { useMemo, useRef, useState, type ClipboardEvent } from "react";
import { ArrowLeft, Bold, Code, Heading2, ImagePlus, Link as LinkIcon, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MarkdownBody } from "@/components/blog/markdown-body";
import { LanguageProvider } from "@/components/layout/language-provider";
import { markdownMetadata } from "@/lib/markdown";
import { emptyTranslation, type ContentRecord, type Translation } from "@/lib/cms-types";
import { useEditor } from "./use-editor";
import { MediaPicker, uploadFile } from "./media-library";
import { message } from "./api";
import { TagsInput } from "./fields";

export function EditorError({ error, retry }: { error: string; retry: () => void }) {
  return error ? <div role="alert" className="my-4 rounded-lg border border-destructive/40 p-4 text-sm leading-relaxed"><p className="text-destructive">{error}</p><div className="mt-2 flex flex-wrap gap-4"><button className="underline underline-offset-4" onClick={retry}>重试保存</button><a className="underline underline-offset-4" href="/admin/login" target="_blank" rel="noreferrer">在新标签页登录</a><button className="underline underline-offset-4" onClick={() => { if (confirm("请先复制需要保留的修改。重新载入将丢弃当前未保存内容。")) { sessionStorage.removeItem(`actify-draft:${location.pathname.split("/").at(-1)}`); location.reload(); } }}>重新载入</button></div></div> : null;
}
export function PostEditor({ initial }: { initial: ContentRecord<"posts"> }) {
  const editor = useEditor(initial);
  const [locale, setLocale] = useState<"zh" | "en">(initial.data.zh ? "zh" : "en");
  const [view, setView] = useState<"edit" | "preview">("edit");
  const [picker, setPicker] = useState<"body" | "cover" | null>(null);
  const [uploading, setUploading] = useState(false);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const selection = useRef({ start: 0, end: 0 });
  const post = editor.draft.data[locale];
  const metadata = useMemo(() => markdownMetadata(post?.content || ""), [post?.content]);
  const update = (patch: Partial<Translation>) => editor.change({ ...editor.draft, data: { ...editor.draft.data, [locale]: { ...(post || emptyTranslation()), ...patch } } });
  async function switchLanguage(next: "zh" | "en") {
    if (editor.dirty) { try { await editor.save(); } catch { return; } }
    setLocale(next);
  }
  function insert(before: string, after = "", placeholder = "") {
    if (!post) return;
    const { start, end } = selection.current;
    const text = before + (post.content.slice(start, end) || placeholder) + after;
    update({ content: post.content.slice(0, start) + text + post.content.slice(end) });
    requestAnimationFrame(() => { textarea.current?.focus(); textarea.current?.setSelectionRange(start + before.length, start + text.length - after.length); });
  }
  async function paste(event: ClipboardEvent<HTMLTextAreaElement>) {
    const file = [...event.clipboardData.files][0];
    if (!file) return;
    event.preventDefault(); setUploading(true);
    try { const image = await uploadFile(file); insert(`\n![图片说明](${image.url})\n`); }
    catch (error) { editor.setError(message(error)); } finally { setUploading(false); }
  }
  async function publish() {
    if (!post) return;
    if (!confirm(`将${locale === "zh" ? "中文" : "英文"}版本发布到 /blog/${editor.draft.slug}？`)) return;
    await editor.action("publish", locale);
  }
  async function preview() {
    const tab = window.open("", "_blank");
    if (!tab) { editor.setError("请允许打开新标签页后重试预览。"); return; }
    tab.opener = null;
    try { await editor.save(); tab.location.href = `/admin/posts/${initial.id}/preview?locale=${locale}`; }
    catch { tab.close(); }
  }
  const status = editor.saving ? "保存中…" : editor.error ? "保存失败 / 待处理" : editor.dirty ? "有未保存的修改" : `已保存 ${new Date(editor.server.updatedAt).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}`;
  return <div className="mx-auto max-w-[1280px] px-5 pb-16 sm:px-8">
    <div className="sticky top-0 z-20 -mx-5 flex flex-wrap items-center justify-between gap-3 border-b bg-background px-5 py-4 sm:-mx-8 sm:px-8">
      <Link href="/admin/posts" className="inline-flex items-center gap-1 text-sm text-muted-foreground"><ArrowLeft className="size-4" />文章列表</Link>
      <div className="flex flex-wrap items-center gap-2"><span role="status" className="mr-2 text-xs text-muted-foreground">{status}</span><Button variant="outline" size="sm" disabled={editor.saving || editor.acting || !!editor.server.deletedAt} onClick={() => void editor.save().catch(() => {})}>保存草稿</Button><Button size="sm" disabled={!post || editor.acting || !!editor.server.deletedAt || uploading} onClick={publish}>{editor.server.published?.[locale] ? "发布更新" : "发布"}</Button></div>
    </div>
    <EditorError error={editor.error} retry={() => void editor.save().catch(() => {})} />
    {editor.server.deletedAt && <div className="my-5 flex items-center justify-between rounded-lg border p-4 text-sm">这篇文章在回收站中。<Button variant="outline" onClick={() => editor.action("restore")}>恢复为草稿</Button></div>}
    <fieldset disabled={editor.acting || !!editor.server.deletedAt || uploading} className="min-w-0">
      <legend className="sr-only">文章编辑</legend>
      <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
        <div className="flex gap-6">{(["zh", "en"] as const).map((lang) => <button key={lang} type="button" onClick={() => switchLanguage(lang)} aria-pressed={locale === lang} className={`border-b-2 pb-3 text-sm ${locale === lang ? "border-foreground font-medium" : "border-transparent text-muted-foreground"}`}>{lang === "zh" ? "中文" : "English"}<span className="ml-2 text-xs text-muted-foreground">{editor.server.published?.[lang] ? "已发布" : editor.draft.data[lang] ? "草稿" : "未创建"}</span></button>)}</div>
        <button type="button" onClick={preview} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">完整预览<ExternalLink className="size-3" /></button>
      </div>
      {!post ? <div className="py-20 text-center"><h1 className="text-xl font-semibold">还没有{locale === "en" ? "英文" : "中文"}版本</h1><p className="admin-muted mt-3">译文独立保存和发布，未发布时网站继续展示已有版本。</p><Button className="mt-6" onClick={() => update(emptyTranslation())}>开始写{locale === "en" ? "英文" : "中文"}版本</Button></div> : <>
        <div className="py-7"><h1 className="sr-only">编辑文章</h1><input aria-label="文章标题" value={post.title} maxLength={200} placeholder="给这篇记录起个标题" onChange={(event) => update({ title: event.target.value })} className="w-full min-w-0 bg-transparent text-[28px] font-semibold tracking-tight outline-none placeholder:text-muted-foreground/60 focus-visible:ring-2 focus-visible:ring-ring rounded-md" /><textarea aria-label="文章摘要" value={post.description} maxLength={1000} placeholder="用一两句话，说明这篇文章写了什么。" rows={2} onChange={(event) => update({ description: event.target.value })} className="mt-4 w-full resize-y rounded-md bg-transparent text-sm leading-relaxed text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring" /></div>
        <details className="mb-7 rounded-xl border p-4"><summary className="cursor-pointer text-sm font-medium">文章设置 <span className="ml-3 text-xs font-normal text-muted-foreground">地址、分类、标签、日期与封面</span></summary><div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <label className="admin-field">文章地址<input className="admin-input mt-2 font-mono" value={editor.draft.slug} disabled={editor.server.locked} onChange={(e) => editor.change({ ...editor.draft, slug: e.target.value })} /><span className="mt-1 block break-all text-xs font-normal text-muted-foreground">/blog/{editor.draft.slug}{editor.server.locked && " · 发布后锁定"}</span></label>
          <label className="admin-field">分类<input className="admin-input mt-2" value={post.category} onChange={(e) => update({ category: e.target.value })} /></label>
          <label className="admin-field">标签（逗号分隔）<TagsInput key={locale} values={post.tags} onChange={(tags) => update({ tags })} /></label>
          <label className="admin-field">发布日期<input type="date" className="admin-input mt-2" value={post.date} onChange={(e) => update({ date: e.target.value })} /></label>
          <label className="admin-field">更新日期<input type="date" className="admin-input mt-2" value={post.updatedAt} onChange={(e) => update({ updatedAt: e.target.value })} /></label>
          <label className="admin-field">作者<input className="admin-input mt-2" value={post.author} placeholder="Actify" onChange={(e) => update({ author: e.target.value })} /></label>
          <label className="admin-field sm:col-span-2">封面地址<div className="mt-2 flex gap-2"><input className="admin-input" value={post.cover} onChange={(e) => update({ cover: e.target.value })} /><Button variant="outline" onClick={() => setPicker("cover")}>选择图片</Button></div></label>
          <label className="admin-field">封面说明<input className="admin-input mt-2" value={post.coverAlt} onChange={(e) => update({ coverAlt: e.target.value })} /></label>
        </div></details>
        <div className="mb-3 flex gap-2 lg:hidden"><Button size="sm" variant={view === "edit" ? "default" : "outline"} onClick={() => setView("edit")}>编辑</Button><Button size="sm" variant={view === "preview" ? "default" : "outline"} onClick={() => setView("preview")}>预览</Button></div>
        <div className="grid min-w-0 overflow-hidden rounded-xl border lg:grid-cols-2">
          <div className={`${view === "preview" ? "hidden lg:block" : ""} min-w-0 lg:border-r`}>
            <div className="flex items-center gap-1 border-b px-3 py-2"><span className="mr-auto text-xs text-muted-foreground">Markdown</span>{[[Heading2, "插入标题", "## ", "", "标题"], [Bold, "加粗", "**", "**", "文字"], [LinkIcon, "插入链接", "[", "](https://)", "链接文字"], [Code, "插入代码块", "\n```text\n", "\n```\n", "代码"]].map(([Icon, label, before, after, placeholder]) => { const Symbol = Icon as typeof Bold; return <Button key={String(label)} variant="ghost" size="icon" aria-label={String(label)} onClick={() => insert(String(before), String(after), String(placeholder))}><Symbol className="size-4" /></Button>; })}<Button variant="ghost" size="icon" aria-label="插入图片" onClick={() => setPicker("body")}><ImagePlus className="size-4" /></Button></div>
            <textarea ref={textarea} aria-label="Markdown 正文" className="block min-h-[560px] w-full resize-y bg-transparent p-5 font-mono text-sm leading-7 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring" value={post.content} onSelect={(e) => { selection.current = { start: e.currentTarget.selectionStart, end: e.currentTarget.selectionEnd }; }} onChange={(e) => update({ content: e.target.value })} onPaste={paste} placeholder="从一个想法开始。支持 Markdown、表格、代码块，也可以直接粘贴图片。" />
          </div>
          <div className={`${view === "edit" ? "hidden lg:block" : ""} min-w-0`}><div className="flex h-[53px] items-center justify-between border-b px-5 text-xs text-muted-foreground"><span>网站预览</span><span>{metadata.readingMinutes} 分钟阅读</span></div><LanguageProvider locale={locale}><div className="p-5 sm:p-7">
            {metadata.toc.length > 0 && <details className="mb-6 rounded-lg border p-3 text-sm"><summary>文章目录</summary><ul className="mt-3 space-y-2">{metadata.toc.map((item) => <li key={item.id} className={item.depth === 3 ? "pl-3" : ""}>{item.title}</li>)}</ul></details>}
            <div className="prose min-w-0 max-w-full text-sm leading-relaxed dark:prose-invert wrap-anywhere"><MarkdownBody content={post.content || "*预览会显示在这里。*"} /></div>
          </div></LanguageProvider></div>
        </div>
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground"><span>{uploading ? "正在上传图片…" : "修改会保存为草稿。点击发布后，读者才会看到更新。"}</span>{editor.server.published?.[locale] && <button className="underline underline-offset-4" onClick={() => { if (confirm("撤回当前语言版本？其他已发布译文不受影响。")) void editor.action("unpublish", locale); }}>撤回当前版本</button>}</div>
      </>}
    </fieldset>
    {picker && <MediaPicker onClose={() => setPicker(null)} onSelect={(media) => picker === "cover" ? update({ cover: media.url }) : insert(`\n![图片说明](${media.url})\n`)} />}
  </div>;
}
