import { Binding, Template } from './Config';

export interface DetailViews {
  entity: DetailView[];
  collection: DetailView[];
}

export interface DetailView {
  match: string[];
  blocks: Block[];
}

export type Block = Headline | Attributes | Text | Citation;

export interface BlockOf<TType extends string, TProps> {
  type: TType;
  properties: TProps;
}

export type Headline = BlockOf<'headline', HeadlineProps>;
export type Attributes = BlockOf<'attributes', AttributesProps>;
export type Text = BlockOf<'text', TextProps>;
export type Citation = BlockOf<'citation', CitationProps>;

export interface HeadlineProps {
  title: Binding;
}

export interface TextProps {
  title?: Binding | string;
  text: Binding;
  annotations?: Binding;
}

export interface AttributesProps {
  title: string;
  items: AttributesItem[];
}

export type AttributesItem = AttributesValueItem | AttributesNodeItem;

export interface AttributesBaseItem {
  label: string;
  emptyLabel?: string;
  isEmptyVisible?: boolean;
}

export interface AttributesValueItem extends AttributesBaseItem {
  kind?: 'value';
  value: Binding;
}

export interface AttributesNodeItem extends AttributesBaseItem {
  kind: 'node';
  value: Binding;
  property: string;
  isLinked?: boolean;
  /** HTTP(S) URL property on the same node as the display value. Takes precedence over isLinked. */
  externalLinkProperty?: string;
}

export interface CitationProps {
  title?: string;
  citation: Template;
  license?: Template;
  links?: CitationLink[];
}

export interface CitationLink {
  label: string;
  href: Binding | string;
  icon?: string;
}
