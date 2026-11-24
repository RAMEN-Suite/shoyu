import { Component, computed, inject, Signal, signal, viewChild, WritableSignal } from '@angular/core';
import { TableModule } from 'primeng/table';
import { PaginatedListComponent } from '../../shared/interfaces/paginated-list/paginated-list.component';
import { List, Listable, QueryOptions } from '../../../models/List';
import { HttpResourceRef } from '@angular/common/http';
import { ActivatedRoute, Params } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { PaginationUtils } from '../../../utils/PaginationUtils';
import { SelectComponent } from '../../shared/interfaces/select/select.component';
import { FormsModule } from '@angular/forms';
import { IftaLabel } from 'primeng/iftalabel';
import { InputText } from 'primeng/inputtext';
import { Button } from 'primeng/button';
import { Tooltip } from 'primeng/tooltip';
import { ActiveFilter, FacetGroup, FacetOptions } from '../../../models/Facet';
import { FacetListComponent } from '../../shared/interfaces/facet-list/facet-list.component';
import { FilterUtils } from '../../../utils/FilterUtils';
import { Collection } from '../../../models/Node';
import { FilterOption, ListOption, Option, Property, SortOption, SortOptionGroup } from '../../../models/config/ListViews';
import { AbstractListScreen } from '../abstract-list.screen';
import { TranslocoDirective } from '@jsverse/transloco';
import { ROUTES } from '../../../app.routes';
import { ParseUtils } from '../../../utils/ParseUtils';
import { ScreenShellComponent } from '../../shared/layout/screen-shell/screen-shell.component';
import { Registry } from '../../../helper/Registry';
import { ConfigService } from '../../../services/config.service';
import { NavigationService } from '../../../services/navigation.service';

@Component({
  selector: 'screen-collections',
  imports: [
    TableModule,
    PaginatedListComponent,
    SelectComponent,
    FormsModule,
    IftaLabel,
    InputText,
    Button,
    Tooltip,
    FacetListComponent,
    TranslocoDirective,
    ScreenShellComponent,
  ],
  templateUrl: './collections.screen.html',
})
export class CollectionsScreen extends AbstractListScreen {
  private readonly facetListComponent: Signal<FacetListComponent | undefined> = viewChild(FacetListComponent);
  private readonly navigationService: NavigationService = inject(NavigationService);
  private readonly route: ActivatedRoute = inject(ActivatedRoute);

  protected readonly filters: Signal<FilterOption[]> = computed((): FilterOption[] => this.activeOption()?.filters ?? []);
  protected readonly activeFilters: WritableSignal<ActiveFilter[]> = signal<ActiveFilter[]>([]);

  protected readonly sort: Signal<Option[]> = computed((): Option[] => this.getSortOptions());
  protected readonly activeSort: WritableSignal<Option | undefined> = signal(undefined);

  protected readonly facetOptions: WritableSignal<FacetOptions> = signal({ facets: [] });
  protected readonly queryOptions: WritableSignal<QueryOptions> = signal({
    orderBy: 'label',
    asc: true,
    limit: 25,
    skip: 0,
  });

  public readonly $list: HttpResourceRef<List<Collection>> = this.listService.fetchList(
    Listable.COLLECTION,
    this.activeOption,
    this.queryOptions,
  );

  public readonly $facets: HttpResourceRef<FacetGroup[]> = this.listService.fetchFacets(
    Listable.COLLECTION,
    this.activeOption,
    this.facetOptions,
  );

  protected readonly collections: Signal<List<Collection>> = this.onLoading(
    (): List<Collection> => this.$list.value(),
    (): boolean => this.$list.isLoading(),
  );

  protected readonly properties: Signal<Property[]> = this.onLoading(
    (): Property[] => this.activeProperties(),
    (): boolean => this.$list.isLoading(),
  );

  protected readonly facets: Signal<FacetGroup[]> = this.onLoading(
    (): FacetGroup[] => this.$facets.value(),
    (): boolean => this.$facets.isLoading(),
  );

  public constructor() {
    const config: Registry = inject(ConfigService).config();
    super(config.getListView('collections'));

    this.initPageState();
    this.route.queryParams.pipe(takeUntilDestroyed()).subscribe(this.applyQueryParams.bind(this));
  }

  private initPageState(): void {
    const option: ListOption = this.currentOption();
    const sort: Option | undefined = this.getInitialSortOption(option);
    this.activeSort.set(sort);

    this.queryOptions.update((current: QueryOptions): QueryOptions => ({
      ...current,
      orderBy: sort?.value ?? 'label',
      asc: option.sort?.direction === 'asc',
    }));

    this.facetOptions.update((current: FacetOptions): FacetOptions => ({
      ...current,
      facets: this.filterPaths(option),
    }));
  }

  protected handlePaginationChange(change: Partial<Pick<QueryOptions, 'limit' | 'skip'>>): void {
    const next: QueryOptions = { ...this.queryOptions(), ...change };
    const limit: number = PaginationUtils.parseLimit(next.limit);
    const page: number = PaginationUtils.skipToPage(next.skip, limit);
    void this.navigationService.updateQuery(this.route, { page, limit }, { scroll: 'manual', replaceUrl: false });
  }

  protected handleActiveItemChange(option: ListOption | undefined): void {
    if (!option) return;
    void this.navigationService.updateQuery(this.route, {
      label: option.value,
      limit: this.queryOptions().limit,
      page: 1,
      orderBy: null,
    });
  }

  protected handleSearchChange(searchPhrase: string): void {
    const search: string = searchPhrase.trim();
    if (search.length < 3 && search !== '') return;
    void this.navigationService.updateQuery(this.route, { search: search || null, page: 1 }, { scroll: 'manual' });
  }

  protected handleFilterChange(filters: ActiveFilter[]): void {
    const activeFilters: string[] = filters.map(FilterUtils.serializeFilter);
    void this.navigationService.updateQuery(this.route, { filters: activeFilters, page: 1 }, { scroll: 'manual' });
  }

  protected handleSortChange(change: Partial<Pick<QueryOptions, 'asc' | 'orderBy'>>): void {
    const next: QueryOptions = { ...this.queryOptions(), ...change };
    const newOrder: string = next.orderBy ?? 'label';
    const newDirection: string = String(next.asc);
    void this.navigationService.updateQuery(this.route, { orderBy: newOrder, asc: newDirection, page: 1 }, { scroll: 'manual' });
  }

  protected handleClearFilter(): void {
    this.facetListComponent()?.collapseAccordions();
    void this.navigationService.updateQuery(this.route, null, { queryParamsHandling: null });
  }

  private getInitialSortOption(option: ListOption | undefined): Option | undefined {
    const group: SortOptionGroup | undefined = option?.sort;
    const existing: SortOption | undefined = group?.options.find((o: SortOption): boolean => o.identifier === group.initial);
    const initial: SortOption | undefined = existing ?? group?.options[0];

    if (!initial) return undefined;
    return { icon: initial.icon, label: initial.label, value: initial.identifier };
  }

  private getSortOptions(): Option[] {
    const options: SortOption[] = this.activeOption()?.sort?.options ?? [];
    return options.map((option: SortOption): Option => ({ icon: option.icon, label: option.label, value: option.identifier }));
  }

  private applyQueryParams(params: Params): void {
    const limit: number = PaginationUtils.parseLimit(params['limit']);
    const page: number = PaginationUtils.parsePage(params['page']);
    const skip: number = PaginationUtils.pageToSkip(page, limit);

    this.applyActiveOptionParam(params);
    this.applyFilterParams(params);

    const search: string | undefined = ParseUtils.parseString(params['search']);
    const sort: Pick<QueryOptions, 'orderBy' | 'asc'> = this.applySortParams(params);

    this.queryOptions.update((current: QueryOptions): QueryOptions => ({
      ...current,
      limit,
      skip,
      search,
      filters: this.activeFilters(),
      ...sort,
    }));

    this.facetOptions.update((current: FacetOptions): FacetOptions => ({
      ...current,
      search,
      filters: this.activeFilters(),
      facets: this.filterPaths(this.activeOption()),
    }));
  }

  private applyActiveOptionParam(params: Params): void {
    const label: string | undefined = ParseUtils.parseString(params['label']);
    const option: ListOption | undefined = this.findOption(label, this.listOptions());
    if (option) this.activeOption.set(option);
  }

  private applyFilterParams(params: Params): void {
    const filterArray: unknown[] = ParseUtils.parseArray(params['filters']);
    const filters: ActiveFilter[] = ParseUtils.parseStringArray(filterArray).map(FilterUtils.parseFilter);
    this.activeFilters.set(filters);
  }

  private applySortParams(params: Params): Pick<QueryOptions, 'orderBy' | 'asc'> {
    const option: ListOption | undefined = this.activeOption();
    const sortOptions: Option[] = this.sort();

    const rawOrderBy: string | undefined = ParseUtils.parseString(params['orderBy']);
    const existing: Option | undefined = this.findOption(rawOrderBy, sortOptions);
    const initial: Option | undefined = this.getInitialSortOption(option);
    const activeSort: Option | undefined = existing ?? initial;

    this.activeSort.set(activeSort);

    const order: string = activeSort?.value ?? 'label';
    const isAscending: boolean = ParseUtils.parseBoolean(params['asc']) ?? option?.sort?.direction === 'asc';
    return { orderBy: order, asc: isAscending };
  }

  protected readonly ROUTES: typeof ROUTES = ROUTES;
}
