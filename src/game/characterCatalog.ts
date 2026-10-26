export type HairStyle =
  | "princess_bow"    // Uzun dalgalı saç + büyük tatlı kurdele
  | "cat_ears"        // Sevimli kedi kulakları + leylak saç
  | "pastel_braids"   // İki yandan örgülü saçlar + papatya tokalar
  | "street_headband" // Havalı saç bandı + omuzda saç
  | "witch_hat"       // Yıldız tokalı peri şapkası + lüleli saç
  | "anime_messy"     // Dağınık havalı anime saçları + kolye
  | "hoodie_cap"      // Ters cap şapka + boyunda kulaklık
  | "slick_prince"    // Asil yandan taranmış saç + fular
  | "sport_band"      // Alında spor bandı + dinamik saç
  | "cyber_spiky";    // Fütüristik neon vizör / güneş gözlüğü + sivri anime saçı

export type OutfitStyle =
  | "princess_dress"  // Fırfırlı pembe masal prensesi elbisesi
  | "neko_sweater"    // Pelüş leylak kazak + mini mor pileli etek
  | "pastel_overalls" // Şeftali crop top + lavanta moru tulum
  | "street_jacket"   // Pembe-mor kolej ceketi + tenis eteği
  | "witch_robe"      // Mor büyücü cübbesi + pelerin
  | "classic_tee"     // Havalı mor tişört + füme kot pantolon
  | "hoodie_street"   // Oversize mor hoodie + kargo pantolon
  | "royal_vest"      // Beyaz gömlek üstüne asil mor yelek
  | "sport_jacket"    // Mor fermuarlı spor ceket + eşofman
  | "cyber_coat";     // Neon mor detaylı ceket + deri pantolon

export type CharacterOption = {
  id: string;
  name: string;
  gender: "female" | "male";
  emoji: string;
  description: string;
  hairStyle: HairStyle;
  hairColor: string;
  skinColor: string;
  eyeColor: string;
  blushColor: string;
  outfitStyle: OutfitStyle;
  primaryColor: string;   // Elbise / Tişört / Ceket ana rengi
  secondaryColor: string; // Etek / Pantolon / Detay rengi
  accentColor: string;    // Kurdele / Şerit / Düğme rengi
  shoeColor: string;      // Ayakkabı rengi
};

// -------------------------------------------------------------
// 5 FARKLI KIZ MODELİ (Pembe, Mor, Pastel, Şirin ve Tatlı)
// -------------------------------------------------------------
export const FEMALE_CHARACTERS: CharacterOption[] = [
  {
    id: "aden_princess",
    name: "Aden (Masal Prensesi)",
    gender: "female",
    emoji: "🌸",
    description: "Pudra pembe fırfırlı elbise, leylak kurdele ve tatlı allıklar",
    hairStyle: "princess_bow",
    hairColor: "#6c2e22",      // Tatlı sıcak kestane
    skinColor: "#ffd9c8",      // Doğal ipeksi açık ten
    eyeColor: "#3b1d38",       // Büyük parıltılı anime gözü
    blushColor: "#fb7185",     // Pembe yanak allığı
    outfitStyle: "princess_dress",
    primaryColor: "#f472b6",   // Pudra pembe elbise
    secondaryColor: "#fff1f2", // Fırfır etek uçları
    accentColor: "#c084fc",    // Leylak kurdele ve fiyonk
    shoeColor: "#ec4899",      // Şirin pembe babetler
  },
  {
    id: "girl_cat",
    name: "Kedi Kız (Neko Chibi)",
    gender: "female",
    emoji: "🐱",
    description: "Mor-pembe kedi kulakları, pelüş leylak kazak ve sevimli mini etek",
    hairStyle: "cat_ears",
    hairColor: "#c084fc",      // Pastel leylak saç
    skinColor: "#fde2d4",
    eyeColor: "#581c87",       // Kedi moru gözler
    blushColor: "#f472b6",
    outfitStyle: "neko_sweater",
    primaryColor: "#a855f7",   // Pelüş mor kazak
    secondaryColor: "#6b21a8", // Mor mini pileli etek
    accentColor: "#f472b6",    // Pembe iç kulak ve pati detayı
    shoeColor: "#f472b6",      // Pembe pati ayakkabılar
  },
  {
    id: "girl_pastel",
    name: "Pastel Gezgin",
    gender: "female",
    emoji: "🌿",
    description: "Lavanta moru tulum, şeftali crop top ve tatlı sırt çantası",
    hairStyle: "pastel_braids",
    hairColor: "#d97706",      // Tatlı karamel bal rengi saç
    skinColor: "#fde2d4",
    eyeColor: "#1e1b4b",
    blushColor: "#fb7185",
    outfitStyle: "pastel_overalls",
    primaryColor: "#c084fc",   // Lavanta tulum
    secondaryColor: "#fdba74", // Şeftali crop top
    accentColor: "#f43f5e",    // Sırt çantası ve papatya tokalar
    shoeColor: "#ffffff",      // Beyaz sneaker
  },
  {
    id: "girl_street",
    name: "Sokak Modası",
    gender: "female",
    emoji: "🎧",
    description: "Oversize kolej ceketi, pembe saç bandı ve DJ kulaklıkları",
    hairStyle: "street_headband",
    hairColor: "#1e1b4b",      // Gece mavisi/siyah saç
    skinColor: "#fed7aa",
    eyeColor: "#0f172a",
    blushColor: "#f472b6",
    outfitStyle: "street_jacket",
    primaryColor: "#db2777",   // Pembe kolej ceketi
    secondaryColor: "#fdf2f8", // Beyaz pileli tenis eteği
    accentColor: "#a855f7",    // Mor kollar ve DJ kulaklığı
    shoeColor: "#ec4899",      // Pembe-beyaz chunky sneaker
  },
  {
    id: "girl_witch",
    name: "Akademi Büyücüsü",
    gender: "female",
    emoji: "✨",
    description: "Altın yıldızlı mor peri şapkası, pembe pelerin ve yıldızlı elbise",
    hairStyle: "witch_hat",
    hairColor: "#f472b6",      // Şeker pembesi lüleler
    skinColor: "#fce7f3",
    eyeColor: "#6b21a8",
    blushColor: "#fb7185",
    outfitStyle: "witch_robe",
    primaryColor: "#7e22ce",   // Kraliyet moru büyücü elbisesi
    secondaryColor: "#db2777", // Arkada pembe peri pelerini
    accentColor: "#facc15",    // Parlayan altın sarısı yıldız tokalar
    shoeColor: "#3b0764",      // Mor bağcıklı botlar
  },
];

// -------------------------------------------------------------
// 5 FARKLI ERKEK MODELİ (Karizmatik, Havalı, Yakışıklı Never)
// -------------------------------------------------------------
export const MALE_CHARACTERS: CharacterOption[] = [
  {
    id: "never_classic",
    name: "Never (Klasik)",
    gender: "male",
    emoji: "⭐",
    description: "Havalı dağınık anime saçları, mor tişört ve koyu kot pantolon",
    hairStyle: "anime_messy",
    hairColor: "#2e1065",      // Koyu mor-siyah dağınık anime saçı
    skinColor: "#fed7aa",
    eyeColor: "#1e1b4b",
    blushColor: "transparent",
    outfitStyle: "classic_tee",
    primaryColor: "#9333ea",   // Karizmatik mor tişört
    secondaryColor: "#1e293b", // Koyu füme kot pantolon
    accentColor: "#cbd5e1",    // Gümüş kolye zinciri
    shoeColor: "#ffffff",      // Beyaz sokak sneakerı
  },
  {
    id: "boy_hoodie",
    name: "Sokak Dansçısı",
    gender: "male",
    emoji: "🧢",
    description: "Oversize mor hoodie, boyunda kulaklık ve ters takılmış cap şapka",
    hairStyle: "hoodie_cap",
    hairColor: "#1c1917",      // Siyah saç
    skinColor: "#fed7aa",
    eyeColor: "#0f172a",
    blushColor: "transparent",
    outfitStyle: "hoodie_street",
    primaryColor: "#7c3aed",   // Mor oversize hoodie
    secondaryColor: "#0f172a", // Siyah bol kargo pantolon
    accentColor: "#ec4899",    // Pembe ters takılmış cap şapka
    shoeColor: "#a855f7",      // Mor-beyaz yüksek sneaker
  },
  {
    id: "boy_prince",
    name: "Zarif Prens",
    gender: "male",
    emoji: "👑",
    description: "Beyaz gömlek üstüne asil mor yelek, altın düğmeler ve şık duruş",
    hairStyle: "slick_prince",
    hairColor: "#78350f",      // Asil açık kahve yandan taranmış saç
    skinColor: "#fef3c7",
    eyeColor: "#1e1b4b",
    blushColor: "transparent",
    outfitStyle: "royal_vest",
    primaryColor: "#6b21a8",   // Kraliyet moru yelek
    secondaryColor: "#312e81", // Asil lacivert kumaş pantolon
    accentColor: "#facc15",    // Altın sarısı düğmeler ve mor fular
    shoeColor: "#18181b",      // Parlak şık kundura
  },
  {
    id: "boy_sport",
    name: "Sportif Atlet",
    gender: "male",
    emoji: "⚡",
    description: "Fermuarlı mor spor ceket, spor saç bandı ve enerjik duruş",
    hairStyle: "sport_band",
    hairColor: "#3f3f46",      // Koyu füme saç
    skinColor: "#fed7aa",
    eyeColor: "#18181b",
    blushColor: "transparent",
    outfitStyle: "sport_jacket",
    primaryColor: "#9333ea",   // Mor spor fermuarlı ceket
    secondaryColor: "#18181b", // Siyah dar paça spor eşofman
    accentColor: "#f43f5e",    // Neon pembe kafa bandı ve şeritler
    shoeColor: "#f43f5e",      // Neon pembe koşu ayakkabısı
  },
  {
    id: "boy_cyber",
    name: "Cyber Gamer",
    gender: "male",
    emoji: "🎮",
    description: "Neon mor çizgili ceket, fütüristik vizör gözlük ve gümüş sivri saçlar",
    hairStyle: "cyber_spiky",
    hairColor: "#e2e8f0",      // Platin gümüş sivri anime saçları
    skinColor: "#fed7aa",
    eyeColor: "#06b6d4",
    blushColor: "transparent",
    outfitStyle: "cyber_coat",
    primaryColor: "#09090b",   // Siyah teknolojik ceket
    secondaryColor: "#18181b", // Deri detaylı pantolon
    accentColor: "#06b6d4",    // Parlayan neon camgöbeği vizör ve mor LED
    shoeColor: "#06b6d4",      // Neon tabanlı LED sneaker
  },
];

export function getCharacterOption(id?: string): CharacterOption {
  const all = [...FEMALE_CHARACTERS, ...MALE_CHARACTERS];
  // Eski legacy model id'leri için kusursuz eşleştirme
  if (!id || id === "Casual_Female" || id.includes("Female")) {
    const match = all.find((c) => c.id === id);
    return match || FEMALE_CHARACTERS[0]!;
  }
  if (id === "Casual_Male" || id.includes("Male")) {
    const match = all.find((c) => c.id === id);
    return match || MALE_CHARACTERS[0]!;
  }
  const match = all.find((c) => c.id === id);
  return match || FEMALE_CHARACTERS[0]!;
}
