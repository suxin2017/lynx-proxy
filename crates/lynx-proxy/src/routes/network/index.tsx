import { createFileRoute } from '@tanstack/react-router';
import { Sequence } from './components/Sequence';
import { Structure } from './components/Structure';
import {
  ShowTypeSegmentedStateContextProvider,
  useShowTypeSegmentedStateContext,
} from './components/ShowTypeSegmented';
export const Route = createFileRoute('/network/')({
  component: RouteComponent,
});

function InnerComponent() {
  const { state } = useShowTypeSegmentedStateContext();

  return (
    <div className="flex h-full w-full flex-1 flex-col overflow-hidden">
      {state === 'Sequence' && <Sequence />}
      {state === 'Structure' && <Structure />}
    </div>
  );
}

function RouteComponent() {
  return (
    <ShowTypeSegmentedStateContextProvider>
      <InnerComponent />
    </ShowTypeSegmentedStateContextProvider>
  );
}
