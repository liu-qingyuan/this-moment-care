import type { CommandId, InputId } from "../model.ts";

export const commandAttribute = (command: CommandId): string =>
  `data-command="${command}"`;

export const inputIdAttribute = (inputId: InputId): string =>
  `id="${inputId}"`;

export function escapeHtml(value: string): string {
  return value.replace(
    /[&<>'"]/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "'": "&#39;",
        '"': "&quot;",
      })[character]!,
  );
}

export function feedbackText(feedback?: "success" | "error"): string {
  if (feedback === "success") return "已复制";
  if (feedback === "error") return "复制失败，请手动选择文字。";
  return "";
}
