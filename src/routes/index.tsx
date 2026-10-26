import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { local, uiStore, type Gender } from "@/game/store";
import { startMusic } from "@/game/music";
import { FEMALE_CHARACTERS, MALE_CHARACTERS, type CharacterOption } from "@/game/characterCatalog";
import { requestFullScreenSafely } from "@/game/fullscreen";

const Game = lazy(() => import("@/game/Game"));
const CharacterPreview = lazy(() =>
  import("@/game/CharacterPreview").then((m) => ({ default: m.CharacterPreview }))
);

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Aden'in Harikalar Dünyası — Online 3D Aşk Oyunu" },
      { name: "description", content: "Pembe-mor küçük bir aşk dünyasında arkadaşınla buluş, notları topla, kalp gönder." },
      { property: "og:title", content: "Aden'in Harikalar Dünyası" },
      { property: "og:description", content: "Online 3D aşk oyunu: aynı dünyada buluş, notları topla, kalp gönder." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function generateUUID(): string {
  try {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
  } catch {
    /* fallback */
  }
  return "u-" + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
}

function usePortrait() {
  const [p, setP] = useState(false);
  useEffect(() => {
    const f = () => {
      const isPortrait = window.innerHeight > window.innerWidth;
      setP(isPortrait);
      if (!isPortrait) {
        window.scrollTo(0, 0);
      }
    };
    f();
    window.addEventListener("resize", f);
    window.addEventListener("orientationchange", f);
    return () => {
      window.removeEventListener("resize", f);
      window.removeEventListener("orientationchange", f);
    };
  }, []);
  return p;
}

function RotateOverlay({ onTouch }: { onTouch?: () => void }) {
  return (
    <div
      onClick={onTouch}
      className="lobby-bg fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 p-6 text-center cursor-pointer select-none"
    >
      <div className="rotate-phone text-6xl">📱</div>
      <h2 className="font-display text-2xl sm:text-3xl text-primary font-bold">Telefonunu yan çevir</h2>
      <p className="text-muted-foreground text-sm max-w-xs">
        Aden'in Masal Dünyası sadece yatay ekranda oynanır 💗
      </p>
      <span className="text-xs text-pink-600/90 mt-1 bg-white/80 px-3 py-1 rounded-full border border-pink-200 shadow-sm">
        Yan çevirip ekrana dokun
      </span>
    </div>
  );
}

function Index() {
  const portrait = usePortrait();
  const [entered, setEntered] = useState(false);
  const [name, setName] = useState("");
  const [gender, setGender] = useState<Gender>("female");
  const [model, setModel] = useState<string>("aden_princess");
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    // Siteye girildiği an tüm karakter modellerini arka planda indirip önbelleğe al
    import("@/game/characterLoader").then((m) => m.preloadAllCharacters());

    setName(localStorage.getItem("aden-name") ?? "");
    const g = localStorage.getItem("aden-gender");
    if (g === "male" || g === "female") {
      setGender(g);
      const savedModel = localStorage.getItem("aden-model");
      const list = g === "male" ? MALE_CHARACTERS : FEMALE_CHARACTERS;
      if (savedModel && list.some((c) => c.id === savedModel)) {
        setModel(savedModel);
      } else {
        setModel(list[0]!.id);
      }
    } else {
      setGender("female");
      setModel(FEMALE_CHARACTERS[0]!.id);
    }

    const handleFirstTouch = () => {
      if (window.innerWidth > window.innerHeight) {
        requestFullScreenSafely();
      }
    };
    window.addEventListener("pointerdown", handleFirstTouch, { passive: true });
    return () => {
      window.removeEventListener("pointerdown", handleFirstTouch);
    };
  }, []);

  const handleGenderChange = (g: Gender) => {
    setGender(g);
    const list = g === "male" ? MALE_CHARACTERS : FEMALE_CHARACTERS;
    setModel(list[0]!.id);
  };

  const characterList: CharacterOption[] = gender === "male" ? MALE_CHARACTERS : FEMALE_CHARACTERS;
  const currentIndex = characterList.findIndex((c) => c.id === model);
  const currentOption = characterList[currentIndex >= 0 ? currentIndex : 0]!;

  const goNext = () => {
    const nextIdx = (currentIndex + 1) % characterList.length;
    setModel(characterList[nextIdx]!.id);
  };

  const goPrev = () => {
    const prevIdx = (currentIndex - 1 + characterList.length) % characterList.length;
    setModel(characterList[prevIdx]!.id);
  };

  const enter = async () => {
    if (!name.trim() || !gender) return;
    try {
      localStorage.setItem("aden-name", name.trim());
      localStorage.setItem("aden-gender", gender);
      localStorage.setItem("aden-model", model);
    } catch {}

    local.id = generateUUID();
    local.pos = { x: (Math.random() - 0.5) * 4, y: 0, z: 8 };
    local.name = name.trim();
    local.gender = gender;
    local.characterModel = model;

    // Varsayılan olarak müzik kapalı başlasın
    let muted = true;
    try {
      muted = localStorage.getItem("aden-muted") === "0" ? false : true;
    } catch {}
    let read: number[] = [];
    try {
      read = JSON.parse(localStorage.getItem("aden-read") ?? "[]");
    } catch {}
    let volume = 0.35;
    try {
      const vs = Number(localStorage.getItem("aden-volume") ?? "0.35");
      volume = Number.isFinite(vs) ? vs : 0.35;
    } catch {}

    uiStore.set({ muted, volume, readNotes: read });
    try {
      startMusic(muted, volume);
    } catch {}

    requestFullScreenSafely();

    try {
      if (screen.orientation && (screen.orientation as any).lock) {
        await (screen.orientation as any).lock("landscape");
      }
    } catch {
      /* not supported, fine */
    }
    setEntered(true);
  };

  if (portrait) return <RotateOverlay onTouch={requestFullScreenSafely} />;

  if (entered)
    return (
      <Suspense
        fallback={
          <div className="lobby-bg fixed inset-0 flex items-center justify-center font-display text-2xl text-primary">
            Aşk dünyası yükleniyor... 💗
          </div>
        }
      >
        <Game />
      </Suspense>
    );

  return (
    <main className="lobby-bg fixed inset-0 flex items-center justify-center p-2 sm:p-4 select-none overflow-hidden">

      {/* Tam Ekran Düğmesi (Sağ Üst) */}
      <button
        type="button"
        onClick={requestFullScreenSafely}
        className="absolute top-2 right-2 z-20 flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/85 hover:bg-white text-xs font-bold text-pink-600 shadow-sm border border-pink-200 transition-all cursor-pointer backdrop-blur-sm active:scale-95"
      >
        <span>⛶</span>
        <span>Tam Ekran</span>
      </button>

      <div className="lobby-card relative w-full max-w-xl sm:max-w-2xl my-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-4 items-center">
          {/* Sol Kolon: Karakter Önizleme Sahnesi */}
          <div className="relative rounded-2xl bg-gradient-to-b from-white/80 to-pink-50/70 p-2 backdrop-blur-md border border-pink-200 flex flex-col items-center">
            {/* Karakter 3D Sahnesi ve Yan Oklar */}
            <div className="relative w-full h-44 sm:h-52 flex items-center justify-center overflow-hidden">
              <button
                type="button"
                className="hud-round absolute left-1 z-10 size-7 sm:size-8 cursor-pointer shadow-md hover:scale-110 active:scale-95 transition-transform"
                onClick={goPrev}
                aria-label="Önceki Model"
              >
                <ChevronLeft className="size-4 sm:size-5 text-pink-600" />
              </button>

              {isClient ? (
                <Suspense
                  fallback={
                    <div className="h-44 sm:h-52 w-full flex items-center justify-center font-display text-xs text-primary animate-pulse">
                      Yükleniyor... 🌸
                    </div>
                  }
                >
                  <CharacterPreview model={model} />
                </Suspense>
              ) : (
                <div className="h-44 sm:h-52 w-full flex items-center justify-center text-3xl">🌸</div>
              )}

              <button
                type="button"
                className="hud-round absolute right-1 z-10 size-7 sm:size-8 cursor-pointer shadow-md hover:scale-110 active:scale-95 transition-transform"
                onClick={goNext}
                aria-label="Sonraki Model"
              >
                <ChevronRight className="size-4 sm:size-5 text-pink-600" />
              </button>
            </div>

            {/* Seçili Karakter İsim Rozeti */}
            <div className="mt-0.5 flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-0.5 shadow-sm border border-pink-200">
              <span className="text-sm">{currentOption.emoji}</span>
              <span className="font-display font-bold text-gray-800 text-xs">{currentOption.name}</span>
            </div>

            {/* Hızlı Kostüm Seçim İkon Barı */}
            <div className="mt-1 flex items-center justify-center gap-1 w-full overflow-x-auto py-0.5">
              {characterList.map((c) => {
                const isSelected = model === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setModel(c.id)}
                    title={c.name}
                    className={`flex size-6 sm:size-7 items-center justify-center rounded-lg text-xs sm:text-sm transition-all cursor-pointer ${
                      isSelected
                        ? "bg-pink-500 text-white shadow-md ring-2 ring-pink-300 scale-105"
                        : "bg-white/90 text-gray-700 hover:bg-pink-100/80 hover:scale-105 border border-pink-100"
                    }`}
                  >
                    {c.emoji}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sağ Kolon: Başlık, İsim, Cinsiyet, Giriş Butonu */}
          <div className="flex flex-col gap-2 justify-center">
            {/* Başlık */}
            <div className="text-center sm:text-left">
              <div className="inline-flex items-center gap-1.5 justify-center sm:justify-start">
                <span className="heart-beat text-xl">💗</span>
                <h1 className="font-display text-lg sm:text-xl text-primary font-bold">
                  Aden'in Masal Dünyası
                </h1>
              </div>
            </div>

            {/* İsim Girişi */}
            <div>
              <label className="text-[10px] font-bold text-pink-700/80 mb-0.5 block px-1 tracking-wider">
                KULLANICI ADIN
              </label>
              <input
                className="love-input w-full"
                placeholder="İsmini yaz..."
                maxLength={14}
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && enter()}
              />
            </div>

            {/* Cinsiyet Seçimi */}
            <div>
              <label className="text-[10px] font-bold text-pink-700/80 mb-0.5 block px-1 tracking-wider">
                CİNSİYET
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  className="gender-btn cursor-pointer flex items-center justify-center gap-1"
                  data-active={gender === "male"}
                  onClick={() => handleGenderChange("male")}
                >
                  <span>👦 Erkek</span>
                </button>
                <button
                  type="button"
                  className="gender-btn cursor-pointer flex items-center justify-center gap-1"
                  data-active={gender === "female"}
                  onClick={() => handleGenderChange("female")}
                >
                  <span>👧 Kadın</span>
                </button>
              </div>
            </div>

            {/* Giriş Butonu */}
            <button
              className="btn-love w-full cursor-pointer mt-1 flex items-center justify-center gap-2"
              disabled={!name.trim() || !gender}
              onClick={enter}
            >
              <span>Masal Dünyasına Gir</span>
              <span>💞</span>
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
