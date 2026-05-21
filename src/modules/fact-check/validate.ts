import { CarouselData, ValidationResult } from './types';
import {
  WHITELIST_LEIS,
  WHITELIST_ESOCIAL,
  WHITELIST_REINF,
  WHITELIST_DARF_AVISO,
  WHITELIST_MOTIVOS_DESLIGAMENTO,
  WHITELIST_CATEGORIAS,
} from './whitelists';
import {
  RE_LEI,
  RE_ESOCIAL,
  RE_REINF,
  RE_DARF,
  SUSPICIOUS_PATTERNS,
} from './extractors';

/**
 * Coleta todos os matches de uma regex global sem efeitos colaterais
 * de lastIndex compartilhado. Cria nova instancia interna.
 */
function findAll(regex: RegExp, text: string): RegExpExecArray[] {
  const re = new RegExp(regex.source, regex.flags);
  const results: RegExpExecArray[] = [];
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    results.push(match);
  }
  return results;
}

/**
 * Remove tags HTML inline pra facilitar analise textual.
 */
export function normalize(text: string): string {
  text = text.replace(/<[^>]+>/g, ' ');
  text = text.replace(/\s+/g, ' ');
  return text.trim();
}

/**
 * Concatena todo texto do JSON num unico bloco.
 */
export function collectText(data: CarouselData): string {
  const parts: string[] = [
    data.hook_capa ?? '',
    data.label_capa ?? '',
    data.cta_text ?? '',
    data.cta_sub ?? '',
    data.caption ?? '',
  ];

  for (const s of data.slides ?? []) {
    parts.push(s.label_topo ?? '');
    parts.push(s.tag ?? '');
    if (s.paragraphs) {
      parts.push(...s.paragraphs);
    }
    if (s.list) {
      parts.push(...s.list);
    }
    if (s.stats) {
      for (const [n, t] of s.stats) {
        parts.push(`${n} ${t}`);
      }
    }
    if (s.cards) {
      for (const c of s.cards) {
        parts.push(c.title ?? '');
        parts.push(c.body ?? '');
        parts.push(c.label ?? '');
      }
    }
    if (s.callout !== undefined) {
      parts.push(s.callout);
    }
  }

  return normalize(parts.filter((p) => p).join(' '));
}

/**
 * Match flexivel: normaliza espacos e case pra comparar.
 * Retorna true se a citacao casa com algum item da whitelist (substring nos 2 sentidos).
 */
export function whitelistMatch(
  citation: string,
  whitelist: Set<string> | string[],
): boolean {
  const norm = citation.replace(/\s+/g, ' ').trim().toLowerCase();
  const items = Array.from(whitelist);
  for (let i = 0; i < items.length; i++) {
    const wn = items[i].replace(/\s+/g, ' ').trim().toLowerCase();
    // match por substring nos 2 sentidos
    if (wn.includes(norm) || norm.includes(wn)) {
      return true;
    }
  }
  return false;
}

/**
 * Retorna ValidationResult com {ok, issues, warnings}.
 */
export function validate(data: CarouselData): ValidationResult {
  const text = collectText(data);
  const issues: string[] = [];
  const warnings: string[] = [];

  // 1. Leis/INs/portarias/decretos
  for (const m of findAll(RE_LEI, text)) {
    const cit = m[0];
    // ignora se for generico (sem numero especifico)
    if (!/\d/.test(cit)) {
      continue;
    }
    if (!whitelistMatch(cit, WHITELIST_LEIS)) {
      issues.push(`Lei/IN/Portaria não validada: '${cit}'`);
    }
  }

  // 2. Eventos eSocial
  for (const m of findAll(RE_ESOCIAL, text)) {
    const ev = m[0];
    if (!WHITELIST_ESOCIAL.has(ev)) {
      issues.push(`Evento eSocial não conhecido: ${ev}`);
    }
  }

  // 3. Eventos EFD-Reinf
  for (const m of findAll(RE_REINF, text)) {
    const ev = m[0];
    if (!WHITELIST_REINF.has(ev)) {
      issues.push(`Evento EFD-Reinf não conhecido: ${ev}`);
    }
  }

  // 4. Codigos DARF
  for (const m of findAll(RE_DARF, text)) {
    const d = m[1];
    if (!WHITELIST_DARF_AVISO.has(d)) {
      warnings.push(`DARF ${d} fora da whitelist (verificar contexto)`);
    }
  }

  // 5. Avisos pra codigos motivo desligamento numericos suspeitos
  const reMotivo = /motivo\s+(\d{1,2})\b/gi;
  for (const m of findAll(reMotivo, text)) {
    const n = parseInt(m[1], 10);
    if (!WHITELIST_MOTIVOS_DESLIGAMENTO.has(n)) {
      warnings.push(`Motivo desligamento ${n} não validado (não cravar)`);
    }
  }

  // 6. Categorias eSocial numericas
  const reCategoria = /categoria\s+(\d{3})\b/gi;
  for (const m of findAll(reCategoria, text)) {
    const c = parseInt(m[1], 10);
    if (!WHITELIST_CATEGORIAS.has(c)) {
      warnings.push(`Categoria eSocial ${c} não validada`);
    }
  }

  // 7. Termos suspeitos comuns (palavras vagas que podem esconder claim falso)
  for (const [pat, motivo] of SUSPICIOUS_PATTERNS) {
    if (pat.test(text)) {
      warnings.push(`Suspeita: ${motivo}`);
    }
  }

  return {
    ok: issues.length === 0,
    issues,
    warnings,
  };
}
