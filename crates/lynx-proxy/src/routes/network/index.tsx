import { RequestContextMenuProvicer } from '@/components/RequestContextMenu';
import { useI18n } from '@/contexts';
import { createFileRoute } from '@tanstack/react-router';
import { Typography } from 'antd';
import { CommonCard } from '../settings/components/CommonCard';
import { CleanRequestButton } from './components/CleanRequestButton';
import { RecordingStatusButton } from './components/RecordingStatusButton';
import { Sequence } from './components/Sequence';
import {
  ShowTypeSegmented,
  ShowTypeSegmentedStateContextProvider,
  useShowTypeSegmentedStateContext,
} from './components/ShowTypeSegmented';
import { AutoScrollProvider } from './components/store/autoScrollStore';
import { Structure } from './components/Structure';
import { SearchRequestUrlInput } from './components/TableFilter';

const { Title } = Typography;

export const Route = createFileRoute('/network/')({
  component: RouteComponent,
});

function InnerComponent() {
  const { state } = useShowTypeSegmentedStateContext();
  const { t } = useI18n();

  return (
    <AutoScrollProvider>
      <RequestContextMenuProvicer>
        <CommonCard>
          <div className="flex h-full w-full flex-1 gap-2 flex-col overflow-hidden">
            <div className='flex items-center justify-between gap-2'>
              <Title level={4} style={{ margin: 0 }}>
                {t('network.title')}
              </Title>
              <div className='flex items-center gap-2'>
                <RecordingStatusButton />
                <CleanRequestButton />
              </div>
            </div>
            {/* ToolBar */}
            <div className='flex gap-2'>
              <SearchRequestUrlInput />
              <ShowTypeSegmented />
            </div>
            {state === 'Sequence' && <Sequence />}
            {state === 'Structure' && <Structure />}
          </div>
        </CommonCard>
      </RequestContextMenuProvicer>
    </AutoScrollProvider>

  );
}

function RouteComponent() {
  return (
    <ShowTypeSegmentedStateContextProvider>
      <InnerComponent />
    </ShowTypeSegmentedStateContextProvider>
  );
}
