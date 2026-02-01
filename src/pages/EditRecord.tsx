import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Check } from "lucide-react";
import { toast } from "sonner";
import { useGoBack } from "@/hooks/useGoBack";
import { handleRecordStatusChange } from "@/hooks/useVehicleStatusManager";

interface ServiceRecord {
  id: string;
  vehicle_id: string;
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
  record_status?: string;
}

const EditRecord = () => {
  const { recordId } = useParams();
  const navigate = useNavigate();
  const goBack = useGoBack(`/service-record/${recordId}`);
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [record, setRecord] = useState<ServiceRecord | null>(null);

  // Form state
  const [operationType, setOperationType] = useState<"degisim" | "onarim" | "bakim" | "">("");
  const [partSource, setPartSource] = useState<"cikma" | "sifir" | "">("");
  const [partQuality, setPartQuality] = useState<"oem" | "muadil" | "">("");
  const [quantity, setQuantity] = useState(1);
  const [unitPrice, setUnitPrice] = useState(0);
  const [recordStatus, setRecordStatus] = useState<"tespit" | "devam" | "tamamlandi">("tespit");

  const [formData, setFormData] = useState({
    description: "",
    laborCost: 0,
    serviceDate: new Date().toISOString().split("T")[0],
    km_at_service: 0,
    technician: "",
  });

  useEffect(() => {
    if (recordId) {
      fetchRecord();
    }
  }, [recordId]);

  const fetchRecord = async () => {
    try {
      const { data, error } = await supabase
        .from("service_records")
        .select("*")
        .eq("id", recordId)
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        toast.error("Kayıt bulunamadı");
        navigate("/");
        return;
      }

      setRecord(data);

      // Pre-fill form with existing data
      setOperationType((data.operation_type as any) || "");
      setPartSource((data.part_source as any) || "");
      setPartQuality((data.part_quality as any) || "");
      setQuantity(data.quantity || 1);
      setUnitPrice(data.unit_price || 0);
      setRecordStatus((data.record_status as any) || "tespit");
      setFormData({
        description: data.description || "",
        laborCost: data.labor_cost || 0,
        serviceDate: data.service_date ? data.service_date.split("T")[0] : new Date().toISOString().split("T")[0],
        km_at_service: data.km_at_service || 0,
        technician: data.technician || "",
      });
    } catch (error: any) {
      toast.error("Veri yüklenirken hata oluştu");
      console.error(error);
    } finally {
      setInitialLoading(false);
    }
  };

  const getTotalSteps = () => {
    if (record?.operation_type === "bakim") return 2; // Details -> Summary
    return 5; // Operation -> Source -> Quality -> Details -> Summary
  };

  const handleNext = () => {
    if (record?.operation_type === "bakim") {
      // Periodic maintenance - simplified flow
      setCurrentStep((prev) => Math.min(prev + 1, getTotalSteps()));
      return;
    }

    // Standard flow validations
    if (currentStep === 1 && !operationType) {
      toast.error("Lütfen işlem türünü seçin");
      return;
    }

    if (currentStep === 2 && !partSource) {
      toast.error("Lütfen parça kaynağını seçin");
      return;
    }

    if (currentStep === 3 && !partQuality) {
      toast.error("Lütfen parça kalitesini seçin");
      return;
    }

    setCurrentStep((prev) => Math.min(prev + 1, getTotalSteps()));
  };

  const handleBack = () => {
    if (currentStep === 1) {
      navigate(`/service-record/${recordId}`);
    } else {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleSubmit = async () => {
    if (!record) return;

    setLoading(true);

    try {
      const partCost = quantity * unitPrice;
      
      // Get the previous status to compare
      const previousStatus = record.record_status;

      const { error } = await supabase
        .from("service_records")
        .update({
          description: formData.description,
          km_at_service: formData.km_at_service,
          service_date: formData.serviceDate,
          part_cost: partCost,
          labor_cost: formData.laborCost,
          quantity: quantity,
          unit_price: unitPrice,
          technician: formData.technician,
          operation_type: operationType || record.operation_type,
          part_source: partSource || record.part_source,
          part_quality: partQuality || record.part_quality,
          record_status: recordStatus,
          completed_at: recordStatus === "tamamlandi" ? new Date().toISOString() : null,
        })
        .eq("id", record.id);

      if (error) throw error;

      // Update vehicle km if changed
      await supabase
        .from("vehicles")
        .update({ current_km: formData.km_at_service })
        .eq("id", record.vehicle_id);

      // Update vehicle status if record status changed
      if (previousStatus !== recordStatus) {
        // Get estimated duration from original record for delivery calculation
        const { data: fullRecord } = await supabase
          .from("service_records")
          .select("estimated_duration_minutes")
          .eq("id", record.id)
          .single();
          
        await handleRecordStatusChange(
          record.vehicle_id, 
          recordStatus, 
          fullRecord?.estimated_duration_minutes
        );
      }

      toast.success("Kayıt başarıyla güncellendi!");
      navigate(`/vehicle/${record.vehicle_id}`);
    } catch (error: any) {
      toast.error(error.message || "Kayıt güncellenirken hata oluştu");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const progressPercent = (currentStep / getTotalSteps()) * 100;

  if (initialLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Yükleniyor...</p>
      </div>
    );
  }

  if (!record) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Kayıt bulunamadı</p>
          <Button onClick={() => navigate("/")}>Ana Sayfaya Dön</Button>
        </div>
      </div>
    );
  }

  // Periodic maintenance (bakim) - simplified edit flow
  if (record.operation_type === "bakim") {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <div className="container mx-auto p-6 max-w-md flex-1 flex flex-col">
          <div className="flex items-center gap-4 mb-4">
            <Button variant="ghost" size="icon" onClick={handleBack} className="shrink-0">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-lg font-bold text-foreground">Kaydı Düzenle</h1>
          </div>

          <div className="mb-6">
            <Progress value={progressPercent} className="h-1 mb-2" />
            <p className="text-xs text-center text-muted-foreground">
              Adım {currentStep} / {getTotalSteps()}
            </p>
          </div>

          <div className="flex-1">
            {currentStep === 1 && (
              <DetailsStep
                formData={formData}
                setFormData={setFormData}
              />
            )}

            {currentStep === 2 && (
              <SummaryStep
                record={record}
                operationType={operationType || (record.operation_type as any)}
                partSource={partSource || (record.part_source as any)}
                partQuality={partQuality || (record.part_quality as any)}
                quantity={quantity}
                unitPrice={unitPrice}
                formData={formData}
                recordStatus={recordStatus}
                setRecordStatus={setRecordStatus}
              />
            )}
          </div>

          <div className="flex gap-3 pt-4">
            {currentStep > 1 && (
              <Button variant="outline" onClick={handleBack} className="flex-1 h-12">
                Geri
              </Button>
            )}
            <Button
              onClick={currentStep === getTotalSteps() ? handleSubmit : handleNext}
              disabled={loading}
              className="flex-1 h-12 bg-accent hover:bg-accent/90"
            >
              {loading ? "Kaydediliyor..." : currentStep === getTotalSteps() ? "Güncelle" : "İleri"}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Standard flow
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="container mx-auto p-6 max-w-md flex-1 flex flex-col">
        <div className="flex items-center gap-4 mb-4">
          <Button variant="ghost" size="icon" onClick={handleBack} className="shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-bold text-foreground">Kaydı Düzenle</h1>
        </div>

        <div className="mb-6">
          <Progress value={progressPercent} className="h-1 mb-2" />
          <p className="text-xs text-center text-muted-foreground">
            Adım {currentStep} / {getTotalSteps()}
          </p>
        </div>

        <div className="flex-1">
          {currentStep === 1 && (
            <OperationTypeStep
              operationType={operationType}
              setOperationType={setOperationType}
            />
          )}

          {currentStep === 2 && (
            <PartSourceStep
              partSource={partSource}
              setPartSource={setPartSource}
            />
          )}

          {currentStep === 3 && (
            <PartQualityStep
              partQuality={partQuality}
              setPartQuality={setPartQuality}
              quantity={quantity}
              setQuantity={setQuantity}
              unitPrice={unitPrice}
              setUnitPrice={setUnitPrice}
            />
          )}

          {currentStep === 4 && (
            <DetailsStep
              formData={formData}
              setFormData={setFormData}
            />
          )}

          {currentStep === 5 && (
            <SummaryStep
              record={record}
              operationType={operationType || (record.operation_type as any)}
              partSource={partSource || (record.part_source as any)}
              partQuality={partQuality || (record.part_quality as any)}
              quantity={quantity}
              unitPrice={unitPrice}
              formData={formData}
              recordStatus={recordStatus}
              setRecordStatus={setRecordStatus}
            />
          )}
        </div>

        <div className="flex gap-3 pt-4">
          {currentStep > 1 && (
            <Button variant="outline" onClick={handleBack} className="flex-1 h-12">
              Geri
            </Button>
          )}
          <Button
            onClick={currentStep === getTotalSteps() ? handleSubmit : handleNext}
            disabled={loading}
            className="flex-1 h-12 bg-accent hover:bg-accent/90"
          >
            {loading ? "Kaydediliyor..." : currentStep === getTotalSteps() ? "Güncelle" : "İleri"}
          </Button>
        </div>
      </div>
    </div>
  );
};

// Step Components
const OperationTypeStep = ({
  operationType,
  setOperationType,
}: {
  operationType: string;
  setOperationType: (value: "degisim" | "onarim") => void;
}) => (
  <div>
    <h2 className="text-xl font-bold text-foreground mb-4">İşlem Türü</h2>
    <p className="text-sm text-muted-foreground mb-6">Bu parçada ne tür işlem yapıldı?</p>
    <div className="space-y-3">
      <button
        onClick={() => setOperationType("degisim")}
        className={`w-full p-5 text-left rounded-xl border-2 transition-all flex justify-between items-center ${
          operationType === "degisim"
            ? "border-accent bg-accent/5"
            : "border-border hover:border-accent/50"
        }`}
      >
        <div>
          <span className={operationType === "degisim" ? "text-accent font-bold text-lg" : "text-foreground font-semibold text-lg"}>
            Değişim
          </span>
          <p className="text-sm text-muted-foreground mt-1">Parça tamamen değiştirildi</p>
        </div>
        {operationType === "degisim" && <Check className="h-6 w-6 text-accent" />}
      </button>

      <button
        onClick={() => setOperationType("onarim")}
        className={`w-full p-5 text-left rounded-xl border-2 transition-all flex justify-between items-center ${
          operationType === "onarim"
            ? "border-accent bg-accent/5"
            : "border-border hover:border-accent/50"
        }`}
      >
        <div>
          <span className={operationType === "onarim" ? "text-accent font-bold text-lg" : "text-foreground font-semibold text-lg"}>
            Onarım
          </span>
          <p className="text-sm text-muted-foreground mt-1">Parça tamir edildi</p>
        </div>
        {operationType === "onarim" && <Check className="h-6 w-6 text-accent" />}
      </button>
    </div>
  </div>
);

const PartSourceStep = ({
  partSource,
  setPartSource,
}: {
  partSource: string;
  setPartSource: (value: "cikma" | "sifir") => void;
}) => (
  <div>
    <h2 className="text-xl font-bold text-foreground mb-4">Parça Kaynağı</h2>
    <p className="text-sm text-muted-foreground mb-6">Kullanılan parça hangi türde?</p>
    <div className="space-y-3">
      <button
        onClick={() => setPartSource("sifir")}
        className={`w-full p-5 text-left rounded-xl border-2 transition-all flex justify-between items-center ${
          partSource === "sifir"
            ? "border-accent bg-accent/5"
            : "border-border hover:border-accent/50"
        }`}
      >
        <div>
          <span className={partSource === "sifir" ? "text-accent font-bold text-lg" : "text-foreground font-semibold text-lg"}>
            Sıfır Ürün
          </span>
          <p className="text-sm text-muted-foreground mt-1">Yeni, kullanılmamış parça</p>
        </div>
        {partSource === "sifir" && <Check className="h-6 w-6 text-accent" />}
      </button>

      <button
        onClick={() => setPartSource("cikma")}
        className={`w-full p-5 text-left rounded-xl border-2 transition-all flex justify-between items-center ${
          partSource === "cikma"
            ? "border-accent bg-accent/5"
            : "border-border hover:border-accent/50"
        }`}
      >
        <div>
          <span className={partSource === "cikma" ? "text-accent font-bold text-lg" : "text-foreground font-semibold text-lg"}>
            Çıkma Ürün
          </span>
          <p className="text-sm text-muted-foreground mt-1">İkinci el, yeniden kullanılan parça</p>
        </div>
        {partSource === "cikma" && <Check className="h-6 w-6 text-accent" />}
      </button>
    </div>
  </div>
);

const PartQualityStep = ({
  partQuality,
  setPartQuality,
  quantity,
  setQuantity,
  unitPrice,
  setUnitPrice,
}: {
  partQuality: string;
  setPartQuality: (value: "oem" | "muadil") => void;
  quantity: number;
  setQuantity: (value: number) => void;
  unitPrice: number;
  setUnitPrice: (value: number) => void;
}) => (
  <div>
    <h2 className="text-xl font-bold text-foreground mb-4">Parça Kalitesi</h2>
    <p className="text-sm text-muted-foreground mb-6">Parça orijinal mi yoksa muadil mi?</p>
    <div className="space-y-3 mb-8">
      <button
        onClick={() => setPartQuality("oem")}
        className={`w-full p-5 text-left rounded-xl border-2 transition-all flex justify-between items-center ${
          partQuality === "oem"
            ? "border-accent bg-accent/5"
            : "border-border hover:border-accent/50"
        }`}
      >
        <div>
          <span className={partQuality === "oem" ? "text-accent font-bold text-lg" : "text-foreground font-semibold text-lg"}>
            OEM (Orijinal)
          </span>
          <p className="text-sm text-muted-foreground mt-1">Üretici orijinal parçası</p>
        </div>
        {partQuality === "oem" && <Check className="h-6 w-6 text-accent" />}
      </button>

      <button
        onClick={() => setPartQuality("muadil")}
        className={`w-full p-5 text-left rounded-xl border-2 transition-all flex justify-between items-center ${
          partQuality === "muadil"
            ? "border-accent bg-accent/5"
            : "border-border hover:border-accent/50"
        }`}
      >
        <div>
          <span className={partQuality === "muadil" ? "text-accent font-bold text-lg" : "text-foreground font-semibold text-lg"}>
            Muadil
          </span>
          <p className="text-sm text-muted-foreground mt-1">Yan sanayi / alternatif parça</p>
        </div>
        {partQuality === "muadil" && <Check className="h-6 w-6 text-accent" />}
      </button>
    </div>

    <div className="space-y-4 pt-4 border-t border-border">
      <h3 className="font-semibold text-foreground">Miktar ve Fiyat</h3>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="quantity">Adet</Label>
          <Input
            id="quantity"
            type="number"
            min={1}
            value={quantity}
            onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="unitPrice">Adet Fiyatı (₺)</Label>
          <Input
            id="unitPrice"
            type="number"
            min={0}
            value={unitPrice}
            onChange={(e) => setUnitPrice(parseFloat(e.target.value) || 0)}
            className="mt-1"
          />
        </div>
      </div>
      <div className="p-3 bg-muted rounded-lg">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Toplam Parça Maliyeti</span>
          <span className="font-bold text-accent">{(quantity * unitPrice).toLocaleString()} ₺</span>
        </div>
      </div>
    </div>
  </div>
);

const DetailsStep = ({
  formData,
  setFormData,
}: {
  formData: any;
  setFormData: (data: any) => void;
}) => (
  <div>
    <h2 className="text-xl font-bold text-foreground mb-6">İşlem Bilgileri</h2>

    <div className="space-y-4">
      <div>
        <Label htmlFor="description">Açıklama</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Yapılan işlem hakkında detaylı açıklama..."
          rows={3}
          className="mt-1"
        />
      </div>

      <div>
        <Label htmlFor="laborCost">İşçilik Maliyeti (₺)</Label>
        <Input
          id="laborCost"
          type="number"
          value={formData.laborCost}
          onChange={(e) => setFormData({ ...formData, laborCost: parseFloat(e.target.value) || 0 })}
          className="mt-1"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="serviceDate">İşlem Tarihi</Label>
          <Input
            id="serviceDate"
            type="date"
            value={formData.serviceDate}
            onChange={(e) => setFormData({ ...formData, serviceDate: e.target.value })}
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="km">Kilometre</Label>
          <Input
            id="km"
            type="number"
            value={formData.km_at_service}
            onChange={(e) => setFormData({ ...formData, km_at_service: parseInt(e.target.value) || 0 })}
            className="mt-1"
          />
        </div>
      </div>

      <div>
        <Label htmlFor="technician">Tekniker</Label>
        <Input
          id="technician"
          value={formData.technician}
          onChange={(e) => setFormData({ ...formData, technician: e.target.value })}
          placeholder="İşlemi yapan teknikerin adı"
          className="mt-1"
        />
      </div>
    </div>
  </div>
);

const SummaryStep = ({
  record,
  operationType,
  partSource,
  partQuality,
  quantity,
  unitPrice,
  formData,
  recordStatus,
  setRecordStatus,
}: {
  record: ServiceRecord;
  operationType: string;
  partSource: string;
  partQuality: string;
  quantity: number;
  unitPrice: number;
  formData: any;
  recordStatus: "tespit" | "devam" | "tamamlandi";
  setRecordStatus: (status: "tespit" | "devam" | "tamamlandi") => void;
}) => {
  const partCost = quantity * unitPrice;
  const totalCost = partCost + (formData.laborCost || 0);

  const getOperationLabel = (type: string) => {
    switch (type) {
      case "degisim": return "Değişim";
      case "onarim": return "Onarım";
      case "bakim": return "Bakım";
      default: return "-";
    }
  };

  return (
    <div>
      <h2 className="text-xl font-bold text-foreground mb-4">Özet</h2>
      <Card className="p-4 space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Kayıt</span>
            <span className="font-semibold">{record.title}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">İşlem Türü</span>
            <span className="font-semibold">{getOperationLabel(operationType)}</span>
          </div>
          {partSource && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Parça Kaynağı</span>
              <span className="font-semibold capitalize">{partSource === "sifir" ? "Sıfır" : "Çıkma"}</span>
            </div>
          )}
          {partQuality && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Parça Kalitesi</span>
              <span className="font-semibold uppercase">{partQuality}</span>
            </div>
          )}
        </div>

        <div className="pt-3 border-t border-border space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Parça Maliyeti</span>
            <span className="font-semibold">{partCost.toLocaleString()} ₺</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">İşçilik Maliyeti</span>
            <span className="font-semibold">{(formData.laborCost || 0).toLocaleString()} ₺</span>
          </div>
          <div className="flex justify-between text-base font-bold pt-2 border-t border-border">
            <span>Toplam Maliyet</span>
            <span className="text-accent">{totalCost.toLocaleString()} ₺</span>
          </div>
        </div>

        <div className="pt-3 border-t border-border space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Tarih</span>
            <span className="font-semibold">{formData.serviceDate}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Kilometre</span>
            <span className="font-semibold">{formData.km_at_service.toLocaleString()} km</span>
          </div>
          {formData.technician && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Tekniker</span>
              <span className="font-semibold">{formData.technician}</span>
            </div>
          )}
        </div>

        {formData.description && (
          <div className="pt-3 border-t border-border">
            <p className="text-xs text-muted-foreground mb-1">Açıklama</p>
            <p className="text-sm p-2 bg-muted rounded">{formData.description}</p>
          </div>
        )}

        {/* Record Status Selection */}
        <div className="pt-4 border-t border-border">
          <h4 className="font-semibold text-sm text-muted-foreground mb-3">İşlem Durumu</h4>
          <div className="flex gap-2">
            <button
              onClick={() => setRecordStatus("tespit")}
              className={`flex-1 py-3 px-2 rounded-lg font-semibold text-sm transition-all ${
                recordStatus === "tespit"
                  ? "bg-red-500 text-white"
                  : "bg-muted text-muted-foreground hover:bg-red-100"
              }`}
            >
              Tespit Edildi
            </button>
            <button
              onClick={() => setRecordStatus("devam")}
              className={`flex-1 py-3 px-2 rounded-lg font-semibold text-sm transition-all ${
                recordStatus === "devam"
                  ? "bg-yellow-500 text-white"
                  : "bg-muted text-muted-foreground hover:bg-yellow-100"
              }`}
            >
              Devam Ediyor
            </button>
            <button
              onClick={() => setRecordStatus("tamamlandi")}
              className={`flex-1 py-3 px-2 rounded-lg font-semibold text-sm transition-all ${
                recordStatus === "tamamlandi"
                  ? "bg-green-600 text-white"
                  : "bg-muted text-muted-foreground hover:bg-green-100"
              }`}
            >
              Tamamlandı
            </button>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default EditRecord;
