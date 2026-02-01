import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import VehicleDetail from "./pages/VehicleDetail";
import AddVehicle from "./pages/AddVehicle";
import AddRecord from "./pages/AddRecord";
import EditRecord from "./pages/EditRecord";
import ScanQRDebug from "./pages/ScanQRDebug";
import VehicleSearch from "./pages/VehicleSearch";
import VehicleList from "./pages/VehicleList";
import EditVehicle from "./pages/EditVehicle";
import SelectAction from "./pages/SelectAction";
import ServiceRecordDetail from "./pages/ServiceRecordDetail";
import VehicleSummary from "./pages/VehicleSummary";
import PlannedMaintenance from "./pages/PlannedMaintenance";
import Notifications from "./pages/Notifications";
import FaultDetection from "./pages/FaultDetection";
import FaultPrediction from "./pages/FaultPrediction";
import QRManagement from "./pages/QRManagement";
import AdminPanel from "./pages/AdminPanel";
import TechnicianManagement from "./pages/TechnicianManagement";
import AISettings from "./pages/AISettings";
import StorageSettings from "./pages/StorageSettings";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/vehicle/:id" element={<VehicleDetail />} />
          <Route path="/add-vehicle" element={<AddVehicle />} />
          <Route path="/add-record/:vehicleId" element={<AddRecord />} />
          <Route path="/scan" element={<ScanQRDebug />} />
          <Route path="/vehicle-search" element={<VehicleSearch />} />
          <Route path="/vehicles" element={<VehicleList />} />
          <Route path="/qr-management" element={<QRManagement />} />
          <Route path="/admin-panel" element={<AdminPanel />} />
          <Route path="/technician-management" element={<TechnicianManagement />} />
          <Route path="/ai-settings" element={<AISettings />} />
          <Route path="/storage-settings" element={<StorageSettings />} />
          <Route path="/edit-vehicle/:vehicleId" element={<EditVehicle />} />
          <Route path="/select-action/:vehicleId" element={<SelectAction />} />
          <Route path="/service-record/:recordId" element={<ServiceRecordDetail />} />
          <Route path="/edit-record/:recordId" element={<EditRecord />} />
          <Route path="/vehicle-summary/:vehicleId" element={<VehicleSummary />} />
          <Route path="/planned-maintenance/:vehicleId" element={<PlannedMaintenance />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/fault-detection/:vehicleId" element={<FaultDetection />} />
          <Route path="/fault-prediction/:faultId" element={<FaultPrediction />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
