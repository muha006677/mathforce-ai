"use client";

import katex from "katex";

/** Matches inline \( ... \) or block \[ ... \] in order (non-greedy). */
const MATH_REGEX = /\\\(([\s\S]*?)\\\)|\\\[([\s\S]*?)\\\]/g;

type Part =
  | { type: "text"; value: string }
  | { type: "inline"; value: string }
  | { type: "block"; value: string };

function parseMixedContent(str: string): Part[] {
  if (!str || typeof str !== "string") return [{ type: "text", value: str ?? "" }];
  const parts: Part[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  MATH_REGEX.lastIndex = 0;
  while ((match = MATH_REGEX.exec(str)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: "text", value: str.slice(lastIndex, match.index) });
    }
    if (match[1] !== undefined) {
      parts.push({ type: "inline", value: match[1].trim() });
    } else if (match[2] !== undefined) {
      parts.push({ type: "block", value: match[2].trim() });
    }
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < str.length) {
    parts.push({ type: "text", value: str.slice(lastIndex) });
  }
  if (parts.length === 0) {
    parts.push({ type: "text", value: str });
  }
  return parts;
}

function renderLatex(latex: string, displayMode: boolean): string {
  try {
    return katex.renderToString(latex, {
      throwOnError: false,
      displayMode,
      output: "html",
    });
  } catch {
    return katex.renderToString(
      latex.replace(/&/g, "\\&").replace(/%/g, "\\%"),
      { throwOnError: false, displayMode, output: "html" }
    );
  }
}

export interface MathRendererProps {
  /** Text with optional LaTeX: inline \( ... \) and/or block \[ ... \] */
  children: string;
  className?: string;
  /** Root element type */
  as?: "span" | "p" | "div";
  /** When true, treat entire children as one block formula (displayMode) */
  blockMode?: boolean;
}

/**
 * Renders text with optional LaTeX (KaTeX).
 * - Inline: \( ... \)
 * - Block: \[ ... \]
 * Supported: \frac, \sqrt, \sin, \cos, \tan, \log, \ln, \int, ^ (powers), _ (subscripts).
 * Plain text unchanged. Dark theme via global .katex rules.
 */
export function MathRenderer({
  children,
  className = "",
  as: Tag = "span",
  blockMode = false,
}: MathRendererProps) {
  const parts = blockMode
    ? [{ type: "block" as const, value: (children ?? "").trim() }]
    : parseMixedContent(children);
  return (
    <Tag className={className}>
      {parts.map((part, i) => {
        if (part.type === "text") return <span key={i}>{part.value}</span>;
        if (part.type === "inline") {
          return (
            <span
              key={i}
              className="math-renderer-inline"
              dangerouslySetInnerHTML={{ __html: renderLatex(part.value, false) }}
            />
          );
        }
        return (
          <span
            key={i}
            className="math-renderer-block"
            dangerouslySetInnerHTML={{ __html: renderLatex(part.value, true) }}
          />
        );
      })}
    </Tag>
  );
}
