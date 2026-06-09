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
