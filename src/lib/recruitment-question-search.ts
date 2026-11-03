import { QUESTION_KINDS, canonicalKind } from "./recruitment";

/** Minimal shapes the question-bank search needs (structurally compatible with the studio rows). */
export type SearchableTopic = {
  title: string;
  description: string;
  position: string | null;
};

export type SearchableQuestion = {
  prompt: string;
  kind: string;
  options: string[];
};

/** Lowercases and strips Vietnamese diacritics so "thiet ke" matches "Thiết kế". */
export function normalizeText(str: string): string {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .trim();
}

/** Case/diacritic-insensitive substring test; an empty needle always matches. */
const contains = (haystack: string, needle: string) =>
  !!haystack && normalizeText(haystack).includes(needle);

/** A question matches on its prompt, any of its choice options, or its kind label. */
export function questionMatchesSearch(q: SearchableQuestion, normTerm: string): boolean {
  if (!normTerm) return true;
  if (contains(q.prompt, normTerm)) return true;
  if (Array.isArray(q.options) && q.options.some((opt) => contains(opt, normTerm))) return true;
  const kind = canonicalKind(q.kind);
  return contains(QUESTION_KINDS[kind] ?? kind, normTerm);
}

/** A topic matches on its title, description or the position it applies to. */
export function topicMatchesSearch(t: SearchableTopic, normTerm: string): boolean {
  if (!normTerm) return true;
  if (contains(t.title, normTerm)) return true;
  if (contains(t.description, normTerm)) return true;
  return contains(t.position ?? "", normTerm);
}

export type FilteredTopic<T, Q> = {
  topic: T;
  /** Every question of the topic, in display order. */
  allQuestions: Q[];
  /** Only the questions that pass both the kind filter and the search term. */
  matchingQuestions: Q[];
};

/**
 * Two-level filter for the question bank: trims each topic's question list to
 * the questions passing both filters (a topic-title match never pulls unrelated
 * questions in), then keeps a topic only when it still has a matching question —
 * or, with just a search term, when the topic itself matches — so searching a
 * topic name still surfaces that topic, but with an honest empty list.
 */
export function filterQuestionBank<
  T extends SearchableTopic & { id: string },
  Q extends SearchableQuestion,
>({
  topics,
  questionsOf,
  search,
  kinds,
}: {
  topics: T[];
  questionsOf: (topicId: string) => Q[];
  search: string;
  /** Selected question kinds; an empty list means "every kind". */
  kinds: string[];
}): FilteredTopic<T, Q>[] {
  const normTerm = normalizeText(search);
  const anyKind = kinds.length === 0;

  return topics
    .map((topic) => {
      const allQuestions = questionsOf(topic.id);
      const matchingQuestions = allQuestions.filter(
        (q) =>
          (anyKind || kinds.includes(canonicalKind(q.kind))) &&
          (!normTerm || questionMatchesSearch(q, normTerm)),
      );
      return { topic, allQuestions, matchingQuestions };
    })
    .filter((item) => {
      if (!anyKind) return item.matchingQuestions.length > 0;
      if (!normTerm) return true;
      return item.matchingQuestions.length > 0 || topicMatchesSearch(item.topic, normTerm);
    });
}
