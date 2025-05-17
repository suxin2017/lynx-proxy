import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { useSelector } from 'react-redux';
import { RootState } from '.';
import { Model as RequestModel } from '@/RequestModel';
import { MessageEventStoreValue } from '@/services/generated/utoipaAxum.schemas';

export interface RequestTableState {
  requests: MessageEventStoreValue[];
  filterUri: string;
  filterMimeType: string[];
}
const initialState: RequestTableState = {
  requests: [],
  filterUri: '',
  filterMimeType: [],
};

const requestTableSlice = createSlice({
  name: 'requestTable',
  initialState,
  reducers: {
    clearRequestTable: () => initialState,
    appendRequest: (state, action: PayloadAction<MessageEventStoreValue[]>) => {
      state.requests.push(...action.payload);
    },
    replaceRequest: (
      state,
      action: PayloadAction<MessageEventStoreValue[]>,
    ) => {
      state.requests.forEach((request, index) => {
        const newRequest = action.payload.find(
          (newRequest) => newRequest.traceId === request.traceId,
        );
        if (newRequest) {
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
        const mimeType = request.response?.headers['context-type'] || '';
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
