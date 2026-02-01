import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { History, Download, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";

export interface BackupRecord {
  id: string;
  date: string;
  size: string;
  vehicleCount: number;
  recordCount: number;
  data?: string; // Base64 encoded backup data for local storage
}

const BACKUP_HISTORY_KEY = "umit-oto-backup-history";

export const getBackupHistory = (): BackupRecord[] => {
  try {
    const history = localStorage.getItem(BACKUP_HISTORY_KEY);
    return history ? JSON.parse(history) : [];
  } catch {
    return [];
  }
};

export const saveBackupToHistory = (backup: BackupRecord) => {
  const history = getBackupHistory();
  // Keep only last 10 backups
  const newHistory = [backup, ...history].slice(0, 10);
  localStorage.setItem(BACKUP_HISTORY_KEY, JSON.stringify(newHistory));
};

export const removeBackupFromHistory = (id: string) => {
  const history = getBackupHistory();
  const newHistory = history.filter((b) => b.id !== id);
  localStorage.setItem(BACKUP_HISTORY_KEY, JSON.stringify(newHistory));
};

interface BackupHistoryCardProps {
  onRestore: (backup: BackupRecord) => void;
}

const BackupHistoryCard = ({ onRestore }: BackupHistoryCardProps) => {
  const [history, setHistory] = useState<BackupRecord[]>([]);

  useEffect(() => {
    setHistory(getBackupHistory());
  }, []);

  const handleDelete = (id: string) => {
    removeBackupFromHistory(id);
    setHistory(getBackupHistory());
  };

  const handleDownload = (backup: BackupRecord) => {
    if (backup.data) {
      const blob = new Blob([atob(backup.data)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `yedek-${backup.date}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  };

  if (history.length === 0) {
    return (
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <History className="h-5 w-5 text-accent" />
          <h3 className="font-semibold">Yedek Geçmişi</h3>
        </div>
        <p className="text-sm text-muted-foreground text-center py-4">
          Henüz yedek alınmamış
        </p>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-3">
        <History className="h-5 w-5 text-accent" />
        <h3 className="font-semibold">Yedek Geçmişi</h3>
        <span className="text-xs text-muted-foreground ml-auto">
          Son {history.length} yedek
        </span>
      </div>

      <div className="space-y-2 max-h-48 overflow-y-auto">
        {history.map((backup) => (
          <div
            key={backup.id}
            className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg text-sm"
          >
            <div className="flex-1">
              <div className="font-medium">
                {format(new Date(backup.date), "dd MMM yyyy HH:mm", {
                  locale: tr,
                })}
              </div>
              <div className="text-xs text-muted-foreground">
                {backup.vehicleCount} araç, {backup.recordCount} kayıt •{" "}
                {backup.size}
              </div>
            </div>
            {backup.data && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => handleDownload(backup)}
              >
                <Download className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive"
              onClick={() => handleDelete(backup.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
    </Card>
  );
};

export default BackupHistoryCard;
