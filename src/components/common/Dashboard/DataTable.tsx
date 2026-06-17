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
// import ColumnDropdown from "./ColumnDropdown";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import EmptyState from "@/components/common/EmptyState";
import {
  FolderOpen,
  LayoutGrid,
  Search,
  Table as TableIcon,
} from "lucide-react";
import ProjectCard from "./projectCard";
import { cn } from "@/lib/utils";
import CreateProjectDailog from "./CreateProjectDailog";
import EditProjectDialog from "./EditProjectDialog";
import DeleteDialog from "@/components/global/DeleteModal";
import { useDispatch, useSelector } from "react-redux";
import type { AppDispatch, RootState } from "@/redux/store";
import { setProjectDelete } from "@/redux/GlobalModalSlice";
import { DeleteProject } from "@/api/Projects/mutation";
import { useState } from "react";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  /** Controlled search term (server-side). */
  search: string;
  onSearchChange: (value: string) => void;
  /** Zero-based index of the current page. */
  pageIndex: number;
  /** Total number of pages reported by the backend. */
  pageCount: number;
  /** Total number of rows reported by the backend. */
  total: number;
  pageSize: number;
  onPageChange: (pageIndex: number) => void;
  /** True while a page/search request is in flight. */
  isFetching?: boolean;
}

/** Page indices to render around the current one, capped to `span` buttons. */
function pageWindow(pageIndex: number, pageCount: number, span = 5): number[] {
  if (pageCount <= 0) return [];
  const half = Math.floor(span / 2);
  let start = Math.max(0, pageIndex - half);
  const end = Math.min(pageCount - 1, start + span - 1);
  start = Math.max(0, end - span + 1);
  const pages: number[] = [];
  for (let i = start; i <= end; i++) pages.push(i);
  return pages;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  search,
  onSearchChange,
  pageIndex,
  pageCount,
  total,
  pageSize,
  onPageChange,
  isFetching,
}: DataTableProps<TData, TValue>) {
  const [content, setContent] = useState<"Table" | "Card">("Table");
  const { ProjectDelete } = useSelector(
    (state: RootState) => state.GlobalModal,
  );
  const isMobile = useIsMobile();
  const dispatch = useDispatch<AppDispatch>();
  const { mutate } = DeleteProject();

  // Pagination is server-driven, so react-table is used only to render columns.
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    pageCount,
  });

  const canPrev = pageIndex > 0;
  const canNext = pageIndex < pageCount - 1;
  const from = total === 0 ? 0 : pageIndex * pageSize + 1;
  const to = Math.min(total, (pageIndex + 1) * pageSize);

  return (
    <Tabs
      value={content}
      onValueChange={(e: string) => setContent(e as "Table" | "Card")}
      className="w-full space-y-6"
    >
      {/* HEADER CONTROLS BAR */}
      <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-4">
        {/* Search Input styled to match landing form boxes */}
        <div className="relative flex-1 max-w-md flex items-center bg-white rounded-lg border border-[#ECECEC] px-4 shadow-sm focus-within:border-[#6338F6]/50 transition-all">
          <Search size={18} className="text-[#6B7280] mr-2" />
          <Input
            placeholder="Find the project..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="h-10 border-none rounded-none focus-visible:ring-0 px-0 bg-transparent text-[#111827]"
          />
        </div>

        {/* Action Buttons Cluster */}
        <div className="flex items-center justify-end gap-3">
          <CreateProjectDailog />
          {/* Column selector temporarily hidden. */}
          {/* {content === "Table" && <ColumnDropdown table={table} />} */}

          <TabsList className="bg-[#F5F6FF] border border-[#E8ECFF] p-1 h-12 rounded-xl">
            <TabsTrigger
              value="Table"
              className="rounded-lg gap-2 cursor-pointer data-[state=active]:bg-white data-[state=active]:text-[#6338F6] data-[state=active]:shadow-sm text-[#4B5563]"
            >
              <TableIcon size={16} />
              <span className="hidden md:inline">Table</span>
            </TabsTrigger>
            <TabsTrigger
              value="Card"
              className="rounded-lg gap-2 cursor-pointer data-[state=active]:bg-white data-[state=active]:text-[#6338F6] data-[state=active]:shadow-sm text-[#4B5563]"
            >
              <LayoutGrid size={16} />
              <span className="hidden md:inline">Card</span>
            </TabsTrigger>
          </TabsList>
        </div>
      </div>

      {/* VIEWPORT AREA */}
      <TabsContent value="Table" className="mt-0 outline-none">
        <div className="bg-white rounded-lg border border-white/60 shadow-[0_15px_50px_rgba(99,56,246,0.04)] overflow-hidden">
          <Table
            data-test-id="DASHBOARD"
            containerClassName="max-h-[60vh] overflow-y-auto"
          >
            <TableHeader className="sticky top-0 z-20 bg-gradient-to-br from-[#eef1ff] via-[#f8f9ff] to-[#e8ecff] border-b border-[#F1F1F1] [&_tr]:bg-transparent">
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow
                  key={headerGroup.id}
                  className="hover:bg-transparent border-none"
                >
                  {headerGroup.headers.map((header) => (
                    <TableHead
                      key={header.id}
                      className="h-14 text-xs font-semibold tracking-wider text-[#4B5563] uppercase first:pl-8 last:pr-8"
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {isFetching && data.length === 0 ? (
                // Skeleton rows on the first load (keepPreviousData covers paging).
                Array.from({ length: 6 }).map((_, rowIdx) => (
                  <TableRow
                    key={`skeleton-${rowIdx}`}
                    className="border-b border-[#F1F1F1] last:border-none"
                  >
                    {Array.from({ length: columns.length }).map(
                      (__, cellIdx) => (
                        <TableCell
                          key={cellIdx}
                          className="py-4 first:pl-8 last:pr-8"
                        >
                          <Skeleton className="h-4 w-full max-w-[180px]" />
                        </TableCell>
                      ),
                    )}
                  </TableRow>
                ))
              ) : table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row, index) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && "selected"}
                    style={{
                      animationDelay: `${Math.min(index, 12) * 30}ms`,
                      animationFillMode: "backwards",
                    }}
                    className="border-b border-[#F1F1F1] last:border-none hover:bg-[#F8F9FF]/50 transition-colors duration-200 animate-in fade-in slide-in-from-bottom-1"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell
                        key={cell.id}
                        className="py-4 text-sm text-[#111827] first:pl-8 last:pr-8"
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={columns.length} className="p-0">
                    <EmptyState
                      icon={<FolderOpen className="h-6 w-6" />}
                      title="No projects found"
                      description={
                        search
                          ? "Try a different search term."
                          : "Create your first project to start building personas."
                      }
                    />
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </TabsContent>

      <TabsContent value="Card" className="mt-0 outline-none">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {isFetching && data.length === 0 ? (
            Array.from({ length: 6 }).map((_, i) => (
              <div
                key={`card-skeleton-${i}`}
                className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-6"
              >
                <Skeleton className="h-5 w-2/3" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-4/5" />
                <div className="flex gap-2 pt-1">
                  <Skeleton className="h-6 w-20 rounded-full" />
                  <Skeleton className="h-6 w-24 rounded-full" />
                </div>
              </div>
            ))
          ) : data.length === 0 ? (
            <div className="col-span-full">
              <EmptyState
                icon={<FolderOpen className="h-6 w-6" />}
                title="No projects found"
                description={
                  search
                    ? "Try a different search term."
                    : "Create your first project to start building personas."
                }
              />
            </div>
          ) : (
            table
              .getRowModel()
              .rows.map((p, index) => (
                <ProjectCard
                  key={p.id}
                  project={p.original as any}
                  index={index}
                />
              ))
          )}
        </div>
      </TabsContent>

      {/* PAGINATION CONTROLS */}
      <div className="flex items-center justify-between border-t border-[#F1F1F1] pt-4">
        <div className="text-sm text-[#6B7280]">
          {isMobile ? (
            <span>
              Page {pageIndex + 1} of {Math.max(pageCount, 1)}
            </span>
          ) : (
            <span>
              {total === 0
                ? "No projects"
                : `Showing ${from}–${to} of ${total} projects`}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(pageIndex - 1)}
            disabled={!canPrev || isFetching}
            className="rounded-lg px-4 h-10 border-[#ECECEC] text-[#4B5563] hover:text-[#6338F6]"
          >
            Previous
          </Button>

          {!isMobile &&
            pageWindow(pageIndex, pageCount, 3).map((num) => (
              <Button
                key={num}
                size="sm"
                variant={pageIndex === num ? "default" : "outline"}
                onClick={() => onPageChange(num)}
                disabled={isFetching}
                className={cn(
                  "w-10 h-10 rounded-lg font-medium transition-all",
                  pageIndex === num
                    ? "bg-gradient-to-r from-[#6338F6] to-[#8B5CF6] text-white shadow-md shadow-[#6338F6]/10"
                    : "border-[#ECECEC] text-[#4B5563] hover:bg-[#F5F6FF]",
                )}
              >
                {num + 1}
              </Button>
            ))}

          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(pageIndex + 1)}
            disabled={!canNext || isFetching}
            className="rounded-lg px-4 h-10 border-[#ECECEC] text-[#4B5563] hover:text-[#6338F6]"
          >
            Next
          </Button>
        </div>
      </div>
      <DeleteDialog
        open={ProjectDelete !== null}
        setOpen={() => dispatch(setProjectDelete(null))}
        onClick={() => mutate({ project_id: ProjectDelete as string })}
      />
      <EditProjectDialog />
    </Tabs>
  );
}
