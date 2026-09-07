import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { YANDEX_API_KEY, YANDEX_RASP_SEARCH_URL } from '../config/api.config';
import { API_UNAVAILABLE_MESSAGE, MissingApiKeyError } from '../models/api-error';
import { RaspApiErrorBody, RaspSearchResponse } from '../models/rasp.model';
import { SearchParams } from '../models/search.model';

@Injectable({ providedIn: 'root' })
export class ScheduleService {
  private readonly http = inject(HttpClient);

  search(params: SearchParams): Observable<RaspSearchResponse> {
    if (!YANDEX_API_KEY.trim()) {
      return throwError(() => new MissingApiKeyError());
    }

    let query = new HttpParams()
      .set('apikey', YANDEX_API_KEY)
      .set('from', params.from.code)
      .set('to', params.to.code)
      .set('date', params.date)
      .set('format', 'json')
      .set('lang', 'ru_RU');

    if (params.transportType) {
      query = query.set('transport_types', params.transportType);
    }

    return this.http.get<RaspSearchResponse>(YANDEX_RASP_SEARCH_URL, { params: query });
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
}
