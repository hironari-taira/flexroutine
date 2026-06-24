import type { RunMode } from '@/types/models';

export function normalizeRunMode(value: string | string[] | undefined): RunMode {
  const rawValue = Array.isArray(value) ? value[0] : value;
  return rawValue === 'emergency' || rawValue === 'EMERGENCY' ? 'EMERGENCY' : 'NORMAL';
}

export function runModeToParam(mode: RunMode) {
  return mode === 'EMERGENCY' ? 'emergency' : 'normal';
}
