interface ServiceItem {
  id: number;
  grup: string;
  altGrup: string;
  parca: string;
  stokKodu: string;
  aciklama: string;
}

export const parseServiceData = (csvText: string): ServiceItem[] => {
  const lines = csvText.split('\n').slice(1); // Skip header
  const items: ServiceItem[] = [];

  lines.forEach((line) => {
    if (!line.trim()) return;
    
    // Parse CSV line accounting for commas in quoted strings
    const matches = line.match(/,([^,]+),([^,]+),([^,]+),([^,]+),"([^"]+)"/);
    if (matches) {
      items.push({
        id: items.length + 1,
        grup: matches[1].trim(),
        altGrup: matches[2].trim(),
        parca: matches[3].trim(),
        stokKodu: matches[4].trim(),
        aciklama: matches[5].trim(),
      });
    }
  });

  return items;
};

export const getServiceGroups = (items: ServiceItem[]): string[] => {
  return [...new Set(items.map(item => item.grup))];
};

export const getServiceSubGroups = (items: ServiceItem[], grup: string): string[] => {
  return [...new Set(items.filter(item => item.grup === grup).map(item => item.altGrup))];
};

export const getServiceParts = (items: ServiceItem[], grup: string, altGrup: string): string[] => {
  return [...new Set(items.filter(item => item.grup === grup && item.altGrup === altGrup).map(item => item.parca))];
};

export const getServiceItems = (items: ServiceItem[], grup: string, altGrup: string, parca: string): ServiceItem[] => {
  return items.filter(item => item.grup === grup && item.altGrup === altGrup && item.parca === parca);
};
