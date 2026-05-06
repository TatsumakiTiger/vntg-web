import { BrowserRouter, Routes, Route } from "react-router-dom";
import ScrollScene from "./ScrollScene";
import Dashboard from "./Dashboard";
import Onboarding from "./Onboarding";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ScrollScene />} />
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/dashboard" element={<Dashboard />} />
      </Routes>
    </BrowserRouter>
  );
}
