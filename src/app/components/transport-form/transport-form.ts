import { Component, OnDestroy, computed, inject, signal } from '@angular/core';
import { Subscription } from 'rxjs';
import { StationAutocomplete } from '../station-autocomplete/station-autocomplete';
import { TripCard } from '../trip-card/trip-card';
import { SearchParams, StationPoint, TransportType } from '../../models/search.model';
import { TripView, toTripViews } from '../../models/trip-view';
import { ScheduleService } from '../../services/schedule.service';

export interface TransportOption {
  value: TransportType | null;
  label: string;
  title: string;
}

type DatePreset = 'today' | 'tomorrow' | 'custom';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

@Component({
  selector: 'app-transport-form',
  imports: [StationAutocomplete, TripCard],
  templateUrl: './transport-form.html',
  styleUrl: './transport-form.css',
})
export class TransportForm implements OnDestroy {
  private readonly scheduleService = inject(ScheduleService);
  private searchRequest?: Subscription;

  readonly fromQuery = signal('');
  readonly toQuery = signal('');
  readonly fromPoint = signal<StationPoint | null>(null);
  readonly toPoint = signal<StationPoint | null>(null);
  readonly date = signal(formatIsoDate(new Date()));
  readonly dateMode = signal<DatePreset>('today');
  readonly transportType = signal<TransportType | null>(null);

  readonly isLoading = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly nothingFound = signal(false);
  readonly results = signal<TripView[]>([]);

  readonly minDate = formatIsoDate(new Date());

  readonly transportOptions: TransportOption[] = [
    { value: null, label: 'любой', title: 'Все виды транспорта' },
    { value: 'plane', label: '', title: 'Самолёт' },
    { value: 'train', label: '', title: 'Поезд' },
    { value: 'suburban', label: '', title: 'Электричка' },
    { value: 'bus', label: '', title: 'Автобус' },
    { value: 'water', label: '', title: 'Водный транспорт' },
  ];

  readonly canSearch = computed(() => {
    const from = this.fromPoint();
    const to = this.toPoint();
    return Boolean(from?.code && to?.code && ISO_DATE.test(this.date()));
  });

  ngOnDestroy(): void {
    this.searchRequest?.unsubscribe();
  }

  onFromQuery(value: string): void {
    this.fromQuery.set(value);
  }

  onToQuery(value: string): void {
    this.toQuery.set(value);
  }

  selectToday(): void {
    this.dateMode.set('today');
    this.date.set(formatIsoDate(new Date()));
  }

  selectTomorrow(): void {
    this.dateMode.set('tomorrow');
    this.date.set(formatIsoDate(addDays(new Date(), 1)));
  }

  selectCustomDate(): void {
    this.dateMode.set('custom');
  }

  onDateInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.dateMode.set('custom');
    if (value && value < this.minDate) {
      this.date.set(this.minDate);
      return;
    }
    this.date.set(value);
  }

  selectTransport(type: TransportType | null): void {
    this.transportType.set(type);
  }

  swapStations(): void {
    const fromQuery = this.fromQuery();
    const fromPoint = this.fromPoint();
    this.fromQuery.set(this.toQuery());
    this.fromPoint.set(this.toPoint());
    this.toQuery.set(fromQuery);
    this.toPoint.set(fromPoint);
  }

  onSearch(): void {
    const fromPoint = this.fromPoint();
    const toPoint = this.toPoint();

    if (!fromPoint?.code || !toPoint?.code || !this.canSearch()) {
      return;
    }

    this.searchRequest?.unsubscribe();
    this.results.set([]);
    this.nothingFound.set(false);
    this.errorMessage.set(null);
    this.isLoading.set(true);

    const params: SearchParams = {
      from: fromPoint,
      to: toPoint,
      date: this.date(),
      transportType: this.transportType(),
    };

    this.searchRequest = this.scheduleService.search(params).subscribe({
      next: (response) => {
        const segments = [...(response.segments ?? []), ...(response.interval_segments ?? [])];
        const trips = toTripViews(segments);
        this.results.set(trips);
        this.nothingFound.set(trips.length === 0);
        this.isLoading.set(false);
      },
      error: (error: unknown) => {
        this.results.set([]);
        this.nothingFound.set(false);
        this.errorMessage.set(this.scheduleService.getUserMessage(error));
        this.isLoading.set(false);
      },
    });
  }
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function formatIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

