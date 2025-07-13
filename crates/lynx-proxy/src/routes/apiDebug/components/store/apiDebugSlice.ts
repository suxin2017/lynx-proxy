import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { HeaderItem, QueryParamItem, FormattedResponse } from '../types';
import {
  HttpMethod,
  ApiDebugResponse,
} from '../../../../services/generated/utoipaAxum.schemas';
import { IViewMessageEventStoreValue } from '../../../../store/useSortPoll';

// 定义状态类型
export interface ApiDebugState {
  method: string;
  url: string;
  headers: HeaderItem[];
  queryParams: QueryParamItem[];
  body: string;
  response: FormattedResponse | null;
  curlModalVisible: boolean;
  isLoading: boolean;
}

// 初始状态
const initialState: ApiDebugState = {
  method: HttpMethod.GET,
  url: '',
  headers: [],
  queryParams: [],
  body: '',
  response: null,
  curlModalVisible: false,
  isLoading: false,
};

// 从URL中解析查询参数的工具函数
const parseUrlParams = (urlString: string): QueryParamItem[] => {
  try {
    if (!urlString) return [];

    const url = new URL(
      urlString.startsWith('http') ? urlString : `http://${urlString}`,
    );
    const params: QueryParamItem[] = [];

    url.searchParams.forEach((value, key) => {
      params.push({ key, value, enabled: true });
    });

    return params;
  } catch {
    return [];
  }
};

// 构建带查询参数的URL的工具函数
const buildUrlWithParams = (
  baseUrl: string,
  params: QueryParamItem[],
): string => {
  try {
    if (!baseUrl) return '';

    // 分离基础URL和现有查询参数
    const [urlPart] = baseUrl.split('?');
    const url = new URL(
      urlPart.startsWith('http') ? urlPart : `http://${urlPart}`,
    );

    // 添加启用的查询参数
    params
      .filter((param) => param.enabled && param.key)
      .forEach((param) => {
        url.searchParams.set(param.key, param.value);
      });

    return url.toString();
  } catch {
    return baseUrl;
  }
};

// 创建 slice
const apiDebugSlice = createSlice({
  name: 'apiDebug',
  initialState,
  reducers: {
    setMethod: (state, action: PayloadAction<string>) => {
      state.method = action.payload;
    },

    setUrl: (state, action: PayloadAction<string>) => {
      state.url = action.payload;
    },

    setHeaders: (state, action: PayloadAction<HeaderItem[]>) => {
      state.headers = action.payload;
    },

    setQueryParams: (state, action: PayloadAction<QueryParamItem[]>) => {
      state.queryParams = action.payload;
    },

    setBody: (state, action: PayloadAction<string>) => {
      state.body = action.payload;
    },

    setResponse: (state, action: PayloadAction<FormattedResponse | null>) => {
      state.response = action.payload;
    },

    setCurlModalVisible: (state, action: PayloadAction<boolean>) => {
      state.curlModalVisible = action.payload;
    },

    setIsLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },

    importCurl: (
      state,
      action: PayloadAction<{
        method: string;
        url: string;
        headers: Record<string, string>;
        body: string;
      }>,
    ) => {
      const { method, url, headers, body } = action.payload;

      // Convert headers object to HeaderItem array
      const headersArray: HeaderItem[] = Object.entries(headers).map(
        ([key, value]) => ({
          key,
          value,
          enabled: true,
        }),
      );

      // Parse query parameters from URL
      const parsedParams = parseUrlParams(url);

      state.method = method;
      state.url = url;
      state.headers = headersArray;
      state.queryParams = parsedParams;
      state.body = body;
    },

    setFromRequest: (
      state,
      action: PayloadAction<IViewMessageEventStoreValue>,
    ) => {
      const request = action.payload;

      // Extract request data
      const method = request.request?.method || HttpMethod.GET;
      const url = request.request?.url || '';

      // Convert headers object to HeaderItem array
      const headersArray: HeaderItem[] = [];
      if (
        request.request?.headers &&
        typeof request.request.headers === 'object'
      ) {
        Object.entries(request.request.headers).forEach(([key, value]) => {
          if (typeof value === 'string') {
            headersArray.push({ key, value, enabled: true });
          }
        });
      }

      // Parse query parameters from URL
      const parsedParams = parseUrlParams(url);

      // Get request body
      let body = '';
      if (
        request.request?.bodyArrayBuffer &&
        request.request.bodyArrayBuffer.byteLength > 0
      ) {
        try {
          body = new TextDecoder('utf-8').decode(
            request.request.bodyArrayBuffer,
          );
        } catch (error) {
          console.warn('Failed to decode request body:', error);
          body = '';
        }
      }

      // Update state
      state.method = method;
      state.url = url;
      state.headers = headersArray;
      state.queryParams = parsedParams;
      state.body = body;

      // Clear any previous response
      state.response = null;
    },

    updateUrlAndParams: (state, action: PayloadAction<string>) => {
      const newUrl = action.payload;
      const parsedParams = parseUrlParams(newUrl);

      state.url = newUrl;

      if (parsedParams.length > 0) {
        state.queryParams = parsedParams;
      } else if (newUrl && !newUrl.includes('?')) {
        // 如果新URL没有查询参数，清空查询参数数组
        state.queryParams = [];
      }
    },

    updateParamsAndUrl: (state, action: PayloadAction<QueryParamItem[]>) => {
      const newParams = action.payload;
      state.queryParams = newParams;

      if (state.url) {
        const [baseUrl] = state.url.split('?');
        state.url = buildUrlWithParams(baseUrl, newParams);
      }
    },

    resetState: () => {
      return initialState;
    },

    loadFromApiDebugResponse: (
      state,
      action: PayloadAction<ApiDebugResponse>,
    ) => {
      const request = action.payload;

      // Set basic request data
      state.method = request.method;
      state.url = request.url;

      // Convert headers to HeaderItem array
      const headersArray: HeaderItem[] = [];
      if (request.headers && typeof request.headers === 'object') {
        Object.entries(request.headers).forEach(([key, value]) => {
          if (typeof value === 'string') {
            headersArray.push({ key, value, enabled: true });
          }
        });
      }
      state.headers = headersArray;

      // Parse query parameters from URL
      state.queryParams = parseUrlParams(request.url);

      // Set body
      state.body = request.body || '';

      // Set response if available
      if (request.responseStatus) {
        const formattedResponse: FormattedResponse = {
          status: request.responseStatus,
          statusText: getStatusText(request.responseStatus),
          headers: (request.responseHeaders as Record<string, string>) || {},
          body: request.responseBody || '',
          responseTime: request.responseTime || 0,
          size: request.responseBody
            ? new Blob([request.responseBody]).size
            : 0,
        };
        state.response = formattedResponse;
      } else {
        state.response = null;
      }
    },
  },
});

// Helper function to get status text
const getStatusText = (status: number): string => {
  const statusTexts: Record<number, string> = {
    200: 'OK',
    201: 'Created',
    204: 'No Content',
    400: 'Bad Request',
    401: 'Unauthorized',
    403: 'Forbidden',
    404: 'Not Found',
    500: 'Internal Server Error',
  };
  return statusTexts[status] || 'Unknown';
};

// 导出 actions
export const {
  setMethod,
  setUrl,
  setHeaders,
  setQueryParams,
  setBody,
  setResponse,
  setCurlModalVisible,
  setIsLoading,
  importCurl,
  setFromRequest,
  updateUrlAndParams,
  updateParamsAndUrl,
  resetState,
  loadFromApiDebugResponse,
} = apiDebugSlice.actions;

// 导出 reducer
export const apiDebugReducer = apiDebugSlice.reducer;
