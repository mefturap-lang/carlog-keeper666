import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Html5Qrcode } from "html5-qrcode";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { useGoBack } from "@/hooks/useGoBack";

const ScanQR = () => {
  const navigate = useNavigate();
  const goBack = useGoBack();
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [scanning, setScanning] = useState(false);
  const isNavigatingRef = useRef(false);

  useEffect(() => {
    startScanner();

    return () => {
      stopScanner();
    };
  }, []);

  const startScanner = async () => {
    try {
      const scanner = new Html5Qrcode("qr-reader");
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        onScanSuccess,
        onScanFailure
      );

      setScanning(true);
    } catch (error: any) {
      toast.error("Kamera erişimi sağlanamadı");
      console.error(error);
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current && scanning) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch (error) {
        console.error("Scanner stop error:", error);
      }
    }
  };

  const extractSlotNumber = (qrContent: string): string | null => {
    // Try to extract slot number from various QR formats
    // Format 1: Just the number (e.g., "1", "25")
    if (/^\d+$/.test(qrContent.trim())) {
      return qrContent.trim();
    }
    
    // Format 2: URL with slot number (e.g., "https://example.com/slot/1" or "/vehicle/1")
    const urlMatch = qrContent.match(/\/(?:slot|vehicle|qr)[\/\-]?(\d+)/i);
    if (urlMatch) {
      return urlMatch[1];
    }
    
    // Format 3: "SLOT-1" or "QR-1" format
    const prefixMatch = qrContent.match(/(?:slot|qr|araç|arac)[\-_\s]?(\d+)/i);
    if (prefixMatch) {
      return prefixMatch[1];
    }
    
    // Format 4: Any number in the string as last resort
    const anyNumberMatch = qrContent.match(/(\d+)/);
    if (anyNumberMatch) {
      return anyNumberMatch[1];
    }
    
    return null;
  };

  const onScanSuccess = async (decodedText: string) => {
    // Prevent multiple navigations
    if (isNavigatingRef.current) return;
    
    await stopScanner();
    
    console.log("QR Code scanned:", decodedText);
    
    // First try exact match
    let { data, error } = await supabase
      .from("vehicles")
      .select("id")
      .eq("qr_code", decodedText)
      .maybeSingle();

    // If no exact match, try to extract slot number
    if (!data) {
      const slotNumber = extractSlotNumber(decodedText);
      console.log("Extracted slot number:", slotNumber);
      
      if (slotNumber) {
        const result = await supabase
          .from("vehicles")
          .select("id")
          .eq("qr_code", slotNumber)
          .maybeSingle();
        
        data = result.data;
        error = result.error;
      }
    }

    if (error || !data) {
      toast.error("QR kod ile eşleşen araç bulunamadı");
      console.log("No vehicle found for QR:", decodedText);
      setTimeout(() => startScanner(), 2000);
      return;
    }

    isNavigatingRef.current = true;
    toast.success("Araç bulundu!");
    navigate(`/vehicle/${data.id}`, { replace: true });
  };

  const onScanFailure = (error: any) => {
    // Scanning errors are normal, don't show them
  };

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
          <h1 className="text-4xl font-bold mb-2 text-center" style={{ color: '#f19035' }}>QR Kod Tara</h1>
          <p className="text-muted-foreground mb-8 text-base text-center">Aracınızın QR kodunu tarayın</p>

          <div className="space-y-6">
            <div id="qr-reader" className="rounded-xl overflow-hidden border-4 border-accent shadow-lg"></div>

            <p className="text-center text-muted-foreground text-base font-medium">
              Aracınızın QR kodunu kameranın göreceği şekilde tutun
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default ScanQR;