export interface OrganizedReflection {
  feelings: string;
  worries: string;
  hopes: string;
}

export interface MedicalExplanation {
  plainLanguage: string;
  uncertainty: string;
  confirmationQuestion: string;
}

const explicitCrisisPatterns = [
  /我(?:现在)?(?:要|准备|打算|想)伤害自己/u,
  /我(?:现在)?(?:要|准备|打算|想)自杀/u,
  /我不想活了/u,
  /我(?:要|准备|打算)结束(?:自己|我的)?生命/u,
  /我(?:现在)?无法呼吸/u,
  /我(?:正在)?大量出血/u,
];

const unsupportedMedicalRequestPatterns = [
  /我得了什么病/u,
  /帮我诊断/u,
  /是不是(?:癌症|肿瘤|绝症)/u,
  /还能活多久/u,
  /应该(?:吃|用)什么药/u,
  /(?:应该|该)怎么治疗/u,
];

const feelingWords = ["感到", "觉得", "害怕", "难过", "平静", "孤单", "累"];
const worryWords = ["担心", "害怕", "不安", "怕"];
const hopeWords = ["希望", "想要", "想让", "盼望"];

function sentences(text: string): string[] {
  return text
    .split(/(?<=[。！？!?])/u)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

function firstExplicitSentence(text: string, words: string[]): string | undefined {
  return sentences(text).find((sentence) =>
    words.some((word) => sentence.includes(word)),
  );
}

export function organizeReflection(text: string): OrganizedReflection {
  return {
    feelings:
      firstExplicitSentence(text, feelingWords) ?? "原话中没有明确写出感受。",
    worries:
      firstExplicitSentence(text, worryWords) ?? "原话中没有明确写出担心。",
    hopes: firstExplicitSentence(text, hopeWords) ?? "原话中没有明确写出希望。",
  };
}

export function hasExplicitCrisisSignal(text: string): boolean {
  return explicitCrisisPatterns.some((pattern) => pattern.test(text));
}

export function isUnsupportedMedicalRequest(text: string): boolean {
  return unsupportedMedicalRequestPatterns.some((pattern) => pattern.test(text));
}

export function formatOrganizedReflection(
  original: string,
  reflection: OrganizedReflection,
): string {
  return [
    `原始信息\n${original}`,
    `我正在感受\n${reflection.feelings}`,
    `我在担心\n${reflection.worries}`,
    `我现在希望\n${reflection.hopes}`,
  ].join("\n\n");
}

export function explainMedicalText(text: string): MedicalExplanation {
  const comfortFocused = text.includes("以舒适为主");
  const observesSymptoms = text.includes("观察症状变化");

  return {
    plainLanguage:
      comfortFocused && observesSymptoms
        ? "接下来会更重视让你舒服一些，并留意身体有没有新的不适。"
        : "这段说明是在描述接下来的照护安排，具体含义仍需要医护人员结合你的情况确认。",
    uncertainty: observesSymptoms
      ? "原话没有说明会出现哪些变化，也没有给出具体时间。"
      : "仅凭这段原话，不能确定具体原因、严重程度或接下来会发生什么。",
    confirmationQuestion: observesSymptoms
      ? "如果出现新的不舒服，我应该先联系谁？"
      : "这段说明中，哪些部分最需要我现在确认？",
  };
}

export function formatMedicalExplanation(
  original: string,
  explanation: MedicalExplanation,
): string {
  return [
    `原始信息\n${original}`,
    `通俗解释\n${explanation.plainLanguage}`,
    `还不能确定\n${explanation.uncertainty}`,
    `可以向医护确认\n${explanation.confirmationQuestion}`,
  ].join("\n\n");
}
