import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../../../store';
import {
  setMethod,
  setUrl,
  setHeaders,
  setQueryParams,
  setBody,
  setResponse,
  setCurlModalVisible,
  setIsLoading,
  importCurl,
  updateUrlAndParams,
  updateParamsAndUrl,
  resetState,
} from './apiDebugSlice';
import { HeaderItem, QueryParamItem, FormattedResponse } from '../types';

export const useApiDebug = () => {
  const dispatch = useDispatch();
  const state = useSelector((state: RootState) => state.apiDebug);

  return {
    // State
    ...state,

    // Actions
    setMethod: (method: string) => dispatch(setMethod(method)),
    setUrl: (url: string) => dispatch(setUrl(url)),
    setHeaders: (headers: HeaderItem[]) => dispatch(setHeaders(headers)),
    setQueryParams: (params: QueryParamItem[]) =>
      dispatch(setQueryParams(params)),
    setBody: (body: string) => dispatch(setBody(body)),
    setResponse: (response: FormattedResponse | null) =>
      dispatch(setResponse(response)),
    setCurlModalVisible: (visible: boolean) =>
      dispatch(setCurlModalVisible(visible)),
    setIsLoading: (loading: boolean) => dispatch(setIsLoading(loading)),

    // Complex actions
    importCurl: (data: {
      method: string;
      url: string;
      headers: Record<string, string>;
      body: string;
    }) => dispatch(importCurl(data)),

    updateUrlAndParams: (url: string) => dispatch(updateUrlAndParams(url)),
    updateParamsAndUrl: (params: QueryParamItem[]) =>
      dispatch(updateParamsAndUrl(params)),

    resetState: () => dispatch(resetState()),
  };
};
