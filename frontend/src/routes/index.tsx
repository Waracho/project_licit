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

import BidderTendersNew from "../pages/BidderPages/BidderTendersNew/BidderTendersNew";
import BidderTendersList from "../pages/BidderPages/BidderTenderList/BidderTendersList";
import BidderHowToApply from "../pages/BidderPages/BidderTendersToApply/BidderTendersToApply";
import SignupPage from "../pages/LoginPage/SignupPage";
import WorkerChats from "../pages/WorkerPages/chats/WorkerChats";

export default function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<LoginPage />} />

        <Route element={<AuthedLayout />}>
          <Route path="/logged" element={<RoleLanding />} />
          <Route path="/signup" element={<SignupPage />} />

          {/* ADMIN */}
          <Route path="/admin" element={
            <RequireRole allow={["ADMIN"]}><AdminHome /></RequireRole>
          } />
          <Route path="/admin/departments" element={
            <RequireRole allow={["ADMIN"]}><AdminDepartments /></RequireRole>
          } />
          <Route path="/admin/users" element={
            <RequireRole allow={["ADMIN"]}><AdminUsers /></RequireRole>
          } />


          {/* BIDDER */}
          <Route
            path="/bidder"
            element={<RequireRole allow={["BIDDER"]}><BidderHome /></RequireRole>}
          />
          <Route
            path="/bidder/tenders"
            element={<RequireRole allow={["BIDDER"]}><BidderTenders /></RequireRole>}
          />
          <Route
            path="/bidder/tenders/new"
            element={<RequireRole allow={["BIDDER"]}><BidderTendersNew /></RequireRole>}
          />
          <Route
            path="/bidder/tenders/list"
            element={<RequireRole allow={["BIDDER"]}><BidderTendersList /></RequireRole>}
          />
          <Route
            path="/bidder/tenders/how-to"
            element={<RequireRole allow={["BIDDER"]}><BidderHowToApply /></RequireRole>}
          />


          {/* WORKER */}
          <Route path="/worker" element={
            <RequireRole allow={["WORKER"]}><WorkerHome /></RequireRole>
          } />
          <Route path="/worker/chats" element={
            <RequireRole allow={["WORKER"]}><WorkerChats /></RequireRole>
          }/>
          <Route path="/worker/departments" element={
            <RequireRole allow={["WORKER"]}><WorkerDepartments /></RequireRole>
          } />
        </Route>

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
