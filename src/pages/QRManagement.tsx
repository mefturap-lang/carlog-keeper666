import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ArrowLeft, RefreshCw, QrCode, Trash2, Car, Upload, Plus, Minus, X, Link, Save, Wand2 } from "lucide-react";
import { toast } from "sonner";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useGoBack } from "@/hooks/useGoBack";

interface SlotData {
  slotNumber: number;
  vehicle: {
    id: string;
    plate_number: string;
    brand: string;
    model: string;
    owner_name: string | null;
  } | null;
  qrImageUrl: string | null;
  qrContent: string | null;
}

const QRManagement = () => {
  const navigate = useNavigate();
  const goBack = useGoBack("/admin-panel");
  const [slots, setSlots] = useState<SlotData[]>([]);
  const [loading, setLoading] = useState(true);
  const [clearingSlot, setClearingSlot] = useState<number | null>(null);
  const [uploadingSlot, setUploadingSlot] = useState<number | null>(null);
  const [deletingQR, setDeletingQR] = useState<number | null>(null);
  const [selectedSlotForUpload, setSelectedSlotForUpload] = useState<number | null>(null);
  const [slotCount, setSlotCount] = useState(30);
  const [editingQrContent, setEditingQrContent] = useState<{ slot: number; content: string } | null>(null);
  const [savingQrContent, setSavingQrContent] = useState<number | null>(null);
  const [bulkStartNumber, setBulkStartNumber] = useState("");
  const [showBulkDialog, setShowBulkDialog] = useState(false);
  const [bulkSaving, setBulkSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  useEffect(() => {
    if (slotCount > 0) {
      fetchSlots();
    }
  }, [slotCount]);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from("admin_settings")
        .select("slot_count")
        .limit(1)
        .single();

      if (error) throw error;
      if (data?.slot_count) {
        setSlotCount(data.slot_count);
      }
    } catch (error) {
      console.error("Error fetching settings:", error);
    }
  };

  const fetchSlots = async () => {
    setLoading(true);
    try {
      const { data: vehicles, error } = await supabase
        .from("vehicles")
        .select("id, qr_code, plate_number, brand, model, owner_name");

      if (error) throw error;

      const { data: qrFiles } = await supabase.storage
        .from("vehicle-photos")
        .list("qr-codes");

      const { data: qrMappings } = await supabase
        .from("qr_mappings")
        .select("slot_number, qr_content");

      const slotData: SlotData[] = [];
      for (let i = 1; i <= slotCount; i++) {
        const vehicle = vehicles?.find(v => v.qr_code === String(i));
        const qrFile = qrFiles?.find(f => f.name.startsWith(`qr-slot-${i}.`));
        const qrImageUrl = qrFile 
          ? supabase.storage.from("vehicle-photos").getPublicUrl(`qr-codes/${qrFile.name}`).data.publicUrl
          : null;
        const mapping = qrMappings?.find(m => m.slot_number === i);

        slotData.push({
          slotNumber: i,
          vehicle: vehicle ? {
            id: vehicle.id,
            plate_number: vehicle.plate_number,
            brand: vehicle.brand,
            model: vehicle.model,
            owner_name: vehicle.owner_name,
          } : null,
          qrImageUrl,
          qrContent: mapping?.qr_content || null,
        });
      }

      setSlots(slotData);
    } catch (error) {
      toast.error("Slot bilgileri yüklenirken hata oluştu");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const updateSlotCount = async (newCount: number) => {
    if (newCount < 1 || newCount > 100) {
      toast.error("Slot sayısı 1-100 arasında olmalıdır");
      return;
    }

    try {
      const { error } = await supabase
        .from("admin_settings")
        .update({ slot_count: newCount })
        .eq("id", (await supabase.from("admin_settings").select("id").limit(1).single()).data?.id);

      if (error) throw error;
      
      setSlotCount(newCount);
      toast.success(`Slot sayısı ${newCount} olarak güncellendi`);
    } catch (error) {
      toast.error("Slot sayısı güncellenirken hata oluştu");
      console.error(error);
    }
  };

  const clearSlot = async (slotNumber: number, vehicleId: string) => {
    setClearingSlot(slotNumber);
    try {
      await supabase.from("service_records").delete().eq("vehicle_id", vehicleId);
      await supabase.from("vehicle_photos").delete().eq("vehicle_id", vehicleId);
      await supabase.from("planned_maintenance").delete().eq("vehicle_id", vehicleId);
      await supabase.from("vehicle_summaries").delete().eq("vehicle_id", vehicleId);
      await supabase.from("fault_detections").delete().eq("vehicle_id", vehicleId);
      await supabase.from("periodic_maintenance_records").delete().eq("vehicle_id", vehicleId);

      const { error } = await supabase.from("vehicles").delete().eq("id", vehicleId);
      if (error) throw error;

      toast.success(`Slot ${slotNumber}'deki araç kaldırıldı`);
      fetchSlots();
    } catch (error: any) {
      toast.error("Araç kaldırılırken hata oluştu");
      console.error(error);
    } finally {
      setClearingSlot(null);
    }
  };

  const handleQRImageUpload = async (slotNumber: number, file: File) => {
    setUploadingSlot(slotNumber);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `qr-slot-${slotNumber}.${fileExt}`;
      const filePath = `qr-codes/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("vehicle-photos")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("vehicle-photos")
        .getPublicUrl(filePath);

      setSlots(prev => prev.map(slot => 
        slot.slotNumber === slotNumber 
          ? { ...slot, qrImageUrl: publicUrl }
          : slot
      ));

      toast.success(`Slot ${slotNumber} için QR görsel yüklendi`);
      setSelectedSlotForUpload(null);
    } catch (error: any) {
      toast.error("QR görsel yüklenirken hata oluştu");
      console.error(error);
    } finally {
      setUploadingSlot(null);
    }
  };

  const deleteQRImage = async (slotNumber: number) => {
    setDeletingQR(slotNumber);
    try {
      const { data: files } = await supabase.storage
        .from("vehicle-photos")
        .list("qr-codes");

      const qrFile = files?.find(f => f.name.startsWith(`qr-slot-${slotNumber}.`));
      
      if (qrFile) {
        const { error } = await supabase.storage
          .from("vehicle-photos")
          .remove([`qr-codes/${qrFile.name}`]);

        if (error) throw error;
      }

      setSlots(prev => prev.map(slot => 
        slot.slotNumber === slotNumber 
          ? { ...slot, qrImageUrl: null }
          : slot
      ));

      toast.success(`Slot ${slotNumber} QR görseli silindi`);
    } catch (error: any) {
      toast.error("QR görsel silinirken hata oluştu");
      console.error(error);
    } finally {
      setDeletingQR(null);
    }
  };

  const saveQrContent = async (slotNumber: number, content: string) => {
    setSavingQrContent(slotNumber);
    try {
      const trimmedContent = content.trim();
      
      if (!trimmedContent) {
        await supabase
          .from("qr_mappings")
          .delete()
          .eq("slot_number", slotNumber);
        
        setSlots(prev => prev.map(slot => 
          slot.slotNumber === slotNumber 
            ? { ...slot, qrContent: null }
            : slot
        ));
        toast.success(`Slot ${slotNumber} QR içeriği silindi`);
      } else {
        const { error } = await supabase
          .from("qr_mappings")
          .upsert(
            { slot_number: slotNumber, qr_content: trimmedContent },
            { onConflict: "slot_number" }
          );

        if (error) throw error;

        setSlots(prev => prev.map(slot => 
          slot.slotNumber === slotNumber 
            ? { ...slot, qrContent: trimmedContent }
            : slot
        ));
        toast.success(`Slot ${slotNumber} QR içeriği kaydedildi`);
      }
      
      setEditingQrContent(null);
    } catch (error: any) {
      if (error.code === "23505") {
        toast.error("Bu QR içeriği başka bir slotta zaten kayıtlı");
      } else {
        toast.error("QR içeriği kaydedilirken hata oluştu");
      }
      console.error(error);
    } finally {
      setSavingQrContent(null);
    }
  };

  const bulkGenerateMappings = async () => {
    const startNum = parseInt(bulkStartNumber);
    if (isNaN(startNum) || startNum < 0) {
      toast.error("Geçerli bir başlangıç numarası girin");
      return;
    }

    setBulkSaving(true);
    try {
      const mappings = [];
      for (let i = 1; i <= slotCount; i++) {
        mappings.push({
          slot_number: i,
          qr_content: `https://umit.oto.slot${startNum + i - 1}`,
        });
      }

      await supabase.from("qr_mappings").delete().gte("slot_number", 1);
      const { error } = await supabase.from("qr_mappings").insert(mappings);
      if (error) throw error;

      toast.success(`${slotCount} slot için QR içerikleri oluşturuldu`);
      setShowBulkDialog(false);
      setBulkStartNumber("");
      fetchSlots();
    } catch (error) {
      toast.error("Toplu kayıt sırasında hata oluştu");
      console.error(error);
    } finally {
      setBulkSaving(false);
    }
  };

  const occupiedCount = slots.filter(s => s.vehicle !== null).length;
  const emptyCount = slots.filter(s => s.vehicle === null).length;
  const mappedCount = slots.filter(s => s.qrContent !== null).length;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-4 md:p-6 max-w-6xl">
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
            <div>
              <h1 className="text-xl font-bold text-accent">QR Yönetim Paneli</h1>
              <p className="text-sm text-muted-foreground">
                Slot durumlarını görüntüle ve yönet
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => updateSlotCount(slotCount - 1)}
                disabled={slotCount <= 1}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <span className="px-2 min-w-[60px] text-center font-medium">
                {slotCount} Slot
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => updateSlotCount(slotCount + 1)}
                disabled={slotCount >= 100}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            <Button
              variant="ghost"
              size="icon"
              onClick={fetchSlots}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <Card className="p-4 text-center">
            <div className="text-2xl font-bold text-foreground">{slotCount}</div>
            <div className="text-sm text-muted-foreground">Toplam Slot</div>
          </Card>
          <Card className="p-4 text-center bg-green-500/10 border-green-500/30">
            <div className="text-2xl font-bold text-green-600">{occupiedCount}</div>
            <div className="text-sm text-muted-foreground">Dolu</div>
          </Card>
          <Card className="p-4 text-center bg-orange-500/10 border-orange-500/30">
            <div className="text-2xl font-bold text-orange-600">{emptyCount}</div>
            <div className="text-sm text-muted-foreground">Boş</div>
          </Card>
          <Card className="p-4 text-center bg-blue-500/10 border-blue-500/30">
            <div className="text-2xl font-bold text-blue-600">{mappedCount}</div>
            <div className="text-sm text-muted-foreground">QR Eşleşmeli</div>
          </Card>
        </div>

        {/* Bulk Generate Button */}
        <div className="mb-4">
          <Dialog open={showBulkDialog} onOpenChange={setShowBulkDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Wand2 className="h-4 w-4" />
                Toplu QR İçeriği Oluştur
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-background">
              <DialogHeader>
                <DialogTitle>Toplu QR İçeriği Oluştur</DialogTitle>
                <DialogDescription>
                  Tüm slotlar için otomatik QR içeriği oluşturun. Format: https://umit.oto.slot[numara]
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <label className="text-sm font-medium">Başlangıç Numarası</label>
                  <Input
                    type="number"
                    placeholder="Örn: 2601"
                    value={bulkStartNumber}
                    onChange={(e) => setBulkStartNumber(e.target.value)}
                    className="mt-1"
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    Slot 1 → https://umit.oto.slot{bulkStartNumber || "2601"}<br/>
                    Slot 2 → https://umit.oto.slot{parseInt(bulkStartNumber || "2601") + 1 || "2602"}<br/>
                    ...
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowBulkDialog(false)}>
                  İptal
                </Button>
                <Button onClick={bulkGenerateMappings} disabled={bulkSaving || !bulkStartNumber}>
                  {bulkSaving ? "Oluşturuluyor..." : "Oluştur"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Slots Grid */}
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Yükleniyor...</div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {slots.map((slot) => (
              <Card
                key={slot.slotNumber}
                className={`p-3 relative transition-all ${
                  slot.vehicle
                    ? "bg-green-500/5 border-green-500/30 hover:border-green-500/50"
                    : "bg-muted/30 border-dashed hover:border-primary/50"
                }`}
              >
                {/* Slot Number Badge */}
                <div className={`absolute -top-2 -left-2 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                  slot.vehicle 
                    ? "bg-green-600 text-white" 
                    : "bg-muted-foreground/20 text-muted-foreground"
                }`}>
                  {slot.slotNumber}
                </div>

                <div className="pt-3 space-y-2">
                  {slot.vehicle ? (
                    <div 
                      className="cursor-pointer hover:bg-accent/10 rounded p-1 -m-1"
                      onClick={() => navigate(`/vehicle/${slot.vehicle!.id}`)}
                    >
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Car className="h-3 w-3" />
                        <span className="truncate">{slot.vehicle.brand} {slot.vehicle.model}</span>
                      </div>
                      <div className="font-semibold text-sm text-accent truncate">
                        {slot.vehicle.plate_number}
                      </div>
                      {slot.vehicle.owner_name && (
                        <div className="text-xs text-muted-foreground truncate">
                          {slot.vehicle.owner_name}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-2">
                      <QrCode className="h-8 w-8 mx-auto text-muted-foreground/40" />
                      <div className="text-xs text-muted-foreground mt-1">Boş Slot</div>
                    </div>
                  )}

                  {/* QR Content Display */}
                  {slot.qrContent && (
                    <div className="pt-1 text-xs text-blue-600 truncate flex items-center gap-1" title={slot.qrContent}>
                      <Link className="h-3 w-3 shrink-0" />
                      <span className="truncate">{slot.qrContent}</span>
                    </div>
                  )}

                  {/* QR Image Preview */}
                  {slot.qrImageUrl && (
                    <div className="pt-2 border-t">
                      <img 
                        src={slot.qrImageUrl} 
                        alt={`QR ${slot.slotNumber}`}
                        className="w-full h-16 object-contain rounded"
                      />
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex flex-col gap-1 pt-2 border-t">
                    {/* QR Content Edit */}
                    {editingQrContent?.slot === slot.slotNumber ? (
                      <div className="flex gap-1">
                        <Input
                          value={editingQrContent.content}
                          onChange={(e) => setEditingQrContent({ ...editingQrContent, content: e.target.value })}
                          placeholder="QR içeriği..."
                          className="h-7 text-xs"
                        />
                        <Button
                          variant="default"
                          size="icon"
                          className="h-7 w-7 shrink-0"
                          onClick={() => saveQrContent(slot.slotNumber, editingQrContent.content)}
                          disabled={savingQrContent === slot.slotNumber}
                        >
                          <Save className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 shrink-0"
                          onClick={() => setEditingQrContent(null)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full h-7 text-xs"
                        onClick={() => setEditingQrContent({ slot: slot.slotNumber, content: slot.qrContent || "" })}
                      >
                        <Link className="h-3 w-3 mr-1" />
                        {slot.qrContent ? "QR İçeriği Düzenle" : "QR İçeriği Ekle"}
                      </Button>
                    )}

                    {/* QR Image Upload */}
                    <Dialog open={selectedSlotForUpload === slot.slotNumber} onOpenChange={(open) => !open && setSelectedSlotForUpload(null)}>
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full h-7 text-xs"
                          onClick={() => setSelectedSlotForUpload(slot.slotNumber)}
                        >
                          <Upload className="h-3 w-3 mr-1" />
                          QR Görsel Yükle
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="bg-background">
                        <DialogHeader>
                          <DialogTitle>Slot {slot.slotNumber} - QR Görsel Yükle</DialogTitle>
                          <DialogDescription>
                            Bu slot için QR kod görselini yükleyin
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <Input
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                handleQRImageUpload(slot.slotNumber, file);
                              }
                            }}
                            disabled={uploadingSlot === slot.slotNumber}
                          />
                          {uploadingSlot === slot.slotNumber && (
                            <div className="text-sm text-muted-foreground text-center">
                              Yükleniyor...
                            </div>
                          )}
                        </div>
                      </DialogContent>
                    </Dialog>

                    {/* Delete QR Image */}
                    {slot.qrImageUrl && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full h-7 text-xs text-orange-600 border-orange-500/30 hover:border-orange-500/50"
                          >
                            <X className="h-3 w-3 mr-1" />
                            QR Görseli Sil
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="bg-background">
                          <AlertDialogHeader>
                            <AlertDialogTitle>QR Görselini Sil</AlertDialogTitle>
                            <AlertDialogDescription>
                              Slot {slot.slotNumber} için yüklenen QR görseli silinecek.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>İptal</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteQRImage(slot.slotNumber)}
                              disabled={deletingQR === slot.slotNumber}
                              className="bg-orange-600 text-white hover:bg-orange-700"
                            >
                              {deletingQR === slot.slotNumber ? "Siliniyor..." : "Sil"}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}

                    {/* Remove Vehicle */}
                    {slot.vehicle && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full h-7 text-xs text-destructive border-destructive/30 hover:border-destructive/50"
                          >
                            <Trash2 className="h-3 w-3 mr-1" />
                            Aracı Kaldır
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="bg-background">
                          <AlertDialogHeader>
                            <AlertDialogTitle>Aracı Kaldır</AlertDialogTitle>
                            <AlertDialogDescription>
                              Slot {slot.slotNumber}'deki {slot.vehicle.plate_number} plakalı araç ve tüm kayıtları silinecek.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>İptal</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => clearSlot(slot.slotNumber, slot.vehicle!.id)}
                              disabled={clearingSlot === slot.slotNumber}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              {clearingSlot === slot.slotNumber ? "Kaldırılıyor..." : "Kaldır"}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default QRManagement;
