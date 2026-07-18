import * as Device from 'expo-device'
import { RamFit } from '../types'

/**
 * Rough heuristic for whether a model of a given file size will run
 * comfortably given total device RAM. Mobile OSes only let an app use a
 * fraction of physical memory, and inference needs the weights plus KV cache
 * headroom, so we key off the total-RAM to model-size ratio.
 */
export function ramFit(modelSizeBytes: number): RamFit {
  const total = Device.totalMemory
  if (!total) return 'unknown'
  const ratio = total / modelSizeBytes
  if (ratio >= 4.5) return 'great'
  if (ratio >= 2.8) return 'ok'
  return 'risky'
}

export function ramFitLabel(fit: RamFit): string {
  switch (fit) {
    case 'great':
      return 'Runs great'
    case 'ok':
      return 'Should run'
    case 'risky':
      return 'May be too big'
    default:
      return ''
  }
}

export function totalRamLabel(): string {
  const total = Device.totalMemory
  if (!total) return ''
  return `${Math.round(total / 1_000_000_000)} GB RAM`
}
