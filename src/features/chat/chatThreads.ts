export type ChatMessage = {
  id: string
  role: 'user' | 'agent'
  text: string
}

export type ChatThread = {
  id: string
  title: string
  updatedAt: number
  messages: ChatMessage[]
}

const STORAGE_KEY = 'brightstar-jarvis-threads'

/** Legacy seed ids from an earlier demo — drop on load. */
const LEGACY_SEED_IDS = new Set(['seed-maint', 'seed-priority'])

function titleFromMessage(text: string): string {
  const trimmed = text.trim().replace(/\s+/g, ' ')
  if (trimmed.length <= 36) return trimmed
  return `${trimmed.slice(0, 35)}…`
}

export function hasUserMessage(thread: ChatThread): boolean {
  return thread.messages.some((m) => m.role === 'user')
}

/** Drop drafts with no user messages and known legacy seeds. */
export function pruneThreads(threads: ChatThread[]): ChatThread[] {
  return threads.filter(
    (t) => !LEGACY_SEED_IDS.has(t.id) && hasUserMessage(t),
  )
}

export function loadThreads(): ChatThread[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as ChatThread[]
    if (!Array.isArray(parsed)) return []
    const pruned = pruneThreads(parsed)
    // Rewrite storage so seeds / empty drafts are gone for good
    saveThreads(pruned)
    return pruned
  } catch {
    return []
  }
}

export function saveThreads(threads: ChatThread[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(pruneThreads(threads)))
  } catch {
    // ignore quota / private mode
  }
}

/** In-memory draft only — never put in the sidebar until first user send. */
export function createEmptyThread(): ChatThread {
  return {
    id: `thread-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    title: 'New chat',
    updatedAt: Date.now(),
    messages: [],
  }
}

/**
 * Upsert only threads that have at least one user message.
 * Empty drafts are removed from the list if present.
 */
export function upsertThread(
  threads: ChatThread[],
  thread: ChatThread,
): ChatThread[] {
  const without = threads.filter((t) => t.id !== thread.id)
  if (!hasUserMessage(thread)) return pruneThreads(without)
  return pruneThreads([thread, ...without]).sort(
    (a, b) => b.updatedAt - a.updatedAt,
  )
}

export function withUserMessage(
  thread: ChatThread,
  message: ChatMessage,
): ChatThread {
  const isFirstUser = !thread.messages.some((m) => m.role === 'user')
  const messages = [...thread.messages, message]
  const title = isFirstUser ? titleFromMessage(message.text) : thread.title
  return { ...thread, messages, title, updatedAt: Date.now() }
}

export function withAgentMessage(
  thread: ChatThread,
  message: ChatMessage,
): ChatThread {
  return {
    ...thread,
    messages: [...thread.messages, message],
    updatedAt: Date.now(),
  }
}
