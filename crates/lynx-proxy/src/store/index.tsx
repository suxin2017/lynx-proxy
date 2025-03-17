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

export const store = configureStore({
  reducer: {
    requestTable: requestTableReducer,
    requestTree: requestTreeReducer,
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
      dispatch(appendRequest({ ...data.add }));
      dispatch(appendTreeNode({ ...data.add }));
    });
    return () => {
      controller.abort('Component unmounted');
    };
  }, [maxLogSize, clearLogSize, dispatch, requestLogCount]);
};
