import { createFileRoute } from '@tanstack/react-router';
import { RequestTable } from './components/RequestTable';
import { Detail } from './components/Detail';
import { Splitter } from 'antd';
import { store } from './components/store';
import { Provider } from 'react-redux';
export const Route = createFileRoute('/network/')({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <Provider store={store}>
      <Splitter className="h-full bg-white" layout="vertical">
        <Splitter.Panel defaultSize="50%" min="20%" max="70%">
          <RequestTable />
        </Splitter.Panel>
        <Splitter.Panel defaultSize="50%" min="20%" max="70%">
          <Detail />
        </Splitter.Panel>
      </Splitter>
    </Provider>
  );
}
