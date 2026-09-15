import { ImageResponse } from "next/og";
import { DATA } from "@/data/resume";

export const size = { width: 64, height: 64 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    <div style={{ background: "#171717", color: "white", width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 44, fontWeight: 600 }}>{DATA.initials}</div>,
    size,
  );
}
