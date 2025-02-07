import { configureStore } from '@reduxjs/toolkit';
import { appendTreeNode, requestTreeReducer } from './requestTreeStore';
import { appendRequest, requestTableReducer } from './requestTableStore';
import { fetchRequest } from '@/api/request';
import { useEffect } from 'react';
import { useDispatch } from 'react-redux';

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
  const dispatch = useDispatch();

  useEffect(() => {
    const controller = fetchRequest((data) => {
      dispatch(appendRequest({ ...data.add }));
      dispatch(appendTreeNode({ ...data.add }));
    });
    return () => {
      controller.abort('Component unmounted');
    };
  }, [dispatch]);
};
