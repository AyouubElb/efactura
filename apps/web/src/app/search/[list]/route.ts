import type { NextRequest } from 'next/server';
import type { Client } from '@/features/clients/clients.types';
import type { ProductOption } from '@/features/documents/documents.types';
import type { Product } from '@/features/products/products.types';
import type {
  Supplier,
  SupplierOption,
} from '@/features/suppliers/suppliers.types';
import { apiRead } from '@/lib/api-server';

const MAX_TEXT = 100;
const ROWS = 8;

// The pickers' search as you type: the one read the browser asks for by itself
export async function GET(
  request: NextRequest,
  ctx: RouteContext<'/search/[list]'>,
) {
  const { list } = await ctx.params;
  const text = (request.nextUrl.searchParams.get('text') ?? '')
    .trim()
    .slice(0, MAX_TEXT);
  const query = new URLSearchParams({ pageSize: String(ROWS) });
  if (text) {
    query.set('search', text);
  }

  switch (list) {
    case 'clients': {
      const result = await apiRead<Client[]>(`/clients?${query}`);
      return result.ok
        ? Response.json({ items: result.data })
        : failed(result.error.statusCode);
    }
    case 'products': {
      const result = await apiRead<Product[]>(`/products?${query}`);
      return result.ok
        ? Response.json({ items: result.data.map(productOption) })
        : failed(result.error.statusCode);
    }
    case 'suppliers': {
      const result = await apiRead<Supplier[]>(`/suppliers?${query}`);
      return result.ok
        ? Response.json({ items: result.data.map(supplierOption) })
        : failed(result.error.statusCode);
    }
    default:
      return Response.json({ error: 'Liste inconnue.' }, { status: 404 });
  }
}

function productOption(product: Product): ProductOption {
  return {
    id: product.id,
    name: product.name,
    reference: product.reference,
    unit: product.unit,
    priceHtCentimes: product.priceHtCentimes,
    tvaRateBp: product.tvaRateBp,
  };
}

function supplierOption({ id, name, ice, city }: Supplier): SupplierOption {
  return { id, name, ice, city };
}

function failed(statusCode: number) {
  return statusCode === 401
    ? Response.json(
        { error: 'Votre session a pris fin. Rechargez la page.' },
        { status: 401 },
      )
    : Response.json(
        { error: 'La recherche ne répond pas. Réessayez dans un instant.' },
        { status: 503 },
      );
}
