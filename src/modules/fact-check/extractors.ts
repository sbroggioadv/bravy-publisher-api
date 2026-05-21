// === EXTRATORES (regex) ===

// Captura "Lei NNN.NNN/AAAA" e variantes
export const RE_LEI = new RegExp(
  '\\b(' +
    'Lei\\s+(?:n[º°.]?\\s*)?\\d{1,3}(?:\\.\\d{3})?(?:/\\d{4})?' +
    '|L\\d{4,5}' +
    '|Decreto\\s+(?:n[º°.]?\\s*)?\\d{1,3}(?:\\.\\d{3})?(?:/\\d{4})?' +
    '|IN\\s+(?:RFB\\s+)?\\d{1,2}\\.\\d{3}/\\d{4}' +
    '|Portaria\\s+(?:MTP\\s+|MPS/MF\\s+|interministerial\\s+)?\\d+(?:/\\d{4})?' +
    '|Resolu[çc][ãa]o\\s+(?:Senado\\s+|RFB\\s+)?\\d+(?:/\\d{4})?' +
    '|LC\\s+\\d+(?:/\\d{4})?' +
    '|Conv[ê]nio\\s+ICMS\\s+\\d+(?:/\\d{2,4})?' +
    '|MP\\s+\\d+(?:\\.\\d{3})?/\\d{4}' +
  ')\\b',
  'gi',
);

// Captura "art. N" ou "artigo N"
export const RE_ARTIGO = new RegExp(
  '\\b(art\\.?\\s*\\d+(?:[º°\\-][A-Z])?|artigo\\s+\\d+(?:[º°\\-][A-Z])?)\\b',
  'gi',
);

// Captura codigos S-NNNN e R-NNNN
export const RE_ESOCIAL = /\bS-\d{4}\b/g;
export const RE_REINF = /\bR-\d{4}\b/g;

// Captura DARFs (4 digitos isolados)
export const RE_DARF = /\bDARF\s+(\d{4})\b/gi;

// Captura percentuais
export const RE_PERCENT = /(\d+(?:[.,]\d+)?\s*%)/g;

// Captura valores monetarios R$ X.XXX,XX
export const RE_DINHEIRO = /R\$\s*(\d{1,3}(?:\.\d{3})*(?:,\d{2})?)/g;

// Padroes suspeitos comuns (palavras vagas que podem esconder claim falso)
export const SUSPICIOUS_PATTERNS: Array<[RegExp, string]> = [
  [/\b\d{1,2}%\s+das\s+empresas\b/i, 'estatistica generica sem fonte'],
  [/\b\d{2,}\s+mil\s+contadores\b/i, 'numero de mercado sem fonte'],
  [/NBR\s+\d+/i, 'NBR -- confirmar numero exato no site da ABNT'],
  [/s[uú]mula\s+\d+/i, 'sumula -- confirmar numero e teor no tribunal'],
];
