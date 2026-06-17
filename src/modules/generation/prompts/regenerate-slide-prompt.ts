/**
 * Prompt focado p/ regenerar UM slide de corpo (RFC §6.4). Recebe persona/
 * padrão/template do Content + os vizinhos como contexto + hint do usuário, e
 * pede de volta um único objeto de slide no mesmo formato do GenerationOutput.
 */
import type { GenerationOutput } from '../types';

type Slide = GenerationOutput['slides'][number];

export interface RegenerateSlidePromptInput {
  persona: string;
  pattern: string;
  template: string;
  position: number;
  total: number;
  current: Slide;
  prev?: Slide;
  next?: Slide;
  hint?: string;
}

export function buildRegenerateSlidePrompt(input: RegenerateSlidePromptInput): string {
  const ctx = (label: string, s?: Slide) => (s ? `${label}:\n${JSON.stringify(s, null, 2)}` : `${label}: (nenhum)`);

  return `Você reescreve UM slide de corpo de um carrossel editorial do nicho "${input.persona}".
Mantenha o tom, a densidade e o padrão "${input.pattern}" (template "${input.template}").

Contexto (NÃO altere estes — são só referência de coesão):
${ctx('Slide anterior', input.prev)}
${ctx('Slide seguinte', input.next)}

Slide atual a reescrever (posição ${input.position} de ${input.total}):
${JSON.stringify(input.current, null, 2)}

${input.hint ? `Ajuste pedido pelo usuário: ${input.hint}` : 'Melhore clareza e impacto mantendo o sentido.'}

Responda APENAS com um objeto JSON do slide, no mesmo formato (campos possíveis:
label_topo, tag, headline_top, headline_em, headline_bottom, paragraphs[], list[],
stats[[num,texto]], cards[{label,icon,title,body,highlight}], callout). Use SÓ os
campos que fizerem sentido para este slide. Sem markdown, sem comentários.`;
}
