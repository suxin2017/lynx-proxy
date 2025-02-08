import { createFileRoute } from '@tanstack/react-router';
import { Sequence } from './components/Sequence';
import { Structure } from './components/Structure';
import {
  ShowTypeSegmentedStateContextProvider,
  useShowTypeSegmentedStateContext
} from './components/ShowTypeSegmented';
import { UseSelectRequestProvider } from './components/store/selectRequestStore';
export const Route = createFileRoute('/network/')({
  component: RouteComponent,
});

function InnerComponent() {
  const { state } = useShowTypeSegmentedStateContext();

  return (
    <div className="flex-1 flex flex-col h-full w-full">
      {state === 'Sequence' && <Sequence />}
      {state === 'Structure' && <Structure />}
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
