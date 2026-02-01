import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, QrCode, Users, FileText, Brain, Settings, LogOut, Eye, EyeOff, Database, Shield } from "lucide-react";
import { toast } from "sonner";
import { useGoBack } from "@/hooks/useGoBack";

interface AdminSettings {
  id: string;
  username: string;
  password_hash: string;
  require_password: boolean;
  allow_record_editing: boolean;
}

const AdminPanel = () => {
  const navigate = useNavigate();
  const goBack = useGoBack();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<AdminSettings | null>(null);
  
  // Login form state
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState("");
  
  // Settings form state
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [requirePassword, setRequirePassword] = useState(true);
  const [allowRecordEditing, setAllowRecordEditing] = useState(false);
  const [showSettingsPassword, setShowSettingsPassword] = useState(false);
  const [showSettingsForm, setShowSettingsForm] = useState(false);

  useEffect(() => {
    checkAuthAndLoadSettings();
  }, []);

  const checkAuthAndLoadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from("admin_settings")
        .select("*")
        .limit(1)
        .single();

      if (error) throw error;

      setSettings(data);
      setNewUsername(data.username);
      setRequirePassword(data.require_password);
      setAllowRecordEditing(data.allow_record_editing || false);

      // Check if password is required
      if (!data.require_password) {
        setIsAuthenticated(true);
      } else {
        // Check session storage for existing login
        const sessionAuth = sessionStorage.getItem("admin_authenticated");
        if (sessionAuth === "true") {
          setIsAuthenticated(true);
        }
      }
    } catch (error) {
      console.error("Error loading settings:", error);
      toast.error("Ayarlar yüklenirken hata oluştu");
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");

    if (!settings) return;

    if (loginUsername === settings.username && loginPassword === settings.password_hash) {
      setIsAuthenticated(true);
      sessionStorage.setItem("admin_authenticated", "true");
      toast.success("Giriş başarılı");
    } else {
      setLoginError("Kullanıcı adı veya şifre hatalı");
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    sessionStorage.removeItem("admin_authenticated");
    setLoginUsername("");
    setLoginPassword("");
    toast.success("Çıkış yapıldı");
  };

  const handleSaveSettings = async () => {
    if (!settings) return;

    try {
      const updateData: Partial<AdminSettings> = {
        require_password: requirePassword,
        allow_record_editing: allowRecordEditing,
      };

      if (newUsername.trim()) {
        updateData.username = newUsername.trim();
      }

      if (newPassword.trim()) {
        updateData.password_hash = newPassword.trim();
      }

      const { error } = await supabase
        .from("admin_settings")
        .update(updateData)
        .eq("id", settings.id);

      if (error) throw error;

      setSettings({ ...settings, ...updateData } as AdminSettings);
      setNewPassword("");
      setShowSettingsForm(false);
      toast.success("Ayarlar kaydedildi");
    } catch (error) {
      console.error("Error saving settings:", error);
      toast.error("Ayarlar kaydedilirken hata oluştu");
    }
  };

  const toggleRecordEditing = async () => {
    if (!settings) return;

    const newValue = !allowRecordEditing;
    setAllowRecordEditing(newValue);

    try {
      const { error } = await supabase
        .from("admin_settings")
        .update({ allow_record_editing: newValue })
        .eq("id", settings.id);

      if (error) throw error;

      setSettings({ ...settings, allow_record_editing: newValue });
      toast.success(newValue ? "Kayıt düzenleme açıldı" : "Kayıt düzenleme kapatıldı");
    } catch (error) {
      console.error("Error toggling record editing:", error);
      toast.error("Ayar güncellenirken hata oluştu");
      setAllowRecordEditing(!newValue); // Revert
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Yükleniyor...</p>
      </div>
    );
  }

  // Login screen
  if (!isAuthenticated && settings?.require_password) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <div className="container mx-auto p-4 md:p-6 max-w-md flex-1 flex flex-col justify-center">
          <Card className="p-6">
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold text-accent mb-2">Yönetici Paneli</h1>
              <p className="text-sm text-muted-foreground">Giriş yapın</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Kullanıcı Adı</Label>
                <Input
                  id="username"
                  type="text"
                  value={loginUsername}
                  onChange={(e) => setLoginUsername(e.target.value)}
                  placeholder="Kullanıcı adı"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Şifre</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="Şifre"
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              {loginError && (
                <p className="text-destructive text-sm">{loginError}</p>
              )}

              <Button type="submit" className="w-full bg-accent hover:bg-accent/90">
                Giriş Yap
              </Button>
            </form>

            <Button
              variant="ghost"
              className="w-full mt-4"
              onClick={() => navigate("/")}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Ana Sayfaya Dön
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  // Admin Panel
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-4 md:p-6 max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={goBack}
              className="shrink-0"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold text-accent">Yönetici Paneli</h1>
              <p className="text-sm text-muted-foreground">ÜMİT OTO SERVİS</p>
            </div>
          </div>
          
          {settings?.require_password && (
            <Button variant="outline" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Çıkış
            </Button>
          )}
        </div>

        {/* Record Editing Toggle - Prominent Position */}
        <Card className="p-4 mb-6 border-2 border-orange-500/30 bg-orange-500/5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
                <Shield className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <h3 className="font-semibold">Kayıt Silinebilirlik/Düzenlenebilirlik</h3>
                <p className="text-sm text-muted-foreground">
                  {allowRecordEditing 
                    ? "Açık - Kayıtlar silinebilir ve düzenlenebilir" 
                    : "Kapalı - Kayıtlar silinemez ve düzenlenemez"
                  }
                </p>
              </div>
            </div>
            <Switch
              checked={allowRecordEditing}
              onCheckedChange={toggleRecordEditing}
            />
          </div>
        </Card>

        {/* Menu Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <Card 
            className="p-6 cursor-pointer hover:shadow-md transition-shadow border-2 hover:border-accent"
            onClick={() => navigate("/qr-management")}
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
                <QrCode className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">QR Yönetim Paneli</h3>
                <p className="text-sm text-muted-foreground">QR kodlarını yönet</p>
              </div>
            </div>
          </Card>

          <Card 
            className="p-6 cursor-pointer hover:shadow-md transition-shadow border-2 hover:border-accent"
            onClick={() => navigate("/technician-management")}
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Yetkili Listesini Düzenle</h3>
                <p className="text-sm text-muted-foreground">Teknisyenleri yönet</p>
              </div>
            </div>
          </Card>

          <Card 
            className="p-6 cursor-pointer hover:shadow-md transition-shadow border-2 hover:border-accent"
            onClick={() => toast.info("Raporlama - yakında eklenecek")}
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center">
                <FileText className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Rapor</h3>
                <p className="text-sm text-muted-foreground">Raporları görüntüle</p>
              </div>
            </div>
          </Card>

          <Card 
            className="p-6 cursor-pointer hover:shadow-md transition-shadow border-2 hover:border-accent"
            onClick={() => navigate("/ai-settings")}
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
                <Brain className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Yapay Zeka</h3>
                <p className="text-sm text-muted-foreground">AI modellerini yönet</p>
              </div>
            </div>
          </Card>

          <Card 
            className="p-6 cursor-pointer hover:shadow-md transition-shadow border-2 hover:border-accent md:col-span-2"
            onClick={() => navigate("/storage-settings")}
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-cyan-100 flex items-center justify-center">
                <Database className="h-6 w-6 text-cyan-600" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Depolama</h3>
                <p className="text-sm text-muted-foreground">Veri yedekleme ve geri yükleme</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Settings Section */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Settings className="h-5 w-5 text-muted-foreground" />
              <h2 className="font-semibold text-lg">Panel Ayarları</h2>
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowSettingsForm(!showSettingsForm)}
            >
              {showSettingsForm ? "İptal" : "Düzenle"}
            </Button>
          </div>

          {showSettingsForm ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="newUsername">Kullanıcı Adı</Label>
                <Input
                  id="newUsername"
                  type="text"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  placeholder="Yeni kullanıcı adı"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="newPassword">Yeni Şifre (boş bırakılırsa değişmez)</Label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    type={showSettingsPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Yeni şifre"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setShowSettingsPassword(!showSettingsPassword)}
                  >
                    {showSettingsPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div className="flex items-center justify-between py-2">
                <div>
                  <Label htmlFor="requirePassword">Şifre ile Giriş Zorunlu</Label>
                  <p className="text-sm text-muted-foreground">
                    Kapatıldığında panele şifresiz girilebilir
                  </p>
                </div>
                <Switch
                  id="requirePassword"
                  checked={requirePassword}
                  onCheckedChange={setRequirePassword}
                />
              </div>

              <Button 
                className="w-full bg-accent hover:bg-accent/90"
                onClick={handleSaveSettings}
              >
                Kaydet
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Kullanıcı Adı:</span>
                <span className="font-medium">{settings?.username}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Şifre Koruması:</span>
                <span className={`font-medium ${settings?.require_password ? 'text-green-600' : 'text-orange-600'}`}>
                  {settings?.require_password ? 'Aktif' : 'Kapalı'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Kayıt Düzenleme:</span>
                <span className={`font-medium ${settings?.allow_record_editing ? 'text-green-600' : 'text-orange-600'}`}>
                  {settings?.allow_record_editing ? 'Açık' : 'Kapalı'}
                </span>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default AdminPanel;
