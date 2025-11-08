// Simple heuristic parser to extract complaints, solutions, and status.
// Customize keyword sets as needed.

const complaintKeywords = [
  'slow internet', 'no internet', 'disconnect', 'packet loss', 'latency', 'speed', 'downtime', 'buffering', 'not working', 'service issue', 'complaint'
]
const solutionKeywords = [
  'restarted', 'reset', 'replaced', 'engineer', 'technician', 'scheduled', 'ticket', 'refund', 'credited', 'resolved', 'fixed', 'investigating', 'monitoring', 'escalated'
]
const resolvedIndicators = ['resolved','fixed','closed','issue solved','working now']
const unresolvedIndicators = ['pending','ongoing','still','not resolved','escalated','awaiting','investigating']

export function parseEmailToRecord({ subject = '', body = '', from = '' }) {
  const text = `${subject}\n${body}`.toLowerCase()

  const problem = complaintKeywords.find(k => text.includes(k)) || extractProblem(text)
  const solution = extractSolution(text)
  const status = inferStatus(text)
  const clientName = parseClientName(from)

  return {
    clientName,
    problem,
    solution,
    status,
  }
}

function parseClientName(from) {
  // from: "Name <email@domain>"
  const m = /\"?([^\"<]+)\"?\s*<[^>]+>/.exec(from) || /([^@]+)@/.exec(from)
  return m ? m[1].trim() : ''
}

function extractProblem(text) {
  // Fallback: first sentence mentioning typical issue words
  const m = /(internet|wifi|broadband|connection|speed|latency|disconnect|packet)/i.exec(text)
  if (!m) return ''
  const idx = Math.max(0, text.lastIndexOf('\n', m.index))
  const end = text.indexOf('.', m.index+1)
  return text.slice(idx, end>0?end: m.index+120).trim()
}

function extractSolution(text) {
  // Look for solution-like keywords and capture surrounding text
  for (const k of solutionKeywords) {
    const i = text.indexOf(k)
    if (i !== -1) {
      const end = text.indexOf('.', i)
      const start = Math.max(0, text.lastIndexOf('\n', i))
      return text.slice(start, end>0?end:i+120).trim()
    }
  }
  return ''
}

function inferStatus(text) {
  if (resolvedIndicators.some(k=>text.includes(k))) return 'Resolved'
  if (unresolvedIndicators.some(k=>text.includes(k))) return 'Unresolved'
  return 'Unknown'
}