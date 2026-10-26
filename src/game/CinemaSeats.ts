export type CinemaSeatData = {
  id: string; // e.g. "cinema-seat-1"
  name: string;
  x: number;
  y: number;
  z: number;
  rot: number; // facing angle
  row: number;
  col: number;
};

// 10 adet amfitiyatro koltuğu (2 sıra, her sırada 5 koltuk, ekrana z=34'e dönük - ferah görüş mesafesi)
export const CINEMA_SEATS: CinemaSeatData[] = [
  // 1. Sıra (Ön sıra, y = 0.0, z = 22.0)
  { id: "cinema-seat-1", name: "1. Koltuk (Ön Sıra)", x: -4.0, y: 0.0, z: 22.0, rot: 0, row: 1, col: 1 },
  { id: "cinema-seat-2", name: "2. Koltuk (Ön Sıra)", x: -2.0, y: 0.0, z: 22.0, rot: 0, row: 1, col: 2 },
  { id: "cinema-seat-3", name: "3. Koltuk (Ön Sıra)", x:  0.0, y: 0.0, z: 22.0, rot: 0, row: 1, col: 3 },
  { id: "cinema-seat-4", name: "4. Koltuk (Ön Sıra)", x:  2.0, y: 0.0, z: 22.0, rot: 0, row: 1, col: 4 },
  { id: "cinema-seat-5", name: "5. Koltuk (Ön Sıra)", x:  4.0, y: 0.0, z: 22.0, rot: 0, row: 1, col: 5 },

  // 2. Sıra (Arka sıra, hafif basamaklı yükseltilmiş, y = 0.35, z = 18.0)
  { id: "cinema-seat-6",  name: "6. Koltuk (Arka Sıra)", x: -4.0, y: 0.35, z: 18.0, rot: 0, row: 2, col: 1 },
  { id: "cinema-seat-7",  name: "7. Koltuk (Arka Sıra)", x: -2.0, y: 0.35, z: 18.0, rot: 0, row: 2, col: 2 },
  { id: "cinema-seat-8",  name: "8. Koltuk (Arka Sıra)", x:  0.0, y: 0.35, z: 18.0, rot: 0, row: 2, col: 3 },
  { id: "cinema-seat-9",  name: "9. Koltuk (Arka Sıra)", x:  2.0, y: 0.35, z: 18.0, rot: 0, row: 2, col: 4 },
  { id: "cinema-seat-10", name: "10. Koltuk (Arka Sıra)", x: 4.0, y: 0.35, z: 18.0, rot: 0, row: 2, col: 5 },
];

export const cinemaSeatSitters = new Map<string, string | null>();

export function onRemoteCinemaSeat(seatId: string, action: "sit" | "leave", playerId: string) {
  if (action === "sit") {
    cinemaSeatSitters.set(seatId, playerId);
  } else {
    cinemaSeatSitters.delete(seatId);
  }
}
