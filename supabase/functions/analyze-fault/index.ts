import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface VehicleData {
  brand: string;
  model: string;
  year: number;
  current_km: number;
  notes: string | null;
  body_parts: Record<string, string> | null;
  owner_name: string | null;
  chassis_number: string;
}

interface ServiceRecord {
  title: string;
  description: string | null;
  km_at_service: number;
  service_date: string;
  part_cost: number | null;
  labor_cost: number | null;
  operation_type: string | null;
  part_source: string | null;
  part_quality: string | null;
  record_status: string | null;
}

interface VehicleSummary {
  summary_text: string | null;
  suggestions: string | null;
}

interface FaultAnalysisRequest {
  vehicle: VehicleData;
  serviceRecords: ServiceRecord[];
  vehicleSummary: VehicleSummary | null;
  faultCodes: string[];
  faultCodesWithDescriptions?: string[]; // DTC kodları + Türkçe açıklamaları
  customerComplaint: string;
  technicianObservation: string;
  photoUrls: string[];
  photoDescriptions: string[];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const requestData: FaultAnalysisRequest = await req.json();
    const { 
      vehicle, 
      serviceRecords, 
      vehicleSummary, 
      faultCodes, 
      faultCodesWithDescriptions,
      customerComplaint, 
      technicianObservation,
      photoUrls,
      photoDescriptions
    } = requestData;

    // Build comprehensive context for AI analysis
    const vehicleAge = new Date().getFullYear() - vehicle.year;
    const avgKmPerYear = Math.round(vehicle.current_km / Math.max(vehicleAge, 1));
    
    // Body parts analysis
    const bodyPartsAnalysis = vehicle.body_parts ? 
      Object.entries(vehicle.body_parts)
        .filter(([_, status]) => status !== "original")
        .map(([part, status]) => `${part}: ${status}`)
        .join(", ") : "Kaporta bilgisi yok";

    // Service history summary
    const serviceHistorySummary = serviceRecords.map(record => {
      const date = new Date(record.service_date).toLocaleDateString('tr-TR');
      const cost = (record.part_cost || 0) + (record.labor_cost || 0);
      return `- ${date} | ${record.km_at_service} km | ${record.title} | ${record.description || ''} | Maliyet: ${cost}₺ | Durum: ${record.record_status || 'belirsiz'}`;
    }).join("\n");

    // Build the expert system prompt
    const systemPrompt = `Sen otomotiv arıza teşhis uzmanısın. Araç verilerini analiz ederek kısa ve öz teşhisler sun.

ÇIKTI FORMATI (JSON):
{
  "predictions": [
    {
      "title": "Arıza başlığı (kısa)",
      "probability": 85,
      "shortExplanation": "Max 5 kelime özet",
      "criticality": "Çok Kritik" | "Orta Dereceli" | "Ötelenebilir",
      "cause": "Tahmini sebep - detaylı ama kısa (max 50 karakter)",
      "faultyParts": "Arızalı parçalar ve geçmiş işlemlerle bağlantı (max 50 karakter)",
      "recommendedAction": "Önerilen işlem (max 50 karakter)"
    }
  ],
  "overallAssessment": "Genel değerlendirme (MAX 200 KARAKTERİ ASLA GEÇME)"
}

KRİTİK KURALLAR:
- Minimum 3, maksimum 5 arıza tahmini sun
- Her açıklama ÇOK KISA olmalı - uzun cümleler YASAK
- "cause" + "faultyParts" + "recommendedAction" TOPLAMI 150 karakteri geçmemeli
- "overallAssessment" 200 karakteri ASLA geçmemeli
- Tahminleri olasılık sırasına göre sırala
- Kişisel deneyim ifadeleri kullanma`;

    // Build the analysis request message
    const userMessage = `ARAÇ BİLGİLERİ:
Marka: ${vehicle.brand}
Model: ${vehicle.model}
Yıl: ${vehicle.year} (${vehicleAge} yaşında)
Güncel Kilometre: ${vehicle.current_km.toLocaleString()} km
Yıllık Ortalama Kilometre: ${avgKmPerYear.toLocaleString()} km/yıl
Şasi Numarası: ${vehicle.chassis_number}
${vehicle.notes ? `Teknisyen Notları: ${vehicle.notes}` : ''}

KAPORTA DURUMU:
${bodyPartsAnalysis || "Tüm parçalar orijinal"}

SERVİS GEÇMİŞİ (${serviceRecords.length} kayıt):
${serviceHistorySummary || "Servis kaydı bulunmuyor"}

${vehicleSummary ? `ÖNCEKİ ARAÇ ÖZETİ:
${vehicleSummary.summary_text || ''}
Önceki Öneriler: ${vehicleSummary.suggestions || ''}` : ''}

---

MEVCUT ARIZA BİLGİLERİ:

OBD ARIZA KODLARI:
${faultCodesWithDescriptions && faultCodesWithDescriptions.length > 0 
  ? faultCodesWithDescriptions.join("\n") 
  : (faultCodes.length > 0 ? faultCodes.join(", ") : "Arıza kodu girilmedi")}

MÜŞTERİ ŞİKAYETİ:
${customerComplaint || "Müşteri şikayeti belirtilmedi"}

TEKNİSYEN GÖZLEMİ:
${technicianObservation || "Teknisyen gözlemi belirtilmedi"}

${photoDescriptions.length > 0 ? `FOTOĞRAF AÇIKLAMALARI:
${photoDescriptions.filter(d => d).map((desc, i) => `Fotoğraf ${i + 1}: ${desc}`).join("\n")}` : ''}

---

Lütfen tüm bu verileri analiz ederek, uzman seviyesinde bir arıza teşhisi ve çözüm önerisi sun. Olası arıza nedenlerini, arızanın nasıl oluştuğunu, hangi parçaların etkilendiğini ve nasıl müdahale edilmesi gerektiğini detaylı şekilde açıkla.`;

    // Prepare messages array - include images if available
    const messages: Array<{ role: string; content: string | Array<{ type: string; text?: string; image_url?: { url: string } }> }> = [
      { role: "system", content: systemPrompt }
    ];

    // If we have photos, include them in the message for visual analysis
    if (photoUrls.length > 0) {
      const contentArray: Array<{ type: string; text?: string; image_url?: { url: string } }> = [
        { type: "text", text: userMessage }
      ];
      
      // Add photo URLs for visual analysis
      for (const url of photoUrls) {
        if (url) {
          contentArray.push({
            type: "image_url",
            image_url: { url }
          });
        }
      }
      
      messages.push({ role: "user", content: contentArray });
    } else {
      messages.push({ role: "user", content: userMessage });
    }

    console.log("Sending analysis request to AI...");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro", // Using Pro for complex reasoning with images
        messages,
        temperature: 0.3, // Lower temperature for more consistent technical analysis
        max_tokens: 4000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI Gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ 
          error: "Rate limit exceeded. Please try again in a few moments." 
        }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      if (response.status === 402) {
        return new Response(JSON.stringify({ 
          error: "AI credits exhausted. Please add credits to continue." 
        }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      throw new Error(`AI Gateway error: ${response.status} - ${errorText}`);
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No content in AI response");
    }

    console.log("AI Response received, parsing...");

    // Parse the JSON response from AI
    let analysisResult;
    try {
      // Extract JSON from the response (it might be wrapped in markdown code blocks)
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || 
                        content.match(/```\s*([\s\S]*?)\s*```/) ||
                        [null, content];
      const jsonStr = jsonMatch[1] || content;
      analysisResult = JSON.parse(jsonStr.trim());
    } catch (parseError) {
      console.error("Failed to parse AI response as JSON:", parseError);
      console.log("Raw content:", content);
      
      // Create a structured response from unstructured text
      analysisResult = {
        predictions: [{
          title: "Yapay Zeka Analizi",
          probability: 70,
          shortExplanation: "Detaylı Analiz",
          criticality: "Orta Dereceli",
          cause: "AI analizi tamamlandı",
          faultyParts: "Detay için metne bakın",
          recommendedAction: "Uzman değerlendirmesi önerilir"
        }],
        overallAssessment: content.substring(0, 200)
      };
    }

    // Add metadata to the result
    const finalResult = {
      ...analysisResult,
      vehicleInfo: {
        brand: vehicle.brand,
        model: vehicle.model,
        year: vehicle.year,
        km: vehicle.current_km,
      },
      faultCodes,
      customerComplaint,
      technicianObservation,
      serviceHistoryCount: serviceRecords.length,
      analyzedAt: new Date().toISOString(),
      analysisMethod: "AI-Powered Expert Analysis",
    };

    return new Response(JSON.stringify(finalResult), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Fault analysis error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    
    return new Response(JSON.stringify({ 
      error: errorMessage,
      fallback: true 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
