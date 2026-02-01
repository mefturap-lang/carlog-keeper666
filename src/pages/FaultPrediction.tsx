import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, AlertTriangle, AlertCircle, Clock, CheckCircle2, Wrench, Shield, Lightbulb, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useGoBack } from "@/hooks/useGoBack";

interface Prediction {
  title: string;
  probability: number;
  shortExplanation: string;
  criticality: "Çok Kritik" | "Orta Dereceli" | "Ötelenebilir";
  // New concise fields
  cause?: string;
  faultyParts?: string;
  recommendedAction?: string;
  // Legacy fields for backwards compatibility
  explanation?: string;
  rootCause?: string;
  failureMechanism?: string;
  affectedComponents?: string[];
  diagnosticSteps?: string[];
  repairSolution?: string;
  estimatedCost?: string;
  urgency?: string;
  preventionTips?: string;
}

interface AnalysisResult {
  predictions: Prediction[];
  vehicleInfo: {
    brand: string;
    model: string;
    year: number;
    km: number;
  };
  faultCodes: string[];
  customerComplaint: string;
  technicianObservation: string;
  serviceHistoryCount: number;
  analyzedAt: string;
  // New fields from AI
  overallAssessment?: string;
  safetyWarnings?: string[];
  additionalRecommendations?: string[];
  analysisMethod?: string;
}

interface FaultDetection {
  id: string;
  vehicle_id: string;
  fault_codes: string[];
  customer_complaint: string | null;
  technician_observation: string | null;
  analysis_result: AnalysisResult | null;
  is_analyzed: boolean;
  created_at: string;
}

interface FaultPhoto {
  id: string;
  photo_url: string;
  description: string | null;
  photo_order: number;
}

const FaultPrediction = () => {
  const { faultId } = useParams();
  const navigate = useNavigate();
  const goBack = useGoBack();
  const [faultDetection, setFaultDetection] = useState<FaultDetection | null>(null);
  const [photos, setPhotos] = useState<FaultPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedPredictions, setExpandedPredictions] = useState<Record<number, boolean>>({});

  useEffect(() => {
    if (faultId) {
      fetchFaultData();
    }
  }, [faultId]);

  const fetchFaultData = async () => {
    try {
      const { data: faultData, error: faultError } = await supabase
        .from("fault_detections")
        .select("*")
        .eq("id", faultId)
        .maybeSingle();

      if (faultError) throw faultError;
      
      if (faultData) {
        const parsedData = {
          ...faultData,
          analysis_result: typeof faultData.analysis_result === 'string' 
            ? JSON.parse(faultData.analysis_result) 
            : faultData.analysis_result
        };
        setFaultDetection(parsedData);
        // Expand first prediction by default
        setExpandedPredictions({ 0: true });
      }

      const { data: photosData, error: photosError } = await supabase
        .from("fault_detection_photos")
        .select("*")
        .eq("fault_detection_id", faultId)
        .order("photo_order", { ascending: true });

      if (photosError) throw photosError;
      setPhotos(photosData || []);
    } catch (error) {
      console.error("Error fetching fault data:", error);
      toast.error("Veri yüklenirken hata oluştu");
    } finally {
      setLoading(false);
    }
  };

  const togglePrediction = (index: number) => {
    setExpandedPredictions(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  const getCriticalityIcon = (criticality: string) => {
    switch (criticality) {
      case "Çok Kritik":
        return <AlertTriangle className="h-4 w-4 text-destructive" />;
      case "Orta Dereceli":
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case "Ötelenebilir":
        return <Clock className="h-4 w-4 text-green-500" />;
      default:
        return <CheckCircle2 className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getCriticalityColor = (criticality: string) => {
    switch (criticality) {
      case "Çok Kritik":
        return "bg-destructive/10 text-destructive border-destructive/30";
      case "Orta Dereceli":
        return "bg-yellow-500/10 text-yellow-700 border-yellow-500/30";
      case "Ötelenebilir":
        return "bg-green-500/10 text-green-700 border-green-500/30";
      default:
        return "bg-muted text-muted-foreground border-muted";
    }
  };

  const getProbabilityColor = (probability: number) => {
    if (probability >= 80) return "bg-destructive";
    if (probability >= 60) return "bg-yellow-500";
    if (probability >= 40) return "bg-accent";
    return "bg-muted-foreground";
  };

  const getBorderColor = (probability: number) => {
    if (probability >= 80) return "hsl(var(--destructive))";
    if (probability >= 60) return "#eab308";
    if (probability >= 40) return "hsl(var(--accent))";
    return "hsl(var(--muted-foreground))";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Yükleniyor...</p>
      </div>
    );
  }

  if (!faultDetection || !faultDetection.analysis_result) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Analiz sonucu bulunamadı</p>
          <Button onClick={() => navigate("/")}>Ana Sayfaya Dön</Button>
        </div>
      </div>
    );
  }

  const { analysis_result } = faultDetection;
  const isAIPowered = analysis_result.analysisMethod === "AI-Powered Expert Analysis";

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
            <h1 className="text-xl font-bold text-foreground">UZMAN ANALİZ RAPORU</h1>
            <p className="text-sm text-muted-foreground">
              {analysis_result.vehicleInfo.brand} {analysis_result.vehicleInfo.model}
            </p>
          </div>
        </div>

        {/* Analysis Info */}
        <Card className="p-3 mb-4 bg-accent/10 border-accent/30">
          <div className="flex justify-between items-center text-xs mb-2">
            <span className="text-muted-foreground">
              Analiz: {format(new Date(analysis_result.analyzedAt), "d MMMM yyyy, HH:mm", { locale: tr })}
            </span>
            <span className="text-accent font-semibold">
              {analysis_result.serviceHistoryCount} kayıt analiz edildi
            </span>
          </div>
          {isAIPowered && (
            <div className="flex items-center gap-1.5 text-xs text-accent font-medium">
              <Lightbulb className="h-3.5 w-3.5" />
              Yapay Zeka Destekli Uzman Analizi
            </div>
          )}
        </Card>

        {/* Safety Warnings */}
        {analysis_result.safetyWarnings && analysis_result.safetyWarnings.length > 0 && (
          <Card className="p-4 mb-4 bg-destructive/10 border-destructive/30">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="h-5 w-5 text-destructive" />
              <h3 className="font-bold text-destructive">Güvenlik Uyarıları</h3>
            </div>
            <ul className="space-y-1">
              {analysis_result.safetyWarnings.map((warning, idx) => (
                <li key={idx} className="text-sm text-destructive flex items-start gap-2">
                  <span className="text-destructive">⚠️</span>
                  {warning}
                </li>
              ))}
            </ul>
          </Card>
        )}

        {/* Uploaded Photos */}
        {photos.length > 0 && (
          <Card className="p-4 mb-4">
            <h3 className="font-semibold mb-3">Analiz Edilen Fotoğraflar</h3>
            <div className="grid grid-cols-4 gap-2">
              {photos.map((photo) => (
                <div key={photo.id} className="relative">
                  <img
                    src={photo.photo_url}
                    alt={photo.description || "Arıza fotoğrafı"}
                    className="w-full aspect-square object-cover rounded-lg"
                  />
                  {photo.description && (
                    <div className="absolute bottom-0 left-0 right-0 bg-black/60 p-1 rounded-b-lg">
                      <p className="text-[8px] text-white truncate">{photo.description}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Input Summary */}
        <Card className="p-4 mb-4">
          <h3 className="font-semibold mb-3">Giriş Bilgileri</h3>
          
          {analysis_result.faultCodes.length > 0 && (
            <div className="mb-3">
              <p className="text-xs text-muted-foreground mb-1">Arıza Kodları:</p>
              <div className="flex flex-wrap gap-1">
                {analysis_result.faultCodes.map((code, index) => (
                  <span 
                    key={index}
                    className="px-2 py-0.5 bg-destructive/10 text-destructive text-xs font-mono rounded"
                  >
                    {code}
                  </span>
                ))}
              </div>
            </div>
          )}
          
          {analysis_result.customerComplaint && (
            <div className="mb-3">
              <p className="text-xs text-muted-foreground mb-1">Müşteri Şikayeti:</p>
              <p className="text-sm">{analysis_result.customerComplaint}</p>
            </div>
          )}
          
          {analysis_result.technicianObservation && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">Teknisyen Gözlemi:</p>
              <p className="text-sm">{analysis_result.technicianObservation}</p>
            </div>
          )}
        </Card>

        {/* Overall Assessment - Max 200 chars */}
        {analysis_result.overallAssessment && (
          <Card className="p-4 mb-4 bg-muted/30">
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-accent" />
              Genel Değerlendirme
            </h3>
            <p className="text-sm text-foreground leading-relaxed">
              {analysis_result.overallAssessment.slice(0, 200)}
            </p>
          </Card>
        )}

        {/* Predictions */}
        <div className="mb-4">
          <h2 className="text-lg font-bold mb-3">Tahmini Arıza Sebepleri</h2>
          
          <div className="space-y-3">
            {analysis_result.predictions.map((prediction, index) => (
              <Collapsible
                key={index}
                open={expandedPredictions[index]}
                onOpenChange={() => togglePrediction(index)}
              >
                <Card 
                  className="overflow-hidden border-l-4" 
                  style={{ borderLeftColor: getBorderColor(prediction.probability) }}
                >
                  <CollapsibleTrigger className="w-full">
                    <div className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1 text-left">
                          <h3 className="font-bold text-foreground">{prediction.title}</h3>
                          <p className="text-sm text-accent font-semibold mt-0.5">
                            {prediction.shortExplanation}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <span className={`text-xl font-bold ${
                            prediction.probability >= 80 ? "text-destructive" :
                            prediction.probability >= 60 ? "text-yellow-600" :
                            "text-accent"
                          }`}>
                            %{prediction.probability}
                          </span>
                          {expandedPredictions[index] ? 
                            <ChevronUp className="h-4 w-4 text-muted-foreground" /> : 
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          }
                        </div>
                      </div>

                      {/* Probability Bar */}
                      <div className="w-full h-2 bg-muted rounded-full overflow-hidden mb-3">
                        <div 
                          className={`h-full ${getProbabilityColor(prediction.probability)} transition-all`}
                          style={{ width: `${prediction.probability}%` }}
                        />
                      </div>

                      {/* Concise Breakdown - Always visible */}
                      <div className="mt-3 space-y-1.5 text-xs">
                        {prediction.cause && (
                          <p><span className="font-semibold text-destructive">1. Sebep:</span> {prediction.cause}</p>
                        )}
                        {prediction.faultyParts && (
                          <p><span className="font-semibold text-yellow-600">2. Parçalar:</span> {prediction.faultyParts}</p>
                        )}
                        {prediction.recommendedAction && (
                          <p><span className="font-semibold text-green-600">3. Öneri:</span> {prediction.recommendedAction}</p>
                        )}
                      </div>

                      {/* Criticality Badge */}
                      <div className="mt-3 flex items-center justify-between">
                        <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-semibold border ${getCriticalityColor(prediction.criticality)}`}>
                          {getCriticalityIcon(prediction.criticality)}
                          {prediction.criticality}
                        </div>
                        {(prediction.rootCause || prediction.repairSolution) && (
                          <span className="text-xs text-muted-foreground">
                            {expandedPredictions[index] ? "Daralt" : "Detay"}
                          </span>
                        )}
                      </div>
                    </div>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <div className="px-4 pb-4 pt-0 space-y-4 border-t border-border/50 mt-2 pt-4">
                      {/* Root Cause */}
                      {prediction.rootCause && (
                        <div>
                          <p className="text-xs font-semibold text-destructive mb-1 flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            Kök Neden
                          </p>
                          <p className="text-sm text-foreground bg-destructive/5 p-2 rounded">
                            {prediction.rootCause}
                          </p>
                        </div>
                      )}

                      {/* Failure Mechanism */}
                      {prediction.failureMechanism && (
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground mb-1">
                            Arıza Mekanizması
                          </p>
                          <p className="text-sm text-foreground">
                            {prediction.failureMechanism}
                          </p>
                        </div>
                      )}

                      {/* Affected Components */}
                      {prediction.affectedComponents && prediction.affectedComponents.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground mb-1">
                            Etkilenen Parçalar
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {prediction.affectedComponents.map((comp, i) => (
                              <span key={i} className="px-2 py-0.5 bg-muted text-xs rounded">
                                {comp}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Diagnostic Steps */}
                      {prediction.diagnosticSteps && prediction.diagnosticSteps.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground mb-1">
                            Teşhis Adımları
                          </p>
                          <ol className="text-sm space-y-1">
                            {prediction.diagnosticSteps.map((step, i) => (
                              <li key={i} className="flex items-start gap-2">
                                <span className="text-accent font-semibold">{i + 1}.</span>
                                <span>{step}</span>
                              </li>
                            ))}
                          </ol>
                        </div>
                      )}

                      {/* Repair Solution */}
                      {prediction.repairSolution && (
                        <div>
                          <p className="text-xs font-semibold text-green-600 mb-1 flex items-center gap-1">
                            <Wrench className="h-3 w-3" />
                            Onarım Çözümü
                          </p>
                          <p className="text-sm text-foreground bg-green-500/5 p-2 rounded">
                            {prediction.repairSolution}
                          </p>
                        </div>
                      )}

                      {/* Cost & Urgency */}
                      <div className="flex gap-4">
                        {prediction.estimatedCost && (
                          <div className="flex-1">
                            <p className="text-xs font-semibold text-muted-foreground mb-1">
                              Tahmini Maliyet
                            </p>
                            <p className="text-sm font-medium text-accent">
                              {prediction.estimatedCost}
                            </p>
                          </div>
                        )}
                        {prediction.urgency && (
                          <div className="flex-1">
                            <p className="text-xs font-semibold text-muted-foreground mb-1">
                              Aciliyet
                            </p>
                            <p className="text-sm font-medium">
                              {prediction.urgency}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Prevention Tips */}
                      {prediction.preventionTips && (
                        <div>
                          <p className="text-xs font-semibold text-accent mb-1 flex items-center gap-1">
                            <Lightbulb className="h-3 w-3" />
                            Önleme Önerileri
                          </p>
                          <p className="text-sm text-muted-foreground italic">
                            {prediction.preventionTips}
                          </p>
                        </div>
                      )}
                    </div>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            ))}
          </div>
        </div>

        {/* Additional Recommendations */}
        {analysis_result.additionalRecommendations && analysis_result.additionalRecommendations.length > 0 && (
          <Card className="p-4 mb-4">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-accent" />
              Ek Öneriler
            </h3>
            <ul className="space-y-2">
              {analysis_result.additionalRecommendations.map((rec, idx) => (
                <li key={idx} className="text-sm flex items-start gap-2">
                  <span className="text-accent">•</span>
                  {rec}
                </li>
              ))}
            </ul>
          </Card>
        )}

        {/* Legend */}
        <Card className="p-4 mb-4">
          <h3 className="font-semibold mb-3 text-sm">Kritiklik Seviyeleri</h3>
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              <span className="font-semibold text-destructive">Çok Kritik:</span>
              <span className="text-muted-foreground">Acil müdahale gerektirir</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <AlertCircle className="h-4 w-4 text-yellow-500" />
              <span className="font-semibold text-yellow-600">Orta Dereceli:</span>
              <span className="text-muted-foreground">Yakın zamanda ilgilenilmeli</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <Clock className="h-4 w-4 text-green-500" />
              <span className="font-semibold text-green-600">Ötelenebilir:</span>
              <span className="text-muted-foreground">Planlı bakımda ele alınabilir</span>
            </div>
          </div>
        </Card>

        {/* Back Button */}
        <Button
          onClick={() => navigate(`/vehicle/${faultDetection.vehicle_id}`)}
          variant="outline"
          className="w-full"
        >
          Araç Sayfasına Dön
        </Button>
      </div>
    </div>
  );
};

export default FaultPrediction;
