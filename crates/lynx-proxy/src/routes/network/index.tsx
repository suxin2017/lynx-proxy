import { createFileRoute } from '@tanstack/react-router';
import { store } from './components/store';
import { Provider, useDispatch } from 'react-redux';
import { Sequence } from './components/Sequence';
import { useEffect } from 'react';
import { Structure } from './components/Structure';
import { fetchRequest } from '@/api/request';
import { appendRequest } from './components/store/requestTableStore';
import { appendTreeNode } from './components/store/requestTreeStore';
import {
  ShowTypeSegmented,
  ShowTypeSegmentedStateContextProvider,
  useShowTypeSegmentedStateContext,
} from './components/ShowTypeSegmented';
import { RecordingStatusButton } from './components/RecordingStatusButton';
export const Route = createFileRoute('/network/')({
  component: RouteComponent,
});

function InnerComponent() {
  const { state } = useShowTypeSegmentedStateContext();

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
  return (
    <div className="flex-1 flex flex-col h-full w-full">
      {state === 'Sequence' && (
        <div className="flex-1 flex flex-col h-full w-full animate-fade-in">
          <div className="flex items-center">
            <ShowTypeSegmented />
            <RecordingStatusButton />
          </div>
          <div className="flex-1">
            <Sequence />
          </div>
        </div>
      )}
      {state === 'Structure' && (
        <div className="flex-1 animate-fade-in">
          <Structure />
        </div>
      )}
    </div>
  );
}

function RouteComponent() {
  return (
    <ShowTypeSegmentedStateContextProvider>
      <Provider store={store}>
        <InnerComponent />
      </Provider>
    </ShowTypeSegmentedStateContextProvider>
  );
}
