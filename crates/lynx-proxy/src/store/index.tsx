import {
  useGetCachedRequests,
  useGetCaptureStatus,
} from '@/services/generated/net-request/net-request';
import {
  MessageEventBody,
  MessageEventRequestHeaders,
  MessageEventStoreValue,
  ResponseDataWrapperRecordRequests,
} from '@/services/generated/utoipaAxum.schemas';
import { configureStore } from '@reduxjs/toolkit';
import { useInterval } from 'ahooks';
import { useDispatch, useSelector } from 'react-redux';
import {
  appendRequest,
  removeOldRequest,
  replaceRequest,
  requestTableReducer,
  useRequestLogCount,
} from './requestTableStore';
import {
  appendTreeNode,
  replaceTreeNode,
  requestTreeReducer,
} from './requestTreeStore';
import pako from 'pako';
import { useSelectRequest } from '@/routes/network/components/store/selectRequestStore';

export const store = configureStore({
  reducer: {
    requestTable: requestTableReducer,
    requestTree: requestTreeReducer,
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

export function decodeGzipBase64(base64: string): ArrayBuffer {
  const bytes = base64ToArrayBuffer(base64);
  const decompressed = pako.ungzip(bytes);
  return decompressed.buffer;
}

export function bodyToArrayBuffer(
  headers: MessageEventRequestHeaders,
  body: MessageEventBody,
) {
  if (headers['content-encoding'] === 'gzip') {
    return decodeGzipBase64(body as string);
  }
  return base64ToArrayBuffer(body);
}

const formatItem = (item: MessageEventStoreValue) => {
  const { request, response } = item;
  const reqBodyArrayBuffer = request?.body
    ? bodyToArrayBuffer(request.headers, request.body)
    : undefined;
  const resBodyArrayBuffer = response?.body
    ? bodyToArrayBuffer(response.headers, response.body)
    : undefined;
  return {
    ...item,
    request: {
      ...request,
      bodyArrayBuffer: reqBodyArrayBuffer,
    },
    message: {
      ...item.messages,
      message: item.messages?.message?.reverse(),
    },
    response: {
      ...response,
      bodyArrayBuffer: resBodyArrayBuffer,
    },
  };
};

export type IViewMessageEventStoreValue = ReturnType<typeof formatItem>;

export const useUpdateRequestLog = () => {
  const cacheRequests = useGetCachedRequests({});
  const { data: netWorkCaptureStatusData } = useGetCaptureStatus();
  const dispatch = useDispatch();
  const requestLogCount = useRequestLogCount();
  const { maxLogSize = 1000 } = {};

  const pendingRequestIds = useSelector((state: RootState) => {
    return state.requestTable.pendingRequestIds;
  });
  const { selectRequest, setSelectRequest } = useSelectRequest();

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
      .map(formatItem)
    const patchRequests =
      cacheRequestsData?.data.patchRequests?.map(formatItem);
    const cacheNewData = {
      data: {
        data: {
          ...cacheRequests.data?.data,
          newRequests,
          patchRequests,
        },
      },
    };
    if (requestLogCount >= maxLogSize) {
      dispatch(
        removeOldRequest({
          maxLogSize,
        }),
      );
    }
    if (cacheNewData.data?.data.newRequests) {
      dispatch(appendRequest(cacheNewData.data?.data?.newRequests));

      dispatch(appendTreeNode(cacheNewData.data?.data?.newRequests));
    }
    if (cacheNewData.data?.data.patchRequests) {
      const updateCurrentRequest = cacheNewData.data?.data.patchRequests.find(
        (item) => item.traceId === selectRequest?.traceId,
      );

      if (updateCurrentRequest) {
        setSelectRequest(updateCurrentRequest);
      }
      dispatch(replaceRequest(cacheNewData.data?.data?.patchRequests));

      dispatch(replaceTreeNode(cacheNewData.data?.data?.patchRequests));
    }
  };

  useInterval(
    () => {
      if (
        netWorkCaptureStatusData?.data?.recordingStatus === 'pauseRecording'
      ) {
        cacheRequests
          .mutateAsync({
            data: {
              traceIds: Object.keys(pendingRequestIds),
            },
          })
          .then(handleCacheRequests);
      }
    },
    2000,
    { immediate: true },
  );
};
