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
}

export interface IRuleTree {
  key: string;
  title: string;
  children: IRuleTreeNode[];
  record: IRuleGroupModel;
}
export interface IRuleGroupTreeResponse extends IResponseBox<IRuleTree[]> {}
export interface IRuleContentResponse extends IResponseBox<IRuleContentModel> {}