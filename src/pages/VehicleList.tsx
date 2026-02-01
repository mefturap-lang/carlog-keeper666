import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ArrowLeft, RefreshCw, Search, ArrowUpDown, Plus, Trash2, Edit, User, Clock } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useGoBack } from "@/hooks/useGoBack";
import { recalculateAllVehicleStatuses } from "@/hooks/useVehicleStatusManager";

interface VehicleWithDetails {
  id: string;
  plate_number: string;
  brand: string;
  model: string;
  owner_name: string | null;
  owner_phone: string | null;
  created_at: string;
  status: string | null;
  estimated_delivery_date: string | null;
  assigned_technician: string | null;
  last_service_date: string | null;
  qr_code: string;
  total_cost: number;
}

const statusConfig: Record<string, { label: string; className: string }> = {
  islemde: { label: "İşlemde", className: "text-orange-600 font-bold" },
  sirada: { label: "Sırada", className: "text-yellow-600 font-bold" },
  tamamlandi: { label: "Tamamlandı", className: "text-green-700 font-bold" },
  yok: { label: "-", className: "text-muted-foreground" },
};

const VehicleList = () => {
  const navigate = useNavigate();
  const goBack = useGoBack();
  const [vehicles, setVehicles] = useState<VehicleWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    fetchVehicles();
    // Recalculate statuses when the list loads
    recalculateAllVehicleStatuses().then(() => fetchVehicles());
  }, []);

  const fetchVehicles = async () => {
    setLoading(true);
    try {
      const { data: vehiclesData, error: vehiclesError } = await supabase
        .from("vehicles")
        .select("id, plate_number, brand, model, owner_name, owner_phone, created_at, status, estimated_delivery_date, qr_code, assigned_technician");

      if (vehiclesError) throw vehiclesError;

      // Get last service date and total cost for each vehicle
      const vehiclesWithService = await Promise.all(
        (vehiclesData || []).map(async (vehicle) => {
          const { data: serviceData } = await supabase
            .from("service_records")
            .select("service_date, part_cost, labor_cost")
            .eq("vehicle_id", vehicle.id)
            .order("service_date", { ascending: false });

          const totalCost = serviceData?.reduce((sum, record) => {
            return sum + (Number(record.part_cost) || 0) + (Number(record.labor_cost) || 0);
          }, 0) || 0;

          return {
            ...vehicle,
            last_service_date: serviceData?.[0]?.service_date || null,
            total_cost: totalCost,
          };
        })
      );

      setVehicles(vehiclesWithService);
    } catch (error) {
      toast.error("Araçlar yüklenirken hata oluştu");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const deleteVehicle = async (vehicleId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeletingId(vehicleId);
    
    try {
      // First delete related records
      await supabase.from("service_records").delete().eq("vehicle_id", vehicleId);
      await supabase.from("vehicle_photos").delete().eq("vehicle_id", vehicleId);
      await supabase.from("planned_maintenance").delete().eq("vehicle_id", vehicleId);
      await supabase.from("vehicle_summaries").delete().eq("vehicle_id", vehicleId);
      await supabase.from("fault_detections").delete().eq("vehicle_id", vehicleId);
      await supabase.from("periodic_maintenance_records").delete().eq("vehicle_id", vehicleId);
      
      // Then delete the vehicle
      const { error } = await supabase.from("vehicles").delete().eq("id", vehicleId);
      if (error) throw error;
      
      toast.success("Araç kaydı silindi");
      setVehicles(vehicles.filter(v => v.id !== vehicleId));
    } catch (error: any) {
      toast.error("Araç silinirken hata oluştu");
      console.error(error);
    } finally {
      setDeletingId(null);
    }
  };

  const filteredAndSortedVehicles = useMemo(() => {
    let result = [...vehicles];

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (v) =>
          v.owner_name?.toLowerCase().includes(query) ||
          v.owner_phone?.includes(query) ||
          v.plate_number.toLowerCase().includes(query) ||
          `${v.brand} ${v.model}`.toLowerCase().includes(query) ||
          v.qr_code?.toLowerCase().includes(query) ||
          v.assigned_technician?.toLowerCase().includes(query)
      );
    }

    // Sort by last service date
    result.sort((a, b) => {
      const dateA = a.last_service_date ? new Date(a.last_service_date).getTime() : 0;
      const dateB = b.last_service_date ? new Date(b.last_service_date).getTime() : 0;
      return sortOrder === "desc" ? dateB - dateA : dateA - dateB;
    });

    return result;
  }, [vehicles, searchQuery, sortOrder]);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    return format(new Date(dateStr), "dd MMM yyyy", { locale: tr });
  };

  const formatDeliveryDate = (dateStr: string | null) => {
    if (!dateStr) return null;
    return format(new Date(dateStr), "dd MMM HH:mm", { locale: tr });
  };

  const getStatusDisplay = (status: string | null, estimatedDeliveryDate: string | null) => {
    const config = statusConfig[status || "yok"] || statusConfig.yok;
    return (
      <div className="flex flex-col">
        <span className={config.className}>{config.label}</span>
        {status === "islemde" && estimatedDeliveryDate && (
          <span className="text-[10px] text-muted-foreground flex items-center gap-0.5 mt-0.5">
            <Clock className="h-3 w-3" />
            {formatDeliveryDate(estimatedDeliveryDate)}
          </span>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-4 md:p-6 max-w-6xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="lg"
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                goBack();
              }}
              className="shrink-0 font-semibold"
            >
              <ArrowLeft className="mr-2 h-5 w-5" />
              Geri
            </Button>
            <h1 className="text-xl font-bold text-accent">ÜMİT OTO SERVİS</h1>
          </div>
          
          <Button
            onClick={() => navigate("/add-vehicle")}
            className="bg-accent hover:bg-accent/90"
          >
            <Plus className="h-4 w-4 mr-2" />
            Yeni Araç
          </Button>
        </div>

        {/* Title & Controls */}
        <Card className="p-4 mb-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
            <div>
              <h2 className="text-xl font-bold text-foreground">Araç Listesi</h2>
              <p className="text-sm text-muted-foreground">
                Sistemde kayıtlı {vehicles.length} araç
              </p>
            </div>
            <div className="flex gap-2 items-center">
              <div className="relative flex-1 md:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Ara (isim, telefon, plaka, tekniker...)"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9"
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSortOrder(sortOrder === "desc" ? "asc" : "desc")}
                className="h-9 px-3"
              >
                <ArrowUpDown className="h-4 w-4 mr-1" />
                {sortOrder === "desc" ? "Yeni" : "Eski"}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={fetchVehicles}
                disabled={loading}
                className="h-9 w-9"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              </Button>
            </div>
          </div>

          {/* Vehicle Table */}
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Yükleniyor...</div>
          ) : filteredAndSortedVehicles.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchQuery ? "Sonuç bulunamadı" : "Henüz araç eklenmemiş"}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-2 font-semibold text-muted-foreground">Araç Sahibi</th>
                    <th className="text-left py-3 px-2 font-semibold text-muted-foreground hidden md:table-cell">Telefon</th>
                    <th className="text-left py-3 px-2 font-semibold text-muted-foreground">Marka/Model</th>
                    <th className="text-left py-3 px-2 font-semibold text-muted-foreground">Plaka</th>
                    <th className="text-left py-3 px-2 font-semibold text-muted-foreground hidden sm:table-cell">Tekniker</th>
                    <th className="text-left py-3 px-2 font-semibold text-muted-foreground hidden lg:table-cell">Son İşlem</th>
                    <th className="text-left py-3 px-2 font-semibold text-muted-foreground">Güncel Maliyet</th>
                    <th className="text-left py-3 px-2 font-semibold text-muted-foreground">İşlem Durumu</th>
                    <th className="text-left py-3 px-2 font-semibold text-muted-foreground">İşlemler</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAndSortedVehicles.map((vehicle) => (
                    <tr
                      key={vehicle.id}
                      className="border-b border-border/50 hover:bg-muted/30 cursor-pointer transition-colors"
                      onClick={() => navigate(`/vehicle/${vehicle.id}`)}
                    >
                      <td className="py-3 px-2 font-medium">{vehicle.owner_name || "-"}</td>
                      <td className="py-3 px-2 hidden md:table-cell">{vehicle.owner_phone || "-"}</td>
                      <td className="py-3 px-2">{vehicle.brand} {vehicle.model}</td>
                      <td className="py-3 px-2 font-semibold text-accent">{vehicle.plate_number}</td>
                      <td className="py-3 px-2 hidden sm:table-cell">
                        {vehicle.assigned_technician ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                            <User className="h-3 w-3" />
                            {vehicle.assigned_technician}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="py-3 px-2 hidden lg:table-cell">{formatDate(vehicle.last_service_date)}</td>
                      <td className="py-3 px-2 font-semibold text-green-600">{vehicle.total_cost.toLocaleString('tr-TR')} ₺</td>
                      <td className="py-3 px-2">{getStatusDisplay(vehicle.status, vehicle.estimated_delivery_date)}</td>
                      <td className="py-3 px-2">
                        <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/edit-vehicle/${vehicle.id}`);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="bg-background">
                              <AlertDialogHeader>
                                <AlertDialogTitle>Aracı Silmek İstediğinize Emin Misiniz?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Bu işlem geri alınamaz. {vehicle.plate_number} plakalı araç ve tüm kayıtları kalıcı olarak silinecektir.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>İptal</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={(e) => deleteVehicle(vehicle.id, e)}
                                  disabled={deletingId === vehicle.id}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  {deletingId === vehicle.id ? "Siliniyor..." : "Sil"}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default VehicleList;
