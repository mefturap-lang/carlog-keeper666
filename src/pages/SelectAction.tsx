import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Wrench, Gauge, Bell, Calendar } from "lucide-react";
import { useGoBack } from "@/hooks/useGoBack";

const SelectAction = () => {
  const { vehicleId } = useParams();
  const navigate = useNavigate();
  const goBack = useGoBack(`/vehicle/${vehicleId}`);

  const actions = [
    {
      id: "new-record",
      title: "Yeni İşlem Ekle",
      description: "Araca yapılan yeni işlem kaydı oluştur",
      icon: Wrench,
      iconBg: "bg-accent",
      path: `/add-record/${vehicleId}`,
    },
    {
      id: "update-km",
      title: "Araç KM Güncelleme",
      description: "Aracın güncel kilometre bilgisini güncelle",
      icon: Gauge,
      iconBg: "bg-primary",
      path: `/update-km/${vehicleId}`,
    },
    {
      id: "add-reminder",
      title: "Bakım Uyarısı Ekle",
      description: "Gelecek bakım için uyarı ve hatırlatma oluştur",
      icon: Bell,
      iconBg: "bg-yellow-500",
      path: `/add-reminder/${vehicleId}`,
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6 max-w-md">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="ghost"
            size="icon"
            onClick={goBack}
            className="shrink-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold text-accent">ÜMİT OTO SERVİS</h1>
        </div>

        {/* Title */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-foreground">İşlem Seçin</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Yapmak istediğiniz işlemi seçin
          </p>
        </div>

        {/* Action Cards */}
        <div className="space-y-4">
          {actions.map((action) => (
            <Card
              key={action.id}
              className="p-4 cursor-pointer hover:shadow-lg transition-all"
              onClick={() => navigate(action.path)}
            >
              <div className="flex items-center gap-4">
                <div
                  className={`w-12 h-12 rounded-xl ${action.iconBg} flex items-center justify-center shrink-0`}
                >
                  <action.icon className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">{action.title}</h3>
                  <p className="text-xs text-muted-foreground">
                    {action.description}
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SelectAction;