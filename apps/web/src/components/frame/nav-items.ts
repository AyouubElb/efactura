export interface NavItem {
  href: string;
  label: string;
  // Other sections it stands for: an avoir lives under Factures
  also?: string[];
}

export interface NavGroup {
  label?: string;
  adminOnly?: boolean;
  items: NavItem[];
}

// Hiding the Administration group is comfort: the API refuses its routes to a Collaborateur
export const NAV_GROUPS: NavGroup[] = [
  {
    items: [
      { href: '/dashboard', label: 'Tableau de bord' },
      { href: '/purchases', label: 'Achats' },
    ],
  },
  {
    label: 'Ventes',
    items: [
      { href: '/quotes', label: 'Devis' },
      { href: '/invoices', label: 'Factures', also: ['/credit-notes'] },
    ],
  },
  {
    label: 'Catalogue',
    items: [
      { href: '/products', label: 'Produits' },
      { href: '/clients', label: 'Clients' },
      { href: '/suppliers', label: 'Fournisseurs' },
    ],
  },
  {
    label: 'Administration',
    adminOnly: true,
    items: [
      { href: '/activity', label: 'Activité' },
      { href: '/team', label: 'Équipe' },
      { href: '/settings', label: 'Paramètres' },
    ],
  },
];
