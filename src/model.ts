import type { MedicalExplanation, OrganizedReflection } from "./domain.ts";

export const activities = [
  { id: "current", label: "此刻的我" },
  { id: "understand", label: "帮我理解" },
  { id: "express", label: "我想和某个人说" },
  { id: "important", label: "对我重要的事情" },
] as const;

export type ActivityId = (typeof activities)[number]["id"];

export interface ApplicationState {
  activeActivity: ActivityId;
  currentInput: string;
  currentResult?: OrganizedReflection;
  crisisInterrupted: boolean;
  copyFeedback?: "success" | "error";
  inputError: boolean;
  understandingInput: string;
  understandingResult?: MedicalExplanation;
  understandingInputError: boolean;
  understandingCopyFeedback?: "success" | "error";
  understandingBoundaryNotice: boolean;
}
