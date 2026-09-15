import { Icons } from "@/components/icons/social";
import { HomeIcon, FolderGit2, NotebookIcon, Hammer, BookOpen, Compass } from "lucide-react";
import { ReactLight } from "@/components/icons/react";
import { NextjsIconDark } from "@/components/icons/nextjs";
import { Typescript } from "@/components/icons/typescript";
import { Nodejs } from "@/components/icons/nodejs";
import type { ReactNode } from "react";

// Fill in your public contact details here. Empty links are not rendered.
const github = "https://github.com/xfrrn";
const email = "";

export type Project = {
  name: string;
  slug: string;
  description: string;
  dates: string;
  technologies: readonly string[];
  image?: string;
  video?: string;
  github?: string;
  demo?: string;
  status: "Building" | "Live" | "Archived";
  featured: boolean;
};

export const DATA = {
  name: "Actify",
  initials: "A",
  url: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").origin,
  roles: ["Developer", "AI Builder", "Indie Hacker"],
  description: "I build useful software, explore AI, and turn small ideas into independent products.",
  summary: "I'm Actify, a developer exploring the space between software, AI, and independent products. This is where I share what I'm building, what I'm learning, and the details behind the work.",
  avatarUrl: "", // Add a file in public/ and set its path, e.g. /avatar.png.
  skills: [
    { name: "React", icon: ReactLight },
    { name: "Next.js", icon: NextjsIconDark },
    { name: "TypeScript", icon: Typescript },
    { name: "Node.js", icon: Nodejs },
  ],
  now: {
    updatedAt: "2026-09-11",
    items: [
      { label: "Currently Building", title: "A home for my work", description: "This portfolio and a place to publish development notes.", icon: Hammer },
      { label: "Currently Learning", title: "Building with AI", description: "Exploring how AI can fit into useful, everyday software.", icon: BookOpen },
      { label: "Currently Exploring", title: "Small, independent products", description: "Finding focused problems worth solving with simple tools.", icon: Compass },
    ],
  },
  blog: {
    description: "Notes on development, AI, and building independent products.",
  },
  navbar: [
    { href: "/", icon: HomeIcon, label: "Home" },
    { href: "/projects", icon: FolderGit2, label: "Projects" },
    { href: "/blog", icon: NotebookIcon, label: "Blog" },
  ],
  contact: {
    email,
    description: "Have a project in mind, an idea to share, or a question about my work? I'd love to hear from you.",
    social: {
      GitHub: { name: "GitHub", url: github, icon: Icons.github, navbar: true },
      Email: { name: "Email", url: email ? `mailto:${email}` : "", icon: Icons.email, navbar: false },
      X: { name: "X", url: "", icon: Icons.x, navbar: false },
    },
  },
  // Leave unconfirmed experience empty; the existing sections appear when populated.
  work: [] as {
    company: string; href: string; badges: string[]; location: string;
    title: string; logoUrl: string; start: string; end?: string; description: string;
  }[],
  education: [] as {
    school: string; href: string; degree: string; logoUrl: string; start: string; end: string;
  }[],
  projects: [
    {
      name: "Actify Portfolio",
      slug: "actify-portfolio",
      description: "My personal site, built on Magic UI Portfolio. A home for projects, development notes, and what I'm working on now.",
      dates: "September 2026 — Present",
      technologies: ["Next.js", "TypeScript", "Tailwind CSS", "Magic UI", "MDX"],
      image: "/projects/actify-portfolio.png",
      github: "https://github.com/xfrrn/Actify-Blog",
      demo: "/",
      status: "Building",
      featured: true,
    },
  ] satisfies Project[] as Project[],
  hackathons: [] as {
    title: string; dates: string; location: string; description: string; image: string;
    links: { title: string; href: string; icon: ReactNode }[];
  }[],
} as const;
