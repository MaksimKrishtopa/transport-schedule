import { Component, DestroyRef, inject, input, output } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, catchError, debounceTime, distinctUntilChanged, map, of, startWith, switchMap } from 'rxjs';
import { StationPoint } from '../../models/search.model';
import { StationService } from '../../services/station.service';

type SuggestState =
  | { status: 'closed' }
  | { status: 'loading' }
  | { status: 'empty' }
  | { status: 'error'; message: string }
  | { status: 'results'; items: StationPoint[] };

@Component({
  selector: 'app-station-autocomplete',
  templateUrl: './station-autocomplete.html',
  styleUrl: './station-autocomplete.css',
})
export class StationAutocomplete {
  readonly placeholder = input('Пункт');
  readonly query = input('');
  readonly selected = input<StationPoint | null>(null);

  readonly queryChange = output<string>();
  readonly selectedChange = output<StationPoint | null>();

  protected state: SuggestState = { status: 'closed' };

  private readonly destroyRef = inject(DestroyRef);
  private readonly stationService = inject(StationService);
  private readonly query$ = new Subject<string>();
  private lastOpenState: SuggestState = { status: 'closed' };
  private lastSuggestQuery = '';
  private isFocused = false;
  private blurTimer?: ReturnType<typeof setTimeout>;

  constructor() {
    this.query$
      .pipe(
        debounceTime(350),
        map((value) => value.trim()),
        distinctUntilChanged(),
        switchMap((value) => this.search(value).pipe(map((state) => ({ value, state })))),
        takeUntilDestroyed(),
      )
      .subscribe(({ value, state }) => {
        if (state.status !== 'closed') {
          this.lastOpenState = state;
          this.lastSuggestQuery = value;
        }

        if (this.isFocused) {
          this.state = state;
        }
      });

    this.destroyRef.onDestroy(() => this.clearBlurTimer());
  }

  protected onInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.queryChange.emit(value);

    const selected = this.selected();
    if (selected && selected.title !== value) {
      this.selectedChange.emit(null);
    }

    this.query$.next(value);
  }

  protected onFocus(): void {
    this.isFocused = true;

    if (this.selected()) {
      return;
    }

    const query = this.query().trim();
    if (query.length < 2) {
      return;
    }

    if (query === this.lastSuggestQuery && this.lastOpenState.status !== 'closed') {
      this.state = this.lastOpenState;
      return;
    }

    this.query$.next(query);
  }

  protected onBlur(): void {
    this.isFocused = false;
    this.clearBlurTimer();
    this.blurTimer = setTimeout(() => {
      this.state = { status: 'closed' };
    }, 120);
  }

  protected selectPoint(point: StationPoint): void {
    this.selectedChange.emit(point);
    this.queryChange.emit(point.title);
    this.state = { status: 'closed' };
  }

  private clearBlurTimer(): void {
    if (this.blurTimer !== undefined) {
      clearTimeout(this.blurTimer);
      this.blurTimer = undefined;
    }
  }

  private search(query: string) {
    if (query.length < 2) {
      return of<SuggestState>({ status: 'closed' });
    }

    return this.stationService.searchStations(query).pipe(
      map((items) =>
        items.length > 0
          ? ({ status: 'results', items } satisfies SuggestState)
          : ({ status: 'empty' } satisfies SuggestState),
      ),
      startWith<SuggestState>({ status: 'loading' }),
      catchError((error: unknown) =>
        of<SuggestState>({
          status: 'error',
          message: this.stationService.getUserMessage(error),
        }),
      ),
    );
  }
}
