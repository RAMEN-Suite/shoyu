import { Component, computed, inject, Signal, signal, WritableSignal } from '@angular/core';
import { IftaLabel } from 'primeng/iftalabel';
import { InputText } from 'primeng/inputtext';
import { FormsModule } from '@angular/forms';
import { HttpResourceRef } from '@angular/common/http';
import { DataView } from 'primeng/dataview';
import { ActivatedRoute, Params } from '@angular/router';
import { Utils } from '../../../utils/Utils';
import { NavigationService } from '../../../services/navigation.service';
import { List, Listable, QueryOptions } from '../../../models/List';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SelectComponent } from '../../shared/interfaces/select/select.component';
import { ROUTES } from '../../../app.routes';
import { NodesViewComponent } from '../../shared/interfaces/data-view/nodes-view/nodes-view.component';
import { TranslocoDirective } from '@jsverse/transloco';
import { Entity } from '../../../models/Node';
import { EntityListOption, Property } from '../../../models/config/ListViews';
import { AbstractListScreen } from '../abstract-list.screen';
import { ParseUtils } from '../../../utils/ParseUtils';
import { SearchableListComponent, SearchableOption } from '../../shared/interfaces/searchable-list/searchable-list.component';
import { ListIndexService } from '../../../services/list-index/list-index.service';
import { ListIndex } from '../../../models/ListIndex';
import { CharacterListComponent } from '../../shared/interfaces/character-list/character-list.component';
import { ScreenShellComponent } from '../../shared/layout/screen-shell/screen-shell.component';
import { ConfigService } from '../../../services/config.service';
import { Registry } from '../../../helper/Registry';

const DEFAULT_OPTION: EntityListOption = {
  icon: 'pi pi-folder-open',
  label: 'app.screens.entities.default',
  index: 'character',
  value: '',
};

@Component({
  selector: 'screen-entities',
  imports: [
    IftaLabel,
    InputText,
    FormsModule,
    DataView,
    SelectComponent,
    NodesViewComponent,
    TranslocoDirective,
    SearchableListComponent,
    CharacterListComponent,
    ScreenShellComponent,
  ],
  templateUrl: './entities.screen.html',
})
export class EntitiesScreen extends AbstractListScreen<EntityListOption> {
  private readonly navigationService: NavigationService = inject(NavigationService);
  private readonly route: ActivatedRoute = inject(ActivatedRoute);
  private readonly listIndexService: ListIndexService = inject(ListIndexService);

  protected readonly activeIndex: WritableSignal<string> = signal('');
  protected readonly searchPhrase: WritableSignal<string> = signal('');

  protected readonly filteredEntities: Signal<Entity[]> = computed((): Entity[] => this.filterEntityList());
  protected readonly entityLabels: Signal<string[]> = computed((): string[] =>
    this.entities().data.map((entity: Entity): string => entity.label),
  );

  protected readonly indexOptions: Signal<SearchableOption[]> = computed((): SearchableOption[] =>
    this.activeListIndex().options(this.entityLabels()),
  );
  protected readonly activeListIndex: Signal<ListIndex> = computed((): ListIndex =>
    this.listIndexService.getIndex(this.activeOption()?.index),
  );
  protected readonly activeIndexLabel: Signal<string> = computed((): string => {
    if (this.searchPhrase()) return this.searchPhrase();
    const index: string = this.activeIndex();
    const option: SearchableOption | undefined = this.indexOptions().find((c: SearchableOption): boolean => c.value === index);
    return option?.label ?? index;
  });

  protected readonly queryOptions: Signal<QueryOptions> = signal({
    orderBy: 'label',
    asc: true,
    limit: 0,
    skip: 0,
  });

  protected readonly $list: HttpResourceRef<List<Entity>> = this.listService.fetchList(
    Listable.ENTITY,
    this.activeOption,
    this.queryOptions,
  );

  protected readonly entities: Signal<List<Entity>> = this.onLoading(
    (): List<Entity> => this.$list.value(),
    (): boolean => this.$list.isLoading(),
  );

  protected readonly properties: Signal<Property[]> = this.onLoading(
    (): Property[] => this.activeProperties(),
    (): boolean => this.$list.isLoading(),
  );

  public constructor() {
    const config: Registry = inject(ConfigService).config();
    super(config.getListView('entities'));
    this.route.queryParams.pipe(takeUntilDestroyed()).subscribe(this.applyQueryParams.bind(this));
  }

  protected override additionalListOptions(): EntityListOption[] {
    return [DEFAULT_OPTION];
  }

  protected handleActiveItemChange(option: EntityListOption | undefined): void {
    if (!option) return;
    this.activeOption.set(option);
    this.activeIndex.set('');
    void this.navigationService.updateQuery(this.route, { label: option.value || null, index: null });
  }

  protected handleIndexChange(index: string): void {
    this.activeIndex.set(index);
    void this.navigationService.updateQuery(this.route, { index: this.searchPhrase() === '' ? index : null });
  }

  protected handleSearchChange(input: string): void {
    const phrase: string = input.trim();
    if (phrase !== '' && phrase.length < 3) return;
    this.searchPhrase.set(phrase);

    const index: string | null = phrase === '' ? this.activeIndex() : null;
    void this.navigationService.updateQuery(this.route, { index, search: phrase || null });
  }

  private filterEntityList(): Entity[] {
    const searchPhrase: string = Utils.normalize(this.searchPhrase(), { toLower: true });
    const entities: Entity[] = this.entities().data;
    const currentIndex: string = this.activeIndex();

    if (searchPhrase !== '') return this.filterBySearch(entities, searchPhrase);
    if (currentIndex === '') return [];
    return this.filterByList(entities, currentIndex);
  }

  private filterBySearch(entities: Entity[], searchPhrase: string): Entity[] {
    return entities.filter((entity: Entity): boolean => {
      const normalized: string = Utils.normalize(entity.label, { toLower: true });
      return normalized.includes(searchPhrase);
    });
  }

  private filterByList(entities: Entity[], currentIndex: string): Entity[] {
    const index: ListIndex = this.activeListIndex();
    const filtered: Entity[] = entities.filter((entity: Entity): boolean => index.value(entity.label) === currentIndex);
    return filtered.sort((a: Entity, b: Entity): number => index.compare(a.label, b.label));
  }

  private applyQueryParams(params: Params): void {
    const index: string | undefined = ParseUtils.parseString(params['index']);
    const searchPhrase: string | undefined = ParseUtils.parseString(params['search']);
    const label: string | undefined = ParseUtils.parseString(params['label']);

    const option: EntityListOption | undefined = this.findOption(label, this.listOptions());
    if (option) this.activeOption.set(option);

    this.searchPhrase.set(searchPhrase ?? '');
    this.activeIndex.set(index ?? '');
  }

  protected readonly ROUTES: typeof ROUTES = ROUTES;
}
