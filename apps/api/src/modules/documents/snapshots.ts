import type { Client, ShopSettings } from '../../generated/prisma/client.js';
import type { ClientSnapshotDto, ShopSnapshotDto } from './dto/snapshot.dto.js';

export type ClientSnapshot = ClientSnapshotDto;
export type ShopSnapshot = ShopSnapshotDto;

// Taken at send: the document never reads the client again
export function clientSnapshot(client: Client): ClientSnapshot {
  return {
    type: client.type,
    name: client.name,
    ice: client.ice,
    address: client.address,
    city: client.city,
    email: client.email,
    phone: client.phone,
    paymentDays: client.paymentDays,
  };
}

// Taken at send: a new RIB or logo never reaches old documents
export function shopSnapshot(settings: ShopSettings): ShopSnapshot {
  return {
    legalName: settings.legalName,
    address: settings.address,
    city: settings.city,
    phone: settings.phone,
    email: settings.email,
    ice: settings.ice,
    ifNumber: settings.ifNumber,
    tpNumber: settings.tpNumber,
    rcNumber: settings.rcNumber,
    rcCity: settings.rcCity,
    bankName: settings.bankName,
    rib: settings.rib,
    logoKey: settings.logoKey,
  };
}
