import { createFileRoute } from '@tanstack/react-router';
import { Sequence } from './components/Sequence';
import { Structure } from './components/Structure';
import {
  ShowTypeSegmented,
  ShowTypeSegmentedStateContextProvider,
  useShowTypeSegmentedStateContext,
} from './components/ShowTypeSegmented';
import { RecordingStatusButton } from './components/RecordingStatusButton';
import { UseSelectRequestProvider } from './components/store/selectRequestStore';
export const Route = createFileRoute('/network/')({
  component: RouteComponent,
});

function InnerComponent() {
  const { state } = useShowTypeSegmentedStateContext();

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
      <UseSelectRequestProvider>
        <InnerComponent />
      </UseSelectRequestProvider>
    </ShowTypeSegmentedStateContextProvider>
  );
}
