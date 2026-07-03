import React from 'react';
import { Outlet } from 'react-router-dom';

export default function AuthenticatedLayout() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto w-full max-w-6xl px-6 py-8">
        <div className="mb-6 rounded-2xl border border-border/60 bg-card/70 p-4 backdrop-blur">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold tracking-tight">EMPIRA</div>
            <div className="text-xs text-muted-foreground">Authenticated area</div>
          </div>
        </div>
        <Outlet />
      </div>
    </div>
  );
}

