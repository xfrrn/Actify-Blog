 

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { getPost } from "@/lib/posts";
import { DATA } from "@/data/resume";

export const runtime = "nodejs";

export const alt = "Blog Post";
export const size = {
    width: 1200,
    height: 630,
};
export const contentType = "image/png";

const getFontData = async () => {
    const [cabinetGrotesk, clashDisplay] = await Promise.all([
        readFile(join(process.cwd(), "public/fonts/CabinetGrotesk-Medium.ttf")).then((buffer) => new Uint8Array(buffer).buffer),
        readFile(join(process.cwd(), "public/fonts/ClashDisplay-Semibold.ttf")).then((buffer) => new Uint8Array(buffer).buffer),
    ]);
    return { cabinetGrotesk, clashDisplay };
};

const styles = {
    outerWrapper: {
        height: "100%",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        backgroundColor: "#ffffff",
        position: "relative",
    },
    middleWrapper: {
        height: "100%",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        backgroundColor: "#ffffff",
        position: "relative",
        padding: "40px",
    },
    wrapper: {
        height: "100%",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        backgroundColor: "#fafafa",
        position: "relative",
        padding: "40px",
        border: "1px solid #e5e5e5",
        borderRadius: "12px",
    },
    imageSection: {
        position: "absolute",
        top: "40px",
        left: "40px",
        display: "flex",
        alignItems: "center",
        zIndex: "2",
    },
    mainContainer: {
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        justifyContent: "flex-end",
        height: "100%",
        width: "100%",
        position: "relative",
        zIndex: "1",
    },
    image: {
        width: "140px",
        height: "140px",
        borderRadius: "24px",
        border: "4px solid #e5e5e5",
        objectFit: "cover",
    },
    title: {
        fontFamily: "Clash Display",
        fontSize: "48px",
        fontWeight: "600",
        lineHeight: "1.1",
        textAlign: "left",
        color: "#000000",
        marginBottom: "16px",
        letterSpacing: "-0.02em",
        maxWidth: "900px",
    },
    description: {
        fontSize: "20px",
        fontWeight: "400",
        lineHeight: "1.5",
        textAlign: "left",
        maxWidth: "800px",
        color: "#404040",
        marginBottom: "16px",
        textWrap: "balance",
    },
    date: {
        fontSize: "16px",
        fontWeight: "400",
        lineHeight: "1.5",
        textAlign: "left",
        color: "#666666",
        marginBottom: "32px",
    },
} as const;

export default async function Image({
    params,
}: {
    params: Promise<{ slug: string }>;
}) {
    try {
        const fontData = await getFontData();
        const { slug } = await params;
        const post = getPost(slug);

        if (!post) return new Response("Post not found", { status: 404 });

        const title = post.title;
        const description = post.description;
        const publishedDate = post.date
            ? new Date(post.date).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
                timeZone: "UTC",
            })
            : "";

        return new ImageResponse(
            (
                <div style={styles.outerWrapper}>
                    <div style={styles.middleWrapper}>
                        <div style={styles.wrapper}>
                            <div style={styles.imageSection}><div style={{ ...styles.image, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 64, fontFamily: "Clash Display" }}>{DATA.initials}</div></div>
                            <div style={styles.mainContainer}>
                                <div style={styles.title}>{title}</div>
                                {description && (
                                    <div style={styles.description}>{description}</div>
                                )}
                                {publishedDate && <div style={styles.date}>{publishedDate}</div>}
                            </div>
                        </div>
                    </div>
                </div>
            ),
            {
                ...size,
                fonts: fontData
                    ? [
                        {
                            name: "Cabinet Grotesk",
                            data: fontData.cabinetGrotesk,
                            weight: 400,
                            style: "normal",
                        },
                        {
                            name: "Cabinet Grotesk",
                            data: fontData.cabinetGrotesk,
                            weight: 700,
                            style: "normal",
                        },
                        {
                            name: "Clash Display",
                            data: fontData.clashDisplay,
                            weight: 600,
                            style: "normal",
                        },
                    ]
                    : undefined,
            }
        );
    } catch (error) {
        console.error("Error generating OpenGraph image:", error);
        return new Response(
            `Failed to generate image: ${error instanceof Error ? error.message : "Unknown error"}`,
            {
                status: 500,
            }
        );
    }
}
