export const getLevenshteinDistance = (a: string, b: string): number => {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix = Array.from({ length: a.length + 1 }, () =>
    new Array(b.length + 1).fill(0)
  );

  for (let i = 0; i <= a.length; i++) matrix[i][0] = i;
  for (let j = 0; j <= b.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,      // deletion
        matrix[i][j - 1] + 1,      // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );

      // Damerau-Levenshtein transposition
      if (
        i > 1 &&
        j > 1 &&
        a[i - 1] === b[j - 2] &&
        a[i - 2] === b[j - 1]
      ) {
        matrix[i][j] = Math.min(matrix[i][j], matrix[i - 2][j - 2] + cost);
      }
    }
  }
  return matrix[a.length][b.length];
};

export const normalizeForFuzzy = (text: string) =>
  text
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

export const isFuzzyMatch = (
  query: string,
  candidateName: string,
  candidateKeywords: string[] = []
): boolean => {
  const normQuery = normalizeForFuzzy(query);
  const normCandidate = normalizeForFuzzy(candidateName);
  const normKeywords = candidateKeywords.map(normalizeForFuzzy);

  const qTokens = normQuery.split(" ").filter(Boolean);
  if (qTokens.length === 0) return false;

  const cTokens = [
    ...normCandidate.split(" ").filter(Boolean),
    ...normKeywords.flatMap(k => k.split(" ").filter(Boolean))
  ];

  if (cTokens.length === 0) return false;

  // Every query token must match at least one candidate token with allowed typos
  let allTokensMatch = true;

  for (const qToken of qTokens) {
    let tokenMatched = false;
    for (const cToken of cTokens) {
      let allowedDist = 0;
      if (qToken.length > 5) allowedDist = 2;
      else if (qToken.length > 3) allowedDist = 1;

      // Exact prefix matching is allowed for shorter queries (like 'mu' -> 'mumbai')
      if (cToken.startsWith(qToken)) {
        tokenMatched = true;
        break;
      }

      const dist = getLevenshteinDistance(qToken, cToken);
      const prefixDist = getLevenshteinDistance(
        qToken,
        cToken.slice(0, qToken.length)
      );

      if (dist <= allowedDist || prefixDist <= allowedDist) {
        tokenMatched = true;
        break;
      }
    }

    if (!tokenMatched) {
      allTokensMatch = false;
      break;
    }
  }

  // Fallback for concatenated queries like 'mirabhayandar'
  const queryNoSpace = normQuery.replace(/\s+/g, "");
  const candidateNoSpace = normCandidate.replace(/\s+/g, "");
  
  let allowedNoSpaceDist = 0;
  if (queryNoSpace.length > 5) allowedNoSpaceDist = 2;
  else if (queryNoSpace.length > 3) allowedNoSpaceDist = 1;

  if (getLevenshteinDistance(queryNoSpace, candidateNoSpace) <= allowedNoSpaceDist) return true;
  
  for (const k of normKeywords) {
    const kNoSpace = k.replace(/\s+/g, "");
    if (getLevenshteinDistance(queryNoSpace, kNoSpace) <= allowedNoSpaceDist) return true;
  }

  return allTokensMatch;
};

export const getFuzzyScore = (
  query: string,
  candidateName: string,
  candidateKeywords: string[] = []
): number => {
  const normQuery = normalizeForFuzzy(query);
  const normCandidate = normalizeForFuzzy(candidateName);
  
  if (normCandidate === normQuery) return 100;
  if (normCandidate.startsWith(normQuery)) return 80;
  if (candidateKeywords.some(k => normalizeForFuzzy(k) === normQuery)) return 90;

  const qTokens = normQuery.split(" ").filter(Boolean);
  const cTokens = normCandidate.split(" ").filter(Boolean);
  
  let score = 0;
  
  for (const qToken of qTokens) {
    let bestTokenScore = 0;
    for (const cToken of cTokens) {
      if (qToken === cToken) {
        bestTokenScore = Math.max(bestTokenScore, 10);
      } else if (cToken.startsWith(qToken)) {
        bestTokenScore = Math.max(bestTokenScore, 5);
      } else {
        const dist = getLevenshteinDistance(qToken, cToken);
        const maxLen = Math.max(qToken.length, cToken.length);
        const sim = 1 - dist / maxLen;
        if (sim > 0.6) {
          bestTokenScore = Math.max(bestTokenScore, sim * 4);
        }
      }
    }
    score += bestTokenScore;
  }
  
  const lenPenalty = Math.abs(normQuery.length - normCandidate.length) * 0.1;
  return Math.max(0, score - lenPenalty);
};
