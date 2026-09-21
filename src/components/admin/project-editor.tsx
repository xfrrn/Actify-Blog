"use client";
import Link from "next/link";
import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProjectCard } from "@/components/projects/project-card";
import { LanguageProvider } from "@/components/layout/language-provider";
import type { ContentRecord, ProjectData } from "@/lib/cms-types";
import { useEditor } from "./use-editor";
import { EditorError } from "./post-editor";
import { MediaPicker } from "./media-library";
import { TagsInput } from "./fields";

export function ProjectEditor({ initial }: { initial: ContentRecord<"projects"> }) {
  const editor = useEditor(initial);
  const [locale, setLocale] = useState<"zh" | "en">("zh"), [picker, setPicker] = useState(false);
  const project = editor.draft.data;
  const update = (patch: Partial<ProjectData>) => editor.change({ ...editor.draft, data: { ...project, ...patch } });
  return <div className="mx-auto max-w-[1280px] px-5 pb-16 sm:px-8">
    <div className="sticky top-0 z-20 -mx-5 flex flex-wrap items-center justify-between gap-3 border-b bg-background px-5 py-4 sm:-mx-8 sm:px-8">
      <Link href="/admin/projects" className="inline-flex items-center gap-1 text-sm text-muted-foreground"><ArrowLeft className="size-4" />作品列表</Link>
      <div className="flex items-center gap-2"><span role="status" className="mr-2 text-xs text-muted-foreground">{editor.saving ? "保存中…" : editor.dirty ? "有未保存的修改" : "已保存"}</span><Button size="sm" variant="outline" disabled={editor.acting || !!editor.server.deletedAt} onClick={() => void editor.save().catch(() => {})}>保存草稿</Button><Button size="sm" disabled={editor.acting || !!editor.server.deletedAt} onClick={() => { if (confirm("发布这个作品？保存的内容将更新到网站。")) void editor.action("publish"); }}>{editor.server.published ? "发布更新" : "发布"}</Button></div>
    </div>
    <EditorError error={editor.error} retry={() => void editor.save().catch(() => {})} />
    {editor.server.deletedAt && <div className="my-5 flex items-center justify-between rounded-lg border p-4 text-sm">这个作品在回收站中。<Button variant="outline" onClick={() => editor.action("restore")}>恢复为草稿</Button></div>}
    <h1 className="admin-title mt-9">{project.name || "新作品"}</h1><p className="admin-muted mt-2">填好介绍，让读者知道你做了什么、可以在哪里体验。</p>
    <div className="mt-8 grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_360px]">
      <fieldset disabled={editor.acting || !!editor.server.deletedAt} className="min-w-0 space-y-5"><legend className="sr-only">作品资料</legend>
        <div className="grid gap-4 sm:grid-cols-2"><label className="admin-field">名称<input value={project.name} className="admin-input mt-2" onChange={(e) => update({ name: e.target.value })} /></label><label className="admin-field">标识<input value={editor.draft.slug} className="admin-input mt-2 font-mono" disabled={editor.server.locked} onChange={(e) => editor.change({ ...editor.draft, slug: e.target.value })} /></label></div>
        <label className="admin-field">中文简介<textarea rows={4} value={project.description.zh} className="admin-input mt-2 leading-relaxed" onChange={(e) => update({ description: { ...project.description, zh: e.target.value } })} /></label>
        <label className="admin-field">英文简介<textarea rows={4} value={project.description.en} className="admin-input mt-2 leading-relaxed" onChange={(e) => update({ description: { ...project.description, en: e.target.value } })} /></label>
        <label className="admin-field">技术标签（逗号分隔）<TagsInput values={project.technologies} onChange={(technologies) => update({ technologies })} /></label>
        <div className="grid gap-4 sm:grid-cols-2">{([["github", "GitHub 链接"], ["demo", "体验 / 官网链接"], ["dates", "项目时间"]] as const).map(([key, label]) => <label key={key} className="admin-field">{label}<input value={project[key]} className="admin-input mt-2" onChange={(e) => update({ [key]: e.target.value })} /></label>)}
          <label className="admin-field">项目状态<select value={project.status} className="admin-input mt-2" onChange={(e) => update({ status: e.target.value as ProjectData["status"] })}><option value="">不显示</option><option value="Building">开发中</option><option value="Live">已上线</option><option value="Archived">已归档</option></select></label>
        </div>
        <label className="admin-field">封面<div className="mt-2 flex gap-2"><input value={project.image} className="admin-input" onChange={(e) => update({ image: e.target.value })} /><Button variant="outline" onClick={() => setPicker(true)}>选择图片</Button></div></label>
        <label className="admin-field">已有视频地址<input value={project.video} className="admin-input mt-2" onChange={(e) => update({ video: e.target.value })} /><span className="mt-2 block text-xs font-normal text-muted-foreground">填写后，卡片优先展示视频。</span></label>
        <div className="flex flex-wrap items-center gap-6 border-y py-5"><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={project.featured} onChange={(e) => update({ featured: e.target.checked })} className="size-4 accent-foreground" />首页精选</label><label className="flex items-center gap-3 text-sm">排序<input type="number" min={-100000} max={100000} value={project.order} className="admin-input w-24" onChange={(e) => update({ order: Number(e.target.value) })} /><span className="text-xs text-muted-foreground">越小越靠前</span></label></div>
        {editor.server.published && <button className="text-xs text-muted-foreground underline underline-offset-4" onClick={() => { if (confirm("撤下这个作品？内容会保留为草稿。")) void editor.action("unpublish"); }}>撤下作品</button>}
      </fieldset>
      <aside className="min-w-0 lg:sticky lg:top-24"><div className="mb-4 flex items-center justify-between"><h2 className="text-sm font-medium">作品卡片预览</h2><div className="flex gap-3 text-xs">{(["zh", "en"] as const).map((lang) => <button key={lang} aria-pressed={locale === lang} className={locale === lang ? "underline underline-offset-4" : "text-muted-foreground"} onClick={() => setLocale(lang)}>{lang === "zh" ? "中文" : "EN"}</button>)}</div></div>
        <LanguageProvider locale={locale}><ProjectCard title={project.name || "作品名称"} description={project.description[locale] || "作品简介会显示在这里。"} tags={project.technologies} image={project.image || undefined} video={project.video || undefined} status={project.status || undefined} dates={project.dates} links={[...(project.github ? [{ type: "GitHub", href: project.github, icon: null }] : []), ...(project.demo ? [{ type: "Demo", href: project.demo, icon: null }] : [])]} /></LanguageProvider>
        <p className="mt-4 text-xs leading-relaxed text-muted-foreground">预览使用网站上的同一个作品组件。草稿修改在发布前不会影响读者。</p>
      </aside>
    </div>
    {picker && <MediaPicker onClose={() => setPicker(false)} onSelect={(media) => update({ image: media.url })} />}
  </div>;
}
