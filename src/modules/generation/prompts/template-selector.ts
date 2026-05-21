import { HookPattern, TemplateName } from '../types';

export function selectTemplate(pattern: HookPattern): TemplateName {
  const terminalPatterns: HookPattern[] = ['D', 'G', 'H'];
  return terminalPatterns.includes(pattern) ? 'compendium' : 'step';
}
