// DTC (Diagnostic Trouble Code) Parser Utility
// 1462 adet OBD-II arıza kodu için Türkçe açıklama sağlar

import dtcCodesRaw from "@/data/dtc_codes.csv?raw";

export interface DTCCode {
  code: string;
  description: string;
}

// Bozuk karakterleri düzelt

// Bozuk karakterleri düzelt
const fixTurkishChars = (text: string): string => {
  // Common broken patterns from Windows-1254 encoding
  return text
    .replace(/K�tle/g, "Kütle")
    .replace(/Ak��/g, "Akış")
    .replace(/Ar�za/g, "Arıza")
    .replace(/D���k/g, "Düşük")
    .replace(/Y�ksek/g, "Yüksek")
    .replace(/Giri�/g, "Giriş")
    .replace(/Bas�nc�/g, "Basıncı")
    .replace(/Bas�n�/g, "Basınç")
    .replace(/S�cakl���/g, "Sıcaklığı")
    .replace(/S�cakl��/g, "Sıcaklık")
    .replace(/Ya��t/g, "Yakıt")
    .replace(/Yak�t/g, "Yakıt")
    .replace(/So�utucu/g, "Soğutucu")
    .replace(/So�utma/g, "Soğutma")
    .replace(/Sog�utma/g, "Soğutma")
    .replace(/Ate�leme/g, "Ateşleme")
    .replace(/�al��ma/g, "Çalışma")
    .replace(/�al��t�rma/g, "Çalıştırma")
    .replace(/�ndikat�r/g, "İndikatör")
    .replace(/Sens�r/g, "Sensör")
    .replace(/Sens�r�/g, "Sensörü")
    .replace(/Poz�syon/g, "Pozisyon")
    .replace(/Pozisyon/g, "Pozisyon")
    .replace(/D�zensiz/g, "Düzensiz")
    .replace(/Enjekt�r/g, "Enjektör")
    .replace(/H�z/g, "Hız")
    .replace(/H�z�/g, "Hızı")
    .replace(/�l��l�/g, "Ölçülü")
    .replace(/�l��m/g, "Ölçüm")
    .replace(/T�rbin/g, "Türbin")
    .replace(/Turbo�arj/g, "Turboşarj")
    .replace(/A��r�/g, "Aşırı")
    .replace(/Voltaj/g, "Voltaj")
    .replace(/Krank/g, "Krank")
    .replace(/Eksantrik/g, "Eksantrik")
    .replace(/De�i�ken/g, "Değişken")
    .replace(/K�sma/g, "Kısma")
    .replace(/Hidrolik/g, "Hidrolik")
    .replace(/�ekim/g, "Çekim")
    .replace(/�ekti/g, "Çekti")
    .replace(/Debriyaj/g, "Debriyaj")
    .replace(/�anz�man/g, "Şanzıman")
    .replace(/�anz/g, "Şanz")
    .replace(/Silindir/g, "Silindir")
    .replace(/Banka/g, "Banka")
    .replace(/Kataliz�r/g, "Katalizör")
    .replace(/Egzoz/g, "Egzoz")
    .replace(/S�z�nt�/g, "Sızıntı")
    .replace(/Buhar/g, "Buhar")
    .replace(/Buharla�ma/g, "Buharlaşma")
    .replace(/Emisyon/g, "Emisyon")
    .replace(/Devir/g, "Devir")
    .replace(/�st�/g, "Üstü")
    .replace(/Alt�nda/g, "Altında")
    .replace(/Performans/g, "Performans")
    .replace(/Menzil/g, "Menzil")
    .replace(/Devre/g, "Devre")
    .replace(/Kesintili/g, "Kesintili")
    .replace(/A��k/g, "Açık")
    .replace(/Kapal�/g, "Kapalı")
    .replace(/Motor/g, "Motor")
    .replace(/Sistem/g, "Sistem")
    .replace(/Kontrol/g, "Kontrol")
    .replace(/Sert/g, "Sert")
    .replace(/Yumu�ak/g, "Yumuşak")
    .replace(/Veri/g, "Veri")
    .replace(/Bellek/g, "Bellek")
    .replace(/Hata/g, "Hata")
    .replace(/�leti�im/g, "İletişim")
    .replace(/Kay�p/g, "Kayıp")
    .replace(/Zaman/g, "Zaman")
    .replace(/Zamanlama/g, "Zamanlama")
    .replace(/Fazla/g, "Fazla")
    .replace(/Fakir/g, "Fakir")
    .replace(/Zengin/g, "Zengin")
    .replace(/Kar���m/g, "Karışım")
    .replace(/Oksijen/g, "Oksijen")
    .replace(/Is�t�c�/g, "Isıtıcı")
    .replace(/Is�tma/g, "Isıtma")
    .replace(/Tepki/g, "Tepki")
    .replace(/Yava�/g, "Yavaş")
    .replace(/H�zl�/g, "Hızlı")
    .replace(/D���k/g, "Düşük")
    .replace(/Y�ksek/g, "Yüksek")
    .replace(/Anormal/g, "Anormal")
    .replace(/Normal/g, "Normal")
    .replace(/Ar�za/g, "Arıza")
    .replace(/Ar�zal�/g, "Arızalı")
    .replace(/Hatas�/g, "Hatası")
    .replace(/Sorunu/g, "Sorunu")
    .replace(/Sorun/g, "Sorun")
    .replace(/Problem/g, "Problem")
    .replace(/Ba�ar�s�z/g, "Başarısız")
    .replace(/Ba�lat/g, "Başlat")
    .replace(/Durdur/g, "Durdur")
    .replace(/A�a��/g, "Aşağı")
    .replace(/Yukar�/g, "Yukarı")
    .replace(/Geli�mi�/g, "Gelişmiş")
    .replace(/�zel/g, "Özel")
    .replace(/Genel/g, "Genel")
    .replace(/�retici/g, "Üretici")
    .replace(/K�lt�r/g, "Kültür")
    .replace(/Manifold/g, "Manifold")
    .replace(/Mutlak/g, "Mutlak")
    .replace(/Barometrik/g, "Barometrik")
    .replace(/Emilen/g, "Emilen")
    .replace(/Hava/g, "Hava")
    .replace(/Hacim/g, "Hacim")
    .replace(/�/g, "")
    .replace(/\s+/g, " ")
    .trim();
};

// CSV'yi parse et
let parsedCodes: DTCCode[] = [];
let isInitialized = false;

const initializeCodes = (): void => {
  if (isInitialized) return;
  
  try {
    const lines = dtcCodesRaw.split("\n");
    parsedCodes = lines
      .map((line) => {
        // Format: "P0100,""Açıklama""" veya P0100,"Açıklama"
        const cleanLine = line.trim().replace(/^"|"$/g, "");
        
        // İlk virgülü bul
        const commaIndex = cleanLine.indexOf(",");
        if (commaIndex === -1) return null;
        
        const code = cleanLine.substring(0, commaIndex).trim().toUpperCase();
        let description = cleanLine.substring(commaIndex + 1).trim();
        
        // Çift tırnakları temizle
        description = description.replace(/^""|""$/g, "").replace(/^"|"$/g, "");
        
        // Türkçe karakterleri düzelt
        description = fixTurkishChars(description);
        
        if (!code || !description) return null;
        
        return { code, description };
      })
      .filter((item): item is DTCCode => item !== null && item.code.length > 0);
    
    isInitialized = true;
    console.log(`DTC kodları yüklendi: ${parsedCodes.length} adet`);
  } catch (error) {
    console.error("DTC kodları yüklenirken hata:", error);
    parsedCodes = [];
  }
};

// Tek bir kodun açıklamasını al
export const getDTCDescription = (code: string): string | null => {
  initializeCodes();
  const upperCode = code.toUpperCase().trim();
  const found = parsedCodes.find((dtc) => dtc.code === upperCode);
  return found?.description || null;
};

// Kodları ara (kod veya açıklama içinde)
export const searchDTCCodes = (query: string, limit: number = 10): DTCCode[] => {
  initializeCodes();
  const lowerQuery = query.toLowerCase().trim();
  
  if (!lowerQuery) return [];
  
  return parsedCodes
    .filter(
      (dtc) =>
        dtc.code.toLowerCase().includes(lowerQuery) ||
        dtc.description.toLowerCase().includes(lowerQuery)
    )
    .slice(0, limit);
};

// Tüm kodları al
export const getAllDTCCodes = (): DTCCode[] => {
  initializeCodes();
  return parsedCodes;
};

// Kod geçerli mi kontrol et
export const isValidDTCCode = (code: string): boolean => {
  initializeCodes();
  const upperCode = code.toUpperCase().trim();
  return parsedCodes.some((dtc) => dtc.code === upperCode);
};

// Birden fazla kodun açıklamalarını al
export const getDTCDescriptions = (codes: string[]): Map<string, string> => {
  initializeCodes();
  const result = new Map<string, string>();
  
  codes.forEach((code) => {
    const desc = getDTCDescription(code);
    if (desc) {
      result.set(code.toUpperCase(), desc);
    }
  });
  
  return result;
};
