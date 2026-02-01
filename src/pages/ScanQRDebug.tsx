import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Html5Qrcode } from "html5-qrcode";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Camera, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { useGoBack } from "@/hooks/useGoBack";

const normalizeQrText = (text: string) => text.replace(/\s+/g, " ").trim();

const extractSlotNumber = (qrContentRaw: string): string | null => {
  const qrContent = normalizeQrText(qrContentRaw);

  // 1) Just a number: "1"
  if (/^\d+$/.test(qrContent)) return qrContent;

  // 2) URL patterns: /slot/1, /qr/1, /vehicle/1, ?slot=1
  const urlPathMatch = qrContent.match(/\/(?:slot|qr|vehicle)[\/\-]?(\d+)/i);
  if (urlPathMatch?.[1]) return urlPathMatch[1];
  const queryMatch = qrContent.match(/[?&](?:slot|qr|vehicle)=(\d+)/i);
  if (queryMatch?.[1]) return queryMatch[1];

  // 3) Text prefix patterns: "QR SLOT 1", "qr-slot-1", "SLOT_1"
  const prefixMatch = qrContent.match(/(?:slot|qr)[\-_\s]*?(\d+)/i);
  if (prefixMatch?.[1]) return prefixMatch[1];

  // 4) Last resort: first number found
  const anyNumberMatch = qrContent.match(/(\d+)/);
  return anyNumberMatch?.[1] ?? null;
};

const ScanQRDebug = () => {
  const navigate = useNavigate();
  const goBack = useGoBack();
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [scanning, setScanning] = useState(false);
  const [lastScannedText, setLastScannedText] = useState<string>("");
  const [manualText, setManualText] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [lastErrorAt, setLastErrorAt] = useState<number>(0);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraStatus, setCameraStatus] = useState<string>("Kamera başlatılıyor...");
  const isNavigatingRef = useRef(false);

  const lastScannedNormalized = useMemo(
    () => (lastScannedText ? normalizeQrText(lastScannedText) : ""),
    [lastScannedText]
  );
  const extractedSlot = useMemo(
    () => (lastScannedText ? extractSlotNumber(lastScannedText) : null),
    [lastScannedText]
  );

  useEffect(() => {
    // Small delay to ensure DOM is ready
    const timer = setTimeout(() => {
      startScanner();
    }, 500);
    
    return () => {
      clearTimeout(timer);
      stopScanner();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startScanner = async () => {
    setCameraError(null);
    setCameraStatus("Kamera izni isteniyor...");
    
    try {
      // Check if camera is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Bu cihazda kamera erişimi desteklenmiyor");
      }

      // First request camera permission explicitly
      setCameraStatus("Kamera izni alınıyor...");
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: "environment" } 
        });
        // Stop the stream immediately, we just needed permission
        stream.getTracks().forEach(track => track.stop());
      } catch (permError: any) {
        if (permError.name === "NotAllowedError") {
          throw new Error("Kamera izni reddedildi. Lütfen tarayıcı ayarlarından kamera iznini verin.");
        } else if (permError.name === "NotFoundError") {
          throw new Error("Bu cihazda kamera bulunamadı.");
        } else {
          throw new Error(`Kamera erişim hatası: ${permError.message}`);
        }
      }

      setCameraStatus("QR tarayıcı başlatılıyor...");
      
      const scanner = new Html5Qrcode("qr-reader");
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: "environment" },
        { 
          fps: 10, 
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0
        },
        (decodedText) => {
          setLastScannedText(decodedText);
          void handleLookup(decodedText);
        },
        () => {
          // scanning errors are normal
        }
      );

      setScanning(true);
      setCameraStatus("Kamera aktif - QR kodu gösterin");
    } catch (error: any) {
      console.error("Camera error:", error);
      setCameraError(error.message || "Kamera başlatılamadı");
      setCameraStatus("Kamera hatası");
      toast.error(error.message || "Kamera erişimi sağlanamadı");
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        if (scanning) {
          await scannerRef.current.stop();
        }
        scannerRef.current.clear();
      } catch (error) {
        console.error("Scanner stop error:", error);
      }
      scannerRef.current = null;
    }
    setScanning(false);
  };

  const restartScanner = async () => {
    await stopScanner();
    setTimeout(() => startScanner(), 300);
  };

  const showNotFoundToastThrottled = () => {
    const now = Date.now();
    if (now - lastErrorAt < 4000) return;
    setLastErrorAt(now);
    toast.error("QR kod ile eşleşen araç bulunamadı");
  };

  const handleLookup = async (decodedTextRaw: string) => {
    // Prevent multiple lookups and navigations
    if (busy || isNavigatingRef.current) return;
    setBusy(true);
    
    try {
      const decodedText = normalizeQrText(decodedTextRaw);

      // Step 1: Check qr_mappings table first
      const { data: mapping } = await supabase
        .from("qr_mappings")
        .select("slot_number")
        .eq("qr_content", decodedText)
        .maybeSingle();

      if (mapping) {
        // Found in mappings, use the slot_number
        const slotNumber = mapping.slot_number.toString();
        const { data: vehicle, error } = await supabase
          .from("vehicles")
          .select("id")
          .eq("qr_code", slotNumber)
          .maybeSingle();

        if (vehicle && !error) {
          isNavigatingRef.current = true;
          await stopScanner();
          toast.success("Araç bulundu!");
          navigate(`/vehicle/${vehicle.id}`, { replace: true });
          return;
        }
      }

      // Step 2: Direct match on qr_code field
      let { data, error } = await supabase
        .from("vehicles")
        .select("id")
        .eq("qr_code", decodedText)
        .maybeSingle();

      if (!data) {
        // Step 3: Try extracting slot number from text
        const slotNumber = extractSlotNumber(decodedText);
        if (slotNumber) {
          const r = await supabase
            .from("vehicles")
            .select("id")
            .eq("qr_code", slotNumber)
            .maybeSingle();
          data = r.data;
          error = r.error;
        }
      }

      if (error || !data) {
        showNotFoundToastThrottled();
        return;
      }

      isNavigatingRef.current = true;
      await stopScanner();
      toast.success("Araç bulundu!");
      navigate(`/vehicle/${data.id}`, { replace: true });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-4 max-w-2xl">
        <div className="mb-4">
          <Button
            variant="ghost"
            size="lg"
            onClick={goBack}
            className="font-semibold"
          >
            <ArrowLeft className="mr-2 h-5 w-5" />
            Geri
          </Button>
        </div>

        <Card className="p-4 md:p-6 border-2">
          <h1 className="text-2xl md:text-3xl font-bold mb-2 text-center text-accent">
            QR Kod Tara
          </h1>
          <p className="text-muted-foreground mb-4 text-sm text-center">
            {cameraStatus}
          </p>

          <div className="space-y-4">
            {/* Camera container with fixed dimensions for mobile */}
            <div className="relative w-full" style={{ minHeight: "300px" }}>
              {cameraError ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-muted rounded-xl border-2 border-dashed border-destructive/50 p-4">
                  <Camera className="h-12 w-12 text-destructive/50 mb-3" />
                  <p className="text-destructive text-center text-sm font-medium mb-3">
                    {cameraError}
                  </p>
                  <Button onClick={restartScanner} variant="outline" size="sm">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Tekrar Dene
                  </Button>
                </div>
              ) : (
                <div
                  id="qr-reader"
                  className="rounded-xl overflow-hidden border-4 border-accent shadow-lg"
                  style={{ minHeight: "300px", width: "100%" }}
                />
              )}
            </div>

            {/* Debug info */}
            <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
              <div className="text-xs font-semibold text-foreground">Son okunan QR içeriği</div>
              <div className="text-xs text-muted-foreground break-all font-mono bg-background/50 p-2 rounded min-h-[24px]">
                {lastScannedNormalized || "(Henüz okunmadı)"}
              </div>
              <div className="text-xs font-semibold text-foreground pt-1">Çıkarılan slot numarası</div>
              <div className="text-xs text-muted-foreground font-mono bg-background/50 p-2 rounded">
                {extractedSlot ?? "(Bulunamadı)"}
              </div>
            </div>

            {/* Manual fallback */}
            <div className="space-y-2 border-t pt-4">
              <div className="text-xs font-semibold text-foreground">Manuel Test</div>
              <div className="flex gap-2">
                <Input
                  value={manualText}
                  onChange={(e) => setManualText(e.target.value)}
                  placeholder='Örn: 1 veya "SLOT-1"'
                  className="text-sm"
                />
                <Button
                  onClick={() => handleLookup(manualText)}
                  disabled={!manualText.trim() || busy}
                  size="sm"
                >
                  Bul
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Kamera çalışmıyorsa slot numarasını manuel girin.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default ScanQRDebug;
