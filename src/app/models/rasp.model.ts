export interface RaspStation {
  code?: string;
  title?: string;
  short_title?: string;
  popular_title?: string;
}

export interface RaspCarrier {
  title?: string;
}

export interface RaspThread {
  uid?: string;
  title?: string;
  short_title?: string;
  number?: string;
  transport_type?: string;
  vehicle?: string | null;
  carrier?: RaspCarrier | null;
}

export interface RaspSegment {
  departure?: string;
  arrival?: string;
  duration?: number;
  departure_terminal?: string | null;
  arrival_terminal?: string | null;
  from?: RaspStation;
  to?: RaspStation;
  thread?: RaspThread;
}

export interface RaspSearchResponse {
  segments?: RaspSegment[];
  interval_segments?: RaspSegment[];
}

export interface RaspApiErrorBody {
  error?: {
    text?: string;
    http_code?: number;
  };
}
