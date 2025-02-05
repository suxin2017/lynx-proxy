import { createFileRoute } from '@tanstack/react-router';
import { Splitter } from 'antd';
import { RuleTree } from './components/RuleTree';
import { RuleEditor } from './components/RuleEditor';
import { SelectedRuleProvider } from './components/store';

export const Route = createFileRoute('/ruleManager/')({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <SelectedRuleProvider>
      <Splitter>
        <Splitter.Panel defaultSize={200} min={80}>
          <RuleTree />
        </Splitter.Panel>
        <Splitter.Panel>
          <RuleEditor />
        </Splitter.Panel>
      </Splitter>
    </SelectedRuleProvider>
  );
}
