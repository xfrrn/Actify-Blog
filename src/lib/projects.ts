import { publishedContent } from "./cms-store.ts";
import type { Locale } from "./i18n";

export async function getProjects(locale: Locale, featuredOnly = false) {
  return (await publishedContent("projects")).map((entry) => ({ ...entry.published!, slug: entry.slug }))
    .filter((project) => !featuredOnly || project.featured)
    .sort((a, b) => a.order - b.order || a.slug.localeCompare(b.slug))
    .map((project) => ({ ...project, status: project.status || undefined, description: project.description[locale] }));
}
