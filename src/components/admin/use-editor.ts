"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { ContentRecord, Kind } from "@/lib/cms-types";
import { adminApi, jsonBody, message } from "./api";
import { useUnsavedChanges } from "./shell";

const serialize = (entry: { slug: string; data: unknown }) => JSON.stringify({ slug: entry.slug, data: entry.data });
export function useEditor<K extends Kind>(initial: ContentRecord<K>) {
  const [draft, setDraft] = useState({ slug: initial.slug, data: initial.data });
  const [server, setServer] = useState(initial);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [acting, setActing] = useState(false);
  const [saved, setSaved] = useState(serialize(initial));
  const { setDirty } = useUnsavedChanges();
  const current = useRef(draft), latest = useRef(initial), baseline = useRef(saved);
  const pending = useRef<Promise<ContentRecord<K>> | null>(null);
  const dirty = serialize(draft) !== saved;
  const recoveryKey = `actify-draft:${initial.id}`;
  useEffect(() => {
    try {
      const cached = sessionStorage.getItem(recoveryKey);
      if (cached && cached !== serialize(initial)) {
        const restored = JSON.parse(cached);
        current.current = restored;
        // Browser recovery protects edits across back navigation and expired sessions.
        setDraft(restored); setError("已恢复此标签页未保存的修改，请检查后保存。");
      }
    } catch { /* Private browser settings may disable session storage. */ }
    return () => setDirty(false);
  }, [initial, recoveryKey, setDirty]);
  useEffect(() => {
    setDirty(dirty);
    try { if (dirty) sessionStorage.setItem(recoveryKey, serialize(draft)); else if (serialize(current.current) === saved) sessionStorage.removeItem(recoveryKey); } catch { /* beforeunload still protects unsaved edits */ }
  }, [dirty, draft, saved, recoveryKey, setDirty]);
  function change(next: typeof draft) { current.current = next; setDraft(next); setError(""); }
  const save = useCallback(async function persist(): Promise<ContentRecord<K>> {
    if (pending.current) { await pending.current; return persist(); }
    const snapshot = current.current;
    if (serialize(snapshot) === baseline.current) return latest.current;
    setSaving(true); setError("");
    pending.current = adminApi<ContentRecord<K>>(`${initial.kind}/${initial.id}`, jsonBody({ ...snapshot, version: latest.current.version, action: "save" }))
      .then((result) => {
        latest.current = result; baseline.current = serialize(snapshot);
        setServer(result); setSaved(baseline.current); return result;
      }).catch((error) => { setError(message(error)); throw error; })
      .finally(() => { pending.current = null; setSaving(false); });
    return pending.current;
  }, [initial.kind, initial.id]);
  useEffect(() => {
    if (!dirty || error || acting || server.deletedAt) return;
    const timer = setTimeout(() => { void save().catch(() => {}); }, 2000);
    return () => clearTimeout(timer);
  }, [dirty, draft, error, acting, server.deletedAt, save]);
  useEffect(() => {
    const keydown = (event: KeyboardEvent) => { if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") { event.preventDefault(); void save().catch(() => {}); } };
    window.addEventListener("keydown", keydown); return () => window.removeEventListener("keydown", keydown);
  }, [save]);
  async function action(action: string, locale?: "zh" | "en") {
    setActing(true); setError("");
    try {
      const record = action === "restore" ? latest.current : await save();
      const result = await adminApi<ContentRecord<K>>(`${initial.kind}/${initial.id}`, jsonBody({ action, version: record.version, locale }));
      latest.current = result; setServer(result); return true;
    } catch (error) { setError(message(error)); return false; }
    finally { setActing(false); }
  }
  return { draft, server, change, save, action, dirty, error, saving, acting, setError };
}
