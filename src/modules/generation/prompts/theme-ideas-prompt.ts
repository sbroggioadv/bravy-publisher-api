import { PatternInfo, VocabEntry } from '../types';

const PERSONA_LABEL: Record<string, string> = {
  contador: 'contadores e escritorios contabeis / BPO fiscal',
  advogado: 'advogados e escritorios juridicos',
  empresario: 'empresarios, donos de empresa e diretores',
  gestor: 'gestores e lideres operacionais',
  arquiteto: 'arquitetos e escritorios de arquitetura',
  engenheiro: 'engenheiros civis, mecanicos e eletricos',
  agencia: 'agencias de marketing, publicidade e social media',
};

export function buildThemeIdeasPrompt(params: {
  persona?: string;
  pattern?: string;
  patterns: PatternInfo[];
  vocab: VocabEntry;
  hint?: string;
}): string {
  const { persona, pattern, patterns, vocab, hint } = params;

  const personaDesc = persona
    ? PERSONA_LABEL[persona] || persona
    : 'profissionais e empresas que querem automatizar tarefas com IA';

  const activePattern = pattern
    ? patterns.find((p) => p.id === pattern)
    : undefined;

  const vocabLines: string[] = [];
  if (vocab.ferramentas?.length)
    vocabLines.push(`Ferramentas do nicho: ${vocab.ferramentas.join(', ')}`);
  if (vocab.obrigacoes?.length)
    vocabLines.push(`Obrigacoes: ${vocab.obrigacoes.join(', ')}`);
  if (vocab.tributos?.length)
    vocabLines.push(`Tributos: ${vocab.tributos.join(', ')}`);
  if (vocab.regimes?.length)
    vocabLines.push(`Regimes: ${vocab.regimes.join(', ')}`);
  if (vocab.areas?.length) vocabLines.push(`Areas: ${vocab.areas.join(', ')}`);
  if (vocab.operacoes?.length)
    vocabLines.push(`Operacoes: ${vocab.operacoes.join(', ')}`);
  if (vocab.dores?.length)
    vocabLines.push(`Dores da persona: ${vocab.dores.join(', ')}`);

  const vocabBlock = vocabLines.length
    ? `\n=== VOCABULARIO DO NICHO (use termos reais daqui) ===\n${vocabLines.join('\n')}\n`
    : '';

  const patternBlock = activePattern
    ? `\n=== PADRAO ESCOLHIDO ===\n${activePattern.id} - ${activePattern.nome}\nQuando usar: ${activePattern.quando_usar}\nEnviese as ideias para encaixar nesse padrao.\n`
    : '';

  const hintBlock = hint
    ? `\n=== DIRECAO DO USUARIO ===\nO usuario deu esta pista, use como ponto de partida: "${hint}"\n`
    : '';

  return `Voce e o estrategista de conteudo do perfil @jp.asv no Instagram (Joao Pedro Nascimento — GESTAO COM CLAUDE CODE, 78k seguidores). O perfil ensina profissionais a automatizarem o trabalho do dia a dia usando IA (Claude Code).

Sua tarefa: sugerir 3 TEMAS concretos de carrossel para a persona: ${personaDesc}.
${patternBlock}${vocabBlock}${hintBlock}
=== REGRAS DAS IDEIAS ===
- Cada tema deve ser uma frase curta e especifica (10 a 18 palavras), pronta pra colar no campo "tema".
- SEMPRE ancorado numa tarefa real e nomeada do dia a dia da persona (nao generico tipo "produtividade com IA").
- SEMPRE mencione Claude Code ou IA aplicada a uma operacao concreta da persona.
- Use ferramentas/obrigacoes/operacoes reais do vocabulario quando existir.
- Cada tema deve ser distinto dos outros (operacoes diferentes).
- Sem hashtags, sem emojis, sem aspas internas.

Exemplo de bom tema (persona contador):
"Recuperacao tributaria lendo 5 anos de SPED com Claude Code em vez de 3 dias no Excel"

Responda APENAS com JSON valido neste formato, sem texto antes ou depois:
{"ideas": ["tema 1", "tema 2", "tema 3"]}`;
}
