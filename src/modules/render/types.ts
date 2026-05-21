export interface CarouselInput {
  slug: string;
  template: 'step' | 'compendium';
  persona?: string;
  label_topo_capa?: string;
  label_capa?: string;
  hook_capa: string;
  slides: SlideInput[];
  cta_label_topo?: string;
  cta_label?: string;
  cta_text?: string;
  cta_sub?: string;
  caption?: string;
}

export interface SlideInput {
  label_topo?: string;
  tag?: string;
  headline_top?: string;
  headline_em?: string;
  headline_bottom?: string;
  paragraphs?: string[];
  list?: string[];
  stats?: [string, string][];
  cards?: CardInput[];
  callout?: string;
}

export interface CardInput {
  label?: string;
  icon?: string;
  title?: string;
  body?: string;
  highlight?: boolean;
}

export interface RenderOutput {
  html: string;
  slideCount: number;
}

export interface RenderResult {
  contentId: string;
  slides: Array<{
    position: number;
    imageUrl: string;
    imageKey: string;
    sizeBytes: number;
  }>;
}
