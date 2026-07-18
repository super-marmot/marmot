/**
 * Personas: named system prompts — the SYSTEM layer made user-configurable.
 * Pure data + helpers (tested); AsyncStorage persistence lives in personas.ts.
 */

export interface Persona {
  id: string
  name: string
  prompt: string
  builtIn?: boolean
}

export const BUILT_IN_PERSONAS: Persona[] = [
  {
    id: 'concise',
    name: 'Concise',
    prompt: 'You are a helpful assistant running locally on the user’s phone. Be concise.',
    builtIn: true,
  },
  {
    id: 'coach',
    name: 'Coach',
    prompt:
      'You are a supportive coach. Ask one clarifying question at a time, reflect back what you hear, and end with a small concrete next step.',
    builtIn: true,
  },
  {
    id: 'writer',
    name: 'Writer',
    prompt:
      'You are a sharp editor. Improve clarity and rhythm, cut filler, keep the author’s voice, and briefly note the main changes you made.',
    builtIn: true,
  },
  {
    id: 'tutor',
    name: 'Tutor',
    prompt:
      'You are a patient tutor. Explain step by step from first principles, use one concrete example, and end by checking understanding with a short question.',
    builtIn: true,
  },
  {
    id: 'developer',
    name: 'Developer',
    prompt:
      'You are a senior software engineer. Be precise, prefer code over prose, state assumptions explicitly, and mention edge cases that matter.',
    builtIn: true,
  },
]

export function validatePersona(name: string, prompt: string): { name: string; prompt: string } {
  const cleanName = name.trim()
  const cleanPrompt = prompt.trim()
  if (!cleanName) throw new Error('Give the persona a name.')
  if (cleanName.length > 30) throw new Error('Keep the name under 30 characters.')
  if (!cleanPrompt) throw new Error('The persona needs a prompt.')
  return { name: cleanName, prompt: cleanPrompt }
}

export function personaId(name: string, existingIds: string[]): string {
  const slug =
    'p-' +
    (name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'persona')
  let id = slug
  let n = 2
  while (existingIds.includes(id)) id = `${slug}-${n++}`
  return id
}

/** immutable upsert of a custom persona into a list */
export function upsertPersona(customs: Persona[], name: string, prompt: string): Persona[] {
  const valid = validatePersona(name, prompt)
  const existing = customs.find((p) => p.name.toLowerCase() === valid.name.toLowerCase())
  if (existing) {
    return customs.map((p) => (p.id === existing.id ? { ...p, prompt: valid.prompt } : p))
  }
  const allIds = [...BUILT_IN_PERSONAS.map((p) => p.id), ...customs.map((p) => p.id)]
  return [...customs, { id: personaId(valid.name, allIds), name: valid.name, prompt: valid.prompt }]
}
