import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Plus, Trash2, User, UserPlus } from "lucide-react";
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
import { useGoBack } from "@/hooks/useGoBack";

interface Technician {
  id: string;
  name: string;
  is_active: boolean;
  created_at: string;
}

const TechnicianManagement = () => {
  const navigate = useNavigate();
  const goBack = useGoBack("/admin-panel");
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    fetchTechnicians();
  }, []);

  const fetchTechnicians = async () => {
    try {
      const { data, error } = await supabase
        .from("technicians")
        .select("*")
        .order("created_at", { ascending: true });

      if (error) throw error;
      setTechnicians(data || []);
    } catch (error) {
      console.error("Error fetching technicians:", error);
      toast.error("Teknisyenler yüklenirken hata oluştu");
    } finally {
      setLoading(false);
    }
  };

  const addTechnician = async () => {
    if (!newName.trim()) {
      toast.error("Lütfen bir isim girin");
      return;
    }

    setAdding(true);
    try {
      const { error } = await supabase
        .from("technicians")
        .insert({ name: newName.trim() });

      if (error) throw error;

      toast.success(`${newName} eklendi`);
      setNewName("");
      fetchTechnicians();
    } catch (error) {
      console.error("Error adding technician:", error);
      toast.error("Teknisyen eklenirken hata oluştu");
    } finally {
      setAdding(false);
    }
  };

  const deleteTechnician = async (id: string, name: string) => {
    try {
      const { error } = await supabase
        .from("technicians")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast.success(`${name} silindi`);
      fetchTechnicians();
    } catch (error) {
      console.error("Error deleting technician:", error);
      toast.error("Teknisyen silinirken hata oluştu");
    }
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
            <h1 className="text-xl font-bold text-accent">Yetkili Listesi</h1>
            <p className="text-sm text-muted-foreground">
              Teknisyen ekle veya çıkar
            </p>
          </div>
        </div>

        {/* Add New Technician */}
        <Card className="p-4 mb-6">
          <div className="flex items-center gap-3">
            <UserPlus className="h-5 w-5 text-muted-foreground shrink-0" />
            <Input
              placeholder="Yeni teknisyen adı..."
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addTechnician()}
              className="flex-1"
            />
            <Button
              onClick={addTechnician}
              disabled={adding || !newName.trim()}
              className="bg-accent hover:bg-accent/90 shrink-0"
            >
              <Plus className="h-4 w-4 mr-1" />
              Ekle
            </Button>
          </div>
        </Card>

        {/* Technicians List */}
        <div className="space-y-3">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Yükleniyor...
            </div>
          ) : technicians.length === 0 ? (
            <Card className="p-8 text-center">
              <User className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
              <p className="text-muted-foreground">Henüz teknisyen eklenmemiş</p>
            </Card>
          ) : (
            technicians.map((tech) => (
              <Card
                key={tech.id}
                className="p-4 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center">
                    <User className="h-5 w-5 text-accent" />
                  </div>
                  <span className="font-medium">{tech.name}</span>
                </div>

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
                      <AlertDialogTitle>Teknisyeni Sil</AlertDialogTitle>
                      <AlertDialogDescription>
                        "{tech.name}" isimli teknisyeni silmek istediğinize emin
                        misiniz? Bu işlem geri alınamaz.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>İptal</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => deleteTechnician(tech.id, tech.name)}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Sil
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </Card>
            ))
          )}
        </div>

        {/* Info */}
        <p className="text-center text-sm text-muted-foreground mt-6">
          Toplam {technicians.length} teknisyen kayıtlı
        </p>
      </div>
    </div>
  );
};

export default TechnicianManagement;
