import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map, of, shareReplay, throwError } from 'rxjs';
import { YANDEX_API_KEY, YANDEX_RASP_STATIONS_URL } from '../config/api.config';
import { API_UNAVAILABLE_MESSAGE, MissingApiKeyError } from '../models/api-error';
import { RaspApiErrorBody } from '../models/rasp.model';
import { StationPoint } from '../models/search.model';

const RESULT_LIMIT = 12;

interface StationsListCodes {
  yandex_code?: string;
}

interface StationsListStation {
  title?: string;
  station_type?: string;
  transport_type?: string;
  codes?: StationsListCodes;
}

interface StationsListSettlement {
  title?: string;
  codes?: StationsListCodes;
  stations?: StationsListStation[];
}

interface StationsListRegion {
  title?: string;
  settlements?: StationsListSettlement[];
}

interface StationsListCountry {
  title?: string;
  regions?: StationsListRegion[];
}

interface StationsListResponse {
  countries?: StationsListCountry[];
}

@Injectable({ providedIn: 'root' })
export class StationService {
  private readonly http = inject(HttpClient);
  private catalog$?: Observable<StationPoint[]>;

  searchStations(query: string): Observable<StationPoint[]> {
    const normalizedQuery = query.trim();
    if (normalizedQuery.length < 2) {
      return of([]);
    }

    if (!YANDEX_API_KEY.trim()) {
      return throwError(() => new MissingApiKeyError());
    }

    return this.getCatalog().pipe(map((points) => filterStations(points, normalizedQuery)));
  }

  getUserMessage(error: unknown): string {
    console.error(error);

    if (error instanceof MissingApiKeyError) {
      return API_UNAVAILABLE_MESSAGE;
    }

    if (error instanceof HttpErrorResponse) {
      if (error.status === 0) {
        return API_UNAVAILABLE_MESSAGE;
      }

      const apiText = (error.error as RaspApiErrorBody | null)?.error?.text;
      if (typeof apiText === 'string' && apiText.trim()) {
        return apiText;
      }
    }

    return API_UNAVAILABLE_MESSAGE;
  }

  private getCatalog(): Observable<StationPoint[]> {
    if (!this.catalog$) {
      const params = new HttpParams()
        .set('apikey', YANDEX_API_KEY)
        .set('format', 'json')
        .set('lang', 'ru_RU');

      this.catalog$ = this.http.get<StationsListResponse>(YANDEX_RASP_STATIONS_URL, { params }).pipe(
        map((response) => flattenStationsList(response)),
        shareReplay(1),
      );
    }

    return this.catalog$;
  }
}

function flattenStationsList(response: StationsListResponse): StationPoint[] {
  const points: StationPoint[] = [];

  for (const country of response.countries ?? []) {
    for (const region of country.regions ?? []) {
      for (const settlement of region.settlements ?? []) {
        const settlementTitle = settlement.title?.trim() ?? '';
        const settlementCode = settlement.codes?.yandex_code;

        if (settlementCode && settlementTitle) {
          points.push({
            code: settlementCode,
            title: settlementTitle,
            subtitle: country.title || region.title,
            type: 'settlement',
          });
        }

        for (const station of settlement.stations ?? []) {
          const stationTitle = station.title?.trim() ?? '';
          const stationCode = station.codes?.yandex_code;
          if (!stationCode || !stationTitle) {
            continue;
          }

          const title =
            settlementTitle && !stationTitle.toLowerCase().includes(settlementTitle.toLowerCase())
              ? `${settlementTitle} (${stationTitle})`
              : stationTitle;

          points.push({
            code: stationCode,
            title,
            subtitle: [settlementTitle, station.station_type].filter(Boolean).join(', '),
            type: 'station',
          });
        }
      }
    }
  }

  return points;
}

function filterStations(points: StationPoint[], query: string): StationPoint[] {
  const normalized = query.toLowerCase();

  return points
    .filter((point) => point.title.toLowerCase().includes(normalized))
    .sort((left, right) => scoreStation(right, normalized) - scoreStation(left, normalized))
    .slice(0, RESULT_LIMIT);
}

function scoreStation(point: StationPoint, query: string): number {
  const title = point.title.toLowerCase();
  let score = point.type === 'settlement' ? 20 : 0;

  if (title === query) {
    score += 50;
  } else if (title.startsWith(query)) {
    score += 30;
  } else if (title.includes(query)) {
    score += 10;
  }

  return score;
}
