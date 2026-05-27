import Navbar from "@/components/global/Navbar";
// import React from "react";
import { Outlet } from "react-router";

const Rootlayout = () => {
  return (
    <div>
      <Navbar />
      <div className="mx-4 md:mx-10">
      <Outlet />
      </div>
    </div>
  );
};

export default Rootlayout;
