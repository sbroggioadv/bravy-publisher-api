import { Persona } from '../types';

export const ACCENT_PALETTE: Record<Persona, { accent: string; hex: string }> = {
  contador:   { accent: 'Verde escuro',   hex: '#3B5D3A' },
  advogado:   { accent: 'Bordo',          hex: '#8B2635' },
  arquiteto:  { accent: 'Ocre',           hex: '#C8932F' },
  empresario: { accent: 'Laranja Claude', hex: '#DA7756' },
  gestor:     { accent: 'Laranja Claude', hex: '#DA7756' },
};
