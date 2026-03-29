import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "@/components/Layout";
import ProjectOverview from "@/pages/ProjectOverview";
import FleetOverview from "@/pages/FleetOverview";
import UnitDetail from "@/pages/UnitDetail";
import AgentChat from "@/pages/AgentChat";
import DecisionTraces from "@/pages/DecisionTraces";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<ProjectOverview />} />
          <Route path="fleet" element={<FleetOverview />} />
          <Route path="units/:unitId" element={<UnitDetail />} />
          <Route path="chat" element={<AgentChat />} />
          <Route path="traces" element={<DecisionTraces />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
