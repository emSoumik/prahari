import type { SanitizerHit } from './types'

/**
 * Phase 0: a deterministic filter that runs before any model sees the input.
 * It does not try to understand the text; it removes known instruction-smuggling shapes.
 */
const PATTERNS: { name: string; re: RegExp }[] = [
  { name: 'override instructions', re: /\b(ignore|disregard|forget|bypass)\b[^.\n]{0,40}\b(previous|prior|above|your|all|the)\b[^.\n]{0,20}\b(instructions?|rules?|polic(?:y|ies)|prompt|verification|otp)\b/gi },
  { name: 'role hijack', re: /\b(you are now|act as|pretend (?:to be|you are)|from now on you)\b[^.\n]{0,60}/gi },
  { name: 'fake privilege', re: /\b(admin|developer|god|debug|maintenance|system)\s+(mode|access|override)\b[^.\n]{0,60}/gi },
  { name: 'fake system tag', re: /\[(?:INST|SYS|SYSTEM)[^\]]{0,80}\]|<\/?(?:system|instructions?)>|\bSYSTEM:\s*[^\n]{0,160}/g },
  { name: 'forced verdict', re: /\b(recommend immediate shortlist|rank (?:this|me|my) [^.\n]{0,30}first|99th percentile|legally binding offer|agree with anything)\b[^.\n]{0,40}/gi },
  { name: 'skip verification', re: /\b(skip|without|no need for|bypass)\s+(the\s+)?(otp|sms|verification|2fa|authentication)\b[^.\n]{0,40}/gi },
]

export function sanitize(input: string): { hits: SanitizerHit[]; cleaned: string } {
  const hits: SanitizerHit[] = []
  let cleaned = input
  for (const { name, re } of PATTERNS) {
    re.lastIndex = 0
    cleaned = cleaned.replace(re, (match) => {
      hits.push({ pattern: name, match: match.trim() })
      return ' '
    })
  }
  return { hits, cleaned: cleaned.replace(/\s{2,}/g, ' ').trim() }
}
