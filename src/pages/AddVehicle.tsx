import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { ArrowLeft, List, Camera, QrCode } from "lucide-react";
import { toast } from "sonner";
import { useGoBack } from "@/hooks/useGoBack";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import VehicleBodyDiagram, { PartStatus } from "@/components/VehicleBodyDiagram";

const TOTAL_SLOTS = 30;

const AddVehicle = () => {
  const navigate = useNavigate();
  const goBack = useGoBack();
  const [loading, setLoading] = useState(false);
  const [showVehicleList, setShowVehicleList] = useState(false);
  const [showBodyworkStep, setShowBodyworkStep] = useState(false);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [bodyParts, setBodyParts] = useState<Record<string, PartStatus>>({});
  const [pendingVehicleId, setPendingVehicleId] = useState<string | null>(null);
  const [usedSlots, setUsedSlots] = useState<string[]>([]);
  const [availableSlots, setAvailableSlots] = useState<number[]>([]);

  const [formData, setFormData] = useState({
    qr_code: "",
    chassis_number: "",
    plate_number: "",
    brand: "",
    model: "",
    year: new Date().getFullYear(),
    color: "",
    current_km: 0,
    notes: "",
    technician: "",
    owner_name: "",
    owner_phone: "",
    owner_address: "",
    body_type: "",
    body_code: "",
    package: "",
    has_heavy_damage: false,
    transmission: "",
    engine: "",
    driveType: "",
    fuelType: "",
  });

  const [photos, setPhotos] = useState({
    front: null as File | null,
    back: null as File | null,
    left: null as File | null,
    right: null as File | null,
  });

  useEffect(() => {
    fetchVehicles();
  }, []);

  useEffect(() => {
    // Calculate available slots
    const usedSlotNumbers = usedSlots
      .map(slot => parseInt(slot))
      .filter(n => !isNaN(n) && n >= 1 && n <= TOTAL_SLOTS);
    
    const available: number[] = [];
    for (let i = 1; i <= TOTAL_SLOTS; i++) {
      if (!usedSlotNumbers.includes(i)) {
        available.push(i);
      }
    }
    setAvailableSlots(available);
  }, [usedSlots]);

  const fetchVehicles = async () => {
    const { data, error } = await supabase
      .from("vehicles")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setVehicles(data);
      setUsedSlots(data.map(v => v.qr_code));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.technician) {
      toast.error("Lütfen bir tekniker seçin");
      return;
    }
    
    if (!formData.qr_code) {
      toast.error("Lütfen bir slot numarası seçin");
      return;
    }
    
    setLoading(true);

    try {
      // Remove technician and non-db fields from formData
      const { technician, driveType, fuelType, engine, transmission, ...vehicleData } = formData;
      
      // Set chassis_number to empty string if not provided
      const finalVehicleData = {
        ...vehicleData,
        chassis_number: vehicleData.chassis_number || "-",
        body_parts: {},
        first_registration_date: new Date().toISOString().split('T')[0],
      };
      
      const { data: vehicle, error: vehicleError } = await supabase
        .from("vehicles")
        .insert([finalVehicleData])
        .select()
        .single();

      if (vehicleError) throw vehicleError;

      // Upload photos if provided
      for (const [position, file] of Object.entries(photos)) {
        if (file) {
          const fileExt = file.name.split(".").pop();
          const fileName = `${vehicle.id}/${position}.${fileExt}`;

          const { error: uploadError } = await supabase.storage
            .from("vehicle-photos")
            .upload(fileName, file);

          if (uploadError) throw uploadError;

          const { data: urlData } = supabase.storage
            .from("vehicle-photos")
            .getPublicUrl(fileName);

          await supabase.from("vehicle_photos").insert([
            {
              vehicle_id: vehicle.id,
              position,
              photo_url: urlData.publicUrl,
            },
          ]);
        }
      }

      toast.success("Araç bilgileri kaydedildi!");
      setPendingVehicleId(vehicle.id);
      setShowBodyworkStep(true);
    } catch (error: any) {
      toast.error(error.message || "Araç eklenirken hata oluştu");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleBodyworkSave = async () => {
    if (!pendingVehicleId) return;
    
    setLoading(true);
    try {
      await supabase
        .from("vehicles")
        .update({ body_parts: bodyParts })
        .eq("id", pendingVehicleId);

      toast.success("Kaporta bilgileri kaydedildi!");
      navigate(`/vehicle/${pendingVehicleId}`);
    } catch (error: any) {
      toast.error(error.message || "Kaporta bilgileri kaydedilirken hata oluştu");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSkipBodywork = () => {
    if (pendingVehicleId) {
      navigate(`/vehicle/${pendingVehicleId}`);
    }
  };

  const handlePhotoChange = (position: keyof typeof photos, file: File | null) => {
    setPhotos({ ...photos, [position]: file });
  };

  // Go back from bodywork step to form
  const handleBackToForm = () => {
    setShowBodyworkStep(false);
  };

  // Bodywork step after vehicle creation
  if (showBodyworkStep) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto p-4 max-w-2xl">
          <div className="mb-6">
            <Button variant="ghost" size="lg" onClick={handleBackToForm} className="font-semibold">
              <ArrowLeft className="mr-2 h-5 w-5" />
              Geri
            </Button>
          </div>

          <Card className="p-8 border-2">
            <h1 className="text-4xl font-bold mb-2" style={{ color: '#f19035' }}>Kaporta Detayları</h1>
            <p className="text-muted-foreground mb-8 text-base">
              Araç kaportasındaki mevcut durumu işaretleyin (opsiyonel)
            </p>

            <VehicleBodyDiagram
              parts={bodyParts}
              onChange={setBodyParts}
              readOnly={false}
            />

            <p className="text-sm text-muted-foreground mt-4 mb-6 text-center">
              Parçaya tıklayarak durumunu değiştirebilirsiniz: Orijinal → Boyalı → Değişen → İşlemli
            </p>

            <div className="flex gap-4">
              <Button 
                variant="outline"
                onClick={handleSkipBodywork}
                className="flex-1 h-14 text-lg font-semibold"
              >
                Atla
              </Button>
              <Button 
                onClick={handleBodyworkSave}
                disabled={loading}
                className="flex-1 bg-accent hover:bg-accent/90 h-14 text-lg font-semibold"
              >
                {loading ? "Kaydediliyor..." : "Kaydet ve Devam Et"}
              </Button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  if (showVehicleList) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto p-4 max-w-2xl">
          <div className="mb-6">
            <Button variant="ghost" size="lg" onClick={() => setShowVehicleList(false)} className="font-semibold">
              <ArrowLeft className="mr-2 h-5 w-5" />
              Geri
            </Button>
          </div>

          <Card className="p-8 border-2">
            <h1 className="text-4xl font-bold mb-2" style={{ color: '#f19035' }}>Kayıtlı Araçlar</h1>
            <p className="text-muted-foreground mb-8 text-base">Bir araç seçin</p>

            <div className="space-y-4">
              {vehicles.map((vehicle) => (
                <Card
                  key={vehicle.id}
                  className="p-6 border-2 cursor-pointer hover:border-accent transition-colors"
                  onClick={() => navigate(`/vehicle/${vehicle.id}`)}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-mono bg-muted px-2 py-1 rounded">Slot {vehicle.qr_code}</span>
                    <div>
                      <h3 className="text-xl font-bold text-foreground">
                        {vehicle.brand} {vehicle.model}
                      </h3>
                      <p className="text-muted-foreground">{vehicle.plate_number}</p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-4 max-w-2xl">
        <div className="mb-6 flex gap-4">
          <Button variant="ghost" size="lg" onClick={goBack} className="font-semibold">
            <ArrowLeft className="mr-2 h-5 w-5" />
            Geri
          </Button>
          <Button 
            variant="outline" 
            size="lg" 
            onClick={() => setShowVehicleList(true)}
            className="font-semibold border-2"
          >
            <List className="mr-2 h-5 w-5" />
            Listeden Seç
          </Button>
        </div>

        <Card className="p-8 border-2">
          <h1 className="text-4xl font-bold mb-2" style={{ color: '#f19035' }}>Yeni Araç Ekle</h1>
          <p className="text-muted-foreground mb-8 text-base">Araç bilgilerini ve fotoğraflarını ekleyin</p>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              {/* Technician field at top */}
              <div>
                <Label htmlFor="technician">Tekniker</Label>
                <Select
                  value={formData.technician}
                  onValueChange={(value) => setFormData({ ...formData, technician: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Tekniker seçin" />
                  </SelectTrigger>
                  <SelectContent className="bg-background z-50">
                    <SelectItem value="Görkem">Görkem</SelectItem>
                    <SelectItem value="Ümit">Ümit</SelectItem>
                    <SelectItem value="Atalay">Atalay</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Slot Selection */}
              <div>
                <Label htmlFor="qr_code" className="flex items-center gap-2">
                  <QrCode className="h-4 w-4" />
                  Kayıt Slotu (1-{TOTAL_SLOTS})
                </Label>
                <div className="mt-2">
                  <Select
                    value={formData.qr_code}
                    onValueChange={(value) => setFormData({ ...formData, qr_code: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Boş slot seçin" />
                    </SelectTrigger>
                    <SelectContent className="bg-background z-50 max-h-60">
                      {availableSlots.length === 0 ? (
                        <div className="p-2 text-sm text-muted-foreground text-center">
                          Tüm slotlar dolu
                        </div>
                      ) : (
                        availableSlots.map((slot) => (
                          <SelectItem key={slot} value={slot.toString()}>
                            Slot {slot}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {availableSlots.length} boş slot mevcut
                </p>
              </div>

              <div>
                <Label htmlFor="chassis_number">Şasi Numarası (VIN Kodu) - Opsiyonel</Label>
                <div className="flex gap-2">
                  <Input
                    id="chassis_number"
                    value={formData.chassis_number}
                    onChange={(e) => setFormData({ ...formData, chassis_number: e.target.value.toUpperCase() })}
                    placeholder="17 karakterli VIN kodu (opsiyonel)"
                    maxLength={17}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="shrink-0 border-accent text-accent hover:bg-accent/10"
                    onClick={() => {
                      if (formData.chassis_number.length === 17) {
                        toast.info("VIN decode API henüz bağlanmadı. İleride bu özellik aktif olacak.");
                      } else {
                        toast.error("Lütfen 17 karakterli geçerli bir VIN kodu girin");
                      }
                    }}
                  >
                    Otomatik Getir
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  VIN kodunu girdikten sonra "Otomatik Getir" ile araç bilgilerini doldurun
                </p>
              </div>

              <div>
                <Label htmlFor="plate_number">Plaka</Label>
                <Input
                  id="plate_number"
                  required
                  value={formData.plate_number}
                  onChange={(e) => setFormData({ ...formData, plate_number: e.target.value })}
                />
              </div>

              {/* Owner Information */}
              <div className="space-y-4 pt-4 border-t border-border">
                <h3 className="text-lg font-semibold text-foreground">Araç Sahibi Bilgileri</h3>
                
                <div>
                  <Label htmlFor="owner_name">Araç Sahibi Adı</Label>
                  <Input
                    id="owner_name"
                    value={formData.owner_name}
                    onChange={(e) => setFormData({ ...formData, owner_name: e.target.value })}
                    placeholder="Araç sahibinin adı soyadı"
                  />
                </div>

                <div>
                  <Label htmlFor="owner_phone">Telefon Numarası</Label>
                  <Input
                    id="owner_phone"
                    value={formData.owner_phone}
                    onChange={(e) => setFormData({ ...formData, owner_phone: e.target.value })}
                    placeholder="0532 123 45 67"
                  />
                </div>

                <div>
                  <Label htmlFor="owner_address">Adres (max 25 karakter)</Label>
                  <Input
                    id="owner_address"
                    value={formData.owner_address}
                    onChange={(e) => setFormData({ ...formData, owner_address: e.target.value.slice(0, 25) })}
                    placeholder="Kısa adres bilgisi"
                    maxLength={25}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {formData.owner_address.length}/25 karakter
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="brand">Marka</Label>
                  <Input
                    id="brand"
                    value={formData.brand}
                    onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                    placeholder="Marka girin"
                  />
                </div>

                <div>
                  <Label htmlFor="model">Model</Label>
                  <Input
                    id="model"
                    value={formData.model}
                    onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                    placeholder="Model girin"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="body_type">Kasa Tipi</Label>
                  <Input
                    id="body_type"
                    value={formData.body_type}
                    onChange={(e) => setFormData({ ...formData, body_type: e.target.value })}
                    placeholder="Örn: Sedan, Hatchback"
                  />
                </div>

                <div>
                  <Label htmlFor="body_code">Kasa Kodu</Label>
                  <Input
                    id="body_code"
                    value={formData.body_code}
                    onChange={(e) => setFormData({ ...formData, body_code: e.target.value })}
                    placeholder="Örn: C6, E90, W213"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="package">Paket</Label>
                  <Input
                    id="package"
                    value={formData.package}
                    onChange={(e) => setFormData({ ...formData, package: e.target.value })}
                    placeholder="Örn: Quattro, xDrive"
                  />
                </div>

                <div>
                  <Label htmlFor="has_heavy_damage">Ağır Hasar Kaydı</Label>
                  <Select
                    value={formData.has_heavy_damage ? "var" : "yok"}
                    onValueChange={(value) => setFormData({ ...formData, has_heavy_damage: value === "var" })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seçin" />
                    </SelectTrigger>
                    <SelectContent className="bg-background z-50">
                      <SelectItem value="yok">Yok</SelectItem>
                      <SelectItem value="var">Var</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="engine">Motor</Label>
                  <Input
                    id="engine"
                    value={formData.engine}
                    onChange={(e) => setFormData({ ...formData, engine: e.target.value })}
                    placeholder="Örn: 2.0L 150 HP"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="transmission">Şanzıman</Label>
                  <Input
                    id="transmission"
                    value={formData.transmission}
                    onChange={(e) => setFormData({ ...formData, transmission: e.target.value })}
                    placeholder="Örn: 8 İleri Otomatik"
                  />
                </div>

                <div>
                  <Label htmlFor="driveType">Çekiş</Label>
                  <Select
                    value={formData.driveType}
                    onValueChange={(value) => setFormData({ ...formData, driveType: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Çekiş tipi seçin" />
                    </SelectTrigger>
                    <SelectContent className="bg-background z-50">
                      <SelectItem value="4x2">4x2</SelectItem>
                      <SelectItem value="4x4">4x4</SelectItem>
                      <SelectItem value="AWD">AWD</SelectItem>
                      <SelectItem value="FWD">FWD</SelectItem>
                      <SelectItem value="RWD">RWD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="fuelType">Yakıt Tipi</Label>
                  <Select
                    value={formData.fuelType}
                    onValueChange={(value) => setFormData({ ...formData, fuelType: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Yakıt tipi seçin" />
                    </SelectTrigger>
                    <SelectContent className="bg-background z-50">
                      <SelectItem value="Mazot">Mazot</SelectItem>
                      <SelectItem value="Benzin">Benzin</SelectItem>
                      <SelectItem value="LPG">LPG</SelectItem>
                      <SelectItem value="Elektrik">Elektrik</SelectItem>
                      <SelectItem value="Hibrit">Hibrit</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="year">Yıl</Label>
                  <Input
                    id="year"
                    type="number"
                    required
                    value={formData.year}
                    onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
                  />
                </div>

                <div>
                  <Label htmlFor="color">Renk</Label>
                  <Input
                    id="color"
                    required
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="current_km">Kilometre</Label>
                <Input
                  id="current_km"
                  type="number"
                  required
                  value={formData.current_km}
                  onChange={(e) => setFormData({ ...formData, current_km: parseInt(e.target.value) })}
                />
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-foreground">Araç Fotoğrafları</h3>
              <div className="grid grid-cols-2 gap-4">
                <PhotoInput label="Ön" position="front" onChange={handlePhotoChange} />
                <PhotoInput label="Arka" position="back" onChange={handlePhotoChange} />
                <PhotoInput label="Sol" position="left" onChange={handlePhotoChange} />
                <PhotoInput label="Sağ" position="right" onChange={handlePhotoChange} />
              </div>
            </div>

            <div>
              <Label htmlFor="notes">Araç Hakkındaki Notlar / Gözlemler</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Ağır hasar kaydı, değişen parçalar, kozmetik/mekanik problemler vb."
                rows={4}
                className="resize-none"
              />
            </div>

            <Button 
              type="submit" 
              disabled={loading || !formData.qr_code} 
              className="w-full bg-accent hover:bg-accent/90 h-14 text-lg font-semibold"
            >
              {loading ? "Kaydediliyor..." : "Devam Et (Kaporta Detayları)"}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
};

const PhotoInput = ({
  label,
  position,
  onChange,
}: {
  label: string;
  position: "front" | "back" | "left" | "right";
  onChange: (position: "front" | "back" | "left" | "right", file: File | null) => void;
}) => (
  <div>
    <Label htmlFor={position}>{label}</Label>
    <Input
      id={position}
      type="file"
      accept="image/*"
      onChange={(e) => onChange(position, e.target.files?.[0] || null)}
      className="cursor-pointer"
    />
  </div>
);

export default AddVehicle;
