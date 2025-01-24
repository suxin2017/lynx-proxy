import * as React from 'react';
import { Outlet, createRootRoute } from '@tanstack/react-router';
import { Layout } from 'antd';

export const Route = createRootRoute({
  component: RootComponent,
});

function RootComponent() {
  return (
    <React.Fragment>
      <Layout className="h-screen">
        {/* <SideBar /> */}
        <Layout>
          <Layout.Content>
            <Outlet />
          </Layout.Content>
        </Layout>
      </Layout>
    </React.Fragment>
  );
}
