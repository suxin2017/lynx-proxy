import { configureStore } from '@reduxjs/toolkit';
import { appendTreeNode, requestTreeReducer } from './requestTreeStore';
import {
  appendRequest,
  removeOldRequest,
  requestTableReducer,
  useRequestLogCount,
} from './requestTableStore';
import { fetchRequest } from '@/api/request';
import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { useGetAppConfig } from '@/api/app';
import { appendLog, websocketResourceReducer } from './websocketResourceStore';

export const store = configureStore({
  reducer: {
    requestTable: requestTableReducer,
    requestTree: requestTreeReducer,
    websocketResource: websocketResourceReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({ serializableCheck: false }),
});

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>;
// Inferred type: {posts: PostsState, comments: CommentsState, users: UsersState}
export type AppDispatch = typeof store.dispatch;

export const useUpdateRequestLog = () => {
  const { data: appConfigData } = useGetAppConfig();
  const dispatch = useDispatch();
  const requestLogCount = useRequestLogCount();
  const { maxLogSize = 1000, clearLogSize = 100 } = appConfigData?.data ?? {};

  useEffect(() => {
    const controller = fetchRequest((data) => {
      if (requestLogCount >= maxLogSize) {
        dispatch(
          removeOldRequest({
            maxLogSize,
            clearLogSize,
          }),
        );
      }

      if ('request' in data) {
        dispatch(appendRequest({ ...data.request }));
        dispatch(appendTreeNode({ ...data.request }));
      }
      if ('webSocket' in data) {
        dispatch(appendLog(data.webSocket));
      }
    });
    return () => {
      controller.abort('Component unmounted');
    };
  }, []);
};
