import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import {
  Cloud,
  HardDrive,
  AlertTriangle,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";

interface StorageOption {
  id: string;
  name: string;
  icon: React.ReactNode;
  description: string;
  requiresConfig: boolean;
  configFields?: { key: string; label: string; placeholder: string }[];
  comingSoon?: boolean;
}

const storageOptions: StorageOption[] = [
  {
    id: "google-drive",
    name: "Google Drive",
    icon: <Cloud className="h-6 w-6 text-blue-500" />,
    description: "Google hesabınızla yedekleme yapın",
    requiresConfig: true,
    configFields: [
      {
        key: "clientId",
        label: "Client ID",
        placeholder: "Google Cloud Console'dan alın",
      },
      {
        key: "apiKey",
        label: "API Key",
        placeholder: "Google Drive API anahtarı",
      },
    ],
    comingSoon: true,
  },
  {
    id: "yandex-disk",
    name: "Yandex Disk",
    icon: <Cloud className="h-6 w-6 text-yellow-500" />,
    description: "Yandex hesabınızla yedekleme yapın",
    requiresConfig: true,
    configFields: [
      {
        key: "token",
        label: "OAuth Token",
        placeholder: "Yandex OAuth token",
      },
    ],
    comingSoon: true,
  },
  {
    id: "local",
    name: "Lokal Depolama",
    icon: <HardDrive className="h-6 w-6 text-gray-500" />,
    description: "Tarayıcı belleğinde saklayın (sınırlı kapasite)",
    requiresConfig: false,
  },
];

interface AddStorageSourceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSourceAdded: (sourceId: string, config?: Record<string, string>) => void;
}

const AddStorageSourceDialog = ({
  open,
  onOpenChange,
  onSourceAdded,
}: AddStorageSourceDialogProps) => {
  const [selectedSource, setSelectedSource] = useState<StorageOption | null>(
    null
  );
  const [config, setConfig] = useState<Record<string, string>>({});
  const [step, setStep] = useState<"select" | "configure">("select");

  const handleSelectSource = (source: StorageOption) => {
    if (source.comingSoon) {
      toast.info(`${source.name} entegrasyonu yakında eklenecek!`);
      return;
    }

    setSelectedSource(source);
    if (source.requiresConfig) {
      setStep("configure");
    } else {
      onSourceAdded(source.id);
      handleClose();
    }
  };

  const handleSaveConfig = () => {
    if (!selectedSource) return;

    // Validate all required fields are filled
    const missingFields = selectedSource.configFields?.filter(
      (field) => !config[field.key]
    );
    if (missingFields && missingFields.length > 0) {
      toast.error("Lütfen tüm alanları doldurun");
      return;
    }

    onSourceAdded(selectedSource.id, config);
    handleClose();
  };

  const handleClose = () => {
    setSelectedSource(null);
    setConfig({});
    setStep("select");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {step === "select" ? "Yeni Kaynak Ekle" : selectedSource?.name}
          </DialogTitle>
          <DialogDescription>
            {step === "select"
              ? "Yedekleme için bir depolama kaynağı seçin"
              : "Bağlantı bilgilerini girin"}
          </DialogDescription>
        </DialogHeader>

        {step === "select" && (
          <div className="space-y-3">
            {storageOptions.map((option) => (
              <Card
                key={option.id}
                className={`p-4 cursor-pointer transition-colors hover:bg-muted/50 ${
                  option.comingSoon ? "opacity-60" : ""
                }`}
                onClick={() => handleSelectSource(option)}
              >
                <div className="flex items-center gap-3">
                  {option.icon}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">{option.name}</h4>
                      {option.comingSoon && (
                        <span className="text-xs bg-muted px-2 py-0.5 rounded">
                          Yakında
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {option.description}
                    </p>
                  </div>
                </div>
              </Card>
            ))}

            <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg mt-4">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>
                Bulut servisleri OAuth entegrasyonu gerektirir. Şu an için JSON
                yedekleme özelliğini kullanarak verilerinizi güvenli şekilde
                dışa aktarabilirsiniz.
              </span>
            </div>
          </div>
        )}

        {step === "configure" && selectedSource && (
          <div className="space-y-4">
            {selectedSource.configFields?.map((field) => (
              <div key={field.key} className="space-y-2">
                <Label htmlFor={field.key}>{field.label}</Label>
                <Input
                  id={field.key}
                  placeholder={field.placeholder}
                  value={config[field.key] || ""}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      [field.key]: e.target.value,
                    }))
                  }
                />
              </div>
            ))}

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setStep("select")}
              >
                Geri
              </Button>
              <Button className="flex-1" onClick={handleSaveConfig}>
                Kaydet
              </Button>
            </div>

            <a
              href="#"
              className="flex items-center justify-center gap-1 text-sm text-accent hover:underline"
            >
              <ExternalLink className="h-4 w-4" />
              Nasıl yapılır?
            </a>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default AddStorageSourceDialog;
