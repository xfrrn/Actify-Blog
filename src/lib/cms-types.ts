import { z } from "zod";

export const localeSchema = z.enum(["zh", "en"]);
const text = (max: number) => z.string().max(max).refine((s) => !s.includes("\0"), "不能包含空字符");
export const slugSchema = z.string().max(100).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "地址只能包含小写英文、数字和连字符");
const httpsUrl = z.url({ protocol: /^https$/ });
const asset = text(2048).refine((s) => !s || /^\/(?!\/|\\)[^\\\s]*$/.test(s) || httpsUrl.safeParse(s).success, "请使用站内路径或有效的 HTTPS 地址");
const date = z.union([z.literal(""), z.iso.date()]);
export const translationSchema = z.object({
  title: text(200), description: text(1000), content: text(300000), date,
  category: text(100), tags: z.array(text(50).min(1)).max(30),
  cover: asset, coverAlt: text(500), author: text(100), updatedAt: date,
});
export const postSchema = z.object({ zh: translationSchema.optional(), en: translationSchema.optional() });
export const projectSchema = z.object({
  name: text(200), description: z.object({ zh: text(5000), en: text(5000) }),
  technologies: z.array(text(60).min(1)).max(30), dates: text(100), image: asset, video: asset,
  github: asset, demo: asset, status: z.enum(["", "Building", "Live", "Archived"]),
  featured: z.boolean(), order: z.number().int().min(-100000).max(100000),
});
export type Translation = z.infer<typeof translationSchema>;
export type PostData = z.infer<typeof postSchema>;
export type ProjectData = z.infer<typeof projectSchema>;
export type Kind = "posts" | "projects";
export type ContentData<K extends Kind> = K extends "posts" ? PostData : ProjectData;
export type ContentRecord<K extends Kind = Kind> = {
  id: string; kind: K; slug: string; locked: boolean; version: number;
  data: ContentData<K>; published: ContentData<K> | null;
  deletedAt: string | null; updatedAt: string;
};
export type Media = { id: string; filename: string; name: string; mime: string; size: number; width: number; height: number; created_at: string; url: string; storage: "local" | "r2" };
export const emptyTranslation = (): Translation => ({ title: "", description: "", content: "", date: new Date().toISOString().slice(0, 10), category: "", tags: [], cover: "", coverAlt: "", author: "", updatedAt: "" });
export const emptyProject = (): ProjectData => ({ name: "", description: { zh: "", en: "" }, technologies: [], dates: "", image: "", video: "", github: "", demo: "", status: "", featured: false, order: 100 });
