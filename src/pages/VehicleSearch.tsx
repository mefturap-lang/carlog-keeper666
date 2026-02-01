import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Search, List } from "lucide-react";
import { toast } from "sonner";
import { useGoBack } from "@/hooks/useGoBack";

const VehicleSearch = () => {
  const navigate = useNavigate();
  const goBack = useGoBack();
  const [plateNumber, setPlateNumber] = useState("");
  const [chassisNumber, setChassisNumber] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    if (!plateNumber && !chassisNumber && !customerName) {
      toast.error("En az bir alan doldurulmalıdır");
      return;
    }

    setLoading(true);
    try {
      let query = supabase.from("vehicles").select("*");

      if (plateNumber) {
        query = query.ilike("plate_number", `%${plateNumber}%`);
      }
      if (chassisNumber) {
        query = query.ilike("chassis_number", `%${chassisNumber}%`);
      }

      const { data, error } = await query.limit(1).maybeSingle();

      if (error) throw error;

      if (data) {
        navigate(`/vehicle/${data.id}`);
      } else {
        toast.error("Araç bulunamadı");
      }
    } catch (error) {
      toast.error("Arama sırasında hata oluştu");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6 max-w-md">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="ghost"
            size="icon"
            onClick={goBack}
            className="shrink-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold text-accent">ÜMİT OTO SERVİS</h1>
        </div>

        {/* Title */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-foreground">Araç Arama</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Manuel giriş için aşağıdaki alanlardan en az birini doldurun
          </p>
        </div>

        {/* Search Form */}
        <div className="flex gap-4 mb-6">
          <div className="flex-1 space-y-4">
            <div>
              <Label htmlFor="plate" className="text-xs text-muted-foreground">
                Araç Plakası
              </Label>
              <Input
                id="plate"
                value={plateNumber}
                onChange={(e) => setPlateNumber(e.target.value)}
                placeholder="Örn: 35 SMT 77"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="chassis" className="text-xs text-muted-foreground">
                Şasi Numarası
              </Label>
              <Input
                id="chassis"
                value={chassisNumber}
                onChange={(e) => setChassisNumber(e.target.value)}
                placeholder="Örn: WAUZZZ4F2BN123456"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="customer" className="text-xs text-muted-foreground">
                Müşteri Adı
              </Label>
              <Input
                id="customer"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Örn: Metehan Bilgili"
                className="mt-1"
              />
            </div>
          </div>

          {/* Search Button */}
          <button
            onClick={handleSearch}
            disabled={loading}
            className="w-24 h-24 mt-6 bg-secondary text-secondary-foreground rounded-2xl flex flex-col items-center justify-center gap-1 hover:bg-secondary/90 transition-colors disabled:opacity-50"
          >
            <Search className="h-6 w-6" />
            <span className="text-xs font-medium">BUL</span>
          </button>
        </div>

        {/* List Button */}
        <Button
          variant="outline"
          className="w-full h-12 rounded-full border-2"
          onClick={() => navigate("/vehicles")}
        >
          <List className="mr-2 h-4 w-4" />
          Listeden Seç
        </Button>
      </div>
    </div>
  );
};

export default VehicleSearch;
