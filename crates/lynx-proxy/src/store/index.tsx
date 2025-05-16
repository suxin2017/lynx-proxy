import { configureStore } from '@reduxjs/toolkit';
import { appendTreeNode, requestTreeReducer } from './requestTreeStore';
import {
  appendRequest,
  removeOldRequest,
  replaceRequest,
  requestTableReducer,
  useRequestLogCount,
} from './requestTableStore';
import { fetchRequest } from '@/api/request';
import { useEffect, useMemo } from 'react';
import { useDispatch } from 'react-redux';
import { useGetAppConfig } from '@/api/app';
import { appendLog, websocketResourceReducer } from './websocketResourceStore';
import { useGetCachedRequests } from '@/services/generated/net-request/net-request';

export const store = configureStore({
  reducer: {
    requestTable: requestTableReducer,
    requestTree: requestTreeReducer,
    websocketResource: websocketResourceReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({ serializableCheck: false }),
});

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>;
// Inferred type: {posts: PostsState, comments: CommentsState, users: UsersState}
export type AppDispatch = typeof store.dispatch;

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

export const useUpdateRequestLog = () => {
  const { data: appConfigData } = useGetAppConfig();
  const cacheRequests = useGetCachedRequests({});

  const chacheNewData = useMemo(() => {
    const newRequests = cacheRequests.data?.data?.newRequests?.map((item) => {
      const { request, response } = item;
      const body = request?.body
        ? base64ToArrayBuffer(request.body)
        : undefined;
      const responseBody = response?.body
        ? base64ToArrayBuffer(response.body)
        : undefined;
      return {
        ...item,
        request: {
          ...request,
          body,
        },
        response: {
          ...response,
          body: responseBody,
        },
      };
    });
    const patchRequests = cacheRequests.data?.data.patchRequests?.map(
      (item) => {
        const { request, response } = item;
        const body = request?.body
          ? base64ToArrayBuffer(request.body)
          : undefined;
        const responseBody = response?.body
          ? base64ToArrayBuffer(response.body)
          : undefined;
        return {
          ...item,
          request: {
            ...request,
            body,
          },
          response: {
            ...response,
            body: responseBody,
          },
        };
      },
    );
    return {
      data: {
        data: {
          ...cacheRequests.data?.data,
          newRequests,
          patchRequests,
        },
      },
    };
  }, [cacheRequests.data?.data]);
  const dispatch = useDispatch();
  const requestLogCount = useRequestLogCount();
  const { maxLogSize = 1000, clearLogSize = 100 } = appConfigData?.data ?? {};

  const handleCacheRequests = () => {
    if (requestLogCount >= maxLogSize) {
      dispatch(
        removeOldRequest({
          maxLogSize,
          clearLogSize,
        }),
      );
    }
    if (chacheNewData.data?.data.newRequests) {
      // @ts-expect-error
      dispatch(appendRequest(chacheNewData.data?.data?.newRequests));
      // @ts-expect-error
      dispatch(appendTreeNode(chacheNewData.data?.data?.newRequests));
    }
    if (chacheNewData.data?.data.patchRequests) {
      // @ts-expect-error
      dispatch(replaceRequest(chacheNewData.data?.data?.patchRequests));
    }
  };

  useEffect(() => {
    handleCacheRequests();
  }, [
    chacheNewData.data?.data.newRequests,
    chacheNewData.data?.data.patchRequests,
  ]);
};
