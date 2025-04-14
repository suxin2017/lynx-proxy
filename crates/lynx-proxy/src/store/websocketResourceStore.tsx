import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { WebSocketLog } from '@/WebSocketLog';
import { get } from 'lodash';
import { useSelector } from 'react-redux';
import { RootState } from '.';
import { useMemo } from 'react';

export interface WebSocketRequestState {
  [key: string]: WebSocketLog[];
}
const initialState: WebSocketRequestState = {};

const websocketResourceSlice = createSlice({
  name: 'websocketResourceStore',
  initialState,
  reducers: {
    clear: () => initialState,
    appendLog: (state, action: PayloadAction<WebSocketLog>) => {
      if (state[action.payload.traceId] === undefined) {
        state[action.payload.traceId] = [];
      }
      state[action.payload.traceId].push(action.payload);
    },
    removeOldRequest: (state, action: PayloadAction<{ traceId: string }>) => {
      delete state[action.payload.traceId];
    },
  },
});

export const { clear, appendLog, removeOldRequest } =
  websocketResourceSlice.actions;

export const useWebSocketResourceByTraceId = (traceId?: string) => {
  const websocketResource = useSelector(
    (state: RootState) => state.websocketResource,
  );
  return useMemo(() => {
    if (!traceId) {
      return [];
    }
    return get(websocketResource, traceId, []);
  }, [traceId, websocketResource]);
};


export const websocketResourceReducer = websocketResourceSlice.reducer;
