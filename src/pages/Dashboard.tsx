import Column from "@/components/common/Dashboard/Column";
import { DataTable } from "@/components/common/Dashboard/DataTable";
import ProjectData from "@/data/ProjectDummyData.json";

const DashboardPage = () => {
  return (
    <div className="w-full max-w-6xl mx-auto py-10">
      <DataTable columns={Column} data={ProjectData} />
    </div>
  );
};

export default DashboardPage;
