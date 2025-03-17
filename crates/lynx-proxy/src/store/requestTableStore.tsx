import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { useSelector } from 'react-redux';
import { RootState } from '.';
import { Model as RequestModel } from '@/RequestModel';

export interface RequestTableState {
  requests: RequestModel[];
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
    appendRequest: (state, action: PayloadAction<RequestModel>) => {
      state.requests.push(action.payload);
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
        clearLogSize: number;
      }>,
    ) => {
      state.requests = state.requests.slice(
        -(action.payload.maxLogSize - action.payload.clearLogSize),
      );
    },
  },
});

export const useRequestLogCount = () => {
  return useSelector((state: RootState) => state.requestTable.requests.length);
};
export const useFilteredTableData = () => {
  return useSelector((state: RootState) => {
    return state.requestTable.requests
      .filter((request) => {
        if (!state.requestTable.filterUri) {
          return true;
        }
        return request.uri.includes(state.requestTable.filterUri);
      })
      .filter((request) => {
        if (state.requestTable.filterMimeType.length === 0) {
          return true;
        }
        const mimeType = request.responseMimeType || '';
        return state.requestTable.filterMimeType.some((type) =>
          mimeType.includes(type),
        );
      });
  });
};

export const {
  appendRequest,
  removeOldRequest,
  clearRequestTable,
  filterMimeType,
  filterUri,
} = requestTableSlice.actions;

export const requestTableReducer = requestTableSlice.reducer;
