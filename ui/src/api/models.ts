export interface RequestModel {
  id: number;
  uri: string;
  traceId: string;
  method: string;
  schema: string;
  version: string;
  statusCode: number;
  header: Record<string, string>; // Assuming Json is a generic JSON object
}
  