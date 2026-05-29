import Column from "@/components/common/Dashboard/Column";
// import CreateProjectDailog from "@/components/common/Dashboard/CreateProjectDailog";
import { DataTable } from "@/components/common/Dashboard/DataTable";
// import { Button } from "@/components/ui/button";
// import ProjectData from "@/data/ProjectDummyData.json";
import type { RootState } from "@/redux/store";
// import { Trash2 } from "lucide-react";
import { useSelector } from "react-redux";

const DashboardPage = () => {

  const {projects} = useSelector((state:RootState)=>state.Project)

  return (
    <div className="w-full max-w-6xl mx-auto py-6">
      <DataTable columns={Column} data={[...projects]} />
    </div>
  );
};

export default DashboardPage;
