export enum ResponseCodeEnum {
  Ok = 'Ok',
  ValidateError = 'ValidateError',
  OperationError = 'OperationError',
  InternalServerError = 'InternalServerError',
}

export interface IResponseBox<T> {
  code: ResponseCodeEnum;
  message?: string;
  data?: T;
}
export interface IResponseBoxView extends IResponseBox<IResponseModel> {}

export interface IRequestModel {
  id: number;
  uri: string;
  traceId: string;
  method: string;
  schema: string;
  version: string;
  statusCode: number;
  header: Record<string, string>;
}

export interface IResponseModel {
  id: number;
  requestId: number;
  traceId: string;
  header: Record<string, string>;
}

export interface IRuleGroupModel {
  id: number;
  name: string;
  description: string;
}

export interface IRuleModel {
  id: number;
  ruleGroupId: number;
  name: string;
  description: string;
}
export interface IRuleContentModel {
  id: number;
  content: number;
}
export interface IRuleTreeNode {
  key: string;
  title: string;
  children: [];
  record: IRuleModel;
  ifLeaf?: boolean;
}

export interface IRuleTree {
  key: string;
  title: string;
  isLeaf?: boolean;
  children: IRuleTreeNode[];
  record: IRuleGroupModel;
}

export interface ISSLConfigModel {
  includeDomains: Array<{
    host: string;
    port: number;
    switch: boolean;
  }>;
  excludeDomains: Array<{
    host: string;
    port: number;
    switch: boolean;
  }>;
}
export interface IAppConfigModel  {
  id: number;
  recordingStatus: RecordStatusEnum;
  captureSSL: boolean;
  sslConfig: ISSLConfigModel;
}
export interface IRuleGroupTreeResponse extends IResponseBox<IRuleTree[]> {}
export interface IRuleContentResponse extends IResponseBox<IRuleContentModel> {}
export interface IAppConfigResponse extends IResponseBox<IAppConfigModel> {}

export enum RecordStatusEnum {
  StartRecording = 'StartRecording',
  PauseRecording = 'PauseRecording',
}
