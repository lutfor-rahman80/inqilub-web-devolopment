import type { ReactNode } from "react";
import type { LocalizedText } from "./content";

/**
 * Renders a picked text; when the English page falls back to Bengali the
 * span is marked lang="bn" so screen readers and fonts switch correctly.
 */
export function Localized({ value, as: Tag = "span", className }: { value: LocalizedText; as?: "span" | "p" | "h1" | "h2" | "h3"; className?: string }) {
  if (!value.isFallback) return <Tag className={className}>{value.text}</Tag>;
  return (
    <Tag className={className} lang="bn">
      {value.text}
    </Tag>
  );
}

/**
 * Splits a message template at its `{name}` placeholder: ("View larger: {alt}", "alt") →
 * ["View larger: ", ""]. For labels built around an element that carries the inserted text
 * itself (an <img> whose alt is a Bengali caption, marked lang="bn").
 */
export function splitTemplate(template: string, name: string): [before: string, after: string] {
  const marker = `{${name}}`;
  const i = template.indexOf(marker);
  if (i < 0) return [template, ""];
  return [template.slice(0, i), template.slice(i + marker.length)];
}

/**
 * fmt() as markup: the template's text with `value` in place of `{name}`, where the value keeps
 * its own language (`valueLang`, e.g. "bn" for a Bengali title inside the English
 * "Play video: {title}"). Use it as the visible or visually hidden content that names a link,
 * button or group — an aria-label string cannot mark the language of a part of it.
 */
export function FmtText({ template, name, value, valueLang }: { template: string; name: string; value: ReactNode; valueLang?: string }) {
  const [before, after] = splitTemplate(template, name);
  return (
    <>
      {before}
      {valueLang ? <span lang={valueLang}>{value}</span> : value}
      {after}
    </>
  );
}
