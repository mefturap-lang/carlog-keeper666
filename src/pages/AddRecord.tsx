import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Check, Upload, Camera, Video } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { parseServiceData, getServiceGroups, getServiceSubGroups, getServiceParts, getServiceItems } from "@/utils/serviceDataParser";
import serviceDataCsv from "@/data/stok_listesi.csv?raw";
import VehicleBodyDiagram, { PartStatus } from "@/components/VehicleBodyDiagram";
import { useGoBack } from "@/hooks/useGoBack";
import { handleRecordStatusChange } from "@/hooks/useVehicleStatusManager";

const PERIODIC_MAINTENANCE_ITEMS = [
  { id: "motor_yagi", label: "Motor Yağı Değişimi" },
  { id: "hava_filtresi", label: "Hava Filtresi Değişimi" },
  { id: "polen_filtresi", label: "Polen Filtresi Değişimi" },
  { id: "yag_filtresi", label: "Yağ Filtresi Değişimi" },
  { id: "yakit_filtresi", label: "Mazot/Benzin Filtresi Değişimi" },
  { id: "sanziman_yagi", label: "Şanzıman Yağı Değişimi" },
  { id: "silecek", label: "Silecek Değişimi" },
];

const AddRecord = () => {
  const { vehicleId } = useParams();
  const navigate = useNavigate();
  const goBack = useGoBack(`/select-action/${vehicleId}`);
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [serviceData, setServiceData] = useState<any[]>([]);
  const [recordType, setRecordType] = useState<"standard" | "periodic" | null>(null);
  
  // Step 1: Category selection
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedSubGroup, setSelectedSubGroup] = useState("");
  const [selectedPart, setSelectedPart] = useState("");
  
  // Step 2: Sequential selection
  const [operationType, setOperationType] = useState<"degisim" | "onarim" | "">("");
  const [partSource, setPartSource] = useState<"cikma" | "sifir" | "">("");
  const [partQuality, setPartQuality] = useState<"oem" | "muadil" | "">("");
  const [quantity, setQuantity] = useState(1);
  const [unitPrice, setUnitPrice] = useState(0);
  const [selectedServiceItem, setSelectedServiceItem] = useState<any>(null);
  
  // Step 3: Form data
  const [formData, setFormData] = useState({
    description: "",
    laborCost: 0,
    partSerialNo: "",
    serviceDate: new Date().toISOString().split("T")[0],
    km_at_service: 0,
    recommendedInterval: "",
    technician: "",
    estimatedDurationMinutes: 60, // Default 1 hour
  });

  // Periodic maintenance
  const [selectedPeriodicItems, setSelectedPeriodicItems] = useState<string[]>([]);
  const [periodicDetails, setPeriodicDetails] = useState<Record<string, string>>({});

  // Bodywork step
  const [hasBodywork, setHasBodywork] = useState<boolean | null>(null);
  const [bodyParts, setBodyParts] = useState<Record<string, PartStatus>>({});

  // Step 4: Media
  const [mediaTab, setMediaTab] = useState<"before" | "during" | "after">("before");

  // Record status (tespit, devam, tamamlandi)
  const [recordStatus, setRecordStatus] = useState<"tespit" | "devam" | "tamamlandi">("tespit");

  useEffect(() => {
    const parsedData = parseServiceData(serviceDataCsv);
    setServiceData(parsedData);
  }, []);

  useEffect(() => {
    if (vehicleId) {
      fetchCurrentKm();
    }
  }, [vehicleId]);

  // Get unique groups from parsed CSV data as categories
  const categories = getServiceGroups(serviceData);
  const serviceSubGroups = selectedCategory ? getServiceSubGroups(serviceData, selectedCategory) : [];
  const serviceParts = selectedCategory && selectedSubGroup ? getServiceParts(serviceData, selectedCategory, selectedSubGroup) : [];
  const serviceItems = selectedCategory && selectedSubGroup && selectedPart ? getServiceItems(serviceData, selectedCategory, selectedSubGroup, selectedPart) : [];

  const fetchCurrentKm = async () => {
    const { data, error } = await supabase
      .from("vehicles")
      .select("current_km")
      .eq("id", vehicleId)
      .maybeSingle();

    if (data && !error) {
      setFormData((prev) => ({ ...prev, km_at_service: data.current_km }));
    }
  };

  const getTotalSteps = () => {
    if (recordType === "periodic") return 4; // Select items -> Details -> Bodywork -> Summary
    return 7; // Category -> Sequential selections -> Details -> Media -> Bodywork -> Summary
  };

  const handleNext = () => {
    if (recordType === null) {
      if (!formData.technician) {
        toast.error("Lütfen tekniker seçin");
        return;
      }
      toast.error("Lütfen bir işlem tipi seçin");
      return;
    }

    if (recordType === "periodic") {
      if (currentStep === 1 && selectedPeriodicItems.length === 0) {
        toast.error("Lütfen en az bir bakım öğesi seçin");
        return;
      }
      setCurrentStep((prev) => Math.min(prev + 1, getTotalSteps()));
      return;
    }

    // Standard flow validations
    if (currentStep === 1) {
      if (!selectedCategory) {
        toast.error("Lütfen bir kategori seçin");
        return;
      }
      if (!selectedSubGroup) {
        toast.error("Lütfen bir alt grup seçin");
        return;
      }
      if (!selectedPart) {
        toast.error("Lütfen bir parça seçin");
        return;
      }
    }
    
    if (currentStep === 2 && !operationType) {
      toast.error("Lütfen işlem türünü seçin");
      return;
    }
    
    if (currentStep === 3 && !partSource) {
      toast.error("Lütfen parça kaynağını seçin");
      return;
    }

    if (currentStep === 4 && !partQuality) {
      toast.error("Lütfen parça kalitesini seçin");
      return;
    }

    if (currentStep === 5) {
      if (!formData.description) {
        toast.error("Lütfen açıklama girin");
        return;
      }
      if (!formData.km_at_service) {
        toast.error("Lütfen kilometre girin");
        return;
      }
    }

    setCurrentStep((prev) => Math.min(prev + 1, getTotalSteps()));
  };

  const handleBack = () => {
    if (currentStep === 1 && recordType !== null) {
      setRecordType(null);
      return;
    }
    if (currentStep === 1) {
      navigate(`/select-action/${vehicleId}`);
    } else {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);

    try {
      const partCost = quantity * unitPrice;
      const stockCode = selectedServiceItem?.stokKodu || "";

      if (recordType === "periodic") {
        // Insert periodic maintenance record
        const { data: record, error } = await supabase.from("service_records").insert([
          {
            vehicle_id: vehicleId,
            title: "Periyodik Bakım",
            description: formData.description,
            km_at_service: formData.km_at_service,
            service_date: formData.serviceDate,
            labor_cost: formData.laborCost,
            technician: formData.technician,
            operation_type: "bakim",
            record_status: recordStatus,
            estimated_duration_minutes: formData.estimatedDurationMinutes,
            completed_at: recordStatus === "tamamlandi" ? new Date().toISOString() : null,
          },
        ]).select().single();

        if (error) throw error;

        // Insert periodic maintenance items
        for (const itemId of selectedPeriodicItems) {
          await supabase.from("periodic_maintenance_records").insert([
            {
              vehicle_id: vehicleId,
              service_record_id: record.id,
              item_type: itemId,
              product_used: periodicDetails[itemId] || "",
            },
          ]);
        }
      } else {
        // Standard service record
        const { error } = await supabase.from("service_records").insert([
          {
            vehicle_id: vehicleId,
            title: selectedServiceItem?.aciklama || "İşlem",
            description: formData.description,
            km_at_service: formData.km_at_service,
            service_date: formData.serviceDate,
            part_cost: partCost,
            labor_cost: formData.laborCost,
            quantity: quantity,
            unit_price: unitPrice,
            technician: formData.technician,
            stock_code: stockCode,
            operation_type: operationType,
            part_source: partSource,
            part_quality: partQuality,
            record_status: recordStatus,
            estimated_duration_minutes: formData.estimatedDurationMinutes,
            completed_at: recordStatus === "tamamlandi" ? new Date().toISOString() : null,
          },
        ]);

        if (error) throw error;
      }

      // Update vehicle km and assigned technician
      await supabase
        .from("vehicles")
        .update({ 
          current_km: formData.km_at_service,
          assigned_technician: formData.technician 
        })
        .eq("id", vehicleId);

      // Update bodywork if any changes
      if (Object.keys(bodyParts).length > 0) {
        await supabase
          .from("vehicles")
          .update({ body_parts: bodyParts })
          .eq("id", vehicleId);
      }

      // Update vehicle status based on record status
      if (vehicleId) {
        await handleRecordStatusChange(vehicleId, recordStatus, formData.estimatedDurationMinutes);
      }

      toast.success("İşlem kaydı başarıyla eklendi!");
      navigate(`/vehicle/${vehicleId}`);
    } catch (error: any) {
      toast.error(error.message || "İşlem kaydı eklenirken hata oluştu");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const progressPercent = (currentStep / getTotalSteps()) * 100;

  // Record type selection screen
  if (recordType === null) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <div className="container mx-auto p-6 max-w-md flex-1 flex flex-col">
          <div className="flex items-center gap-4 mb-8">
            <Button variant="ghost" size="icon" onClick={() => navigate(`/select-action/${vehicleId}`)} className="shrink-0">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-lg font-bold text-foreground">Yeni İşlem Ekle</h1>
          </div>

          <div className="mb-8">
            <Label htmlFor="technician" className="text-base font-semibold">Tekniker</Label>
            <Select
              value={formData.technician}
              onValueChange={(value) => setFormData({ ...formData, technician: value })}
            >
              <SelectTrigger className="mt-2">
                <SelectValue placeholder="Tekniker seçin" />
              </SelectTrigger>
              <SelectContent className="bg-background z-50">
                <SelectItem value="Görkem">Görkem</SelectItem>
                <SelectItem value="Ümit">Ümit</SelectItem>
                <SelectItem value="Atalay">Atalay</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <h2 className="text-xl font-bold text-foreground mb-4">İşlem Tipi Seçin</h2>
          
          <div className="space-y-4 flex-1">
            <button
              onClick={() => {
                if (!formData.technician) {
                  toast.error("Lütfen önce tekniker seçin");
                  return;
                }
                setRecordType("standard");
              }}
              className="w-full p-6 text-left rounded-xl border-2 border-border hover:border-accent transition-all"
            >
              <h3 className="font-bold text-lg text-foreground mb-1">Parça Değişim / Onarım</h3>
              <p className="text-sm text-muted-foreground">Parça değişimi veya onarım işlemi kaydet</p>
            </button>
            
            <button
              onClick={() => {
                if (!formData.technician) {
                  toast.error("Lütfen önce tekniker seçin");
                  return;
                }
                setRecordType("periodic");
              }}
              className="w-full p-6 text-left rounded-xl border-2 border-border hover:border-accent transition-all"
            >
              <h3 className="font-bold text-lg text-foreground mb-1">Periyodik Bakım</h3>
              <p className="text-sm text-muted-foreground">Yağ, filtre ve diğer periyodik bakım işlemleri</p>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Periodic maintenance flow
  if (recordType === "periodic") {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <div className="container mx-auto p-6 max-w-md flex-1 flex flex-col">
          <div className="flex items-center gap-4 mb-4">
            <Button variant="ghost" size="icon" onClick={handleBack} className="shrink-0">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-lg font-bold text-foreground">Periyodik Bakım</h1>
          </div>

          <div className="mb-6">
            <Progress value={progressPercent} className="h-1 mb-2" />
            <p className="text-xs text-center text-muted-foreground">
              Adım {currentStep} / {getTotalSteps()}
            </p>
          </div>

          <div className="flex-1">
            {currentStep === 1 && (
              <PeriodicItemSelection
                selectedItems={selectedPeriodicItems}
                setSelectedItems={setSelectedPeriodicItems}
              />
            )}

            {currentStep === 2 && (
              <PeriodicDetailsForm
                selectedItems={selectedPeriodicItems}
                details={periodicDetails}
                setDetails={setPeriodicDetails}
                formData={formData}
                setFormData={setFormData}
              />
            )}

            {currentStep === 3 && (
              <BodyworkStep
                hasBodywork={hasBodywork}
                setHasBodywork={setHasBodywork}
                bodyParts={bodyParts}
                setBodyParts={setBodyParts}
              />
            )}

            {currentStep === 4 && (
              <PeriodicSummary
                selectedItems={selectedPeriodicItems}
                details={periodicDetails}
                formData={formData}
                setFormData={setFormData}
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
              {loading ? "Kaydediliyor..." : currentStep === getTotalSteps() ? "Kaydet" : "İleri"}
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
          <h1 className="text-lg font-bold text-foreground">Yeni İşlem Ekle</h1>
        </div>

        <div className="mb-6">
          <Progress value={progressPercent} className="h-1 mb-2" />
          <p className="text-xs text-center text-muted-foreground">
            Adım {currentStep} / {getTotalSteps()}
          </p>
        </div>

        <div className="flex-1">
          {currentStep === 1 && (
            <StepOne
              categories={categories}
              selectedCategory={selectedCategory}
              setSelectedCategory={setSelectedCategory}
              subGroups={serviceSubGroups}
              selectedSubGroup={selectedSubGroup}
              setSelectedSubGroup={setSelectedSubGroup}
              parts={serviceParts}
              selectedPart={selectedPart}
              setSelectedPart={setSelectedPart}
            />
          )}

          {currentStep === 2 && (
            <OperationTypeStep
              operationType={operationType}
              setOperationType={setOperationType}
            />
          )}

          {currentStep === 3 && (
            <PartSourceStep
              partSource={partSource}
              setPartSource={setPartSource}
            />
          )}

          {currentStep === 4 && (
            <PartQualityStep
              partQuality={partQuality}
              setPartQuality={setPartQuality}
              quantity={quantity}
              setQuantity={setQuantity}
              unitPrice={unitPrice}
              setUnitPrice={setUnitPrice}
            />
          )}

          {currentStep === 5 && (
            <StepThree
              formData={formData}
              setFormData={setFormData}
            />
          )}

          {currentStep === 6 && (
            <BodyworkStep
              hasBodywork={hasBodywork}
              setHasBodywork={setHasBodywork}
              bodyParts={bodyParts}
              setBodyParts={setBodyParts}
            />
          )}

          {currentStep === 7 && (
            <StepFive
              selectedCategory={selectedCategory}
              selectedSubGroup={selectedSubGroup}
              selectedPart={selectedPart}
              selectedServiceItem={selectedServiceItem}
              operationType={operationType}
              partSource={partSource}
              partQuality={partQuality}
              quantity={quantity}
              unitPrice={unitPrice}
              formData={formData}
              setFormData={setFormData}
              serviceItems={serviceItems}
              setSelectedServiceItem={setSelectedServiceItem}
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
            {loading ? "Kaydediliyor..." : currentStep === getTotalSteps() ? "Kaydet" : "İleri"}
          </Button>
        </div>
      </div>
    </div>
  );
};

// Periodic Maintenance Components
const PeriodicItemSelection = ({
  selectedItems,
  setSelectedItems,
}: {
  selectedItems: string[];
  setSelectedItems: (items: string[]) => void;
}) => {
  const toggleItem = (itemId: string) => {
    if (selectedItems.includes(itemId)) {
      setSelectedItems(selectedItems.filter(id => id !== itemId));
    } else {
      setSelectedItems([...selectedItems, itemId]);
    }
  };

  return (
    <div>
      <h2 className="text-xl font-bold text-foreground mb-4">
        Yapılan bakım işlemlerini seçin
      </h2>
      <p className="text-sm text-muted-foreground mb-6">Birden fazla seçebilirsiniz</p>
      <div className="space-y-3">
        {PERIODIC_MAINTENANCE_ITEMS.map((item) => (
          <button
            key={item.id}
            onClick={() => toggleItem(item.id)}
            className={`w-full p-4 text-left rounded-lg border-2 transition-all flex justify-between items-center ${
              selectedItems.includes(item.id)
                ? "border-accent bg-accent/5"
                : "border-border hover:border-accent/50"
            }`}
          >
            <span className={selectedItems.includes(item.id) ? "text-accent font-semibold" : "text-foreground"}>
              {item.label}
            </span>
            {selectedItems.includes(item.id) && <Check className="h-5 w-5 text-accent" />}
          </button>
        ))}
      </div>
    </div>
  );
};

const PeriodicDetailsForm = ({
  selectedItems,
  details,
  setDetails,
  formData,
  setFormData,
}: {
  selectedItems: string[];
  details: Record<string, string>;
  setDetails: (details: Record<string, string>) => void;
  formData: any;
  setFormData: (data: any) => void;
}) => (
  <div>
    <h2 className="text-xl font-bold text-foreground mb-4">
      Bakım Detayları
    </h2>
    <div className="space-y-4">
      {selectedItems.map((itemId) => {
        const item = PERIODIC_MAINTENANCE_ITEMS.find(i => i.id === itemId);
        return (
          <div key={itemId}>
            <Label htmlFor={itemId}>{item?.label} - Kullanılan Ürün</Label>
            <Input
              id={itemId}
              value={details[itemId] || ""}
              onChange={(e) => setDetails({ ...details, [itemId]: e.target.value })}
              placeholder="Örn: Liquimoly Toptec 4800 - 8.25 LİTRE"
              className="mt-1"
            />
          </div>
        );
      })}

      <div className="pt-4 border-t border-border">
        <div>
          <Label htmlFor="description">Açıklama</Label>
          <Textarea
            id="description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Ek notlar..."
            rows={2}
            className="mt-1"
          />
        </div>

        <div className="mt-4">
          <Label htmlFor="laborCost">İşçilik Maliyeti (₺)</Label>
          <Input
            id="laborCost"
            type="number"
            value={formData.laborCost}
            onChange={(e) => setFormData({ ...formData, laborCost: parseFloat(e.target.value) || 0 })}
            className="mt-1"
          />
        </div>

        <div className="grid grid-cols-2 gap-4 mt-4">
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
      </div>
    </div>
  </div>
);

const PeriodicSummary = ({
  selectedItems,
  details,
  formData,
  setFormData,
  recordStatus,
  setRecordStatus,
}: {
  selectedItems: string[];
  details: Record<string, string>;
  formData: any;
  setFormData: (data: any) => void;
  recordStatus: "tespit" | "devam" | "tamamlandi";
  setRecordStatus: (status: "tespit" | "devam" | "tamamlandi") => void;
}) => (
  <div>
    <h2 className="text-xl font-bold text-foreground mb-4">Özet</h2>
    <Card className="p-4 space-y-4">
      <div>
        <h4 className="font-semibold text-sm text-muted-foreground mb-2">Yapılan Bakımlar</h4>
        <div className="space-y-2">
          {selectedItems.map((itemId) => {
            const item = PERIODIC_MAINTENANCE_ITEMS.find(i => i.id === itemId);
            return (
              <div key={itemId} className="p-3 bg-muted rounded-lg">
                <p className="font-semibold text-foreground">{item?.label}</p>
                {details[itemId] && (
                  <p className="text-sm text-muted-foreground mt-1">{details[itemId]}</p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="pt-4 border-t border-border">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Tarih</span>
            <p className="font-semibold">{formData.serviceDate}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Kilometre</span>
            <p className="font-semibold">{formData.km_at_service.toLocaleString()} km</p>
          </div>
          <div>
            <span className="text-muted-foreground">İşçilik Maliyeti</span>
            <p className="font-semibold text-accent">{formData.laborCost.toLocaleString()} ₺</p>
          </div>
        </div>
      </div>

      {/* Estimated Duration */}
      <div className="pt-4 border-t border-border">
        <Label htmlFor="estimatedDuration" className="text-sm font-semibold text-muted-foreground">
          Tahmini Tamamlanma Süresi
        </Label>
        <Select
          value={formData.estimatedDurationMinutes?.toString() || "60"}
          onValueChange={(value) => setFormData({ ...formData, estimatedDurationMinutes: parseInt(value) })}
        >
          <SelectTrigger className="mt-2">
            <SelectValue placeholder="Süre seçin" />
          </SelectTrigger>
          <SelectContent className="bg-background z-50">
            <SelectItem value="30">30 dakika</SelectItem>
            <SelectItem value="60">1 saat</SelectItem>
            <SelectItem value="120">2 saat</SelectItem>
            <SelectItem value="180">3 saat</SelectItem>
            <SelectItem value="240">4 saat</SelectItem>
            <SelectItem value="300">5 saat</SelectItem>
            <SelectItem value="360">6 saat</SelectItem>
            <SelectItem value="480">8 saat (1 gün)</SelectItem>
            <SelectItem value="960">16 saat (2 gün)</SelectItem>
            <SelectItem value="1440">24 saat (3 gün)</SelectItem>
          </SelectContent>
        </Select>
      </div>

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

// Standard Flow Components
const StepOne = ({
  categories,
  selectedCategory,
  setSelectedCategory,
  subGroups,
  selectedSubGroup,
  setSelectedSubGroup,
  parts,
  selectedPart,
  setSelectedPart,
}: {
  categories: string[];
  selectedCategory: string;
  setSelectedCategory: (value: string) => void;
  subGroups: string[];
  selectedSubGroup: string;
  setSelectedSubGroup: (value: string) => void;
  parts: string[];
  selectedPart: string;
  setSelectedPart: (value: string) => void;
}) => (
  <div className="space-y-6">
    <div>
      <h2 className="text-xl font-bold text-foreground mb-4">
        Aracın hangi kısmında işlem yapıldı?
      </h2>
      <div className="space-y-2">
        {categories.map((category) => (
          <button
            key={category}
            onClick={() => {
              setSelectedCategory(category);
              setSelectedSubGroup("");
              setSelectedPart("");
            }}
            className={`w-full p-4 text-left rounded-lg border-2 transition-all ${
              selectedCategory === category
                ? "border-accent bg-accent/5"
                : "border-border hover:border-accent/50"
            }`}
          >
            <span className={selectedCategory === category ? "text-accent font-semibold" : "text-foreground"}>
              {category}
            </span>
          </button>
        ))}
      </div>
    </div>

    {selectedCategory && subGroups.length > 0 && (
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-3">Alt grup seçin</h3>
        <div className="space-y-2">
          {subGroups.map((group) => (
            <button
              key={group}
              onClick={() => {
                setSelectedSubGroup(group);
                setSelectedPart("");
              }}
              className={`w-full p-4 text-left rounded-lg border-2 transition-all flex justify-between items-center ${
                selectedSubGroup === group
                  ? "border-accent bg-accent/5"
                  : "border-border hover:border-accent/50"
              }`}
            >
              <span className={selectedSubGroup === group ? "text-accent font-semibold" : "text-foreground"}>
                {group}
              </span>
              {selectedSubGroup === group && <Check className="h-5 w-5 text-accent" />}
            </button>
          ))}
        </div>
      </div>
    )}

    {selectedSubGroup && parts.length > 0 && (
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-3">Hangi parçada işlem yapıldı?</h3>
        <div className="space-y-2">
          {parts.map((part) => (
            <button
              key={part}
              onClick={() => setSelectedPart(part)}
              className={`w-full p-4 text-left rounded-lg border-2 transition-all flex justify-between items-center ${
                selectedPart === part
                  ? "border-accent bg-accent/5"
                  : "border-border hover:border-accent/50"
              }`}
            >
              <span className={selectedPart === part ? "text-accent font-semibold" : "text-foreground"}>
                {part}
              </span>
              {selectedPart === part && <Check className="h-5 w-5 text-accent" />}
            </button>
          ))}
        </div>
      </div>
    )}
  </div>
);

const OperationTypeStep = ({
  operationType,
  setOperationType,
}: {
  operationType: string;
  setOperationType: (value: "degisim" | "onarim") => void;
}) => (
  <div>
    <h2 className="text-xl font-bold text-foreground mb-4">
      İşlem Türü
    </h2>
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
    <h2 className="text-xl font-bold text-foreground mb-4">
      Parça Kaynağı
    </h2>
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
    <h2 className="text-xl font-bold text-foreground mb-4">
      Parça Kalitesi
    </h2>
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

const StepThree = ({
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
        <Label htmlFor="description">
          Açıklama <span className="text-destructive">*</span>
        </Label>
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

      <div>
        <Label htmlFor="partSerial">Parça Seri No</Label>
        <Input
          id="partSerial"
          value={formData.partSerialNo}
          onChange={(e) => setFormData({ ...formData, partSerialNo: e.target.value })}
          placeholder="Parça seri numarası (opsiyonel)"
          className="mt-1"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="serviceDate">
            İşlem Tarihi <span className="text-destructive">*</span>
          </Label>
          <Input
            id="serviceDate"
            type="date"
            value={formData.serviceDate}
            onChange={(e) => setFormData({ ...formData, serviceDate: e.target.value })}
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="km">
            Kilometre <span className="text-destructive">*</span>
          </Label>
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
        <Label htmlFor="interval">Önerilen Bakım Aralığı (km)</Label>
        <Input
          id="interval"
          value={formData.recommendedInterval}
          onChange={(e) => setFormData({ ...formData, recommendedInterval: e.target.value })}
          placeholder="Örn: 10000 (opsiyonel)"
          className="mt-1"
        />
        <p className="text-xs text-muted-foreground mt-1">
          Girilirse yaklaşan bakım uyarısı olarak kaydedilecektir
        </p>
      </div>
    </div>
  </div>
);

const BodyworkStep = ({
  hasBodywork,
  setHasBodywork,
  bodyParts,
  setBodyParts,
}: {
  hasBodywork: boolean | null;
  setHasBodywork: (value: boolean | null) => void;
  bodyParts: Record<string, PartStatus>;
  setBodyParts: (parts: Record<string, PartStatus>) => void;
}) => (
  <div>
    <h2 className="text-xl font-bold text-foreground mb-4">
      Kaportada İşlem Yapıldı mı?
    </h2>
    
    {hasBodywork === null && (
      <div className="space-y-3">
        <button
          onClick={() => setHasBodywork(true)}
          className="w-full p-5 text-left rounded-xl border-2 border-border hover:border-accent transition-all"
        >
          <span className="font-bold text-lg text-foreground">Evet</span>
          <p className="text-sm text-muted-foreground mt-1">Kaportada işlem yapıldı, işaretlemek istiyorum</p>
        </button>

        <button
          onClick={() => setHasBodywork(false)}
          className="w-full p-5 text-left rounded-xl border-2 border-border hover:border-accent transition-all"
        >
          <span className="font-bold text-lg text-foreground">Hayır</span>
          <p className="text-sm text-muted-foreground mt-1">Kaportada herhangi bir işlem yapılmadı</p>
        </button>
      </div>
    )}

    {hasBodywork === true && (
      <div>
        <p className="text-sm text-muted-foreground mb-4">
          İşlem yapılan parçaları işaretleyin
        </p>
        <VehicleBodyDiagram
          parts={bodyParts}
          onChange={setBodyParts}
          readOnly={false}
        />
        <button
          onClick={() => setHasBodywork(null)}
          className="mt-4 text-sm text-muted-foreground underline"
        >
          Geri Dön
        </button>
      </div>
    )}

    {hasBodywork === false && (
      <Card className="p-4 text-center">
        <p className="text-muted-foreground">Kaporta işlemi yok olarak işaretlendi</p>
        <button
          onClick={() => setHasBodywork(null)}
          className="mt-2 text-sm text-accent underline"
        >
          Değiştir
        </button>
      </Card>
    )}
  </div>
);

const StepFive = ({
  selectedCategory,
  selectedSubGroup,
  selectedPart,
  selectedServiceItem,
  operationType,
  partSource,
  partQuality,
  quantity,
  unitPrice,
  formData,
  setFormData,
  serviceItems,
  setSelectedServiceItem,
  recordStatus,
  setRecordStatus,
}: {
  selectedCategory: string;
  selectedSubGroup: string;
  selectedPart: string;
  selectedServiceItem: any;
  operationType: string;
  partSource: string;
  partQuality: string;
  quantity: number;
  unitPrice: number;
  formData: any;
  setFormData: (data: any) => void;
  serviceItems: any[];
  setSelectedServiceItem: (item: any) => void;
  recordStatus: "tespit" | "devam" | "tamamlandi";
  setRecordStatus: (status: "tespit" | "devam" | "tamamlandi") => void;
}) => {
  // Auto-select the matching service item based on selections
  useEffect(() => {
    if (serviceItems.length > 0 && !selectedServiceItem) {
      // Find the best matching item
      const matchingItem = serviceItems.find(item => {
        const desc = item.aciklama.toLowerCase();
        const matchesOperation = operationType === "degisim" ? desc.includes("değişim") : desc.includes("onarım");
        const matchesSource = partSource === "cikma" ? desc.includes("çıkma") : desc.includes("sıfır");
        const matchesQuality = partQuality === "oem" ? desc.includes("oem") : desc.includes("muadil");
        return matchesOperation && matchesSource && matchesQuality;
      }) || serviceItems[0];
      
      setSelectedServiceItem(matchingItem);
    }
  }, [serviceItems, operationType, partSource, partQuality]);

  const partCost = quantity * unitPrice;
  const totalCost = partCost + (formData.laborCost || 0);

  return (
    <div>
      <h2 className="text-xl font-bold text-foreground mb-4">Özet</h2>
      <Card className="p-4 space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Kategori</span>
            <span className="font-semibold">{selectedCategory}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Alt Grup</span>
            <span className="font-semibold">{selectedSubGroup}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Parça</span>
            <span className="font-semibold">{selectedPart}</span>
          </div>
        </div>

        <div className="pt-3 border-t border-border space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">İşlem Türü</span>
            <span className="font-semibold capitalize">{operationType === "degisim" ? "Değişim" : "Onarım"}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Parça Kaynağı</span>
            <span className="font-semibold capitalize">{partSource === "sifir" ? "Sıfır" : "Çıkma"}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Parça Kalitesi</span>
            <span className="font-semibold uppercase">{partQuality}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Adet</span>
            <span className="font-semibold">{quantity}</span>
          </div>
        </div>

        {selectedServiceItem && (
          <div className="pt-3 border-t border-border">
            <p className="text-xs text-muted-foreground mb-1">Stok Kodu</p>
            <p className="font-mono text-sm bg-muted p-2 rounded">{selectedServiceItem.stokKodu}</p>
          </div>
        )}

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

        {/* Estimated Duration */}
        <div className="pt-4 border-t border-border">
          <Label htmlFor="estimatedDuration" className="text-sm font-semibold text-muted-foreground">
            Tahmini Tamamlanma Süresi
          </Label>
          <Select
            value={formData.estimatedDurationMinutes?.toString() || "60"}
            onValueChange={(value) => setFormData({ ...formData, estimatedDurationMinutes: parseInt(value) })}
          >
            <SelectTrigger className="mt-2">
              <SelectValue placeholder="Süre seçin" />
            </SelectTrigger>
            <SelectContent className="bg-background z-50">
              <SelectItem value="30">30 dakika</SelectItem>
              <SelectItem value="60">1 saat</SelectItem>
              <SelectItem value="120">2 saat</SelectItem>
              <SelectItem value="180">3 saat</SelectItem>
              <SelectItem value="240">4 saat</SelectItem>
              <SelectItem value="300">5 saat</SelectItem>
              <SelectItem value="360">6 saat</SelectItem>
              <SelectItem value="480">8 saat (1 gün)</SelectItem>
              <SelectItem value="960">16 saat (2 gün)</SelectItem>
              <SelectItem value="1440">24 saat (3 gün)</SelectItem>
            </SelectContent>
          </Select>
        </div>

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

export default AddRecord;