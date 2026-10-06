'use client';

import { Fragment } from 'react';
import { CaretDownIcon, DotsThreeVerticalIcon } from '@phosphor-icons/react';
import {
  metaHelper,
  tableFeatures,
  useTable,
  type TableOptions,
} from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';

export interface ListColumnMeta {
  align?: 'end';
  className?: string;
}

export const listFeatures = tableFeatures({
  columnMeta: metaHelper<ListColumnMeta>(),
});
export type ListFeatures = typeof listFeatures;

export interface RowAction {
  label: string;
  onSelect: () => void;
  danger?: boolean;
}

export interface RowActions {
  label: string;
  items: RowAction[];
  // Shown instead of the menu when there is nothing to do
  note?: React.ReactNode;
}

export interface CardLines {
  title: React.ReactNode;
  titleEnd?: React.ReactNode;
  detail?: React.ReactNode;
  detailEnd?: React.ReactNode;
}

// The menu's clicks travel up the React tree to the row, portal or not
const INSIDE_CONTROL = 'button, a, input, [role="menuitem"]';

export function DataTable<TData extends { id: string }>({
  label,
  columns,
  data,
  onOpen,
  actions,
  card,
}: {
  label: string;
  columns: TableOptions<ListFeatures, TData>['columns'];
  data: TData[];
  onOpen?: (row: TData) => void;
  actions?: (row: TData) => RowActions;
  card: (row: TData) => CardLines;
}) {
  const table = useTable({
    features: listFeatures,
    columns,
    data,
    getRowId: (row) => row.id,
  });
  const rows = table.getRowModel().rows;

  return (
    <div className="min-w-0 rounded-md border border-line bg-card">
      <div className="hidden lg:block">
        <Table aria-label={label}>
          <TableHeader>
            {table.getHeaderGroups().map((group) => (
              <TableRow key={group.id} className="hover:bg-transparent">
                {group.headers.map((header) => {
                  const meta = header.column.columnDef.meta;
                  return (
                    <TableHead
                      key={header.id}
                      className={cn(
                        meta?.align === 'end' && 'text-right',
                        meta?.className,
                      )}
                    >
                      {header.isPlaceholder ? null : (
                        <table.FlexRender header={header} />
                      )}
                    </TableHead>
                  );
                })}
                {actions && (
                  <TableHead className="w-0">
                    <span className="sr-only">Actions</span>
                  </TableHead>
                )}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow
                key={row.id}
                className={cn(onOpen && 'cursor-pointer')}
                onClick={
                  onOpen &&
                  ((event) => {
                    if (!(event.target as Element).closest(INSIDE_CONTROL)) {
                      onOpen(row.original);
                    }
                  })
                }
              >
                {row.getAllCells().map((cell, index) => {
                  const meta = cell.column.columnDef.meta;
                  return (
                    <TableCell
                      key={cell.id}
                      className={cn(
                        meta?.align === 'end' && 'text-right',
                        meta?.className,
                      )}
                    >
                      {index === 0 && onOpen ? (
                        <button
                          type="button"
                          onClick={() => onOpen(row.original)}
                          className="cursor-pointer text-left font-semibold hover:underline"
                        >
                          <table.FlexRender cell={cell} />
                        </button>
                      ) : (
                        <table.FlexRender cell={cell} />
                      )}
                    </TableCell>
                  );
                })}
                {actions && (
                  <TableCell className="w-0 py-1 text-right">
                    <ActionsMenu {...actions(row.original)} />
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <ul aria-label={label} className="divide-y divide-line lg:hidden">
        {rows.map((row) => {
          const lines = card(row.original);
          const content = (
            <>
              <span className="flex items-center justify-between gap-3">
                <span className="min-w-0 truncate font-semibold">
                  {lines.title}
                </span>
                {lines.titleEnd}
              </span>
              {(lines.detail || lines.detailEnd) && (
                <span className="flex items-center justify-between gap-3 text-label text-pencil">
                  <span className="min-w-0 truncate">{lines.detail}</span>
                  <span className="text-ink tabular-nums">
                    {lines.detailEnd}
                  </span>
                </span>
              )}
            </>
          );
          return (
            <li key={row.id} className="flex items-center gap-1 pr-2">
              {onOpen ? (
                <button
                  type="button"
                  onClick={() => onOpen(row.original)}
                  className="grid min-w-0 flex-1 cursor-pointer grid-cols-1 gap-1 px-3 py-2.5 text-left tabular-nums hover:bg-hover-row"
                >
                  {content}
                </button>
              ) : (
                <div className="grid min-w-0 flex-1 grid-cols-1 gap-1 px-3 py-2.5 tabular-nums">
                  {content}
                </div>
              )}
              {actions && <ActionsMenu {...actions(row.original)} compact />}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// Not modal: a confirmation dialog opened from an item keeps the page clickable once it closes
function ActionsMenu({
  label,
  items,
  note,
  compact = false,
}: RowActions & { compact?: boolean }) {
  if (items.length === 0) {
    return note ?? null;
  }
  const firstDanger = items.findIndex((item) => item.danger);
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        {compact ? (
          <Button variant="ghost" size="icon-sm" aria-label={label}>
            <DotsThreeVerticalIcon weight="bold" />
          </Button>
        ) : (
          <Button
            variant="secondary"
            size="sm"
            aria-label={label}
            className="h-7 gap-1"
          >
            Actions
            <CaretDownIcon />
          </Button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent aria-label={label}>
        {items.map((item, index) => (
          <Fragment key={item.label}>
            {index === firstDanger && index > 0 && <DropdownMenuSeparator />}
            <DropdownMenuItem
              variant={item.danger ? 'danger' : 'default'}
              onSelect={item.onSelect}
            >
              {item.label}
            </DropdownMenuItem>
          </Fragment>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
