export type TransportType = 'plane' | 'train' | 'suburban' | 'bus' | 'water';

export type StationPointType = 'settlement' | 'station';

export interface StationPoint {
  code: string;
  title: string;
  subtitle?: string;
  type?: StationPointType;
}

export interface SearchParams {
  from: StationPoint;
  to: StationPoint;
  date: string;
  transportType: TransportType | null;
}
