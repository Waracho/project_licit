import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "../pages/LoginPage/LoginPage";
import RoleLanding from "../pages/RoleLanding";
import AuthedLayout from "../layouts/AuthLayout";

import AdminHome from "../pages/AdminHome";
import BidderHome from "../pages/BidderHome";
import WorkerHome from "../pages/WorkerHome";
import BidderTenders from "../pages/BidderPages/BidderTenders";
import WorkerDepartments from "../pages/WorkerPages/WorkerDepartments";
import AdminDepartments from "../pages/AdminPages/AdminDepartments/AdminDepartments";
import AdminUsers from "../pages/AdminPages/AdminUsers/AdminUsers";
import RequireRole from "../features/auth/RequireRole";

export default function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<LoginPage />} />

        <Route element={<AuthedLayout />}>
          <Route path="/logged" element={<RoleLanding />} />

          <Route path="/admin" element={
            <RequireRole allow={["ADMIN"]}><AdminHome /></RequireRole>
          } />
          <Route path="/admin/departments" element={
            <RequireRole allow={["ADMIN"]}><AdminDepartments /></RequireRole>
          } />
          <Route path="/admin/users" element={
            <RequireRole allow={["ADMIN"]}><AdminUsers /></RequireRole>
          } />

          <Route path="/bidder" element={
            <RequireRole allow={["BIDDER"]}><BidderHome /></RequireRole>
          } />
          <Route path="/bidder/tenders" element={
            <RequireRole allow={["BIDDER"]}><BidderTenders /></RequireRole>
          } />

          <Route path="/worker" element={
            <RequireRole allow={["WORKER"]}><WorkerHome /></RequireRole>
          } />
          <Route path="/worker/departments" element={
            <RequireRole allow={["WORKER"]}><WorkerDepartments /></RequireRole>
          } />
        </Route>

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
