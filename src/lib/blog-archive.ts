type ArchiveEntry = {
  date: string;
  slug: string;
  category?: string;
  draft?: boolean;
};

export function filterArchivePosts<T extends ArchiveEntry>(posts: T[], category = "") {
  return posts.filter((post) => !post.draft && (!category || post.category === category))
    .sort((a, b) => b.date.localeCompare(a.date) || a.slug.localeCompare(b.slug));
}

export function getArchiveCategories(posts: ArchiveEntry[]) {
  const counts = new Map<string, number>();
  for (const post of posts) {
    if (!post.draft && post.category) counts.set(post.category, (counts.get(post.category) ?? 0) + 1);
  }
  return Array.from(counts, ([name, count]) => ({ name, count }))
    .sort((a, b) => a.name.localeCompare(b.name, "zh-CN"));
}

export function groupArchivePosts<T extends { date: string }>(posts: T[]) {
  const groups = new Map<string, T[]>();
  for (const post of posts) {
    const month = post.date.slice(0, 7);
    const entries = groups.get(month) ?? [];
    entries.push(post);
    groups.set(month, entries);
  }
  return Array.from(groups, ([month, posts]) => ({
    id: `month-${month}`,
    label: `${month.slice(0, 4)} 年 ${Number(month.slice(5))} 月`,
    posts,
  }));
}
