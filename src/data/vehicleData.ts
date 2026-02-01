// Placeholder vehicle data structure
// In production, this would come from an external API

export interface VehicleBrand {
  id: string;
  name: string;
}

export interface VehicleModel {
  id: string;
  brandId: string;
  name: string;
}

export interface VehicleEngine {
  id: string;
  modelId: string;
  displacement: string;
  horsepower: string;
  code: string;
}

export interface VehicleTransmission {
  id: string;
  modelId: string;
  type: string;
  code: string;
}

export interface VehicleBodyType {
  id: string;
  modelId: string;
  type: string;
}

// Sample data - replace with real API or database
export const vehicleBrands: VehicleBrand[] = [
  { id: "1", name: "BMW" },
  { id: "2", name: "Mercedes-Benz" },
  { id: "3", name: "Audi" },
  { id: "4", name: "Volkswagen" },
  { id: "5", name: "Ford" },
  { id: "6", name: "Renault" },
  { id: "7", name: "Peugeot" },
  { id: "8", name: "Fiat" },
  { id: "9", name: "Toyota" },
  { id: "10", name: "Honda" },
];

export const vehicleModels: VehicleModel[] = [
  { id: "1", brandId: "1", name: "3 Serisi" },
  { id: "2", brandId: "1", name: "5 Serisi" },
  { id: "3", brandId: "2", name: "C Serisi" },
  { id: "4", brandId: "2", name: "E Serisi" },
  { id: "5", brandId: "3", name: "A4" },
  { id: "6", brandId: "3", name: "A6" },
];

export const vehicleEngines: VehicleEngine[] = [
  { id: "1", modelId: "1", displacement: "2.0L", horsepower: "184 HP", code: "B48B20" },
  { id: "2", modelId: "1", displacement: "3.0L", horsepower: "286 HP", code: "B58B30" },
  { id: "3", modelId: "2", displacement: "2.0L", horsepower: "184 HP", code: "B48B20" },
  { id: "4", modelId: "2", displacement: "3.0L", horsepower: "340 HP", code: "B58B30" },
];

export const vehicleTransmissions: VehicleTransmission[] = [
  { id: "1", modelId: "1", type: "8 İleri Otomatik", code: "ZF 8HP" },
  { id: "2", modelId: "1", type: "6 İleri Manuel", code: "Getrag" },
  { id: "3", modelId: "2", type: "8 İleri Otomatik", code: "ZF 8HP" },
];

export const vehicleBodyTypes: VehicleBodyType[] = [
  { id: "1", modelId: "1", type: "Sedan" },
  { id: "2", modelId: "1", type: "Touring (SW)" },
  { id: "3", modelId: "2", type: "Sedan" },
  { id: "4", modelId: "2", type: "Touring (SW)" },
];

export const getModelsByBrand = (brandId: string): VehicleModel[] => {
  return vehicleModels.filter(model => model.brandId === brandId);
};

export const getEnginesByModel = (modelId: string): VehicleEngine[] => {
  return vehicleEngines.filter(engine => engine.modelId === modelId);
};

export const getTransmissionsByModel = (modelId: string): VehicleTransmission[] => {
  return vehicleTransmissions.filter(trans => trans.modelId === modelId);
};

export const getBodyTypesByModel = (modelId: string): VehicleBodyType[] => {
  return vehicleBodyTypes.filter(body => body.modelId === modelId);
};
