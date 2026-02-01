import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ArrowLeft,
  Database,
  Download,
  Upload,
  Cloud,
  RefreshCw,
  Check,
  AlertTriangle,
  Plus,
} from "lucide-react";
import { toast } from "sonner";
import StorageSourceCard from "@/components/storage/StorageSourceCard";
import BackupHistoryCard, {
  saveBackupToHistory,
  BackupRecord,
} from "@/components/storage/BackupHistoryCard";
import AddStorageSourceDialog from "@/components/storage/AddStorageSourceDialog";
import OfflineStatusCard from "@/components/storage/OfflineStatusCard";
import { useGoBack } from "@/hooks/useGoBack";

const StorageSettings = () => {
  const navigate = useNavigate();
  const goBack = useGoBack("/admin-panel");
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [showAddSource, setShowAddSource] = useState(false);
  const [historyKey, setHistoryKey] = useState(0);

  const [stats, setStats] = useState({
    vehicles: 0,
    serviceRecords: 0,
    photos: 0,
    faultDetections: 0,
  });

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const [vehiclesRes, recordsRes, photosRes, faultsRes] = await Promise.all([
        supabase.from("vehicles").select("id", { count: "exact", head: true }),
        supabase.from("service_records").select("id", { count: "exact", head: true }),
        supabase.from("vehicle_photos").select("id", { count: "exact", head: true }),
        supabase.from("fault_detections").select("id", { count: "exact", head: true }),
      ]);

      setStats({
        vehicles: vehiclesRes.count || 0,
        serviceRecords: recordsRes.count || 0,
        photos: photosRes.count || 0,
        faultDetections: faultsRes.count || 0,
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const exportData = async () => {
    setExporting(true);
    try {
      const [
        vehiclesRes,
        recordsRes,
        photosRes,
        faultsRes,
        plannedRes,
        techniciansRes,
        aiModelsRes,
        adminRes,
      ] = await Promise.all([
        supabase.from("vehicles").select("*"),
        supabase.from("service_records").select("*"),
        supabase.from("vehicle_photos").select("*"),
        supabase.from("fault_detections").select("*"),
        supabase.from("planned_maintenance").select("*"),
        supabase.from("technicians").select("*"),
        supabase.from("ai_models").select("*"),
        supabase.from("admin_settings").select("*"),
      ]);

      const exportDataObj = {
        version: "1.0",
        exportDate: new Date().toISOString(),
        data: {
          vehicles: vehiclesRes.data || [],
          service_records: recordsRes.data || [],
          vehicle_photos: photosRes.data || [],
          fault_detections: faultsRes.data || [],
          planned_maintenance: plannedRes.data || [],
          technicians: techniciansRes.data || [],
          ai_models: aiModelsRes.data || [],
          admin_settings: adminRes.data || [],
        },
      };

      const jsonString = JSON.stringify(exportDataObj, null, 2);
      const blob = new Blob([jsonString], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const fileName = `umit-oto-backup-${new Date().toISOString().split("T")[0]}.json`;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      // Save to backup history
      const sizeKB = (new Blob([jsonString]).size / 1024).toFixed(1);
      const backupRecord: BackupRecord = {
        id: Date.now().toString(),
        date: new Date().toISOString(),
        size: `${sizeKB} KB`,
        vehicleCount: exportDataObj.data.vehicles.length,
        recordCount: exportDataObj.data.service_records.length,
        data: btoa(jsonString),
      };
      saveBackupToHistory(backupRecord);
      setHistoryKey((prev) => prev + 1);

      toast.success("Yedek dosyası indirildi ve geçmişe kaydedildi");
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Yedekleme sırasında hata oluştu");
    } finally {
      setExporting(false);
    }
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImporting(true);
    try {
      const text = await file.text();
      const importData = JSON.parse(text);

      if (!importData.version || !importData.data) {
        throw new Error("Geçersiz yedek dosyası formatı");
      }

      const confirmed = window.confirm(
        "Bu işlem mevcut verileri güncelleyecek. Devam etmek istiyor musunuz?"
      );
      if (!confirmed) {
        setImporting(false);
        return;
      }

      const { data: dataToImport } = importData;

      if (dataToImport.technicians?.length) {
        for (const tech of dataToImport.technicians) {
          await supabase.from("technicians").upsert(tech, { onConflict: "id" });
        }
      }

      if (dataToImport.vehicles?.length) {
        for (const vehicle of dataToImport.vehicles) {
          await supabase.from("vehicles").upsert(vehicle, { onConflict: "id" });
        }
      }

      if (dataToImport.service_records?.length) {
        for (const record of dataToImport.service_records) {
          await supabase.from("service_records").upsert(record, { onConflict: "id" });
        }
      }

      if (dataToImport.fault_detections?.length) {
        for (const fault of dataToImport.fault_detections) {
          await supabase.from("fault_detections").upsert(fault, { onConflict: "id" });
        }
      }

      if (dataToImport.planned_maintenance?.length) {
        for (const maintenance of dataToImport.planned_maintenance) {
          await supabase.from("planned_maintenance").upsert(maintenance, { onConflict: "id" });
        }
      }

      toast.success("Veriler başarıyla içe aktarıldı");
      fetchStats();
    } catch (error: any) {
      console.error("Import error:", error);
      toast.error(error.message || "İçe aktarma sırasında hata oluştu");
    } finally {
      setImporting(false);
      event.target.value = "";
    }
  };

  const handleSourceAdded = (sourceId: string, config?: Record<string, string>) => {
    if (sourceId === "local") {
      toast.success("Lokal depolama aktifleştirildi. Yedekler tarayıcı belleğinde saklanacak.");
    } else {
      toast.info(`${sourceId} entegrasyonu kaydedildi. Yakında aktif olacak.`);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-4 md:p-6 max-w-2xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={goBack}
            className="shrink-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold text-accent">Depolama & Yedekleme</h1>
            <p className="text-sm text-muted-foreground">
              Verilerinizi yönetin ve yedekleyin
            </p>
          </div>
        </div>

        {/* Offline Status */}
        <div className="mb-6">
          <OfflineStatusCard />
        </div>

        {/* Active Storage */}
        <Card className="p-4 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Depolama Kaynakları</h3>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAddSource(true)}
            >
              <Plus className="h-4 w-4 mr-1" />
              Yeni Kaynak Ekle
            </Button>
          </div>

          <div className="space-y-3 mb-4">
            <StorageSourceCard
              name="Lovable Cloud"
              description="Ana depolama kaynağı (Supabase)"
              isActive={true}
              isConnected={true}
              icon={<Cloud className="h-5 w-5 text-green-600" />}
            />
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-muted/50 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-foreground">{stats.vehicles}</div>
              <div className="text-xs text-muted-foreground">Araç</div>
            </div>
            <div className="bg-muted/50 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-foreground">{stats.serviceRecords}</div>
              <div className="text-xs text-muted-foreground">Servis Kaydı</div>
            </div>
            <div className="bg-muted/50 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-foreground">{stats.photos}</div>
              <div className="text-xs text-muted-foreground">Fotoğraf</div>
            </div>
            <div className="bg-muted/50 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-foreground">{stats.faultDetections}</div>
              <div className="text-xs text-muted-foreground">Arıza Tespiti</div>
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            className="w-full mt-3"
            onClick={fetchStats}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Yenile
          </Button>
        </Card>

        {/* Backup History */}
        <div className="mb-6">
          <BackupHistoryCard key={historyKey} onRestore={() => {}} />
        </div>

        {/* Backup Section */}
        <Card className="p-4 mb-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Database className="h-5 w-5 text-accent" />
            Yedekleme
          </h3>

          <div className="space-y-3">
            <Button
              className="w-full bg-accent hover:bg-accent/90"
              onClick={exportData}
              disabled={exporting}
            >
              {exporting ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Hazırlanıyor...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Yedek İndir (JSON)
                </>
              )}
            </Button>

            <p className="text-xs text-muted-foreground text-center">
              Tüm araç, servis kaydı, fotoğraf URL'leri ve ayarlar dahil
            </p>
          </div>
        </Card>

        {/* Restore Section */}
        <Card className="p-4 mb-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Upload className="h-5 w-5 text-accent" />
            Geri Yükleme
          </h3>

          <div className="space-y-3">
            <Label htmlFor="importFile" className="block">
              <div
                className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-accent transition-colors ${
                  importing ? "opacity-50 pointer-events-none" : ""
                }`}
              >
                {importing ? (
                  <>
                    <RefreshCw className="h-8 w-8 mx-auto text-muted-foreground animate-spin mb-2" />
                    <span className="text-muted-foreground">İçe aktarılıyor...</span>
                  </>
                ) : (
                  <>
                    <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                    <span className="text-muted-foreground">
                      Yedek dosyasını yüklemek için tıklayın
                    </span>
                  </>
                )}
              </div>
              <Input
                id="importFile"
                type="file"
                accept=".json"
                className="hidden"
                onChange={handleImport}
                disabled={importing}
              />
            </Label>

            <div className="flex items-start gap-2 text-xs text-orange-600 bg-orange-50 p-3 rounded-lg">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>
                Geri yükleme mevcut verileri güncelleyecektir. İşlemden önce mevcut
                yedeğinizi aldığınızdan emin olun.
              </span>
            </div>
          </div>
        </Card>

        {/* Info Card */}
        <Card className="p-4 bg-muted/50">
          <div className="flex items-center gap-3 mb-3">
            <Check className="h-5 w-5 text-green-600" />
            <h3 className="font-semibold">Çoklu Platform Desteği</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            Yedeklerinizi JSON formatında indirip farklı cihazlarda saklayabilirsiniz.
            Bu dosyalar internet olmadan da görüntülenebilir ve gerektiğinde sisteme
            geri yüklenebilir.
          </p>
        </Card>

        {/* Add Storage Source Dialog */}
        <AddStorageSourceDialog
          open={showAddSource}
          onOpenChange={setShowAddSource}
          onSourceAdded={handleSourceAdded}
        />
      </div>
    </div>
  );
};

export default StorageSettings;
