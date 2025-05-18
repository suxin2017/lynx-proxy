import { createFileRoute } from '@tanstack/react-router';
import { GeneralSetting } from './components/GeneralSetting';

export const Route = createFileRoute('/settings/general')({
  component: GeneralSetting,
});
