import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Upload, X, AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import DTCCodeInput from "@/components/DTCCodeInput";
import { getDTCDescription } from "@/utils/dtcCodeParser";
import { useGoBack } from "@/hooks/useGoBack";
interface Vehicle {
  id: string;
  plate_number: string;
  brand: string;
  model: string;
  year: number;
  current_km: number;
  notes: string | null;
  body_parts?: Record<string, string>;
  owner_name?: string;
}

interface PhotoSlot {
  file: File | null;
  preview: string | null;
  description: string;
}

interface ServiceRecord {
  id: string;
  title: string;
  description: string | null;
  km_at_service: number;
  service_date: string;
  part_cost?: number;
  labor_cost?: number;
}

interface VehicleSummary {
  summary_text: string | null;
  suggestions: string | null;
}

const FaultDetection = () => {
  const { vehicleId } = useParams();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const goBack = useGoBack(`/vehicle/${vehicleId}`);
  
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [serviceRecords, setServiceRecords] = useState<ServiceRecord[]>([]);
  const [vehicleSummary, setVehicleSummary] = useState<VehicleSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  
  // Form state
  const [photoSlots, setPhotoSlots] = useState<PhotoSlot[]>([
    { file: null, preview: null, description: "" },
    { file: null, preview: null, description: "" },
    { file: null, preview: null, description: "" },
    { file: null, preview: null, description: "" },
  ]);
  const [faultCodes, setFaultCodes] = useState<string[]>([""]);
  const [customerComplaint, setCustomerComplaint] = useState("");
  const [technicianObservation, setTechnicianObservation] = useState("");
  const [currentSlotIndex, setCurrentSlotIndex] = useState<number | null>(null);

  useEffect(() => {
    if (vehicleId) {
      fetchData();
    }
  }, [vehicleId]);

  const fetchData = async () => {
    try {
      // Fetch vehicle data
      const { data: vehicleData, error: vehicleError } = await supabase
        .from("vehicles")
        .select("*")
        .eq("id", vehicleId)
        .maybeSingle();

      if (vehicleError) throw vehicleError;
      if (vehicleData) {
        const parsedBodyParts = vehicleData.body_parts 
          ? (typeof vehicleData.body_parts === 'string' 
              ? JSON.parse(vehicleData.body_parts) 
              : vehicleData.body_parts) as Record<string, string>
          : {};
        setVehicle({ ...vehicleData, body_parts: parsedBodyParts });
      }

      // Fetch service records
      const { data: recordsData, error: recordsError } = await supabase
        .from("service_records")
        .select("*")
        .eq("vehicle_id", vehicleId)
        .order("service_date", { ascending: false });

      if (recordsError) throw recordsError;
      setServiceRecords(recordsData || []);

      // Fetch vehicle summary
      const { data: summaryData, error: summaryError } = await supabase
        .from("vehicle_summaries")
        .select("*")
        .eq("vehicle_id", vehicleId)
        .maybeSingle();

      if (!summaryError && summaryData) {
        setVehicleSummary(summaryData);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Veri yüklenirken hata oluştu");
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, slotIndex: number) => {
    const file = e.target.files?.[0];
    if (file) {
      const preview = URL.createObjectURL(file);
      const newSlots = [...photoSlots];
      newSlots[slotIndex] = { ...newSlots[slotIndex], file, preview };
      setPhotoSlots(newSlots);
    }
    setCurrentSlotIndex(null);
  };

  const removePhoto = (index: number) => {
    const newSlots = [...photoSlots];
    if (newSlots[index].preview) {
      URL.revokeObjectURL(newSlots[index].preview!);
    }
    newSlots[index] = { file: null, preview: null, description: "" };
    setPhotoSlots(newSlots);
  };

  const updatePhotoDescription = (index: number, description: string) => {
    const newSlots = [...photoSlots];
    newSlots[index] = { ...newSlots[index], description };
    setPhotoSlots(newSlots);
  };

  const addFaultCode = () => {
    setFaultCodes([...faultCodes, ""]);
  };

  const updateFaultCode = (index: number, value: string) => {
    const newCodes = [...faultCodes];
    newCodes[index] = value;
    setFaultCodes(newCodes);
  };

  const removeFaultCode = (index: number) => {
    if (faultCodes.length > 1) {
      const newCodes = faultCodes.filter((_, i) => i !== index);
      setFaultCodes(newCodes);
    }
  };

  const uploadPhotos = async (faultDetectionId: string): Promise<string[]> => {
    const uploadedUrls: string[] = [];
    
    for (let i = 0; i < photoSlots.length; i++) {
      const slot = photoSlots[i];
      if (slot.file) {
        const fileName = `${faultDetectionId}/${Date.now()}_${i}_${slot.file.name}`;
        const { data, error } = await supabase.storage
          .from("fault-photos")
          .upload(fileName, slot.file);
        
        if (error) {
          console.error("Upload error:", error);
          continue;
        }
        
        const { data: urlData } = supabase.storage
          .from("fault-photos")
          .getPublicUrl(fileName);
        
        // Save photo record
        await supabase.from("fault_detection_photos").insert({
          fault_detection_id: faultDetectionId,
          photo_url: urlData.publicUrl,
          description: slot.description,
          photo_order: i,
        });
        
        uploadedUrls.push(urlData.publicUrl);
      }
    }
    
    return uploadedUrls;
  };

  const handleAnalyze = async () => {
    if (!vehicle) return;
    
    setAnalyzing(true);
    
    try {
      // Create fault detection record
      const { data: faultDetection, error: createError } = await supabase
        .from("fault_detections")
        .insert({
          vehicle_id: vehicle.id,
          fault_codes: faultCodes.filter(c => c.trim() !== ""),
          customer_complaint: customerComplaint,
          technician_observation: technicianObservation,
        })
        .select()
        .single();
      
      if (createError) throw createError;
      
      // Upload photos and get URLs
      const uploadedPhotoUrls = await uploadPhotos(faultDetection.id);
      const photoDescriptions = photoSlots.filter(s => s.file).map(s => s.description);
      
      // Call AI-powered analysis edge function
      toast.info("Yapay zeka analizi başlatılıyor...");
      
      const analysisResponse = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-fault`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            vehicle: {
              brand: vehicle.brand,
              model: vehicle.model,
              year: vehicle.year,
              current_km: vehicle.current_km,
              notes: vehicle.notes,
              body_parts: vehicle.body_parts,
              owner_name: vehicle.owner_name,
              chassis_number: (vehicle as any).chassis_number || "",
            },
            serviceRecords,
            vehicleSummary,
            faultCodes: faultCodes.filter(c => c.trim() !== ""),
            faultCodesWithDescriptions: faultCodes
              .filter(c => c.trim() !== "")
              .map(code => {
                const desc = getDTCDescription(code);
                return desc ? `${code}: ${desc}` : code;
              }),
            customerComplaint,
            technicianObservation,
            photoUrls: uploadedPhotoUrls,
            photoDescriptions,
          }),
        }
      );

      let analysisResult;
      
      if (!analysisResponse.ok) {
        const errorData = await analysisResponse.json();
        console.error("AI analysis failed:", errorData);
        
        if (analysisResponse.status === 429) {
          toast.warning("AI rate limit aşıldı, yerel analiz kullanılıyor...");
        } else if (analysisResponse.status === 402) {
          toast.warning("AI kredisi tükendi, yerel analiz kullanılıyor...");
        } else {
          toast.warning("AI bağlantısı başarısız, yerel analiz kullanılıyor...");
        }
        
        // Fallback to local analysis
        analysisResult = generateAnalysis();
      } else {
        analysisResult = await analysisResponse.json();
        toast.success("Uzman AI analizi tamamlandı!");
      }
      
      // Update fault detection with analysis
      await supabase
        .from("fault_detections")
        .update({
          analysis_result: analysisResult,
          is_analyzed: true,
        })
        .eq("id", faultDetection.id);
      
      // Navigate to prediction page
      navigate(`/fault-prediction/${faultDetection.id}`);
      
    } catch (error) {
      console.error("Analysis error:", error);
      toast.error("Analiz sırasında hata oluştu");
    } finally {
      setAnalyzing(false);
    }
  };

  const generateAnalysis = () => {
    const predictions: Array<{
      title: string;
      probability: number;
      explanation: string;
      shortExplanation: string;
      criticality: "Çok Kritik" | "Orta Dereceli" | "Ötelenebilir";
    }> = [];

    // Analyze based on fault codes
    const codes = faultCodes.filter(c => c.trim() !== "");
    codes.forEach(code => {
      const upperCode = code.toUpperCase();
      if (upperCode.startsWith("P0")) {
        predictions.push({
          title: "Motor Yönetim Sistemi Arızası",
          probability: 75,
          explanation: `${code} kodu motor yönetim sisteminde bir sorun olduğunu gösteriyor. Sensör veya aktuatör kontrolü gerekiyor.`,
          shortExplanation: "Motor Sensör Hatası",
          criticality: "Orta Dereceli",
        });
      } else if (upperCode.startsWith("P1")) {
        predictions.push({
          title: "Üretici Spesifik Arıza",
          probability: 65,
          explanation: `${code} kodu üreticiye özel bir arıza kodudur. Detaylı teşhis gerekiyor.`,
          shortExplanation: "Özel Sistem Hatası",
          criticality: "Orta Dereceli",
        });
      } else if (upperCode.startsWith("P2")) {
        predictions.push({
          title: "Yakıt/Hava Ölçüm Sistemi",
          probability: 70,
          explanation: `${code} kodu yakıt veya hava karışım sisteminde sorun olduğunu gösteriyor.`,
          shortExplanation: "Yakıt Sistemi Hatası",
          criticality: "Çok Kritik",
        });
      } else if (upperCode.startsWith("C")) {
        predictions.push({
          title: "Şasi Sistemi Arızası",
          probability: 60,
          explanation: `${code} kodu şasi veya süspansiyon sisteminde sorun olduğunu gösteriyor.`,
          shortExplanation: "Şasi Hatası",
          criticality: "Orta Dereceli",
        });
      } else if (upperCode.startsWith("B")) {
        predictions.push({
          title: "Gövde/Karoseri Sistemi",
          probability: 55,
          explanation: `${code} kodu karoseri sistemlerinde (klima, cam, kilitler) sorun olduğunu gösteriyor.`,
          shortExplanation: "Karoseri Hatası",
          criticality: "Ötelenebilir",
        });
      } else if (upperCode.startsWith("U")) {
        predictions.push({
          title: "Ağ İletişim Arızası",
          probability: 80,
          explanation: `${code} kodu araç içi iletişim ağında (CAN-Bus) sorun olduğunu gösteriyor.`,
          shortExplanation: "İletişim Hatası",
          criticality: "Çok Kritik",
        });
      }
    });

    // Analyze customer complaint
    const complaintLower = customerComplaint.toLowerCase();
    if (complaintLower.includes("ses") || complaintLower.includes("gürültü")) {
      predictions.push({
        title: "Mekanik Ses/Gürültü Sorunu",
        probability: 60,
        explanation: "Müşteri şikayetine göre mekanik bir parçadan anormal ses geliyor olabilir.",
        shortExplanation: "Mekanik Aşınma",
        criticality: "Orta Dereceli",
      });
    }
    if (complaintLower.includes("titreşim") || complaintLower.includes("sarsıntı")) {
      predictions.push({
        title: "Titreşim/Balans Sorunu",
        probability: 65,
        explanation: "Motor takozları, lastik balans veya süspansiyon parçaları kontrol edilmeli.",
        shortExplanation: "Balans Problemi",
        criticality: "Orta Dereceli",
      });
    }
    if (complaintLower.includes("duman") || complaintLower.includes("yanık")) {
      predictions.push({
        title: "Yanma/Duman Sorunu",
        probability: 85,
        explanation: "Acil müdahale gerekebilir. Elektrik veya motor kaynaklı olabilir.",
        shortExplanation: "Acil Durum",
        criticality: "Çok Kritik",
      });
    }
    if (complaintLower.includes("fren") || complaintLower.includes("durmuyor")) {
      predictions.push({
        title: "Fren Sistemi Sorunu",
        probability: 90,
        explanation: "Fren sistemi acil kontrol edilmeli. Balata, disk veya hidrolik sorun olabilir.",
        shortExplanation: "Fren Arızası",
        criticality: "Çok Kritik",
      });
    }
    if (complaintLower.includes("çalışmıyor") || complaintLower.includes("marş")) {
      predictions.push({
        title: "Çalıştırma Sorunu",
        probability: 70,
        explanation: "Akü, marş motoru veya yakıt sistemi kontrol edilmeli.",
        shortExplanation: "Marş Sorunu",
        criticality: "Orta Dereceli",
      });
    }
    if (complaintLower.includes("yağ") || complaintLower.includes("sızıntı")) {
      predictions.push({
        title: "Yağ Sızıntısı",
        probability: 75,
        explanation: "Motor veya şanzıman contalarında sızıntı olabilir.",
        shortExplanation: "Conta Sorunu",
        criticality: "Orta Dereceli",
      });
    }

    // Add technician observation analysis
    const techLower = technicianObservation.toLowerCase();
    if (techLower.includes("aşınma") || techLower.includes("eskimiş")) {
      predictions.push({
        title: "Parça Aşınması",
        probability: 80,
        explanation: "Teknisyen gözlemiyle parça değişimi gerekiyor olabilir.",
        shortExplanation: "Parça Değişimi",
        criticality: "Orta Dereceli",
      });
    }

    // Consider vehicle history
    if (vehicle) {
      const currentYear = new Date().getFullYear();
      const vehicleAge = currentYear - vehicle.year;
      
      if (vehicleAge > 10 && vehicle.current_km > 200000) {
        predictions.push({
          title: "Yaşa Bağlı Genel Yıpranma",
          probability: 50,
          explanation: `${vehicleAge} yaşında ve ${vehicle.current_km.toLocaleString()} km'de bir araç için genel yıpranma beklenir.`,
          shortExplanation: "Genel Yıpranma",
          criticality: "Ötelenebilir",
        });
      }
    }

    // Consider body parts damage
    if (vehicle?.body_parts) {
      const damagedParts = Object.entries(vehicle.body_parts).filter(([_, status]) => 
        status === "damaged" || status === "changed"
      );
      if (damagedParts.length > 2) {
        predictions.push({
          title: "Geçmiş Kaza Etkisi",
          probability: 45,
          explanation: "Karoseri geçmişi hasarlı parçalar içeriyor, yapısal sorunlar mümkün.",
          shortExplanation: "Kaza Geçmişi",
          criticality: "Orta Dereceli",
        });
      }
    }

    // Default prediction if no specific matches
    if (predictions.length === 0) {
      predictions.push({
        title: "Genel Sistem Kontrolü Gerekli",
        probability: 40,
        explanation: "Verilen bilgilerle kesin bir teşhis konulamıyor. Detaylı inceleme önerilir.",
        shortExplanation: "İnceleme Gerekli",
        criticality: "Ötelenebilir",
      });
    }

    // Sort by probability and limit to 5
    predictions.sort((a, b) => b.probability - a.probability);
    const topPredictions = predictions.slice(0, 5);

    return {
      predictions: topPredictions,
      vehicleInfo: {
        brand: vehicle?.brand,
        model: vehicle?.model,
        year: vehicle?.year,
        km: vehicle?.current_km,
      },
      faultCodes: codes,
      customerComplaint,
      technicianObservation,
      serviceHistoryCount: serviceRecords.length,
      analyzedAt: new Date().toISOString(),
    };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Yükleniyor...</p>
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

  const hasPhotos = photoSlots.some(slot => slot.file !== null);
  const hasFaultCodes = faultCodes.some(code => code.trim() !== "");
  const hasComplaint = customerComplaint.trim() !== "";
  const hasObservation = technicianObservation.trim() !== "";
  const canAnalyze = hasPhotos || hasFaultCodes || hasComplaint || hasObservation;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-4 max-w-md">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={goBack}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold text-foreground">Arıza Tespiti</h1>
            <p className="text-sm text-muted-foreground">
              {vehicle.brand} {vehicle.model} - {vehicle.plate_number}
            </p>
          </div>
        </div>

        {/* Photo Upload Section */}
        <Card className="p-4 mb-4">
          <Label className="text-base font-semibold mb-3 block">
            Fotoğraf Yükleme
          </Label>
          <p className="text-xs text-muted-foreground mb-4">
            Arızayı gösteren fotoğrafları yükleyin (maksimum 4 adet)
          </p>
          
          <div className="grid grid-cols-2 gap-3">
            {photoSlots.map((slot, index) => (
              <div key={index} className="space-y-2">
                <div 
                  className={`relative aspect-square rounded-lg border-2 border-dashed ${
                    slot.preview 
                      ? "border-primary bg-primary/5" 
                      : "border-muted-foreground/30 bg-muted/50"
                  } flex items-center justify-center cursor-pointer hover:border-primary/50 transition-colors`}
                  onClick={() => {
                    if (!slot.preview) {
                      setCurrentSlotIndex(index);
                      fileInputRef.current?.click();
                    }
                  }}
                >
                  {slot.preview ? (
                    <>
                      <img 
                        src={slot.preview} 
                        alt={`Fotoğraf ${index + 1}`}
                        className="w-full h-full object-cover rounded-lg"
                      />
                      <button
                        className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-1 hover:bg-destructive/80"
                        onClick={(e) => {
                          e.stopPropagation();
                          removePhoto(index);
                        }}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </>
                  ) : (
                    <div className="text-center p-2">
                      <Upload className="h-6 w-6 mx-auto text-muted-foreground mb-1" />
                      <p className="text-[10px] text-muted-foreground">
                        Fotoğraf {index + 1}
                      </p>
                    </div>
                  )}
                </div>
                
                {slot.preview && (
                  <Input
                    placeholder="Açıklama (opsiyonel)"
                    value={slot.description}
                    onChange={(e) => updatePhotoDescription(index, e.target.value)}
                    className="text-xs h-8"
                  />
                )}
              </div>
            ))}
          </div>
          
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              if (currentSlotIndex !== null) {
                handleFileSelect(e, currentSlotIndex);
              }
            }}
          />
        </Card>

        {/* Fault Codes Section */}
        <Card className="p-4 mb-4">
          <Label className="text-base font-semibold mb-3 block">
            Arıza Kodları (OBD)
          </Label>
          <p className="text-xs text-muted-foreground mb-4">
            Cihazdan okunan arıza kodlarını girin (varsa) - Kod yazarken açıklama gösterilecek
          </p>
          
          <div className="space-y-3">
            {faultCodes.map((code, index) => (
              <DTCCodeInput
                key={index}
                value={code}
                onChange={(value) => updateFaultCode(index, value)}
                onRemove={() => removeFaultCode(index)}
                showRemove={faultCodes.length > 1}
              />
            ))}
            <Button
              variant="outline"
              size="sm"
              onClick={addFaultCode}
              className="w-full"
            >
              + Arıza Kodu Ekle
            </Button>
          </div>
        </Card>

        {/* Customer Complaint Section */}
        <Card className="p-4 mb-4">
          <Label className="text-base font-semibold mb-3 block">
            Müşteri Şikayeti
          </Label>
          <Textarea
            placeholder="Müşterinin araçla ilgili şikayetlerini yazın..."
            value={customerComplaint}
            onChange={(e) => setCustomerComplaint(e.target.value)}
            rows={4}
            className="resize-none"
          />
        </Card>

        {/* Technician Observation Section */}
        <Card className="p-4 mb-4">
          <Label className="text-base font-semibold mb-3 block">
            Teknisyen Gözlemi / Tahmini
          </Label>
          <Textarea
            placeholder="Aracı inceledikten sonraki gözlemlerinizi ve tahminlerinizi yazın..."
            value={technicianObservation}
            onChange={(e) => setTechnicianObservation(e.target.value)}
            rows={4}
            className="resize-none"
          />
        </Card>

        {/* Info Card */}
        <Card className="p-3 mb-4 bg-accent/10 border-accent/30">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-accent shrink-0 mt-0.5" />
            <div>
              <p className="text-xs text-muted-foreground">
                Analiz, aracın servis geçmişi, teknik bilgileri, kaporta durumu ve girdiğiniz bilgileri birleştirerek yapılacaktır.
              </p>
              {serviceRecords.length > 0 && (
                <p className="text-xs text-accent font-semibold mt-1">
                  {serviceRecords.length} servis kaydı analiz edilecek
                </p>
              )}
            </div>
          </div>
        </Card>

        {/* Analyze Button */}
        <Button
          onClick={handleAnalyze}
          disabled={!canAnalyze || analyzing}
          className="w-full h-14 text-lg font-bold bg-accent hover:bg-accent/90 text-accent-foreground"
        >
          {analyzing ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Analiz Ediliyor...
            </>
          ) : (
            "ANALİZ ET"
          )}
        </Button>

        {!canAnalyze && (
          <p className="text-xs text-center text-muted-foreground mt-2">
            En az bir bilgi girin (fotoğraf, arıza kodu, şikayet veya gözlem)
          </p>
        )}
      </div>
    </div>
  );
};

export default FaultDetection;
