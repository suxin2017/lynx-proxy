import { IRequestModel } from '@/api/models';
import { createSlice, nanoid, PayloadAction } from '@reduxjs/toolkit';
import { last } from 'lodash';

export interface IRequestTreeNode {
  id: string;
  name: string;
  record?: IRequestModel;
  children: IRequestTreeNode[];
}

export type IRequestTree = IRequestTreeNode[];

export interface RequestTreeState {
  requestTree: IRequestTree;
  nodeMap: Record<string, IRequestTreeNode>;
}
const initialState: RequestTreeState = {
  requestTree: [],
  nodeMap: {},
};

const requestTreeSlice = createSlice({
  name: 'requestTree',
  initialState,
  reducers: {
    clearRequestTree: () => initialState,
    appendTreeNode: (state, action: PayloadAction<IRequestModel>) => {
      const { uri } = action.payload;
      const schemaIndex = uri.indexOf('://');
      const schema = uri.slice(0, schemaIndex + 3);
      const parts = uri
        .slice(schemaIndex + 3)
        .split('/')
        .map((part, index) => (index === 0 ? schema + part : part));

      const lastPart = last(parts)?.split('?')?.[0];
      parts[parts.length - 1] = lastPart || '';

      let currentNode = state.requestTree;
      let currentPath = '';
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        currentPath += `/${part}`;
        const isEndNode = i === parts.length - 1;
        if (isEndNode) {
          const newNode: IRequestTreeNode = {
            id: nanoid(),
            name: part === "" ? "/" : part,
            record: action.payload,
            children: [],
          };
          currentNode.push(newNode);
        } else {
          const node = currentNode.find((n) => n.id === currentPath);
          if (!node) {
            const newNode: IRequestTreeNode = {
              id: currentPath,
              name: part,
              record: undefined,
              children: [],
            };
            currentNode.push(newNode);
            currentNode = newNode.children;
          } else {
            currentNode = node?.children || [];
          }
        }
      }
    },
  },
});

export const { appendTreeNode, clearRequestTree } = requestTreeSlice.actions;

export const requestTreeReducer = requestTreeSlice.reducer;
