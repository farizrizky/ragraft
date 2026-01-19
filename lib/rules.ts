export type ResponseRule = {
  id: string;
  phrase: string;
  response: string;
  enabled: boolean;
  priority: number;
  createdAt: Date;
};

function normalizePhrase(value: string) {
  return value.trim().toLowerCase();
}

export function splitRulePhrases(phrase: string) {
  return phrase
    .split(";")
    .map(normalizePhrase)
    .filter((value) => value.length > 0);
}

export function findMatchingRule(rules: ResponseRule[], message: string) {
  const messageLower = message.toLowerCase();
  for (const rule of rules) {
    const phrases = splitRulePhrases(rule.phrase);
    for (const phrase of phrases) {
      if (messageLower.includes(phrase)) {
        return { rule, matchedPhrase: phrase };
      }
    }
  }
  return null;
}
