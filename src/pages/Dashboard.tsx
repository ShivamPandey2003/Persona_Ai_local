import { useEffect, useState } from "react";

import { getProjectList, PROJECTS_PAGE_SIZE } from "@/api/Projects/query";
import Column from "@/components/common/Dashboard/Column";
import { DataTable } from "@/components/common/Dashboard/DataTable";
import { useDebounce } from "@/hooks/useDebounce";

const DashboardPage = () => {
  const [search, setSearch] = useState("");
  const [pageIndex, setPageIndex] = useState(0);
  const debouncedSearch = useDebounce(search, 400);

  // A new search resets back to the first page.
  useEffect(() => {
    setPageIndex(0);
  }, [debouncedSearch]);

  const { data, isFetching } = getProjectList(
    debouncedSearch,
    pageIndex * PROJECTS_PAGE_SIZE,
    PROJECTS_PAGE_SIZE,
  );

  const projects = data?.response.projects ?? [];
  const pagination = data?.response.pagination;
  const total = pagination?.total ?? 0;
  const pageCount = pagination?.total_pages ?? 0;

  return (
    <div className="w-full max-w-6xl mx-auto py-6 p-4 md:p-4 duration-300 animate-in fade-in slide-in-from-bottom-1">
      <DataTable
        columns={Column}
        data={projects}
        search={search}
        onSearchChange={setSearch}
        pageIndex={pageIndex}
        pageCount={pageCount}
        total={total}
        pageSize={PROJECTS_PAGE_SIZE}
        onPageChange={setPageIndex}
        isFetching={isFetching}
      />
    </div>
  );
};

export default DashboardPage;
