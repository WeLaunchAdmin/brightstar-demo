import { useCallback, useState } from 'react'
import {
  ConversationProvider,
  useConversationControls,
  useConversationStatus,
} from '@elevenlabs/react'
import { ChatModePanel } from './ChatModePanel'
import { VoiceModePanel } from './VoiceModePanel'

export type JarvisMode = 'chat' | 'voice'

const AGENT_ID = import.meta.env.VITE_ELEVENLABS_AGENT_ID as string | undefined

export function ChatPage() {
  if (!AGENT_ID) {
    return (
      <div className="flex-1 flex items-center justify-center px-6 bg-white">
        <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 max-w-lg text-center">
          Set <code className="font-mono text-xs">VITE_ELEVENLABS_AGENT_ID</code> in{' '}
          <code className="font-mono text-xs">.env.local</code> to connect Jarvis.
        </p>
      </div>
    )
  }

  return (
    <ConversationProvider agentId={AGENT_ID}>
      <JarvisShell />
    </ConversationProvider>
  )
}

function JarvisShell() {
  const [mode, setMode] = useState<JarvisMode>('chat')
  const { endSession } = useConversationControls()
  const { status } = useConversationStatus()

  const switchMode = useCallback(
    (next: JarvisMode) => {
      if (next === mode) return
      if (status !== 'disconnected') {
        try {
          endSession()
        } catch {
          // ignore — session may already be tearing down
        }
      }
      setMode(next)
    },
    [endSession, mode, status],
  )

  return (
    <div className="relative flex-1 min-h-0 flex flex-col bg-white" data-tour="jarvis-shell">
      {mode === 'chat' ? (
        <ChatModePanel onSwitchToVoice={() => switchMode('voice')} />
      ) : (
        <VoiceModePanel onClose={() => switchMode('chat')} />
      )}
    </div>
  )
}
