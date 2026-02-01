import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Wifi, WifiOff, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

const OfflineStatusCard = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [lastSync, setLastSync] = useState<Date | null>(null);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setLastSync(new Date());
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Check initial state
    if (navigator.onLine) {
      setLastSync(new Date());
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const formatLastSync = () => {
    if (!lastSync) return "Bilinmiyor";
    const now = new Date();
    const diff = now.getTime() - lastSync.getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return "Az önce";
    if (minutes < 60) return `${minutes} dakika önce`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} saat önce`;
    return lastSync.toLocaleDateString("tr-TR");
  };

  return (
    <Card className={`p-4 ${isOnline ? "bg-green-50" : "bg-orange-50"}`}>
      <div className="flex items-center gap-3">
        <div
          className={`w-10 h-10 rounded-full flex items-center justify-center ${
            isOnline ? "bg-green-100" : "bg-orange-100"
          }`}
        >
          {isOnline ? (
            <Wifi className="h-5 w-5 text-green-600" />
          ) : (
            <WifiOff className="h-5 w-5 text-orange-600" />
          )}
        </div>
        <div className="flex-1">
          <h3 className="font-semibold">
            {isOnline ? "Çevrimiçi" : "Çevrimdışı"}
          </h3>
          <p className="text-sm text-muted-foreground">
            {isOnline
              ? `Son senkronizasyon: ${formatLastSync()}`
              : "İnternet bağlantısı yok - Bazı özellikler sınırlı"}
          </p>
        </div>
        {isOnline && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLastSync(new Date())}
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        )}
      </div>

      {!isOnline && (
        <div className="mt-3 text-sm">
          <p className="font-medium text-orange-700 mb-1">
            Çevrimdışı kullanılabilir özellikler:
          </p>
          <ul className="text-orange-600 space-y-0.5 text-xs">
            <li>• Lokal yedeklerden veri görüntüleme</li>
            <li>• Önbellekteki araç bilgileri</li>
            <li>• İndirilen yedek dosyalarını inceleme</li>
          </ul>
          <p className="font-medium text-orange-700 mt-2 mb-1">
            İnternet gerektirenler:
          </p>
          <ul className="text-orange-600 space-y-0.5 text-xs">
            <li>• Yeni kayıt ekleme/düzenleme</li>
            <li>• AI analizi</li>
            <li>• Bulut senkronizasyonu</li>
          </ul>
        </div>
      )}
    </Card>
  );
};

export default OfflineStatusCard;
