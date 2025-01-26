import { IRequestModel } from '@/api/models';
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { useSelector } from 'react-redux';
import { RootState } from '.';

export interface SelectRequestState {
  selectRequest: IRequestModel | null;
}
const initialState: SelectRequestState = {
  selectRequest: null,
};

const selectRequestSlice = createSlice({
  name: 'selectRequest',
  initialState,
  reducers: {
    handleSelect: (
      state,
      action: PayloadAction<SelectRequestState['selectRequest']>,
    ) => {
      if (state.selectRequest?.id === action.payload?.id) {
        state.selectRequest = null;
        return;
      }
      state.selectRequest = action.payload;
    },
  },
});

export const { handleSelect } = selectRequestSlice.actions;

export const selectRequestReducer = selectRequestSlice.reducer;

export const useSelectRequest = () => {
  return useSelector((state: RootState) => state.selectRequest.selectRequest);
};
