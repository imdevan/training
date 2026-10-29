// Anchor ids for Cue / CollapsibleCard titles, e.g. "Leave It" -> "leave-it"
export function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}
