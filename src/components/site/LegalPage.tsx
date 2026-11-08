import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { PageHero } from "@/components/site/SiteLayout";
import { useLang, type Lang } from "@/lib/i18n";
import { LEGAL_CONTACT, LEGAL_UPDATED, PRIVACY, type LegalDoc } from "@/lib/legal-docs";

const LINK = "text-primary underline-offset-2 hover:underline";

/** Turns `{email}`, `{privacy}` and bare https URLs into links, keeping the rest of the text as is. */
function renderText(text: string, lang: Lang): ReactNode[] {
  const nodes: ReactNode[] = [];
  const re = /\{email\}|\{privacy\}|https:\/\/\S+/g;
  let last = 0;
  let key = 0;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    if (match.index > last) nodes.push(text.slice(last, match.index));
    const token = match[0];
    if (token === "{email}") {
      nodes.push(
        <a key={key++} href={`mailto:${LEGAL_CONTACT}`} className={LINK}>
          {LEGAL_CONTACT}
        </a>,
      );
    } else if (token === "{privacy}") {
      nodes.push(
        <Link key={key++} to="/privacy" className={LINK}>
          {PRIVACY[lang].title}
        </Link>,
      );
    } else {
      // Bare URLs may swallow the sentence's closing punctuation.
      const url = token.replace(/[.,;:)]+$/, "");
      nodes.push(
        <a key={key++} href={url} target="_blank" rel="noopener noreferrer" className={LINK}>
          {url}
        </a>,
      );
      const tail = token.slice(url.length);
      if (tail) nodes.push(tail);
    }
    last = match.index + token.length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

/** Shared shell for /privacy and /terms: hero, intro, sections with paragraphs and bullets. */
export function LegalPage({
  docs,
  extra,
}: {
  docs: Record<Lang, LegalDoc>;
  /** Extra block rendered at the end of a section, by section id (used for the Limited Use box). */
  extra?: Partial<Record<string, ReactNode>>;
}) {
  const lang = useLang();
  const doc = docs[lang];
  const [year, month, day] = LEGAL_UPDATED.split("-");
  const updated = year && month && day ? `${day}/${month}/${year}` : LEGAL_UPDATED;

  return (
    <>
      <PageHero eyebrow={`${doc.updatedLabel}: ${updated}`} title={doc.title} />
      <article className="mx-auto max-w-3xl space-y-8 px-4 py-12 md:px-6">
        <p className="leading-relaxed text-muted-foreground">{renderText(doc.intro, lang)}</p>
        {doc.sections.map((section) => {
          const [first, ...rest] = section.paragraphs;
          return (
            <section key={section.id} id={section.id} className="scroll-mt-24 space-y-2">
              <h2 className="text-xl font-semibold">{section.heading}</h2>
              {first && (
                <p className="leading-relaxed text-muted-foreground">{renderText(first, lang)}</p>
              )}
              {section.bullets && section.bullets.length > 0 && (
                <ul className="list-disc space-y-1 pl-5 leading-relaxed text-muted-foreground">
                  {section.bullets.map((bullet, index) => (
                    <li key={index}>{renderText(bullet, lang)}</li>
                  ))}
                </ul>
              )}
              {rest.map((paragraph, index) => (
                <p key={index} className="leading-relaxed text-muted-foreground">
                  {renderText(paragraph, lang)}
                </p>
              ))}
              {extra?.[section.id]}
            </section>
          );
        })}
      </article>
    </>
  );
}
