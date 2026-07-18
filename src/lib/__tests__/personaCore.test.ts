import { BUILT_IN_PERSONAS, personaId, upsertPersona, validatePersona } from '../personaCore'

describe('validatePersona', () => {
  it('trims and accepts valid input', () => {
    expect(validatePersona('  Pirate ', ' Talk like a pirate. ')).toEqual({
      name: 'Pirate',
      prompt: 'Talk like a pirate.',
    })
  })
  it('rejects empty name, long name, and empty prompt', () => {
    expect(() => validatePersona('', 'x')).toThrow('name')
    expect(() => validatePersona('x'.repeat(31), 'x')).toThrow('under 30')
    expect(() => validatePersona('ok', '   ')).toThrow('prompt')
  })
})

describe('personaId', () => {
  it('slugs names and suffixes collisions', () => {
    expect(personaId('My Persona!', [])).toBe('p-my-persona')
    expect(personaId('My Persona', ['p-my-persona'])).toBe('p-my-persona-2')
    expect(personaId('###', [])).toBe('p-persona')
  })
})

describe('upsertPersona', () => {
  it('adds a new custom persona without touching built-ins', () => {
    const customs = upsertPersona([], 'Pirate', 'Arr.')
    expect(customs).toHaveLength(1)
    expect(customs[0].id).toBe('p-pirate')
    expect(customs[0].builtIn).toBeUndefined()
    expect(BUILT_IN_PERSONAS.some((p) => p.id === 'p-pirate')).toBe(false)
  })
  it('updates the prompt when the name already exists (case-insensitive)', () => {
    const first = upsertPersona([], 'Pirate', 'Arr.')
    const second = upsertPersona(first, 'pirate', 'Arr, matey.')
    expect(second).toHaveLength(1)
    expect(second[0].prompt).toBe('Arr, matey.')
    expect(second[0].id).toBe('p-pirate') // id stable across updates
  })
  it('avoids id collisions with built-in personas', () => {
    const customs = upsertPersona([], 'Coach', 'Different coach.')
    expect(customs[0].id).toBe('p-coach') // built-ins use bare ids, no clash
    expect(BUILT_IN_PERSONAS.find((p) => p.id === 'coach')).toBeDefined()
  })
})
