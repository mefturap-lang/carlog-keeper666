import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { differenceInDays, differenceInMinutes, isWithinInterval, setHours, setMinutes } from "date-fns";
import { Plus, Bell, List, QrCode, Search, Settings } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();
  const [notificationCount, setNotificationCount] = useState(0);

  useEffect(() => {
    fetchNotificationCount();
  }, []);

  // Check if current time is within business hours (09:30 - 20:00)
  const isBusinessHours = () => {
    const now = new Date();
    const start = setMinutes(setHours(now, 9), 30);
    const end = setMinutes(setHours(now, 20), 0);
    return isWithinInterval(now, { start, end });
  };

  const fetchNotificationCount = async () => {
    try {
      let count = 0;

      // Count planned maintenance notifications
      const { data: maintenanceData, error: maintenanceError } = await supabase
        .from("planned_maintenance")
        .select("planned_date")
        .eq("is_completed", false);

      if (!maintenanceError && maintenanceData) {
        const today = new Date();
        count += maintenanceData.filter((m) => {
          const daysUntil = differenceInDays(new Date(m.planned_date), today);
          return daysUntil <= 15;
        }).length;
      }

      // Count delayed records (only during business hours)
      if (isBusinessHours()) {
        const { data: recordsData, error: recordsError } = await supabase
          .from("service_records")
          .select("created_at, estimated_duration_minutes")
          .neq("record_status", "tamamlandi")
          .not("estimated_duration_minutes", "is", null);

        if (!recordsError && recordsData) {
          const now = new Date();
          recordsData.forEach(record => {
            const createdAt = new Date(record.created_at);
            const minutesSinceCreation = differenceInMinutes(now, createdAt);
            const delayMinutes = minutesSinceCreation - (record.estimated_duration_minutes || 0);
            
            // Count if delayed by more than 2 hours (120 minutes)
            if (delayMinutes >= 120) {
              count++;
            }
          });
        }
      }

      setNotificationCount(count);
    } catch (error) {
      console.error("Error fetching notifications:", error);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="container mx-auto p-4 md:p-6 max-w-4xl flex-1 flex flex-col">
        {/* Header */}
        <div className="text-center mb-4 pt-4 md:pt-6">
          <h1 className="text-2xl md:text-3xl font-bold text-accent mb-1">ÜMİT OTO SERVİS</h1>
          <p className="text-xs md:text-sm text-muted-foreground tracking-widest">ARAÇ TAKİP SİSTEMİ</p>
        </div>

        {/* Hero Section with QR Tara and Search Buttons side by side */}
        <div className="flex items-center justify-center gap-6 mb-6">
          {/* QR Tara Button - Green border with black QR icon */}
          <div className="text-center">
            <button
              onClick={() => navigate("/scan")}
              className="w-20 h-20 mx-auto mb-2 bg-white border-4 border-green-500 rounded-2xl flex items-center justify-center cursor-pointer transition-all hover:shadow-lg hover:border-green-600"
            >
              <QrCode className="w-10 h-10 text-black" />
            </button>
            <p className="text-xs text-muted-foreground font-medium">QR Tara</p>
          </div>

          {/* Search Button - Orange border with magnifying glass */}
          <div className="text-center">
            <button
              onClick={() => navigate("/vehicle-search")}
              className="w-20 h-20 mx-auto mb-2 bg-white border-4 border-orange-500 rounded-2xl flex items-center justify-center cursor-pointer transition-all hover:shadow-lg hover:border-orange-600"
            >
              <Search className="w-10 h-10 text-orange-500" />
            </button>
            <p className="text-xs text-muted-foreground font-medium">Manuel Giriş</p>
          </div>
        </div>

        <p className="text-sm text-muted-foreground text-center mb-6">Profesyonel Araç Takip ve Servis Yönetimi</p>

        {/* Actions - Stacked buttons for mobile */}
        <div className="flex flex-col gap-2 mb-4 max-w-xs mx-auto w-full">
          <Button
            onClick={() => navigate("/add-vehicle")}
            className="bg-accent hover:bg-accent/90 h-12 text-sm font-semibold rounded-xl w-full"
          >
            <Plus className="mr-2 h-4 w-4" />
            Yeni Araç
          </Button>

          <Button
            variant="outline"
            onClick={() => navigate("/vehicles")}
            className="h-12 text-sm font-semibold rounded-xl border-2 border-primary text-primary hover:bg-primary/5 w-full"
          >
            <List className="mr-2 h-4 w-4" />
            Araç Listesi
          </Button>

          <Button
            variant="outline"
            onClick={() => navigate("/admin-panel")}
            className="h-12 text-sm font-semibold rounded-xl border-2 border-accent text-accent hover:bg-accent/5 w-full"
          >
            <Settings className="mr-2 h-4 w-4" />
            Yönetici Paneli
          </Button>

          <Button
            variant="outline"
            onClick={() => navigate("/notifications")}
            className="relative h-12 text-sm font-semibold rounded-xl border-2 border-green-500 text-green-600 hover:bg-green-50 w-full"
          >
            <Bell className="mr-2 h-4 w-4" />
            Bildirimler
            {notificationCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                {notificationCount}
              </span>
            )}
          </Button>
        </div>

      </div>
    </div>
  );
};

export default Index;