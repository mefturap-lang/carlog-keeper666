import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ArrowLeft, CalendarIcon, Save, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useGoBack } from "@/hooks/useGoBack";

interface Vehicle {
  id: string;
  plate_number: string;
  brand: string;
  model: string;
  current_km: number;
}

const PlannedMaintenance = () => {
  const { vehicleId } = useParams();
  const navigate = useNavigate();
  const goBack = useGoBack(`/vehicle/${vehicleId}`);
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState("");
  const [plannedDate, setPlannedDate] = useState<Date | undefined>(undefined);
  const [plannedKm, setPlannedKm] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (vehicleId) {
      fetchVehicle();
    }
  }, [vehicleId]);

  const fetchVehicle = async () => {
    try {
      const { data } = await supabase
        .from("vehicles")
        .select("id, plate_number, brand, model, current_km")
        .eq("id", vehicleId)
        .maybeSingle();

      if (data) {
        setVehicle(data);
      }
    } catch (error) {
      console.error("Error fetching vehicle:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!vehicle || !title.trim() || !plannedDate) {
      toast.error("Lütfen başlık ve tarih alanlarını doldurun");
      return;
    }

    setSaving(true);

    try {
      await supabase.from("planned_maintenance").insert({
        vehicle_id: vehicle.id,
        title: title.trim(),
        planned_date: format(plannedDate, "yyyy-MM-dd"),
        planned_km: plannedKm ? parseInt(plannedKm) : null,
        notes: notes.trim() || null,
      });

      toast.success("Planlanan bakım kaydedildi");
      navigate(`/vehicle/${vehicle.id}`);
    } catch (error) {
      console.error("Error saving:", error);
      toast.error("Kayıt sırasında hata oluştu");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
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

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-4 max-w-md">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={goBack}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="font-bold text-lg">Planlanan Bakım Ekle</h1>
            <p className="text-xs text-muted-foreground">
              {vehicle.brand} {vehicle.model} - {vehicle.plate_number}
            </p>
          </div>
        </div>

        <Card className="p-4 space-y-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Başlık *</Label>
            <Input
              id="title"
              placeholder="Örn: Yağ Bakımı, Balata Değişimi..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          {/* Planned Date */}
          <div className="space-y-2">
            <Label>Planlanan Tarih *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !plannedDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {plannedDate
                    ? format(plannedDate, "d MMMM yyyy", { locale: tr })
                    : "Tarih seçin"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={plannedDate}
                  onSelect={setPlannedDate}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                  disabled={(date) => date < new Date()}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Planned KM */}
          <div className="space-y-2">
            <Label htmlFor="planned_km">Hedef Kilometre (Opsiyonel)</Label>
            <Input
              id="planned_km"
              type="number"
              placeholder={`Güncel: ${vehicle.current_km.toLocaleString()} km`}
              value={plannedKm}
              onChange={(e) => setPlannedKm(e.target.value)}
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notlar (Opsiyonel)</Label>
            <Textarea
              id="notes"
              placeholder="Eklemek istediğiniz notlar..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          {/* Info */}
          <div className="p-3 bg-muted rounded-lg">
            <p className="text-xs text-muted-foreground">
              📅 Planlanan tarihe 15 gün kala ana sayfada bildirim görüntülenecektir.
            </p>
          </div>

          {/* Save Button */}
          <Button
            onClick={handleSave}
            disabled={saving || !title.trim() || !plannedDate}
            className="w-full bg-accent hover:bg-accent/90"
          >
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Kaydediliyor...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Kaydet
              </>
            )}
          </Button>
        </Card>
      </div>
    </div>
  );
};

export default PlannedMaintenance;
