import { supabase } from "@/integrations/supabase/client";
import { addMinutes, format } from "date-fns";

interface ServiceRecord {
  id: string;
  record_status: string | null;
  estimated_duration_minutes: number | null;
  service_date: string;
}

export type VehicleStatus = "islemde" | "sirada" | "tamamlandi" | "yok";

/**
 * Determines the appropriate vehicle status based on service records and other vehicles
 */
export const calculateVehicleStatus = async (
  vehicleId: string
): Promise<{ status: VehicleStatus; estimatedDeliveryDate: string | null }> => {
  // Get all service records for this vehicle
  const { data: records, error } = await supabase
    .from("service_records")
    .select("id, record_status, estimated_duration_minutes, service_date")
    .eq("vehicle_id", vehicleId)
    .order("service_date", { ascending: false });

  if (error || !records || records.length === 0) {
    return { status: "yok", estimatedDeliveryDate: null };
  }

  // Check if all records are completed
  const allCompleted = records.every((r) => r.record_status === "tamamlandi");
  if (allCompleted) {
    return { status: "tamamlandi", estimatedDeliveryDate: null };
  }

  // Check if any record is "devam" (in progress)
  const hasInProgress = records.some((r) => r.record_status === "devam");
  
  if (hasInProgress) {
    // Calculate estimated delivery date from the most recent in-progress record
    const inProgressRecord = records.find((r) => r.record_status === "devam");
    let estimatedDeliveryDate: string | null = null;
    
    if (inProgressRecord?.estimated_duration_minutes) {
      const deliveryTime = addMinutes(new Date(), inProgressRecord.estimated_duration_minutes);
      estimatedDeliveryDate = format(deliveryTime, "yyyy-MM-dd'T'HH:mm:ss");
    }
    
    return { status: "islemde", estimatedDeliveryDate };
  }

  // Check if there are detected faults but another vehicle is being worked on
  const hasDetectedFaults = records.some((r) => r.record_status === "tespit");
  
  if (hasDetectedFaults) {
    // Check if any other vehicle is currently "islemde"
    const { data: otherVehicles } = await supabase
      .from("vehicles")
      .select("id, status")
      .neq("id", vehicleId)
      .eq("status", "islemde");

    if (otherVehicles && otherVehicles.length > 0) {
      return { status: "sirada", estimatedDeliveryDate: null };
    }
  }

  // Default: detected faults exist but no other vehicle in progress
  return { status: "yok", estimatedDeliveryDate: null };
};

/**
 * Updates vehicle status based on its service records
 */
export const updateVehicleStatusFromRecords = async (vehicleId: string): Promise<void> => {
  const { status, estimatedDeliveryDate } = await calculateVehicleStatus(vehicleId);
  
  const updateData: any = { status };
  if (estimatedDeliveryDate) {
    updateData.estimated_delivery_date = estimatedDeliveryDate;
  }
  
  await supabase
    .from("vehicles")
    .update(updateData)
    .eq("id", vehicleId);
};

/**
 * When a record's status changes to "devam", update vehicle accordingly
 */
export const handleRecordStatusChange = async (
  vehicleId: string,
  newStatus: string,
  estimatedDurationMinutes?: number | null
): Promise<void> => {
  if (newStatus === "devam") {
    // Set vehicle to "islemde" and calculate delivery time
    let estimatedDeliveryDate: string | null = null;
    
    if (estimatedDurationMinutes) {
      const deliveryTime = addMinutes(new Date(), estimatedDurationMinutes);
      estimatedDeliveryDate = format(deliveryTime, "yyyy-MM-dd'T'HH:mm:ss");
    }

    await supabase
      .from("vehicles")
      .update({ 
        status: "islemde",
        estimated_delivery_date: estimatedDeliveryDate 
      })
      .eq("id", vehicleId);

    // Update other vehicles with detected faults to "sirada"
    const { data: otherVehicles } = await supabase
      .from("vehicles")
      .select("id")
      .neq("id", vehicleId)
      .in("status", ["yok"]);

    if (otherVehicles) {
      for (const otherVehicle of otherVehicles) {
        // Check if this vehicle has detected faults
        const { data: otherRecords } = await supabase
          .from("service_records")
          .select("record_status")
          .eq("vehicle_id", otherVehicle.id);

        const hasDetectedFaults = otherRecords?.some((r) => r.record_status === "tespit");
        
        if (hasDetectedFaults) {
          await supabase
            .from("vehicles")
            .update({ status: "sirada" })
            .eq("id", otherVehicle.id);
        }
      }
    }
  } else if (newStatus === "tamamlandi") {
    // Check if all records are completed
    await updateVehicleStatusFromRecords(vehicleId);
  }
};

/**
 * Recalculate all vehicle statuses (useful for initial load or refresh)
 */
export const recalculateAllVehicleStatuses = async (): Promise<void> => {
  const { data: vehicles } = await supabase
    .from("vehicles")
    .select("id");

  if (!vehicles) return;

  // First, find if any vehicle is "islemde"
  let hasVehicleInProgress = false;

  for (const vehicle of vehicles) {
    const { data: records } = await supabase
      .from("service_records")
      .select("record_status")
      .eq("vehicle_id", vehicle.id);

    if (records?.some((r) => r.record_status === "devam")) {
      hasVehicleInProgress = true;
      break;
    }
  }

  // Now update each vehicle
  for (const vehicle of vehicles) {
    const { data: records } = await supabase
      .from("service_records")
      .select("record_status, estimated_duration_minutes")
      .eq("vehicle_id", vehicle.id);

    if (!records || records.length === 0) {
      await supabase.from("vehicles").update({ status: "yok" }).eq("id", vehicle.id);
      continue;
    }

    const allCompleted = records.every((r) => r.record_status === "tamamlandi");
    const hasInProgress = records.some((r) => r.record_status === "devam");
    const hasDetectedFaults = records.some((r) => r.record_status === "tespit");

    if (allCompleted) {
      await supabase.from("vehicles").update({ status: "tamamlandi" }).eq("id", vehicle.id);
    } else if (hasInProgress) {
      const inProgressRecord = records.find((r) => r.record_status === "devam");
      let estimatedDeliveryDate: string | null = null;
      
      if (inProgressRecord?.estimated_duration_minutes) {
        const deliveryTime = addMinutes(new Date(), inProgressRecord.estimated_duration_minutes);
        estimatedDeliveryDate = format(deliveryTime, "yyyy-MM-dd'T'HH:mm:ss");
      }
      
      await supabase.from("vehicles").update({ 
        status: "islemde",
        estimated_delivery_date: estimatedDeliveryDate 
      }).eq("id", vehicle.id);
    } else if (hasDetectedFaults && hasVehicleInProgress) {
      await supabase.from("vehicles").update({ status: "sirada" }).eq("id", vehicle.id);
    } else {
      await supabase.from("vehicles").update({ status: "yok" }).eq("id", vehicle.id);
    }
  }
};
