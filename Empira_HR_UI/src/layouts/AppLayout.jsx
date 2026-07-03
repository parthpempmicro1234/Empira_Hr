import React, { useMemo, useState } from 'react';
import { Outlet } from 'react-router-dom';
import Header from '../components/Header.jsx';
import Sidebar from '../components/Sidebar.jsx';

function cx(...classes) {
  return classes.filter(Boolean).join(' ');
}

export default function AppLayout() {
  const headerHeight = 64;
  const sidebarCollapsedWidth = 84;

  const [mobileOpen, setMobileOpen] = useState(false);

  const styles = useMemo(
    () => ({
      main: {
        paddingTop: headerHeight,
        height: '100vh',
      },
    }),
    [headerHeight]
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Sidebar
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
        headerHeight={headerHeight}
      />

      <Header
        onOpenMobileSidebar={() => setMobileOpen(true)}
        headerHeight={headerHeight}
      />

      <div style={styles.main} className="flex lg:pl-[84px]">
        <main
          className={cx(
            'min-w-0 flex-1 overflow-y-auto',
            'w-full p-4 md:p-6 lg:p-8'
          )}
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
}

