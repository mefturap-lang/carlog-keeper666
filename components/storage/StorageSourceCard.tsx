import { Cloud, Check, AlertTriangle } from "lucide-react";
import { Card } from "@/components/ui/card";

interface StorageSourceCardProps {
  name: string;
  description: string;
  isActive: boolean;
  isConnected: boolean;
  icon: React.ReactNode;
}

const StorageSourceCard = ({
  name,
  description,
  isActive,
  isConnected,
  icon,
}: StorageSourceCardProps) => {
  return (
    <Card className={`p-4 ${isActive ? "border-green-500 border-2" : ""}`}>
      <div className="flex items-center gap-3">
        <div
          className={`w-10 h-10 rounded-full flex items-center justify-center ${
            isConnected ? "bg-green-100" : "bg-muted"
          }`}
        >
          {icon}
        </div>
        <div className="flex-1">
          <h3 className="font-semibold">{name}</h3>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        {isConnected ? (
          <div className="flex items-center gap-1 text-green-600 text-sm">
            <Check className="h-4 w-4" />
            Bağlı
          </div>
        ) : (
          <div className="flex items-center gap-1 text-muted-foreground text-sm">
            <AlertTriangle className="h-4 w-4" />
            Bağlı Değil
          </div>
        )}
      </div>
      {isActive && (
        <div className="mt-2 text-xs text-green-600 font-medium">
          ✓ Aktif Kaynak
        </div>
      )}
    </Card>
  );
};

export default StorageSourceCard;
