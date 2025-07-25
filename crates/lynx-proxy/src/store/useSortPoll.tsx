import { useSelectRequest } from '@/routes/network/components/store/selectRequestStore';
import {
  useGetCachedRequests,
  useGetCaptureStatus,
} from '@/services/generated/net-request/net-request';
import {
  MessageEventBody,
  MessageEventStoreValue,
  ResponseDataWrapperRecordRequests,
} from '@/services/generated/utoipaAxum.schemas';
import { configureStore } from '@reduxjs/toolkit';
import { useInterval } from 'ahooks';
import { useDispatch, useSelector } from 'react-redux';
import { apiDebugReducer } from '../routes/apiDebug/components/store';
import { ExpendMessageEventRequest, ExtendedMessageEventStoreValue, ExtendMessageEventResponse } from './messageEventCache';
import {
  appendRequest,
  removeOldRequest,
  replaceRequest,
  requestTableReducer,
  useRequestLogCount,
} from './requestTableStore';
import {

  requestTreeReducer, requestTreeSliceAction
} from './requestTreeStore';
import { ConnectType, useGeneralSetting } from './useGeneralState';
import { useEffect } from 'react';

const { appendTreeNode,
  replaceTreeNode, } = requestTreeSliceAction

export const store = configureStore({
  reducer: {
    requestTable: requestTableReducer,
    requestTree: requestTreeReducer,
    apiDebug: apiDebugReducer,
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

export function bodyToArrayBuffer(body: MessageEventBody) {
  return base64ToArrayBuffer(body);
}


function getArrayBufferFromResponse(
  response?: ExpendMessageEventRequest | ExtendMessageEventResponse | null,
): ArrayBuffer | undefined {
  if (response && 'bodyArrayBuffer' in response) {
    return response.bodyArrayBuffer;
  }
  return response?.body ? bodyToArrayBuffer(response.body) : undefined;
}

export const formatItem = (item: MessageEventStoreValue | ExtendedMessageEventStoreValue) => {
  const { request, response } = item;

  return {
    ...item,
    request: {
      ...request,
      bodyArrayBuffer: getArrayBufferFromResponse(request),
    } as ExpendMessageEventRequest,
    message: {
      ...item.messages,
      message: item.messages?.message?.reverse(),
    },
    response: {
      ...response,
      bodyArrayBuffer: getArrayBufferFromResponse(response),
    } as ExtendMessageEventResponse,
  };
};


export function filterConnectRequest(item: MessageEventStoreValue) {
  if (item.request?.method === 'CONNECT' && !item.tunnel && typeof item.status !== 'object') {
    return false;
  }
  return true;
}
export type IViewMessageEventStoreValue = ReturnType<typeof formatItem>;

export const useSortPoll = () => {
  const cacheRequests = useGetCachedRequests({});
  const { data: netWorkCaptureStatusData } = useGetCaptureStatus();
  const dispatch = useDispatch();
  const requestLogCount = useRequestLogCount();
  const { maxLogSize = 1000, connectType } = useGeneralSetting();

  const pendingRequestIds = useSelector((state: RootState) => {
    return state.requestTable.pendingRequestIds;
  });
  const { selectRequest, setSelectRequest } = useSelectRequest();

  const handleCacheRequests = (
    cacheRequestsData: ResponseDataWrapperRecordRequests,
  ) => {
    const newRequests = cacheRequestsData?.data?.newRequests
      ?.filter(filterConnectRequest)
      .map(formatItem);
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

  const clearnInterval = useInterval(
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

  useEffect(() => {
    if (connectType === ConnectType.SSE) {
      clearnInterval()
    }
  }, [clearnInterval, connectType])
};
