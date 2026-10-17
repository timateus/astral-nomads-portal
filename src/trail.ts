/**
 * The ordered list of item ids the user last clicked into (search results, a shelf,
 * an author's works). The item page uses it for previous / next navigation.
 */
const KEY = 'an-trail'
let trail: string[] = []

try {
  trail = JSON.parse(sessionStorage.getItem(KEY) ?? '[]')
} catch {
  trail = []
}

export function setTrail(ids: string[]) {
  trail = ids
  try {
    sessionStorage.setItem(KEY, JSON.stringify(ids))
  } catch {
    /* storage unavailable */
  }
}

export function getTrail() {
  return trail
}
