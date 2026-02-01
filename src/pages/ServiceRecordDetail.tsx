import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Calendar, Wrench, FileText, Hash, User, Phone, MapPin, Edit, Trash2, Clock, CheckCircle } from "lucide-react";
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
import { toast } from "sonner";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { useGoBack } from "@/hooks/useGoBack";
import { handleRecordStatusChange, updateVehicleStatusFromRecords } from "@/hooks/useVehicleStatusManager";

interface Vehicle {
  id: string;
  plate_number: string;
  brand: string;
  model: string;
  owner_name?: string;
  owner_phone?: string;
  owner_address?: string;
}

interface ServiceRecord {
  id: string;
  vehicle_id: string;
  title: string;
  description: string | null;
  km_at_service: number;
  service_date: string;
  created_at: string;
  part_cost?: number;
  labor_cost?: number;
  quantity?: number;
  unit_price?: number;
  technician?: string;
  stock_code?: string;
  operation_type?: string;
  part_source?: string;
  part_quality?: string;
  record_status?: string;
  estimated_duration_minutes?: number;
  completed_at?: string;
}

const ServiceRecordDetail = () => {
  const { recordId } = useParams();
  const navigate = useNavigate();
  const goBack = useGoBack();
  const [record, setRecord] = useState<ServiceRecord | null>(null);
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  useEffect(() => {
    if (recordId) {
      fetchRecordData();
    }
  }, [recordId]);

  const fetchRecordData = async () => {
    try {
      const { data: recordData, error: recordError } = await supabase
        .from("service_records")
        .select("*")
        .eq("id", recordId)
        .maybeSingle();

      if (recordError) throw recordError;
      if (!recordData) {
        toast.error("Kayıt bulunamadı");
        navigate("/");
        return;
      }

      setRecord(recordData);

      // Fetch vehicle data
      const { data: vehicleData, error: vehicleError } = await supabase
        .from("vehicles")
        .select("id, plate_number, brand, model, owner_name, owner_phone, owner_address")
        .eq("id", recordData.vehicle_id)
        .maybeSingle();

      if (vehicleError) throw vehicleError;
      setVehicle(vehicleData);
    } catch (error: any) {
      toast.error("Veri yüklenirken hata oluştu");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const updateRecordStatus = async (newStatus: "devam" | "tamamlandi") => {
    if (!record || !vehicle) return;
    
    setUpdatingStatus(true);
    try {
      const updateData: any = { record_status: newStatus };
      
      // Set completed_at when marking as completed
      if (newStatus === "tamamlandi") {
        updateData.completed_at = new Date().toISOString();
      } else {
        updateData.completed_at = null;
      }

      const { error } = await supabase
        .from("service_records")
        .update(updateData)
        .eq("id", record.id);

      if (error) throw error;

      setRecord({ ...record, record_status: newStatus, completed_at: updateData.completed_at });
      toast.success(`Durum "${newStatus === "tamamlandi" ? "Tamamlandı" : "Devam Ediyor"}" olarak güncellendi`);

      // Update vehicle status automatically based on record status
      await handleRecordStatusChange(
        vehicle.id, 
        newStatus, 
        record.estimated_duration_minutes
      );
    } catch (error: any) {
      toast.error("Durum güncellenirken hata oluştu");
      console.error(error);
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Vehicle status is now managed by useVehicleStatusManager

  const deleteRecord = async () => {
    if (!record || !vehicle) return;
    
    setDeleting(true);
    try {
      const { error } = await supabase
        .from("service_records")
        .delete()
        .eq("id", record.id);

      if (error) throw error;

      toast.success("Kayıt başarıyla silindi");
      navigate(`/vehicle/${vehicle.id}`);
    } catch (error: any) {
      toast.error("Kayıt silinirken hata oluştu");
      console.error(error);
    } finally {
      setDeleting(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("tr-TR", {
      day: "numeric",
      month: "long",
      year: "numeric",
      weekday: "long",
    });
  };

  const formatDateTime = (dateString: string) => {
    return format(new Date(dateString), "d MMMM yyyy, HH:mm", { locale: tr });
  };

  const getOperationLabel = (type?: string) => {
    switch (type) {
      case "degisim": return "Değişim";
      case "onarim": return "Onarım";
      case "bakim": return "Bakım";
      default: return "-";
    }
  };

  const getSourceLabel = (source?: string) => {
    switch (source) {
      case "cikma": return "Çıkma";
      case "sifir": return "Sıfır";
      default: return "-";
    }
  };

  const getQualityLabel = (quality?: string) => {
    switch (quality) {
      case "oem": return "OEM";
      case "muadil": return "Muadil";
      default: return "-";
    }
  };

  const getStatusStyle = (status?: string) => {
    switch (status) {
      case "tespit": return "bg-red-500 text-white";
      case "devam": return "bg-yellow-500 text-white";
      case "tamamlandi": return "bg-green-600 text-white";
      default: return "bg-red-500 text-white";
    }
  };

  const getStatusLabel = (status?: string) => {
    switch (status) {
      case "tespit": return "Tespit Edildi";
      case "devam": return "Devam Ediyor";
      case "tamamlandi": return "Tamamlandı";
      default: return "Tespit Edildi";
    }
  };

  const formatDuration = (minutes?: number) => {
    if (!minutes) return "-";
    if (minutes < 60) return `${minutes} dakika`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (mins === 0) return `${hours} saat`;
    return `${hours} saat ${mins} dk`;
  };

  // Parse title to get readable format
  const getReadableTitle = (title: string) => {
    const parts = title.split(" - ");
    if (parts.length > 1) {
      return parts.slice(1).join(" - ");
    }
    return title;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Yükleniyor...</p>
      </div>
    );
  }

  if (!record || !vehicle) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Kayıt bulunamadı</p>
          <Button onClick={() => navigate("/")}>Ana Sayfaya Dön</Button>
        </div>
      </div>
    );
  }

  const totalCost = (record.part_cost || 0) + (record.labor_cost || 0);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-4 max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={goBack}
              className="shrink-0"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-lg font-bold text-foreground">İşlem Detayı</h1>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Current Status Badge */}
            <span className={`px-3 py-1 text-xs font-bold rounded-md ${getStatusStyle(record.record_status)}`}>
              {getStatusLabel(record.record_status)}
            </span>
            
            {/* Delete Button */}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="text-destructive border-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="bg-background">
                <AlertDialogHeader>
                  <AlertDialogTitle>Kaydı Silmek İstediğinize Emin Misiniz?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Bu işlem geri alınamaz. Kayıt kalıcı olarak silinecektir.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>İptal</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={deleteRecord}
                    disabled={deleting}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {deleting ? "Siliniyor..." : "Sil"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        {/* Status Update & Edit Buttons */}
        <Card className="p-4 mb-4">
          <h3 className="text-sm font-semibold text-muted-foreground mb-3">İşlem Durumu</h3>
          <div className="flex gap-2 mb-4">
            <Button
              onClick={() => updateRecordStatus("devam")}
              disabled={updatingStatus || record.record_status === "devam"}
              className={`flex-1 ${
                record.record_status === "devam" 
                  ? "bg-yellow-500 text-white" 
                  : "bg-muted text-muted-foreground hover:bg-yellow-100"
              }`}
              variant="outline"
            >
              Devam Ediyor
            </Button>
            <Button
              onClick={() => updateRecordStatus("tamamlandi")}
              disabled={updatingStatus || record.record_status === "tamamlandi"}
              className={`flex-1 ${
                record.record_status === "tamamlandi" 
                  ? "bg-green-600 text-white" 
                  : "bg-muted text-muted-foreground hover:bg-green-100"
              }`}
              variant="outline"
            >
              <CheckCircle className="h-4 w-4 mr-1" />
              Tamamlandı
            </Button>
          </div>
          
          <Button
            onClick={() => navigate(`/edit-record/${record.id}`)}
            className="w-full bg-accent hover:bg-accent/90"
          >
            <Edit className="mr-2 h-4 w-4" />
            Düzenle / Güncelle
          </Button>
        </Card>

        {/* Timing Info Card */}
        <Card className="p-4 mb-4 bg-blue-50 border-blue-200">
          <h3 className="text-sm font-semibold text-blue-800 mb-3 flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Zaman Bilgileri
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-blue-700">Kayıt Oluşturma</span>
              <span className="font-semibold text-blue-900">{formatDateTime(record.created_at)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-blue-700">Tahmini Süre</span>
              <span className="font-semibold text-blue-900">{formatDuration(record.estimated_duration_minutes)}</span>
            </div>
            {record.completed_at && (
              <div className="flex justify-between pt-2 border-t border-blue-200">
                <span className="text-green-700 font-semibold">Tamamlanma Zamanı</span>
                <span className="font-bold text-green-800">{formatDateTime(record.completed_at)}</span>
              </div>
            )}
          </div>
        </Card>

        {/* Vehicle & Owner Info Card */}
        <Card className="p-4 mb-4 bg-muted/30">
          <div className="space-y-3">
            {/* Owner Info */}
            <div className="flex items-start gap-3">
              <User className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-foreground">
                  {vehicle.owner_name || "Araç Sahibi Belirtilmemiş"}
                </p>
                {vehicle.owner_phone && (
                  <div className="flex items-center gap-1 mt-1">
                    <Phone className="h-3 w-3 text-muted-foreground" />
                    <p className="text-xs text-muted-foreground">{vehicle.owner_phone}</p>
                  </div>
                )}
                {vehicle.owner_address && (
                  <div className="flex items-center gap-1 mt-1">
                    <MapPin className="h-3 w-3 text-muted-foreground" />
                    <p className="text-xs text-muted-foreground">
                      {vehicle.owner_address.slice(0, 25)}
                      {vehicle.owner_address.length > 25 ? "..." : ""}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Vehicle Info */}
            <div className="pt-2 border-t border-border">
              <p className="text-sm font-semibold text-foreground">
                {vehicle.brand} {vehicle.model}
              </p>
              <p className="text-xs text-accent font-semibold">{vehicle.plate_number}</p>
            </div>
          </div>
        </Card>

        {/* Date Card */}
        <Card className="p-4 mb-4">
          <div className="flex items-center gap-3">
            <Calendar className="h-5 w-5 text-accent" />
            <div>
              <p className="text-base font-semibold text-foreground">
                {formatDate(record.service_date)}
              </p>
              <p className="text-xs text-muted-foreground">İşlem Tarihi</p>
            </div>
          </div>
        </Card>

        {/* Title & Description Card */}
        <Card className="p-4 mb-4">
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <Wrench className="h-5 w-5 text-accent shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-base font-bold text-foreground">
                  {getReadableTitle(record.title)}
                </p>
              </div>
            </div>

            {record.description && (
              <div className="pt-3 border-t border-border">
                <div className="flex items-start gap-3">
                  <FileText className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                  <p className="text-sm text-foreground">{record.description}</p>
                </div>
              </div>
            )}

            {/* Stock Code - Small Font */}
            {record.stock_code && (
              <div className="pt-2">
                <div className="flex items-center gap-2">
                  <Hash className="h-3 w-3 text-muted-foreground" />
                  <p className="text-[10px] text-muted-foreground font-mono">
                    Stok Kodu: {record.stock_code}
                  </p>
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Operation Details Card */}
        <Card className="p-4 mb-4">
          <h3 className="text-sm font-semibold text-muted-foreground mb-3">İşlem Bilgileri</h3>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">İşlem Türü</span>
              <span className="font-semibold">{getOperationLabel(record.operation_type)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Parça Kaynağı</span>
              <span className="font-semibold">{getSourceLabel(record.part_source)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Parça Kalitesi</span>
              <span className="font-semibold">{getQualityLabel(record.part_quality)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Kilometre</span>
              <span className="font-semibold">{record.km_at_service.toLocaleString()} km</span>
            </div>
            {record.technician && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Tekniker</span>
                <span className="font-semibold">{record.technician}</span>
              </div>
            )}
          </div>
        </Card>

        {/* Cost Summary Card */}
        <Card className="p-4 mb-4">
          <h3 className="text-sm font-semibold text-muted-foreground mb-3">Maliyet Özeti</h3>
          <div className="space-y-2">
            {record.quantity && record.unit_price !== undefined && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  Adet × Birim Fiyat
                </span>
                <span className="font-semibold">
                  {record.quantity} × {record.unit_price?.toLocaleString()} ₺
                </span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Parça Maliyeti</span>
              <span className="font-semibold text-accent">
                {(record.part_cost || 0).toLocaleString()} ₺
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">İşçilik Maliyeti</span>
              <span className="font-semibold text-primary">
                {(record.labor_cost || 0).toLocaleString()} ₺
              </span>
            </div>
            <div className="flex justify-between text-sm pt-2 border-t border-border">
              <span className="font-semibold">Toplam Maliyet</span>
              <span className="font-bold text-foreground">
                {totalCost.toLocaleString()} ₺
              </span>
            </div>
          </div>
        </Card>

        {/* Media Section - Placeholder */}
        <Card className="p-4 mb-4">
          <h3 className="text-sm font-semibold text-muted-foreground mb-3">Fotoğraf / Video</h3>
          <div className="space-y-4">
            <div>
              <p className="text-xs font-semibold text-accent mb-2">İşlem Öncesi</p>
              <div className="p-4 bg-muted/50 rounded-lg text-center">
                <p className="text-xs text-muted-foreground">Henüz fotoğraf eklenmemiş</p>
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-accent mb-2">İşlem Sırası</p>
              <div className="p-4 bg-muted/50 rounded-lg text-center">
                <p className="text-xs text-muted-foreground">Henüz fotoğraf eklenmemiş</p>
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-accent mb-2">İşlem Sonrası</p>
              <div className="p-4 bg-muted/50 rounded-lg text-center">
                <p className="text-xs text-muted-foreground">Henüz fotoğraf eklenmemiş</p>
              </div>
            </div>
          </div>
        </Card>

        {/* Go to Vehicle Button */}
        <Button
          variant="outline"
          className="w-full"
          onClick={() => navigate(`/vehicle/${vehicle.id}`)}
        >
          Araca Git
        </Button>
      </div>
    </div>
  );
};

export default ServiceRecordDetail;
