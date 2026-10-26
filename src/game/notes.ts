export type Note = { x: number; z: number; title: string; text: string; letter?: boolean };

export const NOTES: Note[] = [
  { x: 14.5, z: 6.0, title: "1. Not", text: "Aden Never'ı çok seviyor 💗" },
  { x: 14.5, z: 7.0, title: "2. Not", text: "Sen benim her şeyimsin." },
  { x: 14.5, z: 8.0, title: "3. Mektup", letter: true, text: "Sevgili Never,\n\nBu dünyadaki her çiçek, her kalp, her ışık senin için. Seninle geçen her gün bir masal gibi. Gülüşün bu adanın güneşi.\n\nSonsuza dek seninle,\nAden 💌" },
  { x: 14.5, z: 9.0, title: "4. Not", text: "Aden Never'ı çok seviyor, hem de çoook! 💞" },
  { x: 14.5, z: 10.0, title: "5. Not", text: "Kalbim hep seninle atıyor." },
  { x: 14.5, z: 11.0, title: "6. Not", text: "Seninle her yer harikalar diyarı ✨" },
  { x: 14.5, z: 12.0, title: "7. Mektup", letter: true, text: "Never'a,\n\nYıldızları saymaya kalksam, seni ne kadar sevdiğimi anlatmaya yetmez. Bu küçük dünyayı, sana olan sevgimin küçük bir parçası olarak yaptım.\n\nAden 🌹" },
  { x: 14.5, z: 13.0, title: "8. Not", text: "Her sabah ilk düşüncem sensin." },
  { x: 14.5, z: 14.0, title: "9. Not", text: "Aden + Never = Sonsuz 💜" },
  { x: 14.5, z: 15.0, title: "10. Not", text: "Elini tutmak dünyanın en güzel hissi." },
];

export const SECRET_NOTE: Note = {
  x: 12.8,
  z: 10.5,
  title: "Gizli Mektup",
  letter: true,
  text: "Tüm notları buldun! 🎉\n\nArtık sırrı biliyorsun: Bu dünyanın adı Aden'in Harikalar Dünyası, ama kalbi Never.\n\nSeni seviyorum. Bugün, yarın ve her zaman.\n\nAden 💗",
};

export const SECRET_INDEX = NOTES.length;
