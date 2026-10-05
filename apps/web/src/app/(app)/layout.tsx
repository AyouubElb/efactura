import { Suspense } from 'react';
import { FrameMenus, FrameMenusLoaded } from '@/components/frame/frame-menus';

// The frame never waits for the API: the menu shows at once, the names stream in
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col md:grid md:grid-cols-[220px_minmax(0,1fr)]">
      <Suspense fallback={<FrameMenus identity={null} />}>
        <FrameMenusLoaded />
      </Suspense>
      <main className="ruled min-w-0 flex-1 pt-4 pr-4 pb-8 pl-gutter-phone md:pt-6 md:pr-8 md:pl-gutter">
        {children}
      </main>
    </div>
  );
}
