import Image from 'next/image';

export function LogoCard({ logoUrl }: { logoUrl: string | null }) {
  return (
    <section
      aria-labelledby="settings-logo"
      className="grid gap-3 rounded-md border border-line bg-card p-4"
    >
      <h2 id="settings-logo" className="caps text-pencil">
        Logo
      </h2>
      {logoUrl ? (
        <Image
          src={logoUrl}
          alt="Logo de la boutique"
          width={1673}
          height={480}
          unoptimized
          className="h-14 w-auto max-w-full justify-self-start"
        />
      ) : (
        <p className="text-pencil">Aucun logo.</p>
      )}
      <p className="text-xs text-pencil">
        Imprimé en haut de chaque devis, facture et avoir.
      </p>
    </section>
  );
}
