import { RequestModel } from '@/api/models';
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface RequestTreeNode {
  id: number;
  record: RequestModel;
  children: Map<string, RequestTreeNode>;
}

type RequestTree = Map<string, RequestTreeNode>;

export interface RequestTreeState {
  requestTree: RequestTree;
  selectTreeNode: RequestTreeNode | null;
}
const initialState: RequestTreeState = {
  requestTree: new Map(),
  selectTreeNode: null,
};

const requestTreeSlice = createSlice({
  name: 'requestTree',
  initialState,
  reducers: {
    handleSelect: (state, action: PayloadAction<RequestTreeNode>) => {
      state.selectTreeNode = action.payload;
    },
    appendTreeNode: (state, action: PayloadAction<RequestModel>) => {
      const { uri } = action.payload;
      const parts = uri.split('/');
      let currentNode = state.requestTree;
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        if (!currentNode.has(part)) {
          currentNode.set(part, {
            id: i,
            record: action.payload,
            children: new Map(),
          });
        }
        currentNode = currentNode.get(part)!.children;
      }
    },
  },
});

export const { handleSelect, appendTreeNode } = requestTreeSlice.actions;

export const requestTreeReducer = requestTreeSlice.reducer;
