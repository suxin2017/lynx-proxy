import { IRequestModel } from '@/api/models';
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { get } from 'lodash';
import { useSelector } from 'react-redux';
import { RootState } from '.';

export interface RequestTableState {
  requests: IRequestModel[];
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
    appendRequest: (state, action: PayloadAction<IRequestModel>) => {
      state.requests.push(action.payload);
    },
    filterUri: (state, action: PayloadAction<string>) => {
      state.filterUri = action.payload;
    },
    filterMimeType: (state, action: PayloadAction<string[]>) => {
      state.filterMimeType = action.payload;
    },
  },
});

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
        const mimeType = get(request.header, 'Content-Type', '');
        return state.requestTable.filterMimeType.some((type) =>
          mimeType.includes(type),
        );
      });
  });
};

export const { appendRequest, clearRequestTable, filterMimeType, filterUri } =
  requestTableSlice.actions;

export const requestTableReducer = requestTableSlice.reducer;
