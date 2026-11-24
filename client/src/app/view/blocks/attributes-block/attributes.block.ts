import { Component, computed, inject, Signal } from '@angular/core';
import { Fieldset } from 'primeng/fieldset';
import { Node } from '../../../models/Node';
import { RouterLink } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';
import { AbstractBlock } from '../abstract.block';
import { AttributesItem, AttributesNodeItem, AttributesProps, AttributesValueItem } from '../../../models/config/DetailViews';
import { ParseUtils } from '../../../utils/ParseUtils';
import { NavigationService } from '../../../services/navigation.service';

interface Attribute {
  label: string;
  values: AttributeValue[];
}

interface AttributeValue {
  value: string;
  href?: string[];
  externalHref?: string;
  isTranslatable?: boolean;
}

@Component({
  selector: 'block-attributes',
  imports: [Fieldset, RouterLink, TranslocoDirective],
  templateUrl: './attributes.block.html',
})
export class AttributesBlock extends AbstractBlock<AttributesProps> {
  private readonly navigationService: NavigationService = inject(NavigationService);
  protected readonly title: Signal<string> = computed((): string => this.properties()?.title ?? '');

  protected readonly attributes: Signal<Attribute[]> = computed((): Attribute[] => {
    const items: AttributesItem[] = this.properties()?.items ?? [];
    const attributes: Attribute[] = [];

    for (const item of items) {
      const attribute: Attribute = this.resolveItem(item);
      if (attribute.values.length > 0) attributes.push(attribute);
    }

    return attributes;
  });

  private resolveItem(item: AttributesItem): Attribute {
    if (item.kind === 'node') return this.resolveNodeItem(item);
    return this.resolveValueItem(item);
  }

  private resolveValueItem(item: AttributesValueItem): Attribute {
    const value: string = this.resolveText(item.value);
    if (value.trim()) return { label: item.label, values: [{ value }] };

    const values: AttributeValue[] = item.isEmptyVisible ? [this.resolveEmptyValue(item)] : [];
    return { label: item.label, values };
  }

  private resolveNodeItem(item: AttributesNodeItem): Attribute {
    const nodes: Node[] = this.resolveNodes(item.value);
    const values: AttributeValue[] = [];

    for (const node of nodes) {
      const nodeValue: AttributeValue = this.resolveNodeValue(node, item);
      if (nodeValue.value.trim()) values.push(nodeValue);
    }

    if (values.length === 0 && item.isEmptyVisible) {
      values.push(this.resolveEmptyValue(item));
    }

    return { label: item.label, values };
  }

  private resolveNodeValue(node: Node, item: AttributesNodeItem): AttributeValue {
    const value: string = ParseUtils.parseString(node[item.property]) ?? '';
    if (item.externalLinkProperty !== undefined) {
      return { value, externalHref: this.resolveExternalHref(node[item.externalLinkProperty]) };
    }
    const href: string[] | undefined = item.isLinked ? this.resolveHref(node) : undefined;
    return { value, href };
  }

  private resolveExternalHref(value: unknown): string | undefined {
    if (typeof value !== 'string' || !value.trim()) return undefined;
    try {
      const url: URL = new URL(value.trim());
      return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : undefined;
    } catch {
      return undefined;
    }
  }

  private resolveEmptyValue(item: AttributesItem): AttributeValue {
    return { value: item.emptyLabel ?? this.EMPTY_LABEL, isTranslatable: true };
  }

  private resolveHref(node: Node): string[] | undefined {
    const uuid: string | undefined = ParseUtils.parseString(node['uuid']);
    if (!uuid) return undefined;

    if (node._labels.includes('Collection')) return this.navigationService.collectionLink(uuid);
    if (node._labels.includes('Entity')) return this.navigationService.entityLink(uuid);
    return this.navigationService.nodeLink(uuid);
  }

  private readonly EMPTY_LABEL: string = 'app.blocks.attributes.missing';
}
