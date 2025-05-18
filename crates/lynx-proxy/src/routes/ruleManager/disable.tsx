import { createFileRoute } from '@tanstack/react-router';
import { Splitter } from 'antd';
import { RuleTree } from './components/RuleTree';
import {
  RuleContentStateProvider,
  SelectedRuleProvider,
} from './components/store';
import { RuleContent } from './components/RuleContent';

export const Route = createFileRoute('/ruleManager/disable')({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <SelectedRuleProvider>
      <RuleContentStateProvider>
        <Splitter className="animate-fade-in">
          <Splitter.Panel defaultSize={200} min={80}>
            <RuleTree />
          </Splitter.Panel>
          <Splitter.Panel>
            <RuleContent />
          </Splitter.Panel>
        </Splitter>
      </RuleContentStateProvider>
    </SelectedRuleProvider>
  );
}
