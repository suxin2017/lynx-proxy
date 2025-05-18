import { configureStore } from '@reduxjs/toolkit';
import { appendTreeNode, requestTreeReducer } from './requestTreeStore';
import {
  appendRequest,
  removeOldRequest,
  replaceRequest,
  requestTableReducer,
  useRequestLogCount,
} from './requestTableStore';
import { useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { appendLog, websocketResourceReducer } from './websocketResourceStore';
import { useGetCachedRequests } from '@/services/generated/net-request/net-request';
import { useInterval } from 'ahooks';
import { ResponseDataWrapperRecordRequests } from '@/services/generated/utoipaAxum.schemas';

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

export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

export const useUpdateRequestLog = () => {
  const cacheRequests = useGetCachedRequests({});

  const dispatch = useDispatch();
  const requestLogCount = useRequestLogCount();
  const { maxLogSize = 1000 } = {};

  const pendingRequestIds = useSelector((state: RootState) => {
    return state.requestTable.pendingRequestIds;
  });

  const handleCacheRequests = (
    cacheRequestsData: ResponseDataWrapperRecordRequests,
  ) => {
    const newRequests = cacheRequestsData?.data?.newRequests
      ?.filter((item) => {
        if (item.request?.method === 'CONNECT' && !item.tunnel) {
          return false;
        }
        return true;
      })
      .map((item) => {
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
    const patchRequests = cacheRequestsData?.data.patchRequests?.map((item) => {
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
    const chacheNewData = {
      data: {
        data: {
          ...cacheRequests.data?.data,
          newRequests,
          patchRequests,
        },
      },
    };
    console.log('chacheNewData', chacheNewData);
    if (requestLogCount >= maxLogSize) {
      dispatch(
        removeOldRequest({
          maxLogSize,
        }),
      );
    }
    if (chacheNewData.data?.data.newRequests) {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-expect-error
      dispatch(appendRequest(chacheNewData.data?.data?.newRequests));
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-expect-error
      dispatch(appendTreeNode(chacheNewData.data?.data?.newRequests));
    }
    if (chacheNewData.data?.data.patchRequests) {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-expect-error
      dispatch(replaceRequest(chacheNewData.data?.data?.patchRequests));
    }
  };

  useInterval(
    () => {
      cacheRequests
        .mutateAsync({
          data: {
            traceIds: Object.keys(pendingRequestIds),
          },
        })
        .then(handleCacheRequests);
    },
    1000,
    { immediate: true },
  );
};
