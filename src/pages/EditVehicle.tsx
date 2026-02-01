import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Save } from "lucide-react";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useGoBack } from "@/hooks/useGoBack";

const EditVehicle = () => {
  const { vehicleId } = useParams();
  const navigate = useNavigate();
  const goBack = useGoBack("/vehicles");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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
    owner_name: "",
    owner_phone: "",
    owner_address: "",
    body_type: "",
    body_code: "",
    package: "",
    has_heavy_damage: false,
    first_registration_date: "",
  });

  useEffect(() => {
    if (vehicleId) {
      fetchVehicle();
    }
  }, [vehicleId]);

  const fetchVehicle = async () => {
    try {
      const { data, error } = await supabase
        .from("vehicles")
        .select("*")
        .eq("id", vehicleId)
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        toast.error("Araç bulunamadı");
        navigate("/vehicles");
        return;
      }

      setFormData({
        qr_code: data.qr_code || "",
        chassis_number: data.chassis_number || "",
        plate_number: data.plate_number || "",
        brand: data.brand || "",
        model: data.model || "",
        year: data.year || new Date().getFullYear(),
        color: data.color || "",
        current_km: data.current_km || 0,
        notes: data.notes || "",
        owner_name: data.owner_name || "",
        owner_phone: data.owner_phone || "",
        owner_address: data.owner_address || "",
        body_type: data.body_type || "",
        body_code: data.body_code || "",
        package: data.package || "",
        has_heavy_damage: data.has_heavy_damage || false,
        first_registration_date: data.first_registration_date || "",
      });
    } catch (error: any) {
      toast.error("Araç bilgileri yüklenirken hata oluştu");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const { error } = await supabase
        .from("vehicles")
        .update({
          qr_code: formData.qr_code,
          chassis_number: formData.chassis_number,
          plate_number: formData.plate_number,
          brand: formData.brand,
          model: formData.model,
          year: formData.year,
          color: formData.color,
          current_km: formData.current_km,
          notes: formData.notes,
          owner_name: formData.owner_name,
          owner_phone: formData.owner_phone,
          owner_address: formData.owner_address,
          body_type: formData.body_type,
          body_code: formData.body_code,
          package: formData.package,
          has_heavy_damage: formData.has_heavy_damage,
          first_registration_date: formData.first_registration_date || null,
        })
        .eq("id", vehicleId);

      if (error) throw error;

      toast.success("Araç bilgileri güncellendi!");
      navigate("/vehicles");
    } catch (error: any) {
      toast.error(error.message || "Araç güncellenirken hata oluştu");
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Yükleniyor...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-4 max-w-2xl">
        <div className="mb-6">
          <Button variant="ghost" size="lg" onClick={goBack} className="font-semibold">
            <ArrowLeft className="mr-2 h-5 w-5" />
            Geri
          </Button>
        </div>

        <Card className="p-8 border-2">
          <h1 className="text-4xl font-bold mb-2" style={{ color: '#f19035' }}>Araç Düzenle</h1>
          <p className="text-muted-foreground mb-8 text-base">Araç bilgilerini güncelleyin</p>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="qr_code">Slot Numarası (QR Kod)</Label>
                <Input
                  id="qr_code"
                  required
                  value={formData.qr_code}
                  onChange={(e) => setFormData({ ...formData, qr_code: e.target.value })}
                  placeholder="Slot numarası"
                />
              </div>

              <div>
                <Label htmlFor="chassis_number">Şasi Numarası (VIN Kodu)</Label>
                <Input
                  id="chassis_number"
                  value={formData.chassis_number}
                  onChange={(e) => setFormData({ ...formData, chassis_number: e.target.value.toUpperCase() })}
                  placeholder="17 karakterli VIN kodu (opsiyonel)"
                  maxLength={17}
                />
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
            </div>

            <Button 
              type="submit" 
              disabled={saving} 
              className="w-full bg-accent hover:bg-accent/90 h-14 text-lg font-semibold"
            >
              <Save className="mr-2 h-5 w-5" />
              {saving ? "Kaydediliyor..." : "Kaydet"}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default EditVehicle;
