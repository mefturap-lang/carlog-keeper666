import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Plus, AlertTriangle, ChevronDown, ChevronUp, Camera, Car, Phone, MapPin, Edit2, Save, X, FileText, Calendar as CalendarIcon, Settings2 } from "lucide-react";
import { toast } from "sonner";
import VehicleBodyDiagram, { PartStatus } from "@/components/VehicleBodyDiagram";
import VehicleSpecsSection from "@/components/VehicleSpecsSection";
import { format, differenceInDays } from "date-fns";
import { tr } from "date-fns/locale";
import { useGoBack } from "@/hooks/useGoBack";
import { updateVehicleStatusFromRecords } from "@/hooks/useVehicleStatusManager";

interface Vehicle {
  id: string;
  qr_code: string;
  chassis_number: string;
  plate_number: string;
  brand: string;
  model: string;
  year: number;
  color: string;
  current_km: number;
  notes: string | null;
  body_parts?: Record<string, PartStatus>;
  owner_name?: string;
  owner_phone?: string;
  owner_address?: string;
  status?: string;
  estimated_delivery_date?: string;
  body_type?: string;
  body_code?: string;
  package?: string;
  has_heavy_damage?: boolean;
  first_registration_date?: string;
  created_at?: string;
}

interface ServiceRecord {
  id: string;
  title: string;
  description: string | null;
  km_at_service: number;
  service_date: string;
  part_cost?: number;
  labor_cost?: number;
  quantity?: number;
  unit_price?: number;
  technician?: string;
  stock_code?: string;
  operation_type?: string;
  part_source?: string;
  part_quality?: string;
}

interface VehiclePhoto {
  position: string;
  photo_url: string;
}

interface PlannedMaintenance {
  id: string;
  title: string;
  planned_date: string;
  planned_km: number | null;
  is_completed: boolean;
}

const VehicleDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const goBack = useGoBack();
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [photos, setPhotos] = useState<VehiclePhoto[]>([]);
  const [records, setRecords] = useState<ServiceRecord[]>([]);
  const [plannedMaintenance, setPlannedMaintenance] = useState<PlannedMaintenance[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSuccess, setShowSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState("records");
  const [bodyParts, setBodyParts] = useState<Record<string, PartStatus>>({});
  const [showObservations, setShowObservations] = useState(false);
  const [showOtherPhotos, setShowOtherPhotos] = useState(false);
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [editedNotes, setEditedNotes] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("yok");
  const [selectedDeliveryDate, setSelectedDeliveryDate] = useState<Date | undefined>(undefined);
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const [isDateOpen, setIsDateOpen] = useState(false);

  useEffect(() => {
    if (id) {
      fetchVehicleData();
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get("success") === "true") {
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 3000);
      }
    }
  }, [id]);

  const fetchVehicleData = async () => {
    try {
      // First, update the vehicle status based on records
      if (id) {
        await updateVehicleStatusFromRecords(id);
      }

      const { data: vehicleData, error: vehicleError } = await supabase
        .from("vehicles")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (vehicleError) throw vehicleError;
      
      if (vehicleData) {
        // Parse body_parts if it exists
        const parsedBodyParts = vehicleData.body_parts 
          ? (typeof vehicleData.body_parts === 'string' 
              ? JSON.parse(vehicleData.body_parts) 
              : vehicleData.body_parts) as Record<string, PartStatus>
          : {};
        
        setVehicle({
          ...vehicleData,
          body_parts: parsedBodyParts,
        });
        setBodyParts(parsedBodyParts);
        setEditedNotes(vehicleData.notes || "");
        setSelectedStatus(vehicleData.status || "yok");
        setSelectedDeliveryDate(
          vehicleData.estimated_delivery_date 
            ? new Date(vehicleData.estimated_delivery_date) 
            : undefined
        );
      }

      const { data: photosData, error: photosError } = await supabase
        .from("vehicle_photos")
        .select("*")
        .eq("vehicle_id", id);

      if (photosError) throw photosError;
      setPhotos(photosData || []);

      const { data: recordsData, error: recordsError } = await supabase
        .from("service_records")
        .select("*")
        .eq("vehicle_id", id)
        .order("service_date", { ascending: false });

      if (recordsError) throw recordsError;
      setRecords(recordsData || []);

      // Fetch planned maintenance
      const { data: plannedData, error: plannedError } = await supabase
        .from("planned_maintenance")
        .select("*")
        .eq("vehicle_id", id)
        .eq("is_completed", false)
        .order("planned_date", { ascending: true });

      if (plannedError) throw plannedError;
      setPlannedMaintenance(plannedData || []);
    } catch (error: any) {
      toast.error("Veri yüklenirken hata oluştu");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const getMainPhoto = () => {
    return photos.find((p) => p.position === "front")?.photo_url;
  };

  // Calculate total costs
  const totalPartCost = records.reduce((sum, r) => sum + (r.part_cost || 0), 0);
  const totalLaborCost = records.reduce((sum, r) => sum + (r.labor_cost || 0), 0);
  const totalCost = totalPartCost + totalLaborCost;

  // Get last/next service info with descriptions
  const getLastServiceInfo = () => {
    if (records.length === 0) return null;
    const lastRecord = records[0];
    const date = new Date(lastRecord.service_date);
    // Parse the title to get a short description
    let shortDesc = "İşlem";
    const titleParts = lastRecord.title.split(" - ");
    if (titleParts.length > 1) {
      // Get the second part which usually contains the description
      const descPart = titleParts[1].split(",")[0];
      shortDesc = descPart.length > 15 ? descPart.slice(0, 15) + "..." : descPart;
    } else if (lastRecord.title.includes("Periyodik")) {
      shortDesc = "Periyodik Bakım";
    } else {
      shortDesc = lastRecord.title.length > 15 ? lastRecord.title.slice(0, 15) + "..." : lastRecord.title;
    }
    return { date, shortDesc };
  };

  // Get next planned maintenance from database
  const getNextPlannedMaintenance = () => {
    if (plannedMaintenance.length === 0) return null;
    const nextMaintenance = plannedMaintenance[0]; // Already sorted by date
    return {
      id: nextMaintenance.id,
      date: new Date(nextMaintenance.planned_date),
      title: nextMaintenance.title,
      daysUntil: differenceInDays(new Date(nextMaintenance.planned_date), new Date()),
    };
  };

  const getDaysUntilNextService = () => {
    const nextMaintenance = getNextPlannedMaintenance();
    if (!nextMaintenance) return null;
    return nextMaintenance.daysUntil;
  };

  const saveNotes = async () => {
    if (!vehicle) return;
    try {
      await supabase
        .from("vehicles")
        .update({ notes: editedNotes })
        .eq("id", vehicle.id);
      
      setVehicle({ ...vehicle, notes: editedNotes });
      setIsEditingNotes(false);
      toast.success("Gözlemler kaydedildi");
    } catch (error) {
      toast.error("Gözlemler kaydedilirken hata oluştu");
    }
  };

  const updateStatus = async (newStatus: string) => {
    if (!vehicle) return;
    try {
      await supabase
        .from("vehicles")
        .update({ status: newStatus })
        .eq("id", vehicle.id);
      
      setSelectedStatus(newStatus);
      setVehicle({ ...vehicle, status: newStatus });
      setIsStatusOpen(false);
      toast.success("Durum güncellendi");
    } catch (error) {
      toast.error("Durum güncellenirken hata oluştu");
    }
  };

  const updateDeliveryDate = async (date: Date | undefined) => {
    if (!vehicle) return;
    try {
      await supabase
        .from("vehicles")
        .update({ 
          estimated_delivery_date: date ? format(date, "yyyy-MM-dd") : null 
        })
        .eq("id", vehicle.id);
      
      setSelectedDeliveryDate(date);
      setVehicle({ ...vehicle, estimated_delivery_date: date ? format(date, "yyyy-MM-dd") : undefined });
      setIsDateOpen(false);
      toast.success("Teslim tarihi güncellendi");
    } catch (error) {
      toast.error("Teslim tarihi güncellenirken hata oluştu");
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "islemde": return { label: "İşlemde", className: "bg-orange-100 text-orange-600 border-orange-300" };
      case "sirada": return { label: "Sırada", className: "bg-yellow-100 text-yellow-700 border-yellow-300" };
      case "tamamlandi": return { label: "Tamamlandı", className: "bg-green-100 text-green-700 border-green-300" };
      default: return { label: "Yok", className: "bg-muted text-muted-foreground border-border" };
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Yükleniyor...</p>
      </div>
    );
  }

  if (!vehicle) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Araç bulunamadı</p>
          <Button onClick={() => navigate("/")}>Ana Sayfaya Dön</Button>
        </div>
      </div>
    );
  }

  const daysUntilService = getDaysUntilNextService();

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-4 max-w-md">
        {/* Success Message */}
        {showSuccess && (
          <div className="mb-4 p-3 bg-primary/10 border border-primary rounded-lg">
            <p className="text-sm text-primary font-medium">
              ✓ Araç başarıyla yüklendi
            </p>
            <p className="text-xs text-muted-foreground">
              {vehicle.brand} {vehicle.model} - {vehicle.plate_number}
            </p>
          </div>
        )}

        {/* Vehicle Card */}
        <Card className="p-4 mb-4">
          <div className="flex gap-4">
            {/* Photo */}
            <div className="relative w-28 h-20 rounded-lg overflow-hidden bg-muted shrink-0">
              {getMainPhoto() ? (
                <img
                  src={getMainPhoto()}
                  alt={`${vehicle.brand} ${vehicle.model}`}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Camera className="h-8 w-8 text-muted-foreground" />
                </div>
              )}
              <button 
                onClick={() => setShowOtherPhotos(!showOtherPhotos)}
                className="absolute bottom-1 left-1 right-1 text-[10px] bg-background/80 text-foreground py-0.5 px-1 rounded text-center hover:bg-background/90 transition-colors"
              >
                Diğer Fotoğraflar
              </button>
            </div>

            {/* Info */}
            <div className="flex-1">
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="font-bold text-lg text-foreground">
                    {vehicle.brand} {vehicle.model}
                  </h1>
                  <p className="text-xs text-muted-foreground">
                    {vehicle.year} • {vehicle.color}
                  </p>
              </div>

              {/* Status and Delivery Date Buttons */}
              <div className="flex flex-col gap-1 mt-2">
                {/* Status Selector */}
                <Popover open={isStatusOpen} onOpenChange={setIsStatusOpen}>
                  <PopoverTrigger asChild>
                    <Button 
                      variant="outline" 
                      size="sm"
                      className={`h-7 text-[10px] px-2 border ${getStatusLabel(selectedStatus).className}`}
                    >
                      <Settings2 className="h-3 w-3 mr-1" />
                      {getStatusLabel(selectedStatus).label}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-36 p-1 bg-background z-50" align="end">
                    <div className="flex flex-col gap-1">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="justify-start text-orange-600 font-bold text-xs h-8"
                        onClick={() => updateStatus("islemde")}
                      >
                        İşlemde
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="justify-start text-yellow-700 font-bold text-xs h-8"
                        onClick={() => updateStatus("sirada")}
                      >
                        Sırada
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="justify-start text-green-700 font-bold text-xs h-8"
                        onClick={() => updateStatus("tamamlandi")}
                      >
                        Tamamlandı
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="justify-start text-muted-foreground text-xs h-8"
                        onClick={() => updateStatus("yok")}
                      >
                        Yok
                      </Button>
                    </div>
                  </PopoverContent>
                </Popover>

                {/* Delivery Date Picker */}
                <Popover open={isDateOpen} onOpenChange={setIsDateOpen}>
                  <PopoverTrigger asChild>
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="h-7 text-[10px] px-2"
                    >
                      <CalendarIcon className="h-3 w-3 mr-1" />
                      {selectedDeliveryDate 
                        ? format(selectedDeliveryDate, "dd MMM", { locale: tr })
                        : "Teslim Tarihi"
                      }
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 bg-background z-50" align="end">
                    <Calendar
                      mode="single"
                      selected={selectedDeliveryDate}
                      onSelect={updateDeliveryDate}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

              <div className="mt-2 grid grid-cols-1 gap-y-1 text-xs">
                <div>
                  <span className="text-muted-foreground">Kasa Tipi / Kodu / Paket</span>
                  <p className="font-semibold">
                    {vehicle.body_type || "-"} 
                    {vehicle.body_code ? ` (${vehicle.body_code})` : ""} 
                    {vehicle.package ? ` / ${vehicle.package}` : ""}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Other Photos Section */}
          {showOtherPhotos && photos.length > 0 && (
            <div className="mt-4 pt-4 border-t border-border">
              <p className="text-xs text-muted-foreground mb-2">Diğer Fotoğraflar</p>
              <div className="grid grid-cols-4 gap-2">
                {photos.map((photo, index) => (
                  <div key={index} className="relative aspect-square rounded-lg overflow-hidden bg-muted">
                    <img
                      src={photo.photo_url}
                      alt={`${photo.position}`}
                      className="w-full h-full object-cover"
                    />
                    <span className="absolute bottom-0 left-0 right-0 text-[8px] bg-background/80 text-foreground py-0.5 px-1 text-center capitalize">
                      {photo.position === 'front' ? 'Ön' : photo.position === 'back' ? 'Arka' : photo.position === 'left' ? 'Sol' : photo.position === 'right' ? 'Sağ' : photo.position}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Additional Info */}
          <div className="mt-4 pt-4 border-t border-border">
            {/* Owner Info - Grid layout with 2 columns */}
            <div className="grid grid-cols-2 gap-4 text-xs mb-3">
              {/* Left column - Owner details */}
              <div>
                <span className="text-muted-foreground">Araç Sahibi</span>
                <p className="font-semibold">{vehicle.owner_name || "-"}</p>
                {vehicle.owner_phone && (
                  <div className="flex items-center gap-1 mt-0.5">
                    <Phone className="h-3 w-3 text-muted-foreground" />
                    <span className="text-muted-foreground">{vehicle.owner_phone}</span>
                  </div>
                )}
                {vehicle.owner_address && (
                  <div className="flex items-center gap-1 mt-0.5">
                    <MapPin className="h-3 w-3 text-muted-foreground" />
                    <span className="text-muted-foreground">
                      {vehicle.owner_address.slice(0, 25)}
                      {vehicle.owner_address.length > 25 ? "..." : ""}
                    </span>
                  </div>
                )}
              </div>
              
              {/* Right column - Additional info */}
              <div className="space-y-2">
                <div>
                  <span className="text-muted-foreground">Ağır Hasar Kaydı</span>
                  <p className={`font-semibold ${vehicle.has_heavy_damage ? 'text-destructive' : 'text-green-600'}`}>
                    {vehicle.has_heavy_damage ? 'Var' : 'Yok'}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">İlk Kayıt Tarihi</span>
                  <p className="font-semibold">
                    {vehicle.first_registration_date 
                      ? format(new Date(vehicle.first_registration_date), "d MMM yyyy", { locale: tr })
                      : vehicle.created_at 
                        ? format(new Date(vehicle.created_at), "d MMM yyyy", { locale: tr })
                        : "-"
                    }
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Slot/QR</span>
                  <p className="font-semibold text-accent">{vehicle.qr_code}</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 text-xs">
              <div>
                <span className="text-muted-foreground">Şasi No</span>
                <p className="font-semibold font-mono text-[10px]">{vehicle.chassis_number}</p>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
              <div className="text-center p-2 bg-muted rounded-lg">
                <p className="text-lg font-bold text-foreground">
                  {vehicle.current_km.toLocaleString()}
                </p>
                <p className="text-muted-foreground">km</p>
              </div>
              <div 
                className="text-center p-2 bg-muted rounded-lg cursor-pointer hover:bg-muted/80 transition-colors"
                onClick={() => records.length > 0 && navigate(`/service-record/${records[0].id}`)}
              >
                <p className="text-xs font-bold text-foreground">
                  {getLastServiceInfo()
                    ? format(getLastServiceInfo()!.date, "d MMM yyyy", { locale: tr })
                    : "-"}
                </p>
                <p className="text-muted-foreground text-[10px]">Son Bakım</p>
                {getLastServiceInfo() && (
                  <p className="text-[9px] font-bold text-accent mt-0.5">
                    ({getLastServiceInfo()!.shortDesc})
                  </p>
                )}
              </div>
              <div 
                className="text-center p-2 bg-muted rounded-lg cursor-pointer hover:bg-muted/80 transition-colors"
                onClick={() => navigate(`/planned-maintenance/${vehicle.id}`)}
              >
                <p className="text-xs font-bold text-foreground">
                  {getNextPlannedMaintenance()
                    ? format(getNextPlannedMaintenance()!.date, "d MMM yyyy", { locale: tr })
                    : "-"}
                </p>
                <p className="text-muted-foreground text-[10px]">Sonraki Bakım</p>
                {getNextPlannedMaintenance() && (
                  <p className="text-[9px] font-bold text-accent mt-0.5">
                    ({getNextPlannedMaintenance()!.title.length > 12 
                      ? getNextPlannedMaintenance()!.title.slice(0, 12) + "..." 
                      : getNextPlannedMaintenance()!.title})
                  </p>
                )}
                {!getNextPlannedMaintenance() && (
                  <p className="text-[9px] text-primary mt-0.5">+ Ekle</p>
                )}
              </div>
            </div>

            {/* Cost Summary */}
            {(totalPartCost > 0 || totalLaborCost > 0) && (
              <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                <div className="text-center p-2 bg-accent/10 rounded-lg">
                  <p className="text-sm font-bold text-accent">
                    {totalPartCost.toLocaleString()} ₺
                  </p>
                  <p className="text-muted-foreground">Parça Toplam</p>
                </div>
                <div className="text-center p-2 bg-primary/10 rounded-lg">
                  <p className="text-sm font-bold text-primary">
                    {totalLaborCost.toLocaleString()} ₺
                  </p>
                  <p className="text-muted-foreground">İşçilik Toplam</p>
                </div>
                <div className="text-center p-2 bg-foreground/10 rounded-lg">
                  <p className="text-sm font-bold text-foreground">
                    {totalCost.toLocaleString()} ₺
                  </p>
                  <p className="text-muted-foreground">Genel Toplam</p>
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Maintenance Warning - show if within 15 days */}
        {daysUntilService !== null && daysUntilService <= 15 && (
          <Card className="p-3 mb-4 bg-yellow-50 border-yellow-200">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-yellow-800">
                  Yaklaşan Bakım Uyarısı
                </p>
                {getNextPlannedMaintenance() && (
                  <p className="text-xs text-yellow-700">
                    <span className="font-bold">{getNextPlannedMaintenance()!.title}</span> - {" "}
                    {daysUntilService < 0 
                      ? `${Math.abs(daysUntilService)} gün gecikmiş!`
                      : daysUntilService === 0 
                        ? "Bugün!"
                        : `${daysUntilService} gün kaldı`
                    }
                  </p>
                )}
              </div>
            </div>
          </Card>
        )}

        {/* Genel Özet Button - GREEN background, WHITE text */}
        <Button
          onClick={() => navigate(`/vehicle-summary/${vehicle.id}`)}
          className="w-full mb-3 bg-green-600 hover:bg-green-700 text-white"
        >
          <FileText className="mr-2 h-4 w-4" />
          Genel Özet
        </Button>

        {/* Arıza Tespiti Button - Red border, white background, orange bold text */}
        <Button
          onClick={() => navigate(`/fault-detection/${vehicle.id}`)}
          variant="outline"
          className="w-full mb-4 border-2 border-destructive bg-background hover:bg-destructive/5 text-accent font-bold"
        >
          <AlertTriangle className="mr-2 h-4 w-4 text-accent" />
          Arıza Tespiti
        </Button>

        {/* Observations Dropdown */}
        <div className="mb-4">
          <Button
            variant="outline"
            className="w-full justify-between"
            onClick={() => setShowObservations(!showObservations)}
          >
            Gözlemler
            {showObservations ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
          
          {showObservations && (
            <Card className="mt-2 p-4">
              {isEditingNotes ? (
                <div className="space-y-3">
                  <Textarea
                    value={editedNotes}
                    onChange={(e) => setEditedNotes(e.target.value)}
                    placeholder="Araç hakkındaki gözlemlerinizi yazın..."
                    rows={4}
                    className="resize-none"
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setIsEditingNotes(false);
                        setEditedNotes(vehicle.notes || "");
                      }}
                      className="flex-1"
                    >
                      <X className="h-4 w-4 mr-1" />
                      İptal
                    </Button>
                    <Button
                      size="sm"
                      onClick={saveNotes}
                      className="flex-1 bg-accent hover:bg-accent/90"
                    >
                      <Save className="h-4 w-4 mr-1" />
                      Kaydet
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="relative">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setIsEditingNotes(true)}
                    className="absolute top-0 right-0 h-6 w-6 p-0"
                  >
                    <Edit2 className="h-3 w-3" />
                  </Button>
                  {vehicle.notes ? (
                    <p className="text-sm text-foreground whitespace-pre-wrap pr-8">{vehicle.notes}</p>
                  ) : (
                    <p className="text-sm text-muted-foreground italic pr-8">
                      Bu araç için henüz gözlem eklenmemiş. Düzenlemek için sağ üstteki ikona tıklayın.
                    </p>
                  )}
                </div>
              )}
            </Card>
          )}
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-4">
          <TabsList className="w-full grid grid-cols-4 h-10">
            <TabsTrigger value="records" className="text-xs">
              Servis Kayıtları
            </TabsTrigger>
            <TabsTrigger value="specs" className="text-xs">
              Teknik Bilgiler
            </TabsTrigger>
            <TabsTrigger value="body" className="text-xs">
              Kaporta
            </TabsTrigger>
            <TabsTrigger value="summary" className="text-xs">
              Özet
            </TabsTrigger>
          </TabsList>

          <TabsContent value="records" className="mt-4">
            <Button
              onClick={() => navigate(`/select-action/${vehicle.id}`)}
              className="w-full bg-accent hover:bg-accent/90 mb-4"
            >
              <Plus className="mr-2 h-4 w-4" />
              Kayıt/İşlem Ekle
            </Button>

            {records.length > 0 && (
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-muted-foreground mb-3">
                  Parça Değişim Kronolojisi
                </h3>
                <div className="bg-muted/50 rounded-xl p-3 space-y-3">
                  {records.map((record) => (
                    <ServiceRecordCard key={record.id} record={record} vehicleId={vehicle.id} />
                  ))}
                </div>
              </div>
            )}

            {records.length === 0 && (
              <Card className="p-8 text-center">
                <p className="text-muted-foreground">Henüz servis kaydı bulunmuyor</p>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="specs" className="mt-4">
            <VehicleSpecsSection
              specs={{
                modelProductionYears: `${vehicle.year}`,
                segment: "-",
                bodyType: "-",
                engineType: "-",
                fuelConsumption: "-",
                horsePower: "-",
                transmission: "-",
                acceleration: "-",
                displacement: "-",
                maxPower: "-",
                maxTorque: "-",
                topSpeed: "-",
                fuelType: "-",
                cityConsumption: "-",
                highwayConsumption: "-",
                averageConsumption: "-",
                fuelTankCapacity: "-",
                seatCount: "-",
                length: "-",
                width: "-",
                height: "-",
                netWeight: "-",
                trunkCapacity: "-",
                tireSize: "-",
              }}
            />
            <p className="text-xs text-muted-foreground mt-4 text-center italic">
              VIN decode API bağlandığında bu bilgiler otomatik doldurulacaktır
            </p>
          </TabsContent>

          <TabsContent value="body" className="mt-4">
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-4">
                <Car className="h-5 w-5 text-accent" />
                <h3 className="font-semibold text-foreground">Kaporta Durumu</h3>
              </div>
              <VehicleBodyDiagram
                parts={bodyParts}
                onChange={setBodyParts}
                readOnly={true}
              />
              <p className="text-xs text-muted-foreground mt-4 text-center">
                Kaporta durumu araç kaydı sırasında veya işlem eklerken güncellenebilir
              </p>
            </Card>
          </TabsContent>

          <TabsContent value="summary" className="mt-4">
            <Card className="p-4">
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Toplam Servis</span>
                  <span className="font-semibold">{records.length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Son Servis KM</span>
                  <span className="font-semibold">
                    {records[0]?.km_at_service.toLocaleString() || "-"} km
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Güncel KM</span>
                  <span className="font-semibold">
                    {vehicle.current_km.toLocaleString()} km
                  </span>
                </div>
                
                <div className="pt-3 border-t border-border space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Toplam Parça Maliyeti</span>
                    <span className="font-semibold text-accent">{totalPartCost.toLocaleString()} ₺</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Toplam İşçilik Maliyeti</span>
                    <span className="font-semibold text-primary">{totalLaborCost.toLocaleString()} ₺</span>
                  </div>
                  <div className="flex justify-between text-base font-bold pt-2 border-t border-border">
                    <span>Genel Toplam</span>
                    <span>{totalCost.toLocaleString()} ₺</span>
                  </div>
                </div>
              </div>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Floating Add Button */}
        <button
          onClick={() => navigate(`/select-action/${vehicle.id}`)}
          className="fixed bottom-6 right-6 w-14 h-14 bg-accent text-accent-foreground rounded-full shadow-lg flex items-center justify-center hover:bg-accent/90 transition-colors"
        >
          <Plus className="h-6 w-6" />
        </button>

        {/* Back Button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/")}
          className="fixed top-4 left-4"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
};

const ServiceRecordCard = ({ record, vehicleId }: { record: ServiceRecord; vehicleId: string }) => {
  const navigate = useNavigate();
  const partCost = record.part_cost || 0;
  const laborCost = record.labor_cost || 0;
  const totalCost = partCost + laborCost;

  // Parse title to get readable format (remove stock code and quantity)
  const getReadableTitle = (title: string) => {
    // Remove stock code prefix if present (e.g., "AKUALTDGSCKMOEM01 - ...")
    const parts = title.split(" - ");
    if (parts.length > 1) {
      // Get operation type label
      const operationLabel = record.operation_type === "degisim" ? "Değişim" : 
                             record.operation_type === "onarim" ? "Onarım" : 
                             record.operation_type === "bakim" ? "Bakım" : "";
      
      // Get the description parts (category, subcategory, etc.)
      const descParts = parts.slice(1).join(" - ");
      // Remove quantity info (", X adet" at the end)
      const withoutQty = descParts.replace(/,\s*\d+\s*adet$/i, "");
      
      if (operationLabel) {
        return `${operationLabel} - ${withoutQty}`;
      }
      return withoutQty;
    }
    return title;
  };

  // Determine border color based on operation type
  const getBorderColor = (operationType: string | undefined) => {
    switch (operationType) {
      case "degisim":
        return "border-2 border-green-500";
      case "onarim":
        return "border-2 border-yellow-500";
      case "bakim":
        return "border-2 border-orange-500";
      default:
        return "border border-border";
    }
  };

  // Get status button style
  const getStatusStyle = (status: string | undefined) => {
    switch (status) {
      case "tespit":
        return "bg-red-500 text-white";
      case "devam":
        return "bg-yellow-500 text-white";
      case "tamamlandi":
        return "bg-green-600 text-white";
      default:
        return "bg-red-500 text-white";
    }
  };

  const getStatusLabel = (status: string | undefined) => {
    switch (status) {
      case "tespit":
        return "Tespit Edildi";
      case "devam":
        return "Devam Ediyor";
      case "tamamlandi":
        return "Tamamlandı";
      default:
        return "Tespit Edildi";
    }
  };

  return (
    <Card 
      className={`p-4 cursor-pointer hover:shadow-md transition-all ${getBorderColor(record.operation_type)} bg-background`}
      onClick={() => navigate(`/service-record/${record.id}`)}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <h4 className="font-semibold text-foreground text-sm leading-tight">
            {getReadableTitle(record.title)}
          </h4>
        </div>
        {/* Status Badge Button */}
        <span className={`px-2 py-1 text-[10px] font-bold rounded-md shrink-0 ml-2 ${getStatusStyle((record as any).record_status)}`}>
          {getStatusLabel((record as any).record_status)}
        </span>
      </div>

      <div className="flex flex-wrap gap-1 mb-2">
        {record.part_quality && (
          <span className="px-2 py-0.5 bg-accent/10 text-accent text-[10px] font-medium rounded uppercase">
            {record.part_quality}
          </span>
        )}
        {record.part_source && (
          <span className="px-2 py-0.5 bg-muted text-muted-foreground text-[10px] font-medium rounded capitalize">
            {record.part_source === "sifir" ? "Sıfır" : "Çıkma"}
          </span>
        )}
      </div>

      <div className="flex items-center justify-between text-xs">
        <div className="flex gap-3">
          <div>
            <span className="text-muted-foreground">Tarih</span>
            <p className="font-semibold">
              {new Date(record.service_date).toLocaleDateString("tr-TR")}
            </p>
          </div>
          {record.technician && (
            <div>
              <span className="text-muted-foreground">Teknisyen</span>
              <p className="font-semibold">{record.technician}</p>
            </div>
          )}
        </div>
      </div>

      {/* Cost breakdown */}
      {(partCost > 0 || laborCost > 0) && (
        <div className="mt-3 pt-3 border-t border-border grid grid-cols-3 gap-2 text-xs">
          <div className="text-center">
            <span className="text-muted-foreground">Parça</span>
            <p className="font-semibold">{partCost.toLocaleString()} ₺</p>
          </div>
          <div className="text-center">
            <span className="text-muted-foreground">İşçilik</span>
            <p className="font-semibold">{laborCost.toLocaleString()} ₺</p>
          </div>
          <div className="text-center">
            <span className="text-muted-foreground">Toplam</span>
            <p className="font-bold text-accent">{totalCost.toLocaleString()} ₺</p>
          </div>
        </div>
      )}
    </Card>
  );
};

export default VehicleDetail;