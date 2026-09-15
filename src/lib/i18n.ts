export type Locale = "en" | "zh";
export const languageCookie = "site-language";
export const normalizeLocale = (value?: string): Locale => value === "zh" ? "zh" : "en";

const en = {
  home: "Home", projects: "Projects", blog: "Blog", hello: "Hi, I'm", about: "About me",
  now: "What I'm working on", updated: "Updated", writing: "Latest writing", allPosts: "All posts",
  noPosts: "No posts yet. I'll share notes from my learning, life, and work here.",
  contact: "Contact", chat: "Let's talk", readNotes: "Read my notes",
  featured: "Selected projects", allProjects: "All projects", tools: "Tools I've built",
  projectsDescription: "PDF translation, GitHub star organization, audio and video notes, and this personal website.",
  noProjects: "No public projects yet.", viewProjects: "View all projects", view: "View",
  cover: "text cover", building: "Building", live: "Live", archived: "Archived", demo: "Visit site",
  category: "Category", categories: "Post categories", clear: "Clear filter", posts: "posts", minRead: "min read",
  timeline: "Post timeline", browseTime: "Browse by date", noDates: "No entries yet",
  emptyCategory: "No posts in this category yet", firstPost: "The first entry starts here",
  clearHint: "Clear the filter to explore other posts.", emptyHint: "No posts published yet. New entries will appear here by month.",
  backBlog: "Back to blog", toc: "On this page", adjacent: "Adjacent articles", previous: "Previous", next: "Next",
  navigation: "Main navigation", theme: "Theme", toggleTheme: "Toggle theme", skip: "Skip to content",
  notFound: "Page not found", notFoundHint: "The page you're looking for doesn't exist or may have moved.",
  backHome: "Go to home", experience: "Work experience", education: "Education",
  copy: "Copy code", copied: "Code copied", copyError: "Copy failed. Select the code and copy it manually.", code: "Code block", table: "Scrollable table",
};
const zh: typeof en = {
  home: "首页", projects: "作品", blog: "博客", hello: "你好，我是", about: "关于我",
  now: "最近在做什么", updated: "更新于", writing: "最近的记录", allPosts: "全部文章",
  noPosts: "还没有发布文章。这里会记录学习、生活和工作中的具体经历。",
  contact: "联系我", chat: "来聊聊", readNotes: "读读我的记录",
  featured: "部分作品", allProjects: "全部作品", tools: "我做的小工具",
  projectsDescription: "PDF 划词翻译、GitHub 收藏整理、音视频笔记，以及这个个人网站。",
  noProjects: "暂时没有公开展示的作品。", viewProjects: "查看全部作品", view: "查看",
  cover: "文字封面", building: "开发中", live: "已上线", archived: "已归档", demo: "访问网站",
  category: "分类", categories: "文章分类", clear: "清除筛选", posts: "篇文章", minRead: "分钟阅读",
  timeline: "文章时间线", browseTime: "按时间浏览", noDates: "暂无时间记录",
  emptyCategory: "这个分类下还没有文章", firstPost: "第一篇记录，从这里开始",
  clearHint: "可以清除筛选，看看其他文章。", emptyHint: "还没有发布文章。新的记录会按月份出现在这条时间线上。",
  backBlog: "返回博客", toc: "本文目录", adjacent: "相邻文章", previous: "上一篇", next: "下一篇",
  navigation: "主导航", theme: "主题", toggleTheme: "切换主题", skip: "跳到正文",
  notFound: "找不到页面", notFoundHint: "你要找的页面不存在，或已经移动。",
  backHome: "返回首页", experience: "工作经历", education: "教育经历",
  copy: "复制代码", copied: "代码已复制", copyError: "复制失败，请选中代码手动复制。", code: "代码块", table: "可横向滚动的表格",
};
export const messages = { en, zh };
