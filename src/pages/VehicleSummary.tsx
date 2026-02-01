import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, RefreshCw, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { useGoBack } from "@/hooks/useGoBack";

interface Vehicle {
  id: string;
  plate_number: string;
  brand: string;
  model: string;
  year: number;
  color: string;
  current_km: number;
  notes: string | null;
  body_parts?: Record<string, string>;
  owner_name?: string;
}

interface ServiceRecord {
  id: string;
  title: string;
  description: string | null;
  km_at_service: number;
  service_date: string;
  operation_type?: string;
  technician?: string;
}

interface VehicleSummaryData {
  id: string;
  vehicle_id: string;
  summary_text: string | null;
  suggestions: string | null;
  last_service_record_count: number;
  last_updated_at: string;
}

const VehicleSummary = () => {
  const { vehicleId } = useParams();
  const navigate = useNavigate();
  const goBack = useGoBack(`/vehicle/${vehicleId}`);
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [records, setRecords] = useState<ServiceRecord[]>([]);
  const [summary, setSummary] = useState<VehicleSummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [hasNewRecords, setHasNewRecords] = useState(false);

  useEffect(() => {
    if (vehicleId) {
      fetchData();
    }
  }, [vehicleId]);

  const fetchData = async () => {
    try {
      // Fetch vehicle
      const { data: vehicleData } = await supabase
        .from("vehicles")
        .select("*")
        .eq("id", vehicleId)
        .maybeSingle();

      if (vehicleData) {
        setVehicle(vehicleData as Vehicle);
      }

      // Fetch records
      const { data: recordsData } = await supabase
        .from("service_records")
        .select("*")
        .eq("vehicle_id", vehicleId)
        .order("service_date", { ascending: false });

      setRecords((recordsData as ServiceRecord[]) || []);

      // Fetch existing summary
      const { data: summaryData } = await supabase
        .from("vehicle_summaries")
        .select("*")
        .eq("vehicle_id", vehicleId)
        .maybeSingle();

      if (summaryData) {
        setSummary(summaryData as VehicleSummaryData);
        // Check if there are new records since last update
        const currentCount = recordsData?.length || 0;
        if (currentCount > (summaryData.last_service_record_count || 0)) {
          setHasNewRecords(true);
        }
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Veri yüklenirken hata oluştu");
    } finally {
      setLoading(false);
    }
  };

  const generateSummary = () => {
    if (!vehicle) return "";

    const vehicleAge = new Date().getFullYear() - vehicle.year;
    const bodyPartsStatus = vehicle.body_parts || {};
    const bodyIssues = Object.entries(bodyPartsStatus)
      .filter(([, status]) => status && status !== "original")
      .map(([part, status]) => `${part}: ${status}`)
      .join(", ");

    let summaryText = `## Araç Genel Durumu\n\n`;
    summaryText += `**${vehicle.brand} ${vehicle.model}** (${vehicle.year} model, ${vehicleAge} yaşında)\n\n`;
    summaryText += `Güncel KM: ${vehicle.current_km.toLocaleString()} km\n\n`;

    // Observations
    if (vehicle.notes) {
      summaryText += `### Teknisyen Gözlemleri\n${vehicle.notes}\n\n`;
    }

    // Body status
    if (bodyIssues) {
      summaryText += `### Kaporta Durumu\n${bodyIssues}\n\n`;
    } else {
      summaryText += `### Kaporta Durumu\nOrijinal durumda\n\n`;
    }

    // Service history summary
    if (records.length > 0) {
      summaryText += `### Servis Geçmişi (${records.length} işlem)\n`;
      const recentRecords = records.slice(0, 5);
      recentRecords.forEach((r) => {
        const date = new Date(r.service_date).toLocaleDateString("tr-TR");
        const titleParts = r.title.split(" - ");
        const shortTitle = titleParts.length > 1 ? titleParts.slice(1).join(" - ") : r.title;
        summaryText += `- ${date}: ${shortTitle}\n`;
      });
      if (records.length > 5) {
        summaryText += `- ... ve ${records.length - 5} işlem daha\n`;
      }
    }

    return summaryText;
  };

  const generateSuggestions = () => {
    if (!vehicle) return "";

    const vehicleAge = new Date().getFullYear() - vehicle.year;
    const suggestions: string[] = [];

    // Age-based suggestions
    if (vehicleAge > 5) {
      suggestions.push("🔴 Araç 5 yaşını geçmiş, düzenli bakım kritik öneme sahip");
    }
    if (vehicleAge > 10) {
      suggestions.push("🔴 Araç 10 yaşını geçmiş, elektrik aksamı ve conta kontrolü önerilir");
    }

    // KM-based suggestions
    if (vehicle.current_km > 100000) {
      suggestions.push("🟠 Yüksek kilometre - Triger seti kontrolü önerilir");
    }
    if (vehicle.current_km > 150000) {
      suggestions.push("🟠 Şanzıman yağı değişimi kontrol edilmeli");
    }

    // Body-based suggestions
    const bodyParts = vehicle.body_parts || {};
    const paintedParts = Object.values(bodyParts).filter((s) => s === "painted").length;
    const changedParts = Object.values(bodyParts).filter((s) => s === "changed").length;

    if (paintedParts > 0) {
      suggestions.push(`🟡 ${paintedParts} parça boyalı - Lokal boya kontrolü yapılmalı`);
    }
    if (changedParts > 0) {
      suggestions.push(`🟡 ${changedParts} parça değişmiş - Kaza geçmişi incelenmeli`);
    }

    // General suggestions
    suggestions.push("🟢 Periyodik bakımların düzenli yapılması önerilir");
    suggestions.push("🟢 Fren sistemi 6 ayda bir kontrol edilmeli");

    return suggestions.join("\n");
  };

  const handleUpdate = async () => {
    if (!vehicle) return;
    setUpdating(true);

    try {
      const newSummary = generateSummary();
      const newSuggestions = generateSuggestions();

      const summaryPayload = {
        vehicle_id: vehicle.id,
        summary_text: newSummary,
        suggestions: newSuggestions,
        last_service_record_count: records.length,
        last_updated_at: new Date().toISOString(),
      };

      if (summary) {
        // Update existing
        await supabase
          .from("vehicle_summaries")
          .update(summaryPayload)
          .eq("id", summary.id);
      } else {
        // Insert new
        await supabase.from("vehicle_summaries").insert(summaryPayload);
      }

      // Refetch
      const { data: updatedSummary } = await supabase
        .from("vehicle_summaries")
        .select("*")
        .eq("vehicle_id", vehicle.id)
        .maybeSingle();

      if (updatedSummary) {
        setSummary(updatedSummary as VehicleSummaryData);
      }

      setHasNewRecords(false);
      toast.success("Özet güncellendi");
    } catch (error) {
      console.error("Error updating summary:", error);
      toast.error("Özet güncellenirken hata oluştu");
    } finally {
      setUpdating(false);
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
            <h1 className="font-bold text-lg">Genel Özet</h1>
            <p className="text-xs text-muted-foreground">
              {vehicle.brand} {vehicle.model} - {vehicle.plate_number}
            </p>
          </div>
        </div>

        {/* New Records Alert */}
        {hasNewRecords && (
          <Card className="p-3 mb-4 bg-accent/10 border-accent">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-accent" />
              <p className="text-sm text-accent">
                Yeni servis kayıtları mevcut. Özeti güncellemek için aşağıdaki butona tıklayın.
              </p>
            </div>
          </Card>
        )}

        {/* Summary Content */}
        {summary?.summary_text ? (
          <Card className="p-4 mb-4">
            <div className="prose prose-sm max-w-none">
              {summary.summary_text.split("\n").map((line, index) => {
                if (line.startsWith("## ")) {
                  return (
                    <h2 key={index} className="text-lg font-bold text-foreground mb-2">
                      {line.replace("## ", "")}
                    </h2>
                  );
                }
                if (line.startsWith("### ")) {
                  return (
                    <h3 key={index} className="text-sm font-semibold text-foreground mt-4 mb-2">
                      {line.replace("### ", "")}
                    </h3>
                  );
                }
                if (line.startsWith("**") && line.endsWith("**")) {
                  return (
                    <p key={index} className="font-bold text-foreground">
                      {line.replace(/\*\*/g, "")}
                    </p>
                  );
                }
                if (line.startsWith("- ")) {
                  return (
                    <p key={index} className="text-sm text-foreground pl-2">
                      • {line.replace("- ", "")}
                    </p>
                  );
                }
                if (line.trim()) {
                  return (
                    <p key={index} className="text-sm text-muted-foreground">
                      {line}
                    </p>
                  );
                }
                return null;
              })}
            </div>
          </Card>
        ) : (
          <Card className="p-8 mb-4 text-center">
            <p className="text-muted-foreground mb-4">
              Henüz özet oluşturulmamış. "Güncelle" butonuna tıklayarak özet oluşturabilirsiniz.
            </p>
          </Card>
        )}

        {/* Suggestions */}
        {summary?.suggestions && (
          <Card className="p-4 mb-4 border-primary/30">
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle className="h-5 w-5 text-primary" />
              <h3 className="font-semibold text-foreground">Öneriler</h3>
            </div>
            <div className="space-y-2">
              {summary.suggestions.split("\n").map((suggestion, index) => (
                <p key={index} className="text-sm text-foreground">
                  {suggestion}
                </p>
              ))}
            </div>
          </Card>
        )}

        {/* Last Updated */}
        {summary?.last_updated_at && (
          <p className="text-xs text-muted-foreground text-center mb-4">
            Son güncelleme:{" "}
            {new Date(summary.last_updated_at).toLocaleDateString("tr-TR", {
              day: "numeric",
              month: "long",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        )}

        {/* Update Button */}
        <Button
          onClick={handleUpdate}
          disabled={updating}
          className="w-full bg-primary hover:bg-primary/90"
        >
          {updating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Güncelleniyor...
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 h-4 w-4" />
              Güncelle
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default VehicleSummary;
