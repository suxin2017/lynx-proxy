import { RequestModel } from '@/api/models';
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { useSelector } from 'react-redux';
import { RootState } from '.';

export interface RequestTableState {
  requests: RequestModel[];
  selectRequest: RequestModel | null;
}
const initialState: RequestTableState = {
  requests: [],
  selectRequest: null,
};

const requestTableSlice = createSlice({
  name: 'requestTable',
  initialState,
  reducers: {
    handleSelect: (state, action) => {
      if (state.selectRequest?.id === action.payload.id) {
        state.selectRequest = null;
        return;
      }
      state.selectRequest = action.payload;
    },
    appendRequest: (state, action: PayloadAction<RequestModel>) => {
      state.requests.push(action.payload);
    },
  },
});

export const { handleSelect, appendRequest } = requestTableSlice.actions;

export const requestTableReducer = requestTableSlice.reducer;

export const useSelectRequest = () => {
  return useSelector((state: RootState) => state.requestTable.selectRequest);
};
