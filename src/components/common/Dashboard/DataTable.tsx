import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useState } from "react";
import ColumnDropdown from "./ColumnDropdown";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LayoutGrid, Search, Table as TableIcon } from "lucide-react";
import ProjectCard from "./projectCard";
import { cn } from "@/lib/utils";
import CreateProjectDailog from "./CreateProjectDailog";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
}

export function DataTable<TData, TValue>({
  columns,
  data,
}: DataTableProps<TData, TValue>) {
  const [content, setContent] = useState<"Table" | "Card">("Table");
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
  });
  const isMobile = useIsMobile();

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    pageCount: 1,
    state: {
      pagination,
    },

    onPaginationChange: setPagination,
  });

  return (
    <Tabs
      value={content}
      onValueChange={(e: string) => setContent(e as "Table" | "Card")}
    >
      <div className={cn("h-full max-h-full")}>
        <div className="flex flex-col-reverse md:flex-row items-end md:items-center justify-between mb-2 gap-2">
          <div className="w-full md:w-1/4 border flex items-center pr-2 bg-white">
            <Input
              placeholder="Find the project..."
              value={""}
              onChange={() => {}}
              className="rounded-none border-none focus-visible:ring-0"
            />
            <Search className="text-primary" />
          </div>
          <div className="flex items-center gap-2">
            <CreateProjectDailog />
              {content === "Table" && <ColumnDropdown table={table} />}
              <TabsList>
                <TabsTrigger value="Table">
                  <TableIcon />
                  <span>Table</span>
                </TabsTrigger>
                <TabsTrigger value="Card">
                  <LayoutGrid />
                  <span>Card</span>
                </TabsTrigger>
              </TabsList>
          </div>
        </div>
        <TabsContent value="Table">
          <div className="overflow-hidden rounded-md border mb-2">
            <Table>
              <TableHeader className="bg-muted">
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => {
                      return (
                        <TableHead key={header.id}>
                          {header.isPlaceholder
                            ? null
                            : flexRender(
                                header.column.columnDef.header,
                                header.getContext(),
                              )}
                        </TableHead>
                      );
                    })}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows?.length ? (
                  table.getRowModel().rows.map((row) => (
                    <TableRow
                      key={row.id}
                      data-state={row.getIsSelected() && "selected"}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id}>
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext(),
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={columns.length}
                      className="h-24 text-center"
                    >
                      No results.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
        <TabsContent value="Card">
          <div className="overflow-hidden mb-2">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {table.getRowModel().rows.map((p) => (
                <ProjectCard key={p.id} project={p.original as project} />
              ))}
            </div>
          </div>
        </TabsContent>
        <div className="flex items-center justify-center md:justify-end gap-4">
          <Button
            size={"sm"}
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            className="w-20"
          >
            Previous
          </Button>

          {!isMobile &&
            Array.from(
              { length: table.getPageCount() },
              (_, i) => pagination.pageIndex + i,
            ).map((num) => {
              return (
                <Button
                  key={num}
                  size={"sm"}
                  variant={pagination.pageIndex === num ? "default" : "outline"}
                >
                  {num + 1}
                </Button>
              );
            })}

          {isMobile && (
            <span className="text-sm">
              Page {pagination.pageIndex + 1} of {table.getPageCount()}
            </span>
          )}

          <Button
            size={"sm"}
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            className="w-20"
          >
            Next
          </Button>
        </div>
      </div>
    </Tabs>
  );
}
