export interface RequestLog {
  traceId: string;
  method: string;
  uri: string;
  host: string;
  schema: string;
  start: number;
  end: number;
  size: number | null;
  code: number;
}

