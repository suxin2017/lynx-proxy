export interface ApiRequest {
  url: string;
  method: string;
  headers: Record<string, string>;
  body: string;
  contentType: string;
  timeout: number;
}

export interface ApiResponse {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: string;
  responseTime: number;
  errorMessage?: string;
}

export interface HeaderItem {
  key: string;
  value: string;
  enabled: boolean;
}

export interface QueryParamItem {
  key: string;
  value: string;
  enabled: boolean;
}

export interface FormattedResponse {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: string;
  responseTime: number;
  size: number;
}
