import { createBrowserRouter } from "react-router";
import ProtectedRoute from "./ProtectedRoute";
import LoginPage from "@/pages/Login";
import SignupPage from "@/pages/Signup";
import ChatPage from "@/pages/Chat";
import Rootlayout from "@/layout/rootlayout";
import DashboardPage from "@/pages/Dashboard";

const Router = createBrowserRouter([
  {
    path: "/login",
    element: <ProtectedRoute element={<LoginPage />} reverse />,
  },
  {
    path: "/sign-up",
    element: <ProtectedRoute element={<SignupPage />} reverse />,
  },
  {
    path:"/chat/:id",
    element:<ChatPage/>
  },
  {
    path:"/",
    element:<Rootlayout/>,
    children:[{
      index:true,
      element:<DashboardPage/>
    }]
  }
]);

export default Router;
