"use client";
import { useState } from "react";
export function TagsInput({ values, onChange }: { values: string[]; onChange: (values: string[]) => void }) {
  const [text, setText] = useState(values.join(", "));
  return <input className="admin-input mt-2" value={text} onChange={(event) => { setText(event.target.value); onChange([...new Set(event.target.value.split(/[,，]/).map((tag) => tag.trim()).filter(Boolean))]); }} />;
}
