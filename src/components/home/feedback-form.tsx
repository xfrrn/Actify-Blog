"use client";

import { useState, type FormEvent } from "react";
import { useLanguage } from "@/components/layout/language-provider";
import { Button } from "@/components/ui/button";

export default function FeedbackForm() {
  const { locale, t } = useLanguage();
  const [status, setStatus] = useState<"idle" | "pending" | "success" | "invalid" | "limited" | "error">("idle");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status === "pending") return;
    const form = event.currentTarget;
    const fields = new FormData(form);
    const painPoint = String(fields.get("painPoint") || "").trim();
    if ([...painPoint].length < 10 || painPoint.length > 2000) {
      setStatus("invalid");
      return;
    }

    setStatus("pending");
    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          painPoint,
          searchQuery: fields.get("searchQuery"),
          website: fields.get("website"),
          locale,
        }),
        signal: AbortSignal.timeout(15000),
      });
      if (response.status === 201) {
        form.reset();
        setStatus("success");
      } else {
        setStatus(response.status === 429 ? "limited" : response.status === 400 ? "invalid" : "error");
      }
    } catch {
      setStatus("error");
    }
  }

  const error = status === "invalid" || status === "limited" || status === "error";
  return (
      <form onSubmit={submit} aria-describedby="feedback-description feedback-privacy" aria-busy={status === "pending"} className="mt-6">
        <fieldset disabled={status === "pending"} className="min-w-0 space-y-5">
          <legend className="sr-only">{t.feedbackTitle}</legend>
          <div className="space-y-2">
            <label htmlFor="feedback-pain" className="block text-sm font-medium">{t.feedbackPain}</label>
            <textarea id="feedback-pain" name="painPoint" required minLength={10} maxLength={2000} rows={4}
              placeholder={t.feedbackPlaceholder} aria-describedby="feedback-hint" aria-invalid={status === "invalid"}
              className="block w-full resize-y rounded-md border border-input bg-background px-3 py-2.5 text-base leading-relaxed placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2" />
            <p id="feedback-hint" className="text-xs text-muted-foreground">{t.feedbackHint}</p>
          </div>
          <div className="space-y-2">
            <label htmlFor="feedback-search" className="block text-sm font-medium">{t.feedbackSearch}</label>
            <input id="feedback-search" name="searchQuery" type="text" maxLength={200} placeholder={t.feedbackSearchPlaceholder}
              className="block w-full rounded-md border border-input bg-background px-3 py-2.5 text-base placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2" />
          </div>
          <div hidden aria-hidden="true">
            <label htmlFor="feedback-website">Website</label>
            <input id="feedback-website" name="website" type="text" tabIndex={-1} autoComplete="off" />
          </div>
          <p id="feedback-privacy" className="text-xs leading-relaxed text-muted-foreground">{t.feedbackPrivacy}</p>
          <Button type="submit" disabled={status === "pending"} className="h-11 w-full sm:w-auto">
            {status === "pending" ? t.feedbackSending : t.feedbackSubmit}
          </Button>
        </fieldset>
        <p role="status" aria-live="polite" aria-atomic="true" className={`mt-3 text-sm leading-relaxed ${error ? "text-destructive" : "text-muted-foreground"}`}>
          {status === "success" ? t.feedbackSuccess : status === "invalid" ? t.feedbackInvalid : status === "limited" ? t.feedbackLimited : status === "error" ? t.feedbackError : ""}
        </p>
      </form>
  );
}
