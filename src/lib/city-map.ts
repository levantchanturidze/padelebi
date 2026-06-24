const KA_TO_EN: Record<string, string> = {
  "თბილისი": "Tbilisi",
  "ბათუმი": "Batumi",
  "ქუთაისი": "Kutaisi",
  "რუსთავი": "Rustavi",
  "გორი": "Gori",
  "ზუგდიდი": "Zugdidi",
  "ფოთი": "Poti",
  "ხაშური": "Khashuri",
  "სამტრედია": "Samtredia",
  "სენაკი": "Senaki",
  "ზესტაფონი": "Zestaponi",
  "მარნეული": "Marneuli",
  "თელავი": "Telavi",
  "ახალქალაქი": "Akhalkalaki",
  "ახალციხე": "Akhaltsikhe",
  "ოზურგეთი": "Ozurgeti",
  "ამბროლაური": "Ambrolauri",
  "ლანჩხუთი": "Lanchkhuti",
  "ბოლნისი": "Bolnisi",
  "კასპი": "Kaspi",
  "მცხეთა": "Mtskheta",
  "სიღნაღი": "Sighnaghi",
  "დედოფლისწყარო": "Dedoplistsqaro",
  "გარდაბანი": "Gardabani",
  "საჩხერე": "Sachkhere",
  "ჩოხატაური": "Chokhatauri",
  "ხობი": "Khobi",
  "წყალტუბო": "Tsqaltubo",
  "ვანი": "Vani",
  "ბაღდათი": "Baghdati",
  "თერჯოლა": "Terjola",
};

/** Returns the English city name if the input is Georgian, otherwise returns the input as-is. */
export function normalizeCity(input: string): string {
  const trimmed = input.trim();
  return KA_TO_EN[trimmed] ?? trimmed;
}

/**
 * City centroids — [longitude, latitude]. Used to auto-pan the venues map
 * when a city filter is applied. Keys match `normalizeCity()` output.
 */
export const CITY_CENTROIDS: Record<string, [number, number]> = {
  Tbilisi: [44.7833, 41.7167],
  Batumi:  [41.6366, 41.65],
  Kutaisi: [42.7000, 42.2667],
  Rustavi: [44.9939, 41.5436],
  Gori:    [44.1133, 41.9847],
  Zugdidi: [41.8717, 42.5089],
  Poti:    [41.6717, 42.1500],
  Telavi:  [45.4736, 41.9197],
  Mtskheta:[44.7178, 41.8456],
  Sighnaghi:[45.9203, 41.6189],
};

/** Resolve a city query to a [lng, lat] centroid, or null if unknown. */
export function cityCentroid(input: string | undefined): [number, number] | null {
  if (!input) return null;
  return CITY_CENTROIDS[normalizeCity(input)] ?? null;
}

/** Default map view when no city is selected — Georgia bbox center. */
export const GEORGIA_CENTER: [number, number] = [43.5, 42.0];
export const GEORGIA_DEFAULT_ZOOM = 6.5;
