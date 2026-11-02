import type { ItemReport } from '@prisma/client';

const stopWords = new Set([
  'a', 'an', 'and', 'at', 'for', 'from', 'in', 'is', 'it', 'my', 'of', 'on', 'or', 'the', 'to', 'with',
]);

function keywords(value: string): Set<string> {
  return new Set(
    value.toLowerCase().match(/[a-z0-9]{3,}/g)?.filter((word) => !stopWords.has(word)) ?? [],
  );
}

export function scorePotentialMatch(lost: ItemReport, found: ItemReport): { score: number; reasons: string[] } {
  const reasons: string[] = [];
  let score = 0;

  if (lost.category === found.category) {
    score += 30;
    reasons.push('same category');
  }

  const lostWords = keywords(`${lost.itemName} ${lost.description}`);
  const foundWords = keywords(`${found.itemName} ${found.description}`);
  const overlap = [...lostWords].filter((word) => foundWords.has(word)).length;
  if (lostWords.size > 0) {
    const keywordScore = Math.round((overlap / lostWords.size) * 25);
    if (keywordScore > 0) {
      score += keywordScore;
      reasons.push('similar item details');
    }
  }

  if (lost.location === found.location) {
    score += 20;
    reasons.push('same campus area');
  }

  const daysApart = Math.abs(lost.dateOccurred.getTime() - found.dateOccurred.getTime()) / 86_400_000;
  if (daysApart <= 30) {
    const dateScore = Math.round(15 * (1 - daysApart / 30));
    if (dateScore > 0) {
      score += dateScore;
      reasons.push('dates are close');
    }
  }

  return { score: Math.min(score, 100), reasons };
}

export function findPotentialMatches(
  lost: ItemReport,
  foundReports: ItemReport[],
  limit = 5,
) {
  return foundReports
    .map((report) => ({ report, ...scorePotentialMatch(lost, report) }))
    .filter((match) => match.score >= 25)
    .sort((a, b) => b.score - a.score || b.report.createdAt.getTime() - a.report.createdAt.getTime())
    .slice(0, limit);
}
