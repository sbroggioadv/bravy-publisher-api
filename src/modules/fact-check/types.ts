export interface ValidationResult {
  ok: boolean;
  issues: string[];
  warnings: string[];
}

export interface CarouselData {
  slug?: string;
  hook_capa?: string;
  label_capa?: string;
  cta_text?: string;
  cta_sub?: string;
  caption?: string;
  slides?: SlideData[];
}

export interface SlideData {
  label_topo?: string;
  tag?: string;
  headline_top?: string;
  headline_em?: string;
  headline_bottom?: string;
  paragraphs?: string[];
  list?: string[];
  stats?: [string, string][];
  cards?: Array<{ title?: string; body?: string; label?: string }>;
  callout?: string;
}
