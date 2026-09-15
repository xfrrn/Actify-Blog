import { allProjects } from "content-collections";
import type { Locale } from "@/lib/i18n";

export function getProjects(locale: Locale, featuredOnly = false) {
  return allProjects
    .filter((project) => !project.draft && (!featuredOnly || project.featured))
    .sort((a, b) => a.order - b.order || a.slug.localeCompare(b.slug))
    .map((project) => ({ ...project, description: project.description[locale] }));
}
