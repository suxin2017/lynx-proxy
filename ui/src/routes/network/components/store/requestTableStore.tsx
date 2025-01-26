import { IRequestModel } from '@/api/models';
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface RequestTableState {
  requests: IRequestModel[];
}
const initialState: RequestTableState = {
  requests: [],
};

const requestTableSlice = createSlice({
  name: 'requestTable',
  initialState,
  reducers: {
    appendRequest: (state, action: PayloadAction<IRequestModel>) => {
      state.requests.push(action.payload);
    },
  },
});

export const { appendRequest } = requestTableSlice.actions;

export const requestTableReducer = requestTableSlice.reducer;
