import { RaspSegment, RaspStation } from './rasp.model';

const MONTHS = ['янв.', 'февр.', 'мар.', 'апр.', 'мая', 'июн.', 'июл.', 'авг.', 'сент.', 'окт.', 'нояб.', 'дек.'];

const TRANSPORT_LABELS: Record<string, string> = {
  plane: 'Самолёт',
  train: 'Поезд',
  suburban: 'Электричка',
  bus: 'Автобус',
  water: 'Водный транспорт',
  helicopter: 'Вертолёт',
};

export interface TripView {
  id: string;
  timeRange?: string;
  dateRange?: string;
  route?: string;
  transportLabel?: string;
  number?: string;
  duration?: string;
  carrier?: string;
}

export function toTripViews(segments: RaspSegment[]): TripView[] {
  return [...segments]
    .sort((left, right) => departureKey(left).localeCompare(departureKey(right)))
    .map((segment, index) => toTripView(segment, index))
    .filter((trip) => trip.timeRange || trip.route || trip.transportLabel || trip.number || trip.duration || trip.carrier);
}

function toTripView(segment: RaspSegment, index: number): TripView {
  const departure = parseDateTime(segment.departure);
  const arrival = parseDateTime(segment.arrival);
  const fromTitle = stationTitle(segment.from, segment.departure_terminal);
  const toTitle = stationTitle(segment.to, segment.arrival_terminal);

  return {
    id: `${segment.thread?.uid ?? index}-${segment.departure ?? ''}-${segment.arrival ?? ''}`,
    timeRange: joinRange(' → ', departure?.time, arrival?.time),
    dateRange: dateRange(departure?.date, arrival?.date),
    route: joinRange(' → ', fromTitle, toTitle),
    transportLabel: transportLabel(segment.thread?.transport_type),
    number: tripNumber(segment.thread?.number),
    duration: formatDuration(segment.duration),
    carrier: text(segment.thread?.carrier?.title) || undefined,
  };
}

function departureKey(segment: RaspSegment): string {
  return text(segment.departure) || '9999-99-99';
}

function stationTitle(station?: RaspStation, terminal?: string | null): string {
  const name = text(station?.popular_title) || text(station?.title) || text(station?.short_title);
  const terminalName = text(terminal);
  if (name && terminalName) {
    return `${name}, ${terminalName}`;
  }
  return name;
}

function transportLabel(type?: string): string | undefined {
  const value = text(type);
  if (!value) {
    return undefined;
  }
  return TRANSPORT_LABELS[value] ?? value;
}

function tripNumber(value?: string): string | undefined {
  const number = text(value);
  if (!number) {
    return undefined;
  }
  return number.startsWith('№') ? number : `№ ${number}`;
}

function dateRange(from?: string, to?: string): string | undefined {
  if (!from || !to || from === to) {
    return undefined;
  }
  return `${from} → ${to}`;
}

function joinRange(separator: string, from?: string, to?: string): string | undefined {
  if (from && to) {
    return `${from}${separator}${to}`;
  }
  return from || to || undefined;
}

function formatDuration(seconds?: number): string | undefined {
  if (seconds == null || Number.isNaN(seconds) || seconds < 0) {
    return undefined;
  }

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.round((seconds % 3600) / 60);

  if (hours > 0 && minutes > 0) {
    return `${hours} ч ${minutes} мин`;
  }
  if (hours > 0) {
    return `${hours} ч`;
  }
  if (minutes > 0) {
    return `${minutes} мин`;
  }
  return undefined;
}

function parseDateTime(value?: string): { date: string; time: string } | null {
  const raw = text(value);
  if (!raw) {
    return null;
  }

  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/);
  if (!match) {
    return null;
  }

  const monthIndex = Number(match[2]) - 1;
  const month = MONTHS[monthIndex];
  if (!month) {
    return null;
  }

  return {
    date: `${Number(match[3])} ${month}`,
    time: `${match[4]}:${match[5]}`,
  };
}

function text(value?: string | null): string {
  if (typeof value !== 'string') {
    return '';
  }
  return value.trim();
}
