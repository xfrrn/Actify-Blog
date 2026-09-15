import BlurFade from "@/components/magicui/blur-fade";
import { ProjectCard } from "@/components/project-card";
import { DATA } from "@/data/resume";
import { Icons } from "@/components/icons";
import Link from "next/link";

const BLUR_FADE_DELAY = 0.04;

export default function ProjectsSection({ featuredOnly = true }: { featuredOnly?: boolean }) {
    const projects = featuredOnly ? DATA.projects.filter((project) => project.featured) : DATA.projects;
    const Heading = featuredOnly ? "h2" : "h1";
    return (
        <section id="projects">
            <div className="flex min-h-0 flex-col gap-y-8">
                <div className="flex flex-col gap-y-4 items-center justify-center">
                    <div className="flex items-center w-full">
                        <div
                            className="flex-1 h-px bg-linear-to-r from-transparent from-5% via-border via-95% to-transparent"

                        />
                        <div className="border bg-primary z-10 rounded-xl px-4 py-1">
                            <span className="text-background text-sm font-medium">{featuredOnly ? "Featured Projects" : "All Projects"}</span>
                        </div>
                        <div
                            className="flex-1 h-px bg-linear-to-l from-transparent from-5% via-border via-95% to-transparent"

                        />
                    </div>
                    <div className="flex flex-col gap-y-3 items-center justify-center">
                        <Heading className="text-3xl font-bold tracking-tighter sm:text-4xl">{featuredOnly ? "What I'm building" : "Projects"}</Heading>
                        <p className="text-muted-foreground md:text-lg/relaxed lg:text-base/relaxed xl:text-lg/relaxed text-balance text-center">
                            Software, experiments, and small ideas taking shape.
                        </p>
                    </div>
                </div>
                <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2 max-w-[800px] mx-auto auto-rows-fr">
                    {projects.map((project, id) => (
                        <BlurFade
                            key={project.slug}
                            delay={BLUR_FADE_DELAY * 12 + id * 0.05}
                            className="h-full"
                        >
                            <ProjectCard
                                href={project.demo || project.github}
                                slug={project.slug}
                                title={project.name}
                                status={project.status}
                                description={project.description}
                                dates={project.dates}
                                tags={project.technologies}
                                image={project.image}
                                video={project.video}
                                links={[
                                    ...(project.github ? [{ type: "GitHub", href: project.github, icon: <Icons.github className="size-3" /> }] : []),
                                    ...(project.demo ? [{ type: "Demo", href: project.demo, icon: <Icons.globe className="size-3" /> }] : []),
                                ]}
                            />
                        </BlurFade>
                    ))}
                </div>
                {projects.length === 0 && <p className="text-sm text-muted-foreground text-center">More projects are on the way.</p>}
                {featuredOnly && <Link href="/projects" className="self-center text-sm text-muted-foreground hover:text-foreground underline underline-offset-4">View all projects</Link>}
            </div>
        </section>
    );
}
