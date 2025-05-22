import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { useSelector } from 'react-redux';
import { IViewMessageEventStoreValue, RootState } from '.';

export interface RequestTableState {
  requests: IViewMessageEventStoreValue[];
  filterUri: string;
  filterMimeType: string[];
  pendingRequestIds: Record<string, boolean>;
}
const initialState: RequestTableState = {
  requests: [],
  filterUri: '',
  filterMimeType: [],
  pendingRequestIds: {},
};

const isCompletedReq = (res: IViewMessageEventStoreValue) => {
  if (res.status === 'Completed' && res.tunnel?.status === "Disconnected") {
    return true;
  }
  if (res.status === 'Completed' && res.messages?.status === 'Disconnected') {
    return true;
  }
  if (res.status === "Completed" && !res.tunnel && !res.messages) {
    return true;
  }
  return false;
};

const requestTableSlice = createSlice({
  name: 'requestTable',
  initialState,

  reducers: {
    clearRequestTable: () => initialState,
    appendRequest: (
      state,
      action: PayloadAction<IViewMessageEventStoreValue[]>,
    ) => {
      state.requests.push(...action.payload);
      action.payload
        ?.filter(isCompletedReq)
        ?.map((res) => res.traceId)
        .forEach((id) => {
          state.pendingRequestIds[id] = true;
        });
    },
    replaceRequest: (
      state,
      action: PayloadAction<IViewMessageEventStoreValue[]>,
    ) => {
      state.requests.forEach((request, index) => {
        const newRequest = action.payload.find(
          (newRequest) => newRequest.traceId === request.traceId,
        );
        if (newRequest) {
          if (isCompletedReq(newRequest)) {
            delete state.pendingRequestIds[newRequest.traceId];
          }

          state.requests[index] = newRequest;
        }
      });
    },
    filterUri: (state, action: PayloadAction<string>) => {
      state.filterUri = action.payload;
    },
    filterMimeType: (state, action: PayloadAction<string[]>) => {
      state.filterMimeType = action.payload;
    },
    removeOldRequest: (
      state,
      action: PayloadAction<{
        maxLogSize: number;
      }>,
    ) => {
      state.requests = state.requests.slice(-action.payload.maxLogSize);
    },
  },
});

export const useRequestLogCount = () => {
  return useSelector((state: RootState) => state.requestTable.requests.length);
};
export const useFilteredTableData = () => {
  return useSelector((state: RootState) => {
    return state.requestTable.requests
      .filter((requestValue) => {
        if (!state.requestTable.filterUri) {
          return true;
        }
        return requestValue.request?.url?.includes(
          state.requestTable.filterUri,
        );
      })
      .filter((request) => {
        if (state.requestTable.filterMimeType.length === 0) {
          return true;
        }
        const mimeType = request.response?.headers?.['content-type'] || '';
        return state.requestTable.filterMimeType.some((type) =>
          mimeType.includes(type),
        );
      });
  });
};

export const {
  appendRequest,
  removeOldRequest,
  replaceRequest,
  clearRequestTable,
  filterMimeType,
  filterUri,
} = requestTableSlice.actions;

export const requestTableReducer = requestTableSlice.reducer;
