import { Card } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface VehicleSpecs {
  // Genel Bakış
  modelProductionYears?: string;
  segment?: string;
  bodyType?: string;
  engineType?: string;
  fuelConsumption?: string;
  horsePower?: string;
  transmission?: string;
  acceleration?: string;
  
  // Motor ve Performans
  displacement?: string;
  maxPower?: string;
  maxTorque?: string;
  topSpeed?: string;
  
  // Yakıt Tüketimi
  fuelType?: string;
  cityConsumption?: string;
  highwayConsumption?: string;
  averageConsumption?: string;
  fuelTankCapacity?: string;
  
  // Boyutlar
  seatCount?: string;
  length?: string;
  width?: string;
  height?: string;
  netWeight?: string;
  trunkCapacity?: string;
  tireSize?: string;
}

interface VehicleSpecsSectionProps {
  specs: VehicleSpecs;
  editable?: boolean;
  onChange?: (specs: VehicleSpecs) => void;
}

const SpecRow = ({ label, value, subLabel }: { label: string; value?: string; subLabel?: string }) => (
  <div className="flex justify-between py-2 border-b border-border last:border-0">
    <div>
      <span className="text-sm font-medium text-foreground">{label}</span>
      {subLabel && <span className="text-xs text-muted-foreground ml-1">({subLabel})</span>}
    </div>
    <span className="text-sm text-primary font-medium">{value || "-"}</span>
  </div>
);

const VehicleSpecsSection = ({ specs }: VehicleSpecsSectionProps) => {
  return (
    <Accordion type="multiple" className="space-y-2">
      {/* Genel Bakış */}
      <AccordionItem value="general" className="border rounded-lg">
        <AccordionTrigger className="px-4 py-3 text-accent font-semibold hover:no-underline">
          Genel Bakış
        </AccordionTrigger>
        <AccordionContent className="px-4 pb-3">
          <SpecRow label="Model Üretim Yılı" value={specs.modelProductionYears} subLabel="İlk / Son" />
          <SpecRow label="Segmenti" value={specs.segment} />
          <SpecRow label="Kasa Tipi / Kapı Sayısı" value={specs.bodyType} />
          <SpecRow label="Motor Tipi" value={specs.engineType} />
          <SpecRow label="Yakıt Tüketimi" value={specs.fuelConsumption} subLabel="Şehir içi / Şehir dışı" />
          <SpecRow label="Motor Gücü" value={specs.horsePower} />
          <SpecRow label="Şanzıman" value={specs.transmission} />
          <SpecRow label="Hızlanma 0-100 km/saat" value={specs.acceleration} />
        </AccordionContent>
      </AccordionItem>

      {/* Motor ve Performans */}
      <AccordionItem value="engine" className="border rounded-lg">
        <AccordionTrigger className="px-4 py-3 text-accent font-semibold hover:no-underline">
          Motor ve Performans
        </AccordionTrigger>
        <AccordionContent className="px-4 pb-3">
          <SpecRow label="Motor Tipi" value={specs.engineType} />
          <SpecRow label="Motor Hacmi" value={specs.displacement} />
          <SpecRow label="Maksimum Güç" value={specs.maxPower} />
          <SpecRow label="Maksimum Tork" value={specs.maxTorque} />
          <SpecRow label="Hızlanma 0-100 km/saat" value={specs.acceleration} />
          <SpecRow label="Azami Sürat" value={specs.topSpeed} />
        </AccordionContent>
      </AccordionItem>

      {/* Yakıt Tüketimi */}
      <AccordionItem value="fuel" className="border rounded-lg">
        <AccordionTrigger className="px-4 py-3 text-accent font-semibold hover:no-underline">
          Yakıt Tüketimi
        </AccordionTrigger>
        <AccordionContent className="px-4 pb-3">
          <SpecRow label="Yakıt Tipi" value={specs.fuelType} />
          <SpecRow label="Şehir içi" value={specs.cityConsumption} subLabel="100 km'de" />
          <SpecRow label="Şehir dışı" value={specs.highwayConsumption} subLabel="100 km'de" />
          <SpecRow label="Ortalama" value={specs.averageConsumption} subLabel="100 km'de" />
          <SpecRow label="Yakıt Depo Hacmi" value={specs.fuelTankCapacity} />
        </AccordionContent>
      </AccordionItem>

      {/* Boyutlar */}
      <AccordionItem value="dimensions" className="border rounded-lg">
        <AccordionTrigger className="px-4 py-3 text-accent font-semibold hover:no-underline">
          Boyutlar
        </AccordionTrigger>
        <AccordionContent className="px-4 pb-3">
          <SpecRow label="Koltuk Sayısı" value={specs.seatCount} />
          <SpecRow label="Uzunluk" value={specs.length} />
          <SpecRow label="Genişlik" value={specs.width} />
          <SpecRow label="Yükseklik" value={specs.height} />
          <SpecRow label="Net Ağırlık" value={specs.netWeight} />
          <SpecRow label="Bagaj Kapasitesi" value={specs.trunkCapacity} />
          <SpecRow label="Lastik Ölçüleri" value={specs.tireSize} />
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
};

export default VehicleSpecsSection;
