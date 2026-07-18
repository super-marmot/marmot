import AsyncStorage from '@react-native-async-storage/async-storage'
import { BUILT_IN_PERSONAS, Persona, upsertPersona } from './personaCore'

const CUSTOM_KEY = 'marmot.personas.v1'

export async function loadPersonas(): Promise<Persona[]> {
  return [...BUILT_IN_PERSONAS, ...(await loadCustom())]
}

async function loadCustom(): Promise<Persona[]> {
  try {
    const raw = await AsyncStorage.getItem(CUSTOM_KEY)
    return raw ? (JSON.parse(raw) as Persona[]) : []
  } catch {
    return []
  }
}

export async function saveCustomPersona(name: string, prompt: string): Promise<Persona[]> {
  const next = upsertPersona(await loadCustom(), name, prompt)
  await AsyncStorage.setItem(CUSTOM_KEY, JSON.stringify(next))
  return [...BUILT_IN_PERSONAS, ...next]
}

export async function removeCustomPersona(id: string): Promise<Persona[]> {
  const next = (await loadCustom()).filter((p) => p.id !== id)
  await AsyncStorage.setItem(CUSTOM_KEY, JSON.stringify(next))
  return [...BUILT_IN_PERSONAS, ...next]
}
