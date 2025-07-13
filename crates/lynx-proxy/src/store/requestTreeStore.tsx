import { createSlice, nanoid, PayloadAction } from '@reduxjs/toolkit';
import { last } from 'lodash';
import { IViewMessageEventStoreValue, RootState } from './useSortPoll';
import { useSelector } from 'react-redux';

export interface IRequestTreeNode {
  id: string;
  name: string;
  record?: IViewMessageEventStoreValue;
  children: IRequestTreeNode[];
}

export type IRequestTree = IRequestTreeNode[];

export interface RequestTreeState {
  requestTree: IRequestTree;
}
const initialState: RequestTreeState = {
  requestTree: [],
};

const dfsFind = (
  tree: IRequestTree,
  id: string,
  callback: (node: IRequestTreeNode) => void,
) => {
  for (const node of tree) {
    callback(node);
    if (node.children.length > 0) {
      dfsFind(node.children, id, callback);
    }
  }
};

const dfsFilter = (
  tree: IRequestTree,
  callback: (node: IRequestTreeNode) => boolean,
): IRequestTree => {
  return tree
    .filter(callback)
    .map((node) => {
      const children = dfsFilter(node.children, callback);
      return {
        ...node,
        children,
      };
    })
    .filter((node) => {
      if (node.record) {
        return true;
      }
      return node?.children?.length > 0;
    });
};

const requestTreeSlice = createSlice({
  name: 'requestTree',
  initialState,
  reducers: {
    clearRequestTree: () => initialState,
    insertOrUpdateTreeNode: (
      state,
      action: PayloadAction<IViewMessageEventStoreValue[]>,
    ) => {
      action.payload.forEach((requestValue) => {
        let found = false;
        // 查找并更新节点
        dfsFind(state.requestTree, requestValue.traceId, (node) => {
          if (node.record?.traceId === requestValue.traceId) {
            node.record = requestValue;
            found = true;
          }
        });
        // 未找到则插入新节点
        if (!found) {
          const { request } = requestValue;
          const uri = request?.url || '';
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
                name: part === '' ? '/' : part,
                record: requestValue,
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
        }
      });
    },
    replaceTreeNode: (
      state,
      action: PayloadAction<IViewMessageEventStoreValue[] | undefined>,
    ) => {
      const nodes = action.payload;
      nodes?.forEach((requestValue) => {
        dfsFind(state.requestTree, requestValue.traceId, (node) => {
          if (node.record?.traceId === requestValue.traceId) {
            node.record = requestValue;
          }
        });
      });
    },
    appendTreeNode: (
      state,
      action: PayloadAction<IViewMessageEventStoreValue[] | undefined>,
    ) => {
      action.payload?.forEach((requestValue) => {
        const { request } = requestValue;
        const uri = request?.url || '';
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
              name: part === '' ? '/' : part,
              record: requestValue,
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
      });
    },
  },
});

export const useTreeData = () => {
  return useSelector((state: RootState) => {
    return dfsFilter(state.requestTree.requestTree, (node) => {

      if (!node.record) {
        return true;
      }
      if (
        state.requestTable.filterUri &&
        !node.record?.request?.url?.includes(state.requestTable.filterUri)
      ) {
        return false;
      }

      if (!state.requestTable.filterMimeType.length) {
        return true;
      }
      const mimeType = node.record.response?.headers?.['content-type'] || '';

      if (
        !state.requestTable.filterMimeType.some((type) =>
          mimeType.includes(type),
        )
      ) {
        return false;
      }

      return true;
    });
  });
};

export const { appendTreeNode, insertOrUpdateTreeNode, replaceTreeNode, clearRequestTree } =
  requestTreeSlice.actions;

export const requestTreeReducer = requestTreeSlice.reducer;
