import { useEffect, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import {
  useConversationControls,
  useConversationStatus,
} from '@elevenlabs/react'
import {
  createEmptyThread,
  hasUserMessage,
  loadThreads,
  saveThreads,
  upsertThread,
  withAgentMessage,
  withUserMessage,
  type ChatMessage,
  type ChatThread,
} from './chatThreads'

export type { ChatMessage }

const SUGGESTIONS = [
  { label: 'Open work orders', prompt: 'Show me open work orders.', Icon: DocIcon },
  { label: 'Idle technicians', prompt: 'Which technicians are idle right now?', Icon: TimerIcon },
  { label: "Today's schedule", prompt: "What's on today's schedule?", Icon: CalendarIcon },
  { label: 'Missed checkouts', prompt: 'Show missed checkouts.', Icon: WarnIcon },
] as const

function timeGreeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

type Props = {
  onSwitchToVoice: () => void
}

export function ChatModePanel({ onSwitchToVoice }: Props) {
  const { startSession, endSession, sendUserMessage, sendUserActivity } =
    useConversationControls()
  const { status, message: statusMessage } = useConversationStatus()

  const [threads, setThreads] = useState<ChatThread[]>(() => loadThreads())
  const [activeThread, setActiveThread] = useState<ChatThread>(() => createEmptyThread())
  const [draft, setDraft] = useState('')
  const [working, setWorking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [search, setSearch] = useState('')
  const [modelOpen, setModelOpen] = useState(false)

  const bottomRef = useRef<HTMLDivElement>(null)
  const statusRef = useRef(status)
  const activeThreadRef = useRef(activeThread)
  statusRef.current = status
  activeThreadRef.current = activeThread

  const activeId = activeThread.id
  const messages = activeThread.messages
  const connected = status === 'connected'
  const showReconnect = status === 'disconnected' || status === 'error'

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, working])

  useEffect(() => {
    saveThreads(threads)
  }, [threads])

  useEffect(() => {
    let cancelled = false
    let startTimer: number | undefined
    let retryTimer: number | undefined

    const sessionOptions = {
      textOnly: true as const,
      connectionType: 'websocket' as const,
      onConnect: () => {
        if (cancelled) return
        setError(null)
      },
      onDisconnect: () => {
        if (cancelled) return
        setWorking(false)
      },
      onError: (msg: string | Error) => {
        if (cancelled) return
        setError(typeof msg === 'string' ? msg : 'Connection failed')
        setWorking(false)
      },
      onMessage: ({ message, role }: { message: string; role: string }) => {
        if (cancelled || !message?.trim()) return
        setWorking(false)
        setActiveThread((prev) => {
          if (role === 'user') {
            const last = prev.messages[prev.messages.length - 1]
            if (last?.role === 'user' && last.text === message) return prev
            const next = withUserMessage(prev, {
              id: `user-${Date.now()}`,
              role: 'user',
              text: message,
            })
            queueMicrotask(() => {
              setThreads((ts) => upsertThread(ts, next))
            })
            return next
          }
          const next = withAgentMessage(prev, {
            id: `agent-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            role: 'agent',
            text: message,
          })
          queueMicrotask(() => {
            setThreads((ts) => upsertThread(ts, next))
          })
          return next
        })
      },
      onAgentTyping: ({ is_typing }: { is_typing: boolean }) => {
        if (cancelled) return
        setWorking(Boolean(is_typing))
      },
    }

    // Defer past React Strict Mode's mount → cleanup → remount cycle.
    const begin = () => {
      if (cancelled) return
      setError(null)
      startSession(sessionOptions)
      retryTimer = window.setTimeout(() => {
        if (cancelled) return
        if (statusRef.current === 'disconnected' || statusRef.current === 'error') {
          startSession(sessionOptions)
        }
      }, 200)
    }

    startTimer = window.setTimeout(begin, 0)

    return () => {
      cancelled = true
      window.clearTimeout(startTimer)
      window.clearTimeout(retryTimer)
      try {
        endSession()
      } catch {
        // ignore
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function persistThread(thread: ChatThread) {
    setActiveThread(thread)
    setThreads((ts) => upsertThread(ts, thread))
  }

  function handleNewChat() {
    const fresh = createEmptyThread()
    setActiveThread(fresh)
    setDraft('')
    setWorking(false)
    setError(null)
  }

  function handleSelectThread(thread: ChatThread) {
    setActiveThread(thread)
    setDraft('')
    setWorking(false)
  }

  function buildSessionCallbacks() {
    return {
      textOnly: true as const,
      connectionType: 'websocket' as const,
      onConnect: () => setError(null),
      onDisconnect: () => setWorking(false),
      onError: (msg: string | Error) => {
        setError(typeof msg === 'string' ? msg : 'Connection failed')
        setWorking(false)
      },
      onMessage: ({ message, role }: { message: string; role: string }) => {
        if (!message?.trim()) return
        setWorking(false)
        setActiveThread((prev) => {
          if (role === 'user') {
            const last = prev.messages[prev.messages.length - 1]
            if (last?.role === 'user' && last.text === message) return prev
          }
          const bubble: ChatMessage = {
            id: `${role}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            role: role === 'user' ? 'user' : 'agent',
            text: message,
          }
          const next =
            bubble.role === 'user'
              ? withUserMessage(prev, bubble)
              : withAgentMessage(prev, bubble)
          queueMicrotask(() => setThreads((ts) => upsertThread(ts, next)))
          return next
        })
      },
      onAgentTyping: ({ is_typing }: { is_typing: boolean }) => {
        setWorking(Boolean(is_typing))
      },
    }
  }

  function handleReconnect() {
    setError(null)
    setWorking(false)
    startSession(buildSessionCallbacks())
  }

  function sendText(text: string) {
    const trimmed = text.trim()
    if (!trimmed || status !== 'connected') return
    setDraft('')
    setWorking(true)
    setError(null)
    const bubble: ChatMessage = {
      id: `user-local-${Date.now()}`,
      role: 'user',
      text: trimmed,
    }
    const next = withUserMessage(activeThreadRef.current, bubble)
    persistThread(next)
    try {
      sendUserMessage(trimmed)
    } catch (e) {
      setWorking(false)
      setError(e instanceof Error ? e.message : 'Failed to send message')
    }
  }

  function handleSend() {
    sendText(draft)
  }

  function handleSuggestion(prompt: string) {
    if (!connected) return
    sendText(prompt)
  }

  const filtered = threads.filter((t) => {
    if (!hasUserMessage(t)) return false
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return t.title.toLowerCase().includes(q)
  })

  const isEmpty = messages.length === 0

  return (
    <div className="flex-1 min-h-0 flex bg-white">
      {/* History sidebar */}
      {sidebarOpen && (
        <aside
          className="w-[260px] shrink-0 border-r border-gray-200 bg-[#f7f7f8] flex flex-col"
          data-tour="jarvis-sidebar"
        >
          <div className="p-3 space-y-2">
            <button
              type="button"
              onClick={handleNewChat}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-gray-900 text-white text-sm font-semibold py-2.5 hover:bg-gray-800"
            >
              <span className="text-lg leading-none">+</span>
              New chat
            </button>
            <label className="relative block">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                <SearchIcon className="w-4 h-4" />
              </span>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search chats"
                className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-transparent bg-white/80 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-200"
              />
            </label>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto px-2 pb-3">
            {filtered.length > 0 && (
              <>
                <p className="px-2 pt-2 pb-1 text-[10px] font-semibold tracking-wider text-gray-400 uppercase">
                  Older
                </p>
                <ul className="space-y-0.5">
                  {filtered.map((t) => (
                    <li key={t.id}>
                      <button
                        type="button"
                        onClick={() => handleSelectThread(t)}
                        className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-left text-sm truncate transition-colors ${
                          t.id === activeId
                            ? 'bg-white text-gray-900 shadow-sm'
                            : 'text-gray-600 hover:bg-white/70'
                        }`}
                      >
                        <ChatIcon className="w-4 h-4 shrink-0 text-gray-400" />
                        <span className="truncate">{t.title}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>

          <div className="border-t border-gray-200 p-3 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-gray-900 text-white text-xs font-semibold flex items-center justify-center">
              BS
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-800 truncate">Supervisor</p>
              <p className="text-xs text-gray-500 truncate">BrightStar workspace</p>
            </div>
          </div>
        </aside>
      )}

      {/* Main column */}
      <div className="flex-1 min-w-0 flex flex-col min-h-0">
        <header className="shrink-0 flex items-center justify-between gap-3 px-4 py-3 border-b border-gray-100">
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              type="button"
              onClick={() => setSidebarOpen((o) => !o)}
              className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100"
              aria-label="Toggle sidebar"
            >
              <SidebarIcon className="w-5 h-5" />
            </button>
            <span className="text-base font-semibold text-gray-900 tracking-tight">
              BrightStar Pro
            </span>
            <LiveBadge />
            {(status === 'connecting' || showReconnect) && (
              <span className="text-xs text-gray-400">
                {status === 'connecting'
                  ? 'Connecting…'
                  : status === 'error'
                    ? statusMessage || 'Error'
                    : 'Disconnected'}
                {showReconnect && (
                  <button
                    type="button"
                    onClick={handleReconnect}
                    className="ml-2 font-semibold text-blue-600 hover:text-blue-800"
                  >
                    Reconnect
                  </button>
                )}
              </span>
            )}
          </div>

          <div className="relative">
            <button
              type="button"
              onClick={() => setModelOpen((o) => !o)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 rounded-full border border-gray-200 bg-white hover:bg-gray-50"
            >
              <SparkleIcon className="w-4 h-4 text-blue-600" />
              Jarvis
              <ChevronIcon className="w-3.5 h-3.5 text-gray-400" />
            </button>
            {modelOpen && (
              <div className="absolute right-0 mt-1 w-44 rounded-xl border border-gray-200 bg-white shadow-lg py-1 z-20">
                <button
                  type="button"
                  className="w-full text-left px-3 py-2 text-sm font-medium text-gray-900 bg-gray-50"
                  onClick={() => setModelOpen(false)}
                >
                  Jarvis
                </button>
              </div>
            )}
          </div>
        </header>

        {error && (
          <div className="mx-4 mt-3 px-3 py-2 text-xs rounded-lg border border-rose-200 bg-rose-50 text-rose-800">
            {error}
          </div>
        )}

        <div className="flex-1 min-h-0 overflow-y-auto">
          {isEmpty ? (
            <div className="h-full flex flex-col items-center justify-center px-4 pb-8">
              <div className="flex items-center gap-3 mb-10">
                <div className="w-11 h-11 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-sm">
                  <BrandMark className="w-6 h-6" />
                </div>
                <h1 className="text-3xl font-semibold text-gray-900 tracking-tight">
                  {timeGreeting()}
                </h1>
              </div>

              <Composer
                draft={draft}
                setDraft={setDraft}
                connected={connected}
                connecting={status === 'connecting'}
                working={working}
                onSend={handleSend}
                onActivity={() => {
                  try {
                    sendUserActivity()
                  } catch {
                    // ignore
                  }
                }}
                onVoice={onSwitchToVoice}
              />

              <div className="mt-4 flex flex-wrap items-center justify-center gap-2 max-w-2xl">
                {SUGGESTIONS.map(({ label, prompt, Icon }) => (
                  <button
                    key={label}
                    type="button"
                    disabled={!connected}
                    onClick={() => handleSuggestion(prompt)}
                    className="inline-flex items-center gap-2 px-3.5 py-2 text-sm text-gray-700 rounded-full border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-40"
                  >
                    <Icon className="w-4 h-4 text-gray-400" />
                    {label}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[min(36rem,90%)] rounded-2xl px-4 py-2.5 text-sm ${
                      m.role === 'user'
                        ? 'bg-gray-900 text-white rounded-br-md'
                        : 'bg-gray-50 border border-gray-100 text-gray-900 rounded-bl-md'
                    }`}
                  >
                    {m.role === 'agent' ? (
                      <div className="prose prose-sm max-w-none prose-p:my-1 prose-ul:my-1 prose-ol:my-1">
                        <ReactMarkdown>{m.text}</ReactMarkdown>
                      </div>
                    ) : (
                      <p className="whitespace-pre-wrap">{m.text}</p>
                    )}
                  </div>
                </div>
              ))}
              {working && (
                <div className="flex justify-start">
                  <div className="bg-gray-50 border border-gray-100 rounded-2xl rounded-bl-md px-4 py-2 text-xs text-gray-500">
                    Jarvis is working…
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>
          )}
        </div>

        {!isEmpty && (
          <div className="shrink-0 px-4 pb-3 pt-2">
            <Composer
              draft={draft}
              setDraft={setDraft}
              connected={connected}
              connecting={status === 'connecting'}
              working={working}
              onSend={handleSend}
              onActivity={() => {
                try {
                  sendUserActivity()
                } catch {
                  // ignore
                }
              }}
              onVoice={onSwitchToVoice}
            />
          </div>
        )}

        <p className="shrink-0 text-center text-[11px] text-gray-400 pb-3 px-4">
          BrightStar Pro checks live fleet records. Verify results before dispatching crews.
        </p>
      </div>
    </div>
  )
}

function Composer({
  draft,
  setDraft,
  connected,
  connecting,
  working,
  onSend,
  onActivity,
  onVoice,
}: {
  draft: string
  setDraft: (v: string) => void
  connected: boolean
  connecting: boolean
  working: boolean
  onSend: () => void
  onActivity: () => void
  onVoice: () => void
}) {
  return (
    <form
      data-tour="jarvis-composer"
      className="w-full max-w-2xl mx-auto"
      onSubmit={(e) => {
        e.preventDefault()
        onSend()
      }}
    >
      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-300">
        <textarea
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value)
            if (connected) onActivity()
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              onSend()
            }
          }}
          rows={2}
          placeholder={
            connected
              ? 'Ask anything about your fleet, work orders, or technicians…'
              : connecting
                ? 'Connecting to Jarvis…'
                : 'Disconnected — tap Reconnect'
          }
          disabled={!connected}
          className="w-full resize-none px-4 pt-3.5 pb-2 text-sm bg-transparent border-0 focus:outline-none disabled:text-gray-400 placeholder:text-gray-400"
        />
        <div className="flex items-center justify-between gap-2 px-3 pb-3">
          <LiveBadge />
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={onVoice}
              className="p-2 rounded-full text-gray-500 hover:bg-gray-100"
              aria-label="Open voice"
              title="Voice"
            >
              <MicIcon className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onVoice}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700"
            >
              <WaveIcon className="w-3.5 h-3.5" />
              Jarvis
            </button>
            <button
              type="submit"
              disabled={!connected || !draft.trim() || working}
              className="ml-1 px-3 py-1.5 text-sm font-semibold rounded-full bg-gray-900 text-white hover:bg-gray-800 disabled:opacity-30"
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </form>
  )
}

function LiveBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-gray-100 text-[10px] font-semibold tracking-wide text-gray-500 uppercase">
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
      Live fleet data
    </span>
  )
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-3-3" strokeLinecap="round" />
    </svg>
  )
}

function ChatIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z" strokeLinejoin="round" />
    </svg>
  )
}

function SidebarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M9 4v16" />
    </svg>
  )
}

function SparkleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2l1.2 6.3L19 10l-5.8 1.7L12 18l-1.2-6.3L5 10l5.8-1.7L12 2z" />
    </svg>
  )
}

function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function BrandMark({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M4 18V8l8-4 8 4v10" strokeLinejoin="round" />
      <path d="M4 18l8 4 8-4" strokeLinejoin="round" />
      <path d="M12 10v8M8 12v4M16 12v4" strokeLinecap="round" />
    </svg>
  )
}

function MicIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 14a3 3 0 0 0 3-3V6a3 3 0 1 0-6 0v5a3 3 0 0 0 3 3z" />
      <path d="M17 11a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.92V21h2v-3.08A7 7 0 0 0 19 11h-2z" />
    </svg>
  )
}

function WaveIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <rect x="3" y="9" width="2.5" height="6" rx="1" />
      <rect x="7.5" y="6" width="2.5" height="12" rx="1" />
      <rect x="12" y="4" width="2.5" height="16" rx="1" />
      <rect x="16.5" y="7" width="2.5" height="10" rx="1" />
      <rect x="18.5" y="9" width="2.5" height="6" rx="1" />
    </svg>
  )
}

function DocIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M7 3h7l5 5v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" />
      <path d="M14 3v5h5M9 13h6M9 17h4" strokeLinecap="round" />
    </svg>
  )
}

function TimerIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="13" r="8" />
      <path d="M12 9v4l2.5 1.5M9 3h6" strokeLinecap="round" />
    </svg>
  )
}

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4" strokeLinecap="round" />
    </svg>
  )
}

function WarnIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 3l10 18H2L12 3z" strokeLinejoin="round" />
      <path d="M12 10v4M12 17h.01" strokeLinecap="round" />
    </svg>
  )
}
