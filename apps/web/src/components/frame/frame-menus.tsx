import { getMe } from '@/features/auth/auth.queries';
import { ROLE_LABELS } from '@/features/auth/auth.types';
import { getSettings } from '@/features/settings/settings.queries';
import { MenuContent, type FrameIdentity } from './menu-content';
import { PhoneMenu } from './phone-menu';

export function FrameMenus({ identity }: { identity: FrameIdentity | null }) {
  return (
    <>
      <aside className="sticky top-0 hidden h-dvh overflow-y-auto border-r border-line bg-card px-3 py-4 text-sm md:block">
        <MenuContent identity={identity} />
      </aside>
      <PhoneMenu identity={identity} />
    </>
  );
}

// Who is logged in comes from the API each time the frame is drawn, never from a cookie
export async function FrameMenusLoaded() {
  const [me, settings] = await Promise.all([getMe(), getSettings()]);
  return (
    <FrameMenus
      identity={{
        fullName: me.fullName,
        roleLabel: ROLE_LABELS[me.role],
        isAdmin: me.role === 'admin',
        shopName: settings.identity?.legalName ?? null,
      }}
    />
  );
}
