"use client";

import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

export type DataTableColumn<T> = {
  key: keyof T;
  label: string;
  render?: (row: T) => ReactNode;
};

export function DataTable<T extends { id: string }>({
  columns,
  data,
  searchPlaceholder = "Buscar...",
  pageSize = 8,
  searchKeys,
}: {
  columns: Array<DataTableColumn<T>>;
  data: T[];
  searchPlaceholder?: string;
  pageSize?: number;
  searchKeys?: Array<keyof T>;
}) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    if (!query) return data;
    const keys = searchKeys ?? columns.map((col) => col.key);
    return data.filter((row) =>
      keys.some((key) => String(row[key] ?? "").toLowerCase().includes(query.toLowerCase()))
    );
  }, [columns, data, query, searchKeys]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageData = filtered.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <Input
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setPage(1);
          }}
          placeholder={searchPlaceholder}
          className="max-w-sm"
        />
        <div className="text-xs text-muted-foreground">
          {filtered.length} resultado(s)
        </div>
      </div>

      {pageData.length === 0 ? (
        <EmptyState
          title="Nada por aqui"
          description="Quando houver registros, eles aparecerão neste quadro."
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((col) => (
                <TableHead key={String(col.key)}>{col.label}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageData.map((row) => (
              <TableRow key={row.id}>
                {columns.map((col) => (
                  <TableCell key={String(col.key)}>
                    {col.render ? col.render(row) : String(row[col.key])}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <div className="flex items-center justify-between">
        <div className="text-xs text-muted-foreground">
          Página {page} de {totalPages}
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setPage((prev) => Math.max(1, prev - 1))}
            disabled={page === 1}
          >
            Anterior
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
            disabled={page === totalPages}
          >
            Próxima
          </Button>
        </div>
      </div>
    </div>
  );
}
