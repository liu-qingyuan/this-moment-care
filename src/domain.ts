export interface OrganizedReflection {
  feelings: string;
  worries: string;
  hopes: string;
}

const explicitCrisisPatterns = [
  /我(?:现在)?(?:要|准备|打算|想)伤害自己/u,
  /我(?:现在)?(?:要|准备|打算|想)自杀/u,
  /我不想活了/u,
  /我(?:要|准备|打算)结束(?:自己|我的)?生命/u,
  /我(?:现在)?无法呼吸/u,
  /我(?:正在)?大量出血/u,
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
