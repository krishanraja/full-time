function words(value: string) {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^a-z0-9' ]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

function shingles(tokens: readonly string[], size: number) {
  const values = new Set<string>();
  for (let index = 0; index <= tokens.length - size; index++) {
    values.add(tokens.slice(index, index + size).join(" "));
  }
  return values;
}

function longestContiguousOverlap(left: readonly string[], right: readonly string[]) {
  let longest = 0;
  const previous = new Array(right.length + 1).fill(0) as number[];
  for (let leftIndex = 1; leftIndex <= left.length; leftIndex++) {
    const current = new Array(right.length + 1).fill(0) as number[];
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex++) {
      if (left[leftIndex - 1] === right[rightIndex - 1]) {
        current[rightIndex] = previous[rightIndex - 1] + 1;
        longest = Math.max(longest, current[rightIndex]);
      }
    }
    for (let index = 0; index < current.length; index++) previous[index] = current[index];
  }
  return longest;
}

export function sourceSimilarity(script: string, sourceSpan: string) {
  const scriptWords = words(script);
  const sourceWords = words(sourceSpan);
  if (scriptWords.length < 5 || sourceWords.length < 5) return 0;
  const scriptShingles = shingles(scriptWords, 5);
  const sourceShingles = shingles(sourceWords, 5);
  const overlap = [...sourceShingles].filter((value) => scriptShingles.has(value)).length;
  const containment = sourceShingles.size ? overlap / sourceShingles.size : 0;
  const contiguous = Math.min(1, longestContiguousOverlap(scriptWords, sourceWords) / 16);
  return Math.max(containment, contiguous);
}

export function maxSourceSimilarity(script: string, sourceSpans: readonly string[]) {
  return sourceSpans.reduce(
    (maximum, sourceSpan) => Math.max(maximum, sourceSimilarity(script, sourceSpan)),
    0,
  );
}
