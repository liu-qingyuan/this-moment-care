import type { MedicalExplanation, OrganizedReflection } from "./domain.ts";

export const activities = [
  { id: "current", label: "此刻的我" },
  { id: "understand", label: "帮我理解" },
  { id: "express", label: "我想和某个人说" },
  { id: "important", label: "对我重要的事情" },
] as const;

export type ActivityId = (typeof activities)[number]["id"];

export type InputId =
  | "current-input"
  | "understand-input"
  | "expression-audience"
  | "expression-input"
  | "expression-draft";

export type CommandId =
  | "submit-current"
  | "copy-current"
  | "revise-current"
  | "submit-understand"
  | "copy-understand"
  | "revise-understand"
  | "submit-expression"
  | "copy-expression"
  | "revise-expression"
  | "crisis-return"
  | "crisis-clear";

export interface ActivityState<Result> {
  input: string;
  result?: Result;
  inputError: boolean;
  copyFeedback?: "success" | "error";
}

export interface UnderstandingActivityState
  extends ActivityState<MedicalExplanation> {
  boundaryNotice: boolean;
}

export interface ExpressionActivityState {
  audience: string;
  input: string;
  draft?: string;
  fieldError?: "audience" | "input";
  copyFeedback?: "success" | "error";
}

export interface ApplicationState {
  activeActivity: ActivityId;
  current: ActivityState<OrganizedReflection>;
  understanding: UnderstandingActivityState;
  expression: ExpressionActivityState;
  crisisInterrupted: boolean;
}
