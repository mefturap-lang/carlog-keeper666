import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type PartStatus = "original" | "local_paint" | "painted" | "changed" | "processed";

interface PartState {
  [key: string]: PartStatus;
}

const statusColors: Record<PartStatus, string> = {
  original: "#D1D5DB", // gray-300
  local_paint: "#F97316", // orange
  painted: "#3B82F6", // blue
  changed: "#EF4444", // red
  processed: "#22C55E", // green
};

const statusLabels: Record<PartStatus, string> = {
  original: "Orijinal",
  local_paint: "Lokal Boyalı",
  painted: "Boyalı",
  changed: "Değişen",
  processed: "İşlemli",
};

interface VehicleBodyDiagramProps {
  parts: PartState;
  onChange?: (parts: PartState) => void;
  readOnly?: boolean;
}

const partLabels: Record<string, string> = {
  hood: "Kaput",
  roof: "Tavan",
  trunk: "Bagaj Kapağı",
  front_bumper: "Ön Tampon",
  rear_bumper: "Arka Tampon",
  front_left_fender: "Sol Ön Çamurluk",
  front_right_fender: "Sağ Ön Çamurluk",
  rear_left_fender: "Sol Arka Çamurluk",
  rear_right_fender: "Sağ Arka Çamurluk",
  left_front_door: "Sol Ön Kapı",
  left_rear_door: "Sol Arka Kapı",
  right_front_door: "Sağ Ön Kapı",
  right_rear_door: "Sağ Arka Kapı",
};

const allPartIds = Object.keys(partLabels);

const VehicleBodyDiagram = ({ parts, onChange, readOnly = false }: VehicleBodyDiagramProps) => {
  const [selectedPart, setSelectedPart] = useState<string | null>(null);

  const handlePartClick = (partId: string) => {
    if (readOnly) return;
    setSelectedPart(partId === selectedPart ? null : partId);
  };

  const handleStatusChange = (partId: string, status: PartStatus) => {
    if (onChange) {
      onChange({ ...parts, [partId]: status });
    }
  };

  const getPartColor = (partId: string) => {
    return statusColors[parts[partId] || "original"];
  };

  const getPartsByStatus = (status: PartStatus) => {
    return Object.entries(parts)
      .filter(([_, s]) => s === status)
      .map(([partId]) => partLabels[partId] || partId);
  };

  const localPaintParts = getPartsByStatus("local_paint");
  const paintedParts = getPartsByStatus("painted");
  const changedParts = getPartsByStatus("changed");
  const processedParts = getPartsByStatus("processed");

  const hasNonOriginalParts = localPaintParts.length > 0 || paintedParts.length > 0 || changedParts.length > 0 || processedParts.length > 0;

  return (
    <div className="space-y-4">
      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-xs p-3 bg-muted/50 rounded-lg">
        {Object.entries(statusLabels).map(([status, label]) => (
          <div key={status} className="flex items-center gap-2">
            <div
              className="w-4 h-4 rounded-sm border border-border shadow-sm"
              style={{ backgroundColor: statusColors[status as PartStatus] }}
            />
            <span className={status === "original" ? "text-muted-foreground" : "font-medium"}>
              {label}
            </span>
          </div>
        ))}
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* SVG Diagram - Clean Professional Design */}
        <div className="flex-shrink-0 relative">
          <svg viewBox="0 0 400 520" className="w-full max-w-[320px] mx-auto">
            {/* Background */}
            <rect x="0" y="0" width="400" height="520" fill="transparent" />

            {/* ============ TOP VIEW ============ */}
            {/* Left Mirror */}
            <rect x="50" y="98" width="8" height="20" rx="2" fill="#E5E7EB" stroke="#374151" strokeWidth="1.5" />
            
            {/* Right Mirror */}
            <rect x="342" y="98" width="8" height="20" rx="2" fill="#E5E7EB" stroke="#374151" strokeWidth="1.5" />

            {/* Front Bumper */}
            <path
              d="M80 20 L320 20 Q340 20 340 35 L340 45 L60 45 L60 35 Q60 20 80 20 Z"
              fill={getPartColor("front_bumper")}
              stroke="#374151"
              strokeWidth="1.5"
              className={!readOnly ? "cursor-pointer hover:opacity-80 transition-opacity" : ""}
              onClick={() => handlePartClick("front_bumper")}
            />
            {selectedPart === "front_bumper" && (
              <path d="M80 20 L320 20 Q340 20 340 35 L340 45 L60 45 L60 35 Q60 20 80 20 Z" fill="none" stroke="#000" strokeWidth="2" strokeDasharray="4" />
            )}

            {/* Front Left Fender */}
            <path
              d="M60 48 L95 48 L95 100 L60 100 Q55 100 55 90 L55 58 Q55 48 60 48 Z"
              fill={getPartColor("front_left_fender")}
              stroke="#374151"
              strokeWidth="1.5"
              className={!readOnly ? "cursor-pointer hover:opacity-80 transition-opacity" : ""}
              onClick={() => handlePartClick("front_left_fender")}
            />
            {selectedPart === "front_left_fender" && (
              <path d="M60 48 L95 48 L95 100 L60 100 Q55 100 55 90 L55 58 Q55 48 60 48 Z" fill="none" stroke="#000" strokeWidth="2" strokeDasharray="4" />
            )}

            {/* Front Right Fender */}
            <path
              d="M305 48 L340 48 Q345 48 345 58 L345 90 Q345 100 340 100 L305 100 Z"
              fill={getPartColor("front_right_fender")}
              stroke="#374151"
              strokeWidth="1.5"
              className={!readOnly ? "cursor-pointer hover:opacity-80 transition-opacity" : ""}
              onClick={() => handlePartClick("front_right_fender")}
            />
            {selectedPart === "front_right_fender" && (
              <path d="M305 48 L340 48 Q345 48 345 58 L345 90 Q345 100 340 100 L305 100 Z" fill="none" stroke="#000" strokeWidth="2" strokeDasharray="4" />
            )}

            {/* Hood */}
            <path
              d="M95 48 L305 48 L305 110 Q305 118 295 118 L105 118 Q95 118 95 110 Z"
              fill={getPartColor("hood")}
              stroke="#374151"
              strokeWidth="1.5"
              className={!readOnly ? "cursor-pointer hover:opacity-80 transition-opacity" : ""}
              onClick={() => handlePartClick("hood")}
            />
            {selectedPart === "hood" && (
              <path d="M95 48 L305 48 L305 110 Q305 118 295 118 L105 118 Q95 118 95 110 Z" fill="none" stroke="#000" strokeWidth="2" strokeDasharray="4" />
            )}

            {/* Windshield (front) */}
            <path
              d="M105 120 L295 120 L285 150 L115 150 Z"
              fill="#9CA3AF"
              stroke="#374151"
              strokeWidth="1"
            />

            {/* Left Front Door */}
            <rect
              x="55"
              y="103"
              width="40"
              height="55"
              rx="2"
              fill={getPartColor("left_front_door")}
              stroke="#374151"
              strokeWidth="1.5"
              className={!readOnly ? "cursor-pointer hover:opacity-80 transition-opacity" : ""}
              onClick={() => handlePartClick("left_front_door")}
            />
            {selectedPart === "left_front_door" && (
              <rect x="55" y="103" width="40" height="55" rx="2" fill="none" stroke="#000" strokeWidth="2" strokeDasharray="4" />
            )}

            {/* Right Front Door */}
            <rect
              x="305"
              y="103"
              width="40"
              height="55"
              rx="2"
              fill={getPartColor("right_front_door")}
              stroke="#374151"
              strokeWidth="1.5"
              className={!readOnly ? "cursor-pointer hover:opacity-80 transition-opacity" : ""}
              onClick={() => handlePartClick("right_front_door")}
            />
            {selectedPart === "right_front_door" && (
              <rect x="305" y="103" width="40" height="55" rx="2" fill="none" stroke="#000" strokeWidth="2" strokeDasharray="4" />
            )}

            {/* Roof */}
            <rect
              x="95"
              y="152"
              width="210"
              height="90"
              rx="5"
              fill={getPartColor("roof")}
              stroke="#374151"
              strokeWidth="1.5"
              className={!readOnly ? "cursor-pointer hover:opacity-80 transition-opacity" : ""}
              onClick={() => handlePartClick("roof")}
            />
            {selectedPart === "roof" && (
              <rect x="95" y="152" width="210" height="90" rx="5" fill="none" stroke="#000" strokeWidth="2" strokeDasharray="4" />
            )}
            {/* Roof Windows */}
            <rect x="115" y="158" width="170" height="35" rx="3" fill="#6B7280" opacity="0.4" />
            <rect x="115" y="200" width="170" height="35" rx="3" fill="#6B7280" opacity="0.4" />

            {/* Left Rear Door */}
            <rect
              x="55"
              y="160"
              width="40"
              height="55"
              rx="2"
              fill={getPartColor("left_rear_door")}
              stroke="#374151"
              strokeWidth="1.5"
              className={!readOnly ? "cursor-pointer hover:opacity-80 transition-opacity" : ""}
              onClick={() => handlePartClick("left_rear_door")}
            />
            {selectedPart === "left_rear_door" && (
              <rect x="55" y="160" width="40" height="55" rx="2" fill="none" stroke="#000" strokeWidth="2" strokeDasharray="4" />
            )}

            {/* Right Rear Door */}
            <rect
              x="305"
              y="160"
              width="40"
              height="55"
              rx="2"
              fill={getPartColor("right_rear_door")}
              stroke="#374151"
              strokeWidth="1.5"
              className={!readOnly ? "cursor-pointer hover:opacity-80 transition-opacity" : ""}
              onClick={() => handlePartClick("right_rear_door")}
            />
            {selectedPart === "right_rear_door" && (
              <rect x="305" y="160" width="40" height="55" rx="2" fill="none" stroke="#000" strokeWidth="2" strokeDasharray="4" />
            )}

            {/* Rear Left Fender */}
            <path
              d="M55 218 L95 218 L95 270 L60 270 Q55 270 55 260 Z"
              fill={getPartColor("rear_left_fender")}
              stroke="#374151"
              strokeWidth="1.5"
              className={!readOnly ? "cursor-pointer hover:opacity-80 transition-opacity" : ""}
              onClick={() => handlePartClick("rear_left_fender")}
            />
            {selectedPart === "rear_left_fender" && (
              <path d="M55 218 L95 218 L95 270 L60 270 Q55 270 55 260 Z" fill="none" stroke="#000" strokeWidth="2" strokeDasharray="4" />
            )}

            {/* Rear Right Fender */}
            <path
              d="M305 218 L345 218 L345 260 Q345 270 340 270 L305 270 Z"
              fill={getPartColor("rear_right_fender")}
              stroke="#374151"
              strokeWidth="1.5"
              className={!readOnly ? "cursor-pointer hover:opacity-80 transition-opacity" : ""}
              onClick={() => handlePartClick("rear_right_fender")}
            />
            {selectedPart === "rear_right_fender" && (
              <path d="M305 218 L345 218 L345 260 Q345 270 340 270 L305 270 Z" fill="none" stroke="#000" strokeWidth="2" strokeDasharray="4" />
            )}

            {/* Rear Windshield */}
            <path
              d="M115 244 L285 244 L295 270 L105 270 Z"
              fill="#9CA3AF"
              stroke="#374151"
              strokeWidth="1"
            />

            {/* Trunk */}
            <path
              d="M95 270 L305 270 L305 310 Q305 320 295 320 L105 320 Q95 320 95 310 Z"
              fill={getPartColor("trunk")}
              stroke="#374151"
              strokeWidth="1.5"
              className={!readOnly ? "cursor-pointer hover:opacity-80 transition-opacity" : ""}
              onClick={() => handlePartClick("trunk")}
            />
            {selectedPart === "trunk" && (
              <path d="M95 270 L305 270 L305 310 Q305 320 295 320 L105 320 Q95 320 95 310 Z" fill="none" stroke="#000" strokeWidth="2" strokeDasharray="4" />
            )}

            {/* Rear Bumper */}
            <path
              d="M60 322 L340 322 L340 338 Q340 348 320 348 L80 348 Q60 348 60 338 Z"
              fill={getPartColor("rear_bumper")}
              stroke="#374151"
              strokeWidth="1.5"
              className={!readOnly ? "cursor-pointer hover:opacity-80 transition-opacity" : ""}
              onClick={() => handlePartClick("rear_bumper")}
            />
            {selectedPart === "rear_bumper" && (
              <path d="M60 322 L340 322 L340 338 Q340 348 320 348 L80 348 Q60 348 60 338 Z" fill="none" stroke="#000" strokeWidth="2" strokeDasharray="4" />
            )}

            {/* Headlights */}
            <ellipse cx="110" cy="32" rx="18" ry="8" fill="#FEF3C7" stroke="#374151" strokeWidth="1" />
            <ellipse cx="290" cy="32" rx="18" ry="8" fill="#FEF3C7" stroke="#374151" strokeWidth="1" />

            {/* Taillights */}
            <rect x="75" y="332" width="30" height="10" rx="2" fill="#DC2626" stroke="#374151" strokeWidth="1" />
            <rect x="295" y="332" width="30" height="10" rx="2" fill="#DC2626" stroke="#374151" strokeWidth="1" />

            {/* Direction Labels - Top View */}
            <text x="200" y="12" textAnchor="middle" fontSize="11" fill="#6B7280" fontWeight="600">ÖN</text>
            <text x="200" y="362" textAnchor="middle" fontSize="11" fill="#6B7280" fontWeight="600">ARKA</text>
            <text x="30" y="195" textAnchor="middle" fontSize="11" fill="#6B7280" fontWeight="600" transform="rotate(-90 30 195)">SOL</text>
            <text x="370" y="195" textAnchor="middle" fontSize="11" fill="#6B7280" fontWeight="600" transform="rotate(90 370 195)">SAĞ</text>

            {/* ============ SIDE VIEW ============ */}
            {/* Side view label */}
            <text x="200" y="395" textAnchor="middle" fontSize="12" fill="#374151" fontWeight="600">YAN GÖRÜNÜM</text>

            {/* Car Body - Side */}
            <path
              d="M50 480 L50 450 L80 450 Q90 450 95 445 L130 420 Q140 410 160 410 L280 410 Q300 410 310 420 L340 440 Q345 445 350 445 L370 445 L370 480 Z"
              fill="#E5E7EB"
              stroke="#374151"
              strokeWidth="1.5"
            />

            {/* Side Windows */}
            <path
              d="M135 418 L155 418 Q160 418 160 423 L160 440 L125 440 L135 418 Z"
              fill="#9CA3AF"
              stroke="#374151"
              strokeWidth="1"
            />
            <rect x="162" y="418" width="50" height="22" rx="1" fill="#9CA3AF" stroke="#374151" strokeWidth="1" />
            <rect x="214" y="418" width="50" height="22" rx="1" fill="#9CA3AF" stroke="#374151" strokeWidth="1" />
            <path
              d="M266 418 L290 418 Q295 418 295 423 L295 440 L266 440 Z"
              fill="#9CA3AF"
              stroke="#374151"
              strokeWidth="1"
            />

            {/* Door Lines */}
            <line x1="162" y1="418" x2="162" y2="478" stroke="#374151" strokeWidth="1" />
            <line x1="214" y1="418" x2="214" y2="478" stroke="#374151" strokeWidth="1" />

            {/* Front Wheel */}
            <circle cx="105" cy="478" r="28" fill="#374151" />
            <circle cx="105" cy="478" r="20" fill="#6B7280" />
            <circle cx="105" cy="478" r="8" fill="#9CA3AF" />

            {/* Rear Wheel */}
            <circle cx="315" cy="478" r="28" fill="#374151" />
            <circle cx="315" cy="478" r="20" fill="#6B7280" />
            <circle cx="315" cy="478" r="8" fill="#9CA3AF" />

            {/* Headlight Side */}
            <rect x="50" y="450" width="20" height="12" rx="2" fill="#FEF3C7" stroke="#374151" strokeWidth="1" />

            {/* Taillight Side */}
            <rect x="355" y="450" width="15" height="10" rx="1" fill="#DC2626" stroke="#374151" strokeWidth="1" />

            {/* Ground Line */}
            <line x1="30" y1="506" x2="390" y2="506" stroke="#9CA3AF" strokeWidth="1" strokeDasharray="4" />
          </svg>
        </div>

        {/* Parts List with Dropdown Selection */}
        <div className="flex-1 space-y-4">
          {/* All Parts Dropdown List */}
          {!readOnly && (
            <div className="space-y-2">
              <h4 className="font-semibold text-sm text-foreground mb-3">Parça Durumlarını Seçin</h4>
              <div className="grid gap-2 max-h-[300px] overflow-y-auto pr-2">
                {allPartIds.map((partId) => (
                  <div 
                    key={partId} 
                    className={`flex items-center justify-between gap-3 p-2 rounded-lg border transition-colors ${
                      selectedPart === partId 
                        ? 'border-primary bg-primary/10' 
                        : 'border-border hover:bg-muted/50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-sm border border-border/50"
                        style={{ backgroundColor: getPartColor(partId) }}
                      />
                      <span className="text-sm font-medium">{partLabels[partId]}</span>
                    </div>
                    <Select
                      value={parts[partId] || "original"}
                      onValueChange={(value) => handleStatusChange(partId, value as PartStatus)}
                    >
                      <SelectTrigger className="w-[130px] h-8 text-xs bg-background">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-background border border-border shadow-lg z-50">
                        {Object.entries(statusLabels).map(([status, label]) => (
                          <SelectItem key={status} value={status} className="text-xs">
                            <div className="flex items-center gap-2">
                              <div 
                                className="w-3 h-3 rounded-sm"
                                style={{ backgroundColor: statusColors[status as PartStatus] }}
                              />
                              {label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Status Summary */}
          <div className="space-y-3 pt-3 border-t border-border">
            <h4 className="font-semibold text-sm text-foreground">Durum Özeti</h4>
            
            {!hasNonOriginalParts ? (
              <p className="text-muted-foreground italic text-sm">Tüm parçalar orijinal</p>
            ) : (
              <div className="space-y-3">
                {localPaintParts.length > 0 && (
                  <div className="p-2 rounded-lg bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: statusColors.local_paint }} />
                      <span className="font-semibold text-xs text-orange-700 dark:text-orange-400">Lokal Boyalı ({localPaintParts.length})</span>
                    </div>
                    <ul className="text-xs text-orange-600 dark:text-orange-300 pl-5 space-y-0.5">
                      {localPaintParts.map((part) => (
                        <li key={part} className="list-disc">{part}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {paintedParts.length > 0 && (
                  <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: statusColors.painted }} />
                      <span className="font-semibold text-xs text-blue-700 dark:text-blue-400">Boyalı ({paintedParts.length})</span>
                    </div>
                    <ul className="text-xs text-blue-600 dark:text-blue-300 pl-5 space-y-0.5">
                      {paintedParts.map((part) => (
                        <li key={part} className="list-disc">{part}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {changedParts.length > 0 && (
                  <div className="p-2 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: statusColors.changed }} />
                      <span className="font-semibold text-xs text-red-700 dark:text-red-400">Değişen ({changedParts.length})</span>
                    </div>
                    <ul className="text-xs text-red-600 dark:text-red-300 pl-5 space-y-0.5">
                      {changedParts.map((part) => (
                        <li key={part} className="list-disc">{part}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {processedParts.length > 0 && (
                  <div className="p-2 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: statusColors.processed }} />
                      <span className="font-semibold text-xs text-green-700 dark:text-green-400">İşlemli ({processedParts.length})</span>
                    </div>
                    <ul className="text-xs text-green-600 dark:text-green-300 pl-5 space-y-0.5">
                      {processedParts.map((part) => (
                        <li key={part} className="list-disc">{part}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VehicleBodyDiagram;
