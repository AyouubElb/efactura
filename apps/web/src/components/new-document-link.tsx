import Link from 'next/link';
import { PlusIcon } from '@phosphor-icons/react/ssr';
import { Button } from '@/components/ui/button';

// The page's main action; below md the icon alone
export function NewDocumentLink({
  href,
  children,
}: {
  href: string;
  children: string;
}) {
  return (
    <Button asChild className="max-md:w-9 max-md:px-0">
      <Link href={href}>
        <PlusIcon />
        <span className="max-md:sr-only">{children}</span>
      </Link>
    </Button>
  );
}
