import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Bell, Calendar, Car, Loader2, CheckCircle, Clock, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { differenceInDays, differenceInMinutes, format, isWithinInterval, setHours, setMinutes } from "date-fns";
import { tr } from "date-fns/locale";
import { useGoBack } from "@/hooks/useGoBack";

interface PlannedMaintenance {
  id: string;
  vehicle_id: string;
  title: string;
  planned_date: string;
  planned_km: number | null;
  notes: string | null;
  is_completed: boolean;
}

interface Vehicle {
  id: string;
  plate_number: string;
  brand: string;
  model: string;
}

interface NotificationItem {
  maintenance: PlannedMaintenance;
  vehicle: Vehicle;
  daysUntil: number;
}

interface DelayedRecord {
  id: string;
  title: string;
  technician: string | null;
  created_at: string;
  estimated_duration_minutes: number;
  vehicle: Vehicle;
  delayMinutes: number;
}

const Notifications = () => {
  const navigate = useNavigate();
  const goBack = useGoBack();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [delayedRecords, setDelayedRecords] = useState<DelayedRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();
    fetchDelayedRecords();
  }, []);

  // Check if current time is within business hours (09:30 - 20:00)
  const isBusinessHours = () => {
    const now = new Date();
    const start = setMinutes(setHours(now, 9), 30);
    const end = setMinutes(setHours(now, 20), 0);
    return isWithinInterval(now, { start, end });
  };

  const fetchDelayedRecords = async () => {
    try {
      // Only fetch during business hours
      if (!isBusinessHours()) {
        setDelayedRecords([]);
        return;
      }

      // Fetch incomplete service records with estimated duration
      const { data: recordsData, error: recordsError } = await supabase
        .from("service_records")
        .select("id, title, technician, created_at, estimated_duration_minutes, vehicle_id")
        .neq("record_status", "tamamlandi")
        .not("estimated_duration_minutes", "is", null);

      if (recordsError) throw recordsError;

      if (!recordsData || recordsData.length === 0) {
        setDelayedRecords([]);
        return;
      }

      // Get vehicles for these records
      const vehicleIds = [...new Set(recordsData.map(r => r.vehicle_id))];
      const { data: vehiclesData, error: vehiclesError } = await supabase
        .from("vehicles")
        .select("id, plate_number, brand, model")
        .in("id", vehicleIds);

      if (vehiclesError) throw vehiclesError;

      const vehicleMap = new Map(vehiclesData?.map(v => [v.id, v]));

      const now = new Date();
      const delayed: DelayedRecord[] = [];

      recordsData.forEach(record => {
        const createdAt = new Date(record.created_at);
        const estimatedEndTime = new Date(createdAt.getTime() + (record.estimated_duration_minutes * 60 * 1000));
        const delayThreshold = new Date(estimatedEndTime.getTime() + (2 * 60 * 60 * 1000)); // +2 hours

        const minutesSinceCreation = differenceInMinutes(now, createdAt);
        const delayMinutes = minutesSinceCreation - record.estimated_duration_minutes;

        // Check if delayed by more than 2 hours (120 minutes)
        if (delayMinutes >= 120) {
          const vehicle = vehicleMap.get(record.vehicle_id);
          if (vehicle) {
            delayed.push({
              id: record.id,
              title: record.title,
              technician: record.technician,
              created_at: record.created_at,
              estimated_duration_minutes: record.estimated_duration_minutes,
              vehicle,
              delayMinutes,
            });
          }
        }
      });

      setDelayedRecords(delayed);
    } catch (error) {
      console.error("Error fetching delayed records:", error);
    }
  };

  const fetchNotifications = async () => {
    try {
      // Fetch all planned maintenance
      const { data: maintenanceData, error: maintenanceError } = await supabase
        .from("planned_maintenance")
        .select("*")
        .eq("is_completed", false)
        .order("planned_date", { ascending: true });

      if (maintenanceError) throw maintenanceError;

      if (!maintenanceData || maintenanceData.length === 0) {
        setNotifications([]);
        setLoading(false);
        return;
      }

      // Fetch vehicles for these maintenance items
      const vehicleIds = [...new Set(maintenanceData.map((m) => m.vehicle_id))];
      const { data: vehiclesData, error: vehiclesError } = await supabase
        .from("vehicles")
        .select("id, plate_number, brand, model")
        .in("id", vehicleIds);

      if (vehiclesError) throw vehiclesError;

      const vehicleMap = new Map(vehiclesData?.map((v) => [v.id, v]));

      // Filter and map notifications (within 15 days)
      const today = new Date();
      const notificationItems: NotificationItem[] = [];

      maintenanceData.forEach((maintenance) => {
        const plannedDate = new Date(maintenance.planned_date);
        const daysUntil = differenceInDays(plannedDate, today);
        const vehicle = vehicleMap.get(maintenance.vehicle_id);

        // Show notifications for upcoming (within 15 days) or overdue
        if (daysUntil <= 15 && vehicle) {
          notificationItems.push({
            maintenance,
            vehicle,
            daysUntil,
          });
        }
      });

      setNotifications(notificationItems);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      toast.error("Bildirimler yüklenirken hata oluştu");
    } finally {
      setLoading(false);
    }
  };

  const markAsCompleted = async (maintenanceId: string) => {
    try {
      await supabase
        .from("planned_maintenance")
        .update({ is_completed: true })
        .eq("id", maintenanceId);

      setNotifications((prev) =>
        prev.filter((n) => n.maintenance.id !== maintenanceId)
      );
      toast.success("Bakım tamamlandı olarak işaretlendi");
    } catch (error) {
      console.error("Error updating:", error);
      toast.error("Güncelleme sırasında hata oluştu");
    }
  };

  const getUrgencyColor = (daysUntil: number) => {
    if (daysUntil < 0) return "bg-red-50 border-red-200";
    if (daysUntil <= 3) return "bg-orange-50 border-orange-200";
    if (daysUntil <= 7) return "bg-yellow-50 border-yellow-200";
    return "bg-blue-50 border-blue-200";
  };

  const getUrgencyText = (daysUntil: number) => {
    if (daysUntil < 0) return { text: `${Math.abs(daysUntil)} gün gecikmiş`, color: "text-red-600" };
    if (daysUntil === 0) return { text: "Bugün", color: "text-red-600" };
    if (daysUntil === 1) return { text: "Yarın", color: "text-orange-600" };
    return { text: `${daysUntil} gün kaldı`, color: "text-blue-600" };
  };

  const formatDelayTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins} dakika`;
    if (mins === 0) return `${hours} saat`;
    return `${hours} saat ${mins} dk`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const totalNotifications = notifications.length + delayedRecords.length;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-4 max-w-md">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" onClick={goBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-accent" />
            <h1 className="font-bold text-lg">Bildirimler</h1>
            {totalNotifications > 0 && (
              <span className="bg-red-500 text-white text-xs font-bold rounded-full px-2 py-0.5">
                {totalNotifications}
              </span>
            )}
          </div>
        </div>

        {/* Business Hours Notice */}
        {!isBusinessHours() && (
          <Card className="p-3 mb-4 bg-gray-100 border-gray-200">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Clock className="h-4 w-4" />
              <span>Gecikme bildirimleri mesai saatlerinde gösterilir (09:30 - 20:00)</span>
            </div>
          </Card>
        )}

        {/* Delayed Records Section */}
        {delayedRecords.length > 0 && (
          <div className="mb-6">
            <h2 className="font-semibold text-sm text-red-600 mb-3 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Gecikmiş İşlemler ({delayedRecords.length})
            </h2>
            <div className="space-y-3">
              {delayedRecords.map((record) => (
                <Card
                  key={record.id}
                  className="p-4 bg-red-50 border-red-200"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Car className="h-4 w-4 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">
                          {record.vehicle.plate_number}
                        </span>
                      </div>
                      <h3 className="font-semibold text-foreground">
                        {record.title}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {record.vehicle.brand} {record.vehicle.model}
                      </p>

                      {record.technician && (
                        <p className="text-xs text-blue-600 mt-1">
                          Tekniker: {record.technician}
                        </p>
                      )}

                      <div className="flex items-center gap-2 mt-2">
                        <Clock className="h-3 w-3 text-red-500" />
                        <span className="text-xs font-bold text-red-600">
                          {formatDelayTime(record.delayMinutes)} gecikme
                        </span>
                      </div>

                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-muted-foreground">
                          Başlangıç: {format(new Date(record.created_at), "d MMM HH:mm", { locale: tr })}
                        </span>
                      </div>
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full mt-3 border-red-300 text-red-700 hover:bg-red-100"
                    onClick={() => navigate(`/service-record/${record.id}`)}
                  >
                    Kayda Git
                  </Button>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Planned Maintenance Notifications */}
        {notifications.length > 0 && (
          <div className="mb-6">
            <h2 className="font-semibold text-sm text-muted-foreground mb-3 flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Planlanan Bakımlar ({notifications.length})
            </h2>
            <div className="space-y-3">
              {notifications.map((item) => {
                const urgency = getUrgencyText(item.daysUntil);
                return (
                  <Card
                    key={item.maintenance.id}
                    className={`p-4 ${getUrgencyColor(item.daysUntil)}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Car className="h-4 w-4 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">
                            {item.vehicle.plate_number}
                          </span>
                        </div>
                        <h3 className="font-semibold text-foreground">
                          {item.maintenance.title}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {item.vehicle.brand} {item.vehicle.model}
                        </p>

                        <div className="flex items-center gap-2 mt-2">
                          <Calendar className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(item.maintenance.planned_date), "d MMMM yyyy", { locale: tr })}
                          </span>
                          <span className={`text-xs font-bold ${urgency.color}`}>
                            ({urgency.text})
                          </span>
                        </div>

                        {item.maintenance.notes && (
                          <p className="text-xs text-muted-foreground mt-2 italic">
                            {item.maintenance.notes}
                          </p>
                        )}
                      </div>

                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => markAsCompleted(item.maintenance.id)}
                        className="shrink-0"
                      >
                        <CheckCircle className="h-5 w-5 text-primary" />
                      </Button>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full mt-3"
                      onClick={() => navigate(`/vehicle/${item.vehicle.id}`)}
                    >
                      Araca Git
                    </Button>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* Empty State */}
        {totalNotifications === 0 && (
          <Card className="p-8 text-center">
            <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              Bildirim bulunmuyor
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Planlanan bakımlar 15 gün kala ve geciken işlemler burada görüntülenecektir
            </p>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Notifications;
