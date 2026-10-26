// Saf kod tabanlı procedural karakterler kullanıldığı için dosya indirme gerekmez
export function preloadAllCharacters(): void {
  // Sıfır gecikmeli procedural modeller anında hazırdır
}

export function loadCharacterModel(_model: string): Promise<any> {
  return Promise.resolve({ scene: null, animations: [] });
}
