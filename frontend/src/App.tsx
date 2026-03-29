import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "@/components/Layout";
import ProjectOverview from "@/pages/ProjectOverview";
import FleetOverview from "@/pages/FleetOverview";
import UnitDetail from "@/pages/UnitDetail";
import AgentChat from "@/pages/AgentChat";
import DecisionTraces from "@/pages/DecisionTraces";
import DataAndModels from "@/pages/DataAndModels";
import SystemDesign from "@/pages/SystemDesign";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<ProjectOverview />} />
          <Route path="data" element={<DataAndModels />} />
          <Route path="design" element={<SystemDesign />} />
          <Route path="fleet" element={<FleetOverview />} />
          <Route path="units/:unitId" element={<UnitDetail />} />
          <Route path="chat" element={<AgentChat />} />
          <Route path="traces" element={<DecisionTraces />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
