import { Logo } from '@/components/logo';
import { Skeleton } from '@/components/ui/skeleton';
import { LogoutButton } from './logout-button';
import { NavLinks } from './nav-links';

export interface FrameIdentity {
  fullName: string;
  roleLabel: string;
  isAdmin: boolean;
  shopName: string | null;
}

// null while the API answers: the menu is usable at once, the names follow
export function MenuContent({
  identity,
  onNavigate,
}: {
  identity: FrameIdentity | null;
  onNavigate?: () => void;
}) {
  return (
    <div className="flex min-h-full flex-col gap-3">
      <div className="grid gap-2 px-2">
        <Logo />
        {identity ? (
          identity.shopName && (
            <span className="text-xs text-pencil">{identity.shopName}</span>
          )
        ) : (
          <Skeleton className="w-28" />
        )}
      </div>
      <NavLinks isAdmin={identity?.isAdmin ?? false} onNavigate={onNavigate} />
      <div className="mt-auto grid gap-0.5 border-t border-line px-2 pt-3">
        {identity ? (
          <>
            <span className="font-semibold">{identity.fullName}</span>
            <span className="text-xs text-pencil">{identity.roleLabel}</span>
            <LogoutButton />
          </>
        ) : (
          <div className="grid gap-2">
            <Skeleton className="w-32" />
            <Skeleton className="w-24" />
          </div>
        )}
      </div>
    </div>
  );
}
