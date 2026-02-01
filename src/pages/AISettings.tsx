import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Brain,
  Plus,
  Trash2,
  Check,
  X,
  Loader2,
  Eye,
  EyeOff,
} from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useGoBack } from "@/hooks/useGoBack";

interface AIModel {
  id: string;
  name: string;
  api_key: string | null;
  api_endpoint: string | null;
  is_default: boolean;
  is_active: boolean;
  model_type: string;
}

const AISettings = () => {
  const navigate = useNavigate();
  const goBack = useGoBack("/admin-panel");
  const [models, setModels] = useState<AIModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedModelId, setSelectedModelId] = useState<string>("");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [testing, setTesting] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);

  // New model form
  const [newModelName, setNewModelName] = useState("");
  const [newApiKey, setNewApiKey] = useState("");
  const [newApiEndpoint, setNewApiEndpoint] = useState("");

  useEffect(() => {
    fetchModels();
  }, []);

  const fetchModels = async () => {
    try {
      const { data, error } = await supabase
        .from("ai_models")
        .select("*")
        .order("is_default", { ascending: false })
        .order("created_at", { ascending: true });

      if (error) throw error;

      setModels(data || []);

      // Set the active model as selected
      const activeModel = data?.find((m) => m.is_active);
      if (activeModel) {
        setSelectedModelId(activeModel.id);
      }
    } catch (error) {
      console.error("Error fetching models:", error);
      toast.error("AI modelleri yüklenirken hata oluştu");
    } finally {
      setLoading(false);
    }
  };

  const testConnection = async () => {
    if (!newApiKey.trim()) {
      toast.error("Lütfen API Key girin");
      return;
    }

    setTesting(true);
    try {
      // Simple test - try to make a minimal request
      const endpoint = newApiEndpoint.trim() || "https://api.openai.com/v1/chat/completions";
      
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${newApiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-3.5-turbo",
          messages: [{ role: "user", content: "test" }],
          max_tokens: 5,
        }),
      });

      if (response.ok || response.status === 400) {
        // 400 might mean wrong model but API key works
        toast.success("Bağlantı başarılı! API Key geçerli.");
        return true;
      } else if (response.status === 401) {
        toast.error("API Key geçersiz");
        return false;
      } else {
        toast.warning("Bağlantı kuruldu ancak yanıt beklenenden farklı");
        return true;
      }
    } catch (error) {
      console.error("Connection test error:", error);
      toast.error("Bağlantı testi başarısız. Endpoint'i kontrol edin.");
      return false;
    } finally {
      setTesting(false);
    }
  };

  const addModel = async () => {
    if (!newModelName.trim()) {
      toast.error("Lütfen model adı girin");
      return;
    }

    if (!newApiKey.trim()) {
      toast.error("Lütfen API Key girin");
      return;
    }

    try {
      const { error } = await supabase.from("ai_models").insert({
        name: newModelName.trim(),
        api_key: newApiKey.trim(),
        api_endpoint: newApiEndpoint.trim() || null,
        model_type: "custom",
        is_active: false,
        is_default: false,
      });

      if (error) throw error;

      toast.success(`${newModelName} modeli eklendi`);
      setNewModelName("");
      setNewApiKey("");
      setNewApiEndpoint("");
      setShowAddDialog(false);
      fetchModels();
    } catch (error) {
      console.error("Error adding model:", error);
      toast.error("Model eklenirken hata oluştu");
    }
  };

  const selectModel = async (modelId: string) => {
    try {
      // First, set all models to inactive
      await supabase.from("ai_models").update({ is_active: false }).neq("id", "");

      // Then, set the selected model as active
      const { error } = await supabase
        .from("ai_models")
        .update({ is_active: true })
        .eq("id", modelId);

      if (error) throw error;

      setSelectedModelId(modelId);
      const model = models.find((m) => m.id === modelId);
      toast.success(`${model?.name} aktif model olarak ayarlandı`);
      fetchModels();
    } catch (error) {
      console.error("Error selecting model:", error);
      toast.error("Model seçilirken hata oluştu");
    }
  };

  const deleteModel = async (id: string, name: string) => {
    try {
      const { error } = await supabase.from("ai_models").delete().eq("id", id);

      if (error) throw error;

      toast.success(`${name} silindi`);
      fetchModels();
    } catch (error) {
      console.error("Error deleting model:", error);
      toast.error("Model silinirken hata oluştu");
    }
  };

  const maskApiKey = (key: string | null) => {
    if (!key) return "-";
    if (key.length <= 8) return "****";
    return `${key.substring(0, 4)}...${key.substring(key.length - 4)}`;
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-4 md:p-6 max-w-2xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={goBack}
            className="shrink-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold text-accent">Yapay Zeka Ayarları</h1>
            <p className="text-sm text-muted-foreground">
              AI modellerini yönet ve yapılandır
            </p>
          </div>
        </div>

        {/* Active Model Selection */}
        <Card className="p-4 mb-6">
          <Label className="text-sm text-muted-foreground mb-2 block">
            Aktif Yapay Zeka Modeli
          </Label>
          <Select value={selectedModelId} onValueChange={selectModel}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Model seçin..." />
            </SelectTrigger>
            <SelectContent>
              {models.map((model) => (
                <SelectItem key={model.id} value={model.id}>
                  <div className="flex items-center gap-2">
                    <Brain className="h-4 w-4" />
                    {model.name}
                    {model.is_default && (
                      <span className="text-xs bg-accent/20 text-accent px-2 py-0.5 rounded">
                        Varsayılan
                      </span>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground mt-2">
            Seçilen model tüm AI işlemlerinde kullanılacaktır
          </p>
        </Card>

        {/* Add New Model Button */}
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button className="w-full mb-6 bg-accent hover:bg-accent/90">
              <Plus className="h-4 w-4 mr-2" />
              Yeni Model Ekle
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-background">
            <DialogHeader>
              <DialogTitle>Yeni AI Model Ekle</DialogTitle>
              <DialogDescription>
                Özel yapay zeka modelinizi bağlayın
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="modelName">Model Adı</Label>
                <Input
                  id="modelName"
                  placeholder="örn: Metehan AI"
                  value={newModelName}
                  onChange={(e) => setNewModelName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="apiKey">API Key *</Label>
                <div className="relative">
                  <Input
                    id="apiKey"
                    type={showApiKey ? "text" : "password"}
                    placeholder="sk-..."
                    value={newApiKey}
                    onChange={(e) => setNewApiKey(e.target.value)}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setShowApiKey(!showApiKey)}
                  >
                    {showApiKey ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="apiEndpoint">API Endpoint (Opsiyonel)</Label>
                <Input
                  id="apiEndpoint"
                  placeholder="https://api.example.com/v1/chat/completions"
                  value={newApiEndpoint}
                  onChange={(e) => setNewApiEndpoint(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Boş bırakılırsa OpenAI uyumlu varsayılan endpoint kullanılır
                </p>
              </div>

              <Button
                variant="outline"
                className="w-full"
                onClick={testConnection}
                disabled={testing || !newApiKey.trim()}
              >
                {testing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Test Ediliyor...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Bağlantıyı Test Et
                  </>
                )}
              </Button>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                İptal
              </Button>
              <Button
                onClick={addModel}
                disabled={!newModelName.trim() || !newApiKey.trim()}
                className="bg-accent hover:bg-accent/90"
              >
                Kaydet
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Models List */}
        <div className="space-y-3">
          <h3 className="font-medium text-sm text-muted-foreground">
            Kayıtlı Modeller
          </h3>

          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Yükleniyor...
            </div>
          ) : (
            models.map((model) => (
              <Card
                key={model.id}
                className={`p-4 ${
                  model.is_active
                    ? "border-accent border-2"
                    : "border-border"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        model.is_active
                          ? "bg-accent text-accent-foreground"
                          : "bg-muted"
                      }`}
                    >
                      <Brain className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{model.name}</span>
                        {model.is_default && (
                          <span className="text-xs bg-accent/20 text-accent px-2 py-0.5 rounded">
                            Varsayılan
                          </span>
                        )}
                        {model.is_active && (
                          <span className="text-xs bg-green-500/20 text-green-600 px-2 py-0.5 rounded">
                            Aktif
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {model.model_type === "lovable"
                          ? "Lovable AI Gateway"
                          : `API Key: ${maskApiKey(model.api_key)}`}
                      </p>
                    </div>
                  </div>

                  {!model.is_default && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="bg-background">
                        <AlertDialogHeader>
                          <AlertDialogTitle>Modeli Sil</AlertDialogTitle>
                          <AlertDialogDescription>
                            "{model.name}" modelini silmek istediğinize emin
                            misiniz?
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>İptal</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deleteModel(model.id, model.name)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Sil
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
              </Card>
            ))
          )}
        </div>

        {/* Info */}
        <Card className="p-4 mt-6 bg-muted/50">
          <p className="text-sm text-muted-foreground">
            <strong>Not:</strong> Lovable AI varsayılan model olarak sunulmaktadır
            ve API Key gerektirmez. Özel modelinizi eklemek için API Key ve
            (opsiyonel) endpoint bilgisi girin.
          </p>
        </Card>
      </div>
    </div>
  );
};

export default AISettings;
