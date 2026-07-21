import { useEffect, useRef, useState } from 'react'
import {
  useConversationControls,
  useConversationInput,
  useConversationMode,
  useConversationStatus,
} from '@elevenlabs/react'

type TranscriptTurn = {
  id: string
  role: 'user' | 'agent'
  text: string
}

type Props = {
  onClose: () => void
}

function formatClock(d: Date): string {
  return d.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
}

export function VoiceModePanel({ onClose }: Props) {
  const { startSession, endSession } = useConversationControls()
  const { status, message: statusMessage } = useConversationStatus()
  const { isMuted, setMuted } = useConversationInput()
  const { isSpeaking, isListening } = useConversationMode()

  const [transcript, setTranscript] = useState<TranscriptTurn[]>([])
  const [error, setError] = useState<string | null>(null)
  const [sessionActive, setSessionActive] = useState(false)
  const [clock, setClock] = useState(() => formatClock(new Date()))
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [transcript])

  useEffect(() => {
    const id = window.setInterval(() => setClock(formatClock(new Date())), 1000)
    return () => window.clearInterval(id)
  }, [])

  function handleStart() {
    setError(null)
    setTranscript([])
    setSessionActive(true)
    try {
      startSession({
        textOnly: false,
        onConnect: () => setError(null),
        onDisconnect: () => {
          setSessionActive(false)
        },
        onError: (msg) => {
          const text =
            typeof msg === 'string'
              ? msg
              : 'Voice session failed. Check microphone permission and try again.'
          setError(text)
          setSessionActive(false)
        },
        onMessage: ({ message, role }) => {
          if (!message?.trim()) return
          setTranscript((prev) => [
            ...prev,
            {
              id: `${role}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
              role: role === 'user' ? 'user' : 'agent',
              text: message,
            },
          ])
        },
      })
    } catch (e) {
      setSessionActive(false)
      const text =
        e instanceof Error
          ? e.message
          : 'Could not start voice session. Microphone may be blocked.'
      setError(text)
    }
  }

  function handleEnd() {
    try {
      endSession()
    } catch {
      // ignore
    }
    setSessionActive(false)
  }

  function handleClose() {
    handleEnd()
    onClose()
  }

  const inSession = status === 'connecting' || status === 'connected'
  const live = status === 'connected'
  const channelState = live
    ? isSpeaking
      ? 'SPEAKING'
      : isListening
        ? 'LISTENING'
        : 'LIVE'
    : status === 'connecting'
      ? 'CONNECTING'
      : 'STANDBY'

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#f4f5f8] text-gray-900">
      <div className="pointer-events-none absolute inset-0 jarvis-voice-grid opacity-70" />

      <header className="relative z-10 flex items-start justify-between px-6 pt-5 sm:px-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#0b1f3a] text-white flex items-center justify-center shadow-sm">
            <JarvisMark className="w-5 h-5" />
          </div>
          <div>
            <p className="text-lg font-semibold tracking-tight leading-tight">Jarvis</p>
            <p className="text-[10px] font-medium tracking-[0.18em] text-gray-400 uppercase">
              BrightStar Operations
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleClose}
          className="w-9 h-9 rounded-full bg-white/80 border border-gray-200 text-gray-500 hover:bg-white hover:text-gray-800 flex items-center justify-center"
          aria-label="Close voice"
        >
          <CloseIcon className="w-4 h-4" />
        </button>
      </header>

      <div className="relative z-10 flex-1 min-h-0 flex flex-col items-center justify-center px-6 pb-8">
        <div
          className={`jarvis-orb mb-8 ${live ? 'jarvis-orb-live' : ''}`}
          aria-hidden
        >
          <div className="jarvis-orb-ring" />
          <div className="jarvis-orb-core" />
        </div>

        <h1
          className="text-2xl sm:text-3xl text-gray-900 text-center mb-2"
          style={{ fontFamily: "'Instrument Serif', Georgia, serif" }}
        >
          {live
            ? isSpeaking
              ? 'Jarvis is speaking…'
              : isListening
                ? 'Listening…'
                : 'Speak — Jarvis is ready.'
            : status === 'connecting'
              ? 'Connecting…'
              : 'Speak — Jarvis is ready.'}
        </h1>
        <p className="text-[11px] font-medium tracking-[0.2em] text-gray-400 uppercase mb-6">
          Voice intelligence · Always on
        </p>

        {(error || (status === 'error' && statusMessage)) && (
          <div className="mb-4 max-w-md w-full px-3 py-2 text-sm rounded-xl border border-rose-200 bg-rose-50 text-rose-800 text-center">
            {error || statusMessage}
          </div>
        )}

        {!inSession ? (
          <button
            type="button"
            onClick={handleStart}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-white border border-gray-200 shadow-sm text-blue-600 text-sm font-semibold hover:bg-blue-50"
          >
            <PlayIcon className="w-3.5 h-3.5" />
            Start
          </button>
        ) : (
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMuted(!isMuted)}
              disabled={status !== 'connected'}
              className={`px-4 py-2 text-sm font-semibold rounded-full border shadow-sm disabled:opacity-40 ${
                isMuted
                  ? 'border-amber-300 bg-amber-50 text-amber-800'
                  : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              {isMuted ? 'Unmute' : 'Mute'}
            </button>
            <button
              type="button"
              onClick={handleEnd}
              className="px-5 py-2 text-sm font-semibold rounded-full bg-gray-900 text-white hover:bg-gray-800"
            >
              End
            </button>
          </div>
        )}

        {transcript.length > 0 && (
          <div className="mt-8 w-full max-w-lg max-h-36 overflow-y-auto rounded-2xl border border-gray-200/80 bg-white/70 px-4 py-3 backdrop-blur-sm">
            <ul className="space-y-1.5">
              {transcript.map((t) => (
                <li key={t.id} className="text-xs text-gray-600">
                  <span
                    className={`font-semibold ${
                      t.role === 'user' ? 'text-emerald-700' : 'text-blue-700'
                    }`}
                  >
                    {t.role === 'user' ? 'You' : 'Jarvis'}
                  </span>
                  <span> · {t.text}</span>
                </li>
              ))}
            </ul>
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      <footer className="relative z-10 pb-5 text-center">
        <p className="text-[10px] font-medium tracking-[0.18em] text-gray-400 uppercase">
          Channel · WSS · EST {clock} · {channelState}
          {sessionActive && status === 'connected' && isMuted ? ' · MUTED' : ''}
        </p>
      </footer>
    </div>
  )
}

function JarvisMark({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M7 6c4 0 6 2 6 6s-2 6-6 6" strokeLinecap="round" />
      <path d="M11 6h6M11 18h6" strokeLinecap="round" />
    </svg>
  )
}

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
    </svg>
  )
}

function PlayIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M8 5v14l11-7L8 5z" />
    </svg>
  )
}
