import type { ReviewInput } from './purchases.schemas';

const NAMED_PRODUCTS = 5;

export interface ConfirmFacts {
  number: string;
  supplierName: string;
  newSupplier: boolean;
  kept: number;
  ignored: number;
  newProducts: string[];
  // Catalogue products whose cost this invoice sets
  costs: number;
}

// What "Valider" will write, read from the values on screen
export function confirmFacts(
  values: ReviewInput,
  cardName: string | null,
): ConfirmFacts {
  const kept = values.lines.filter((line) => !line.ignored);
  const costed = new Set(
    kept.flatMap((line) =>
      line.match !== 'new_product' && line.productId ? [line.productId] : [],
    ),
  );
  return {
    number: values.invoiceNumber.trim(),
    supplierName:
      values.supplier.id && cardName ? cardName : values.supplier.name.trim(),
    newSupplier: values.supplier.id === null,
    kept: kept.length,
    ignored: values.lines.length - kept.length,
    newProducts: kept.flatMap((line) =>
      line.match === 'new_product' && line.newProduct
        ? [line.newProduct.name.trim()]
        : [],
    ),
    costs: costed.size,
  };
}

// "d'Atlas Distribution", "de Maghreb Bureautique"
function ofSupplier(name: string): string {
  return /^[aeiouyàâäéèêëîïôöûüœ]/i.test(name) ? `d'${name}` : `de ${name}`;
}

export function confirmTitle({ number, supplierName }: ConfirmFacts): string {
  return `Valider l'achat ${number} ${ofSupplier(supplierName)} ?`;
}

export function ConfirmSummary({ facts }: { facts: ConfirmFacts }) {
  const { kept, ignored, newProducts, costs } = facts;
  const named = newProducts.slice(0, NAMED_PRODUCTS);
  const others = newProducts.length - named.length;
  return (
    <>
      <p>
        {kept > 1 ? `${kept} lignes enregistrées` : '1 ligne enregistrée'}
        {ignored > 0 && `, ${ignored} ${ignored > 1 ? 'ignorées' : 'ignorée'}`}.
      </p>
      {facts.newSupplier && (
        <p>{`Nouveau fournisseur : ${facts.supplierName}.`}</p>
      )}
      {newProducts.length > 0 && (
        <p>
          {newProducts.length > 1
            ? `${newProducts.length} nouveaux produits`
            : '1 nouveau produit'}
          {` : ${named.join(', ')}`}
          {others > 0 && ` et ${others} ${others > 1 ? 'autres' : 'autre'}`}.
        </p>
      )}
      {costs > 0 && (
        <p>
          {costs > 1
            ? `Les coûts de ${costs} produits sont mis à jour ; les prix de vente ne changent pas.`
            : "Le coût d'un produit est mis à jour ; son prix de vente ne change pas."}
        </p>
      )}
      <p className="font-semibold">Cette action ne peut pas être défaite.</p>
    </>
  );
}
