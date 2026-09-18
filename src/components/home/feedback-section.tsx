import FeedbackForm from "@/components/home/feedback-form";
import { getLanguage } from "@/lib/server-language";
import { getPublishedFeedback } from "@/lib/feedback";

export default async function FeedbackSection() {
  const { t, locale } = await getLanguage();
  const feedback = await getPublishedFeedback();
  return (
    <section id="feedback" aria-labelledby="feedback-title" className="border-t pt-8">
      <h2 id="feedback-title" className="text-xl font-bold">{t.feedbackTitle}</h2>
      <p id="feedback-description" className="mt-3 text-sm leading-relaxed text-muted-foreground">{t.feedbackDescription}</p>
      <FeedbackForm />
      <div className="mt-8 border-t pt-6">
        <h3 className="text-base font-semibold">{t.feedbackPublished}</h3>
        {feedback.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">{t.feedbackEmpty}</p>
        ) : (
          <ul className="mt-4 divide-y">
            {feedback.map((item) => (
              <li key={item.id} className="py-4 first:pt-0">
                <p lang={item.locale === "zh" ? "zh-CN" : "en"} className="whitespace-pre-wrap break-words text-sm leading-relaxed">{item.pain_point}</p>
                <time dateTime={`${item.created_at.replace(" ", "T")}Z`} className="mt-2 block text-xs text-muted-foreground">
                  {new Date(`${item.created_at.replace(" ", "T")}Z`).toLocaleDateString(locale === "zh" ? "zh-CN" : "en-US", { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" })}
                </time>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
