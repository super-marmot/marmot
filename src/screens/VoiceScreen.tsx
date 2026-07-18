import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import * as Speech from 'expo-speech'
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from 'expo-speech-recognition'
import { engine } from '../lib/engine'
import { downloads } from '../lib/downloads'
import { agentDocuments, agentMemory } from '../lib/agentRuntime'
import { loadSettings } from '../lib/chatStore'
import { episodicSummary, LLMMessage } from '../agent'
import { VoicePhase, VoiceSession, detectAddress } from '../lib/voiceSession'
import { InferenceSettings } from '../types'
import { Palette, radius, spacing, themedStyles } from '../theme'
import { useTheme } from '../ThemeContext'

type Mode = 'conversation' | 'meeting'

interface Suggestion {
  request: string
  reply: string
}

function speakAsync(text: string): Promise<void> {
  return new Promise((resolve) => {
    Speech.speak(text, { onDone: resolve, onStopped: resolve, onError: () => resolve() })
  })
}

export default function VoiceScreen() {
  const { colors } = useTheme()
  const styles = getStyles(colors)
  const [mode, setMode] = useState<Mode>('conversation')
  const [active, setActive] = useState(false)
  const [phase, setPhase] = useState<VoicePhase>('idle')
  const [partial, setPartial] = useState('')
  const [turns, setTurns] = useState<{ role: 'user' | 'assistant'; text: string }[]>([])
  const [transcript, setTranscript] = useState<string[]>([])
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const settingsRef = useRef<InferenceSettings | null>(null)
  const sessionRef = useRef<VoiceSession | null>(null)
  const activeRef = useRef(false)
  const modeRef = useRef<Mode>('conversation')
  const historyRef = useRef<LLMMessage[]>([])
  activeRef.current = active
  modeRef.current = mode

  useEffect(() => {
    loadSettings().then((s) => (settingsRef.current = s))
    return () => {
      ExpoSpeechRecognitionModule.stop()
      Speech.stop()
    }
  }, [])

  const llmReply = useCallback(async (text: string): Promise<string> => {
    const settings = settingsRef.current
    if (!settings) throw new Error('settings not loaded')
    historyRef.current.push({ role: 'user', content: text })
    const messages: LLMMessage[] = [
      {
        role: 'system',
        content:
          `${settings.systemPrompt}\n` +
          'You are in live voice mode: answer in 1-3 short spoken-style sentences.',
      },
      ...historyRef.current.slice(-8),
    ]
    const result = await engine.complete(
      messages,
      { ...settings, maxTokens: Math.min(200, settings.maxTokens) },
      () => {}
    )
    historyRef.current.push({ role: 'assistant', content: result.text })
    return result.text
  }, [])

  const startRecognition = useCallback(() => {
    ExpoSpeechRecognitionModule.start({
      lang: 'en-US',
      interimResults: true,
      continuous: modeRef.current === 'meeting',
    })
  }, [])

  // conversation loop: pause the mic while speaking (v1 — no echo cancel),
  // resume when the session returns to listening
  const onPhaseChange = useCallback(
    (next: VoicePhase) => {
      setPhase(next)
      if (next === 'listening' && activeRef.current) startRecognition()
      if (next === 'thinking' || next === 'speaking') ExpoSpeechRecognitionModule.stop()
    },
    [startRecognition]
  )

  useSpeechRecognitionEvent('result', (event) => {
    const text = event.results?.[0]?.transcript ?? ''
    if (!event.isFinal) {
      setPartial(text)
      return
    }
    setPartial('')
    if (!activeRef.current || !text.trim()) return
    if (modeRef.current === 'conversation') {
      setTurns((prev) => [...prev, { role: 'user', text: text.trim() }])
      sessionRef.current?.handleFinalTranscript(text)
    } else {
      const stamped = `[${new Date().toLocaleTimeString()}] ${text.trim()}`
      setTranscript((prev) => [...prev, stamped])
      const address = detectAddress(text)
      if (address.addressed && address.request) {
        // contributor mode: draft a suggestion card; the user taps to speak it
        const context = transcript.slice(-12).join('\n')
        llmReply(
          `You are assisting in a live meeting. Recent transcript:\n${context}\n\nSomeone asked you: ${address.request}\nReply in 1-2 spoken sentences.`
        )
          .then((reply) =>
            setSuggestions((prev) => [...prev, { request: address.request, reply: reply.trim() }])
          )
          .catch(() => {})
      }
    }
  })

  useSpeechRecognitionEvent('end', () => {
    // meeting mode: OS sessions time out — restart to stay continuous
    if (activeRef.current && modeRef.current === 'meeting') startRecognition()
  })

  useSpeechRecognitionEvent('error', (event) => {
    if (event.error === 'not-allowed') {
      setActive(false)
      sessionRef.current?.stop()
      Alert.alert('Microphone needed', 'Enable microphone and speech recognition permissions.')
    } else if (activeRef.current && modeRef.current === 'meeting') {
      startRecognition() // transient errors (no-speech) — keep the meeting rolling
    }
  })

  const start = useCallback(async () => {
    if (!(await downloads.init(), downloads.downloadedModelIds().length) && !engine.getLoadedModelId()) {
      Alert.alert('No model', 'Download a model in the library first.')
      return
    }
    const permission = await ExpoSpeechRecognitionModule.requestPermissionsAsync()
    if (!permission.granted) {
      Alert.alert('Microphone needed', 'Marmot needs the microphone for voice mode.')
      return
    }
    const settings = settingsRef.current
    const modelId = engine.getLoadedModelId() ?? downloads.downloadedModelIds()[0]
    if (settings && modelId) {
      await engine.ensureLoaded(modelId, settings.contextLength, { gpuAndroid: settings.gpuAndroid })
    }
    historyRef.current = []
    setActive(true)
    activeRef.current = true
    if (modeRef.current === 'conversation') {
      sessionRef.current = new VoiceSession(llmReply, speakAsync, {
        onPhase: onPhaseChange,
        onReply: (text) => setTurns((prev) => [...prev, { role: 'assistant', text }]),
      })
      sessionRef.current.start()
    } else {
      setPhase('listening')
      startRecognition()
    }
  }, [llmReply, onPhaseChange, startRecognition])

  const stop = useCallback(async () => {
    setActive(false)
    activeRef.current = false
    sessionRef.current?.stop()
    ExpoSpeechRecognitionModule.stop()
    Speech.stop()
    setPhase('idle')
    // meeting mode: persist the transcript into document RAG + memory
    if (modeRef.current === 'meeting' && transcript.length > 0) {
      const name = `Meeting ${new Date().toLocaleString()}`
      const body = transcript.join('\n')
      try {
        await agentDocuments.addDocument(name, body)
        await agentMemory.add('episodic', episodicSummary(`Meeting transcribed: ${name}`, body))
        Alert.alert('Saved', `Transcript stored as "${name}" — searchable by the agent.`)
      } catch (e: any) {
        Alert.alert('Could not save transcript', e?.message ?? '')
      }
    }
  }, [transcript])

  const phaseLabel =
    phase === 'listening'
      ? partial
        ? `“${partial}”`
        : 'Listening…'
      : phase === 'thinking'
        ? 'Thinking…'
        : phase === 'speaking'
          ? 'Speaking…'
          : 'Tap to start'

  return (
    <View style={styles.container}>
      {/* mode toggle */}
      <View style={styles.modeRow}>
        {(['conversation', 'meeting'] as Mode[]).map((m) => (
          <Pressable
            key={m}
            disabled={active}
            style={[styles.modeChip, mode === m && styles.modeChipActive]}
            onPress={() => setMode(m)}
          >
            <Text style={[styles.modeText, mode === m && styles.modeTextActive]}>
              {m === 'conversation' ? 'Conversation' : 'Meeting'}
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: spacing.lg }}>
        {mode === 'conversation' &&
          turns.map((t, i) => (
            <View
              key={i}
              style={[styles.turn, t.role === 'user' ? styles.userTurn : styles.assistantTurn]}
            >
              <Text style={styles.turnText}>{t.text}</Text>
            </View>
          ))}
        {mode === 'meeting' && (
          <>
            {transcript.map((line, i) => (
              <Text key={i} style={styles.transcriptLine}>
                {line}
              </Text>
            ))}
            {suggestions.map((s, i) => (
              <View key={`s${i}`} style={styles.suggestionCard}>
                <Text style={styles.suggestionLabel}>Marmot suggests · “{s.request}”</Text>
                <Text style={styles.suggestionText}>{s.reply}</Text>
                <Pressable style={styles.speakBtn} onPress={() => Speech.speak(s.reply)}>
                  <Text style={styles.speakBtnText}>Speak it</Text>
                </Pressable>
              </View>
            ))}
            {transcript.length === 0 && (
              <Text style={styles.hint}>
                Transcribes the room continuously. Say “Marmot, …” to get a suggested
                contribution; the transcript is saved for agent search when you stop.
              </Text>
            )}
          </>
        )}
      </ScrollView>

      {/* orb */}
      <View style={styles.orbWrap}>
        <Text style={styles.phaseText}>{phaseLabel}</Text>
        <Pressable
          style={[styles.orb, active && (phase === 'listening' ? styles.orbListening : styles.orbBusy)]}
          onPress={active ? stop : start}
        >
          <Text style={styles.orbIcon}>{active ? '■' : '🎙'}</Text>
        </Pressable>
        <Text style={styles.hint}>{active ? 'Tap to stop' : `Start ${mode} mode`}</Text>
      </View>
    </View>
  )
}

const getStyles = themedStyles((colors: Palette) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    modeRow: {
      flexDirection: 'row',
      gap: spacing.sm,
      padding: spacing.lg,
      paddingBottom: spacing.sm,
    },
    modeChip: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: spacing.sm,
      borderRadius: radius.pill,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    modeChipActive: { backgroundColor: colors.accent, borderColor: colors.accent },
    modeText: { color: colors.textDim, fontWeight: '600', fontSize: 14 },
    modeTextActive: { color: colors.accentText },
    turn: {
      maxWidth: '85%',
      borderRadius: radius.lg,
      padding: spacing.md,
      marginBottom: spacing.sm,
    },
    userTurn: { alignSelf: 'flex-end', backgroundColor: colors.userBubble },
    assistantTurn: {
      alignSelf: 'flex-start',
      backgroundColor: colors.assistantBubble,
      borderWidth: 1,
      borderColor: colors.border,
    },
    turnText: { color: colors.text, fontSize: 15, lineHeight: 21 },
    transcriptLine: { color: colors.textDim, fontSize: 13, lineHeight: 20, marginBottom: 2 },
    suggestionCard: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.green,
      borderRadius: radius.md,
      padding: spacing.md,
      marginVertical: spacing.sm,
      gap: spacing.xs,
    },
    suggestionLabel: { color: colors.green, fontSize: 11, fontWeight: '700' },
    suggestionText: { color: colors.text, fontSize: 14, lineHeight: 20 },
    speakBtn: {
      alignSelf: 'flex-start',
      backgroundColor: colors.green,
      borderRadius: radius.pill,
      paddingHorizontal: spacing.md,
      paddingVertical: 4,
      marginTop: spacing.xs,
    },
    speakBtnText: { color: colors.bg, fontSize: 12, fontWeight: '700' },
    orbWrap: { alignItems: 'center', paddingVertical: spacing.xl, gap: spacing.md },
    phaseText: { color: colors.textDim, fontSize: 14, minHeight: 20 },
    orb: {
      width: 88,
      height: 88,
      borderRadius: 44,
      backgroundColor: colors.surfaceAlt,
      borderWidth: 2,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    orbListening: { borderColor: colors.green, backgroundColor: colors.surface },
    orbBusy: { borderColor: colors.accent, backgroundColor: colors.surface },
    orbIcon: { fontSize: 30, color: colors.text },
    hint: {
      color: colors.textFaint,
      fontSize: 12,
      textAlign: 'center',
      paddingHorizontal: spacing.xl,
    },
  })
)
