export function fuzzyMatch(text: string, query: string): boolean {
  if (!query.trim()) return true;
  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();
  return lowerText.includes(lowerQuery);
}
