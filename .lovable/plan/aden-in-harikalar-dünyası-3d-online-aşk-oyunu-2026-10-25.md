# Aden'in Harikalar Dünyası — 3D Online Aşk Oyunu

## Oyuncunun göreceği şey
1. **Giriş ekranı**: Pembe-mor romantik arka plan, "Aden'in Harikalar Dünyası" başlığı, kullanıcı adı kutusu, cinsiyet seçimi (Erkek / Kadın) ve "Aşk Dünyasına Gir" butonu.
2. **Yatay ekran zorunluluğu**: Telefon dik tutulursa "Telefonunu yan çevir" uyarısı çıkar, oyuna girilemez. Oyun 16:9 yatay ekrana göre tasarlanır.
3. **Küçük 3D dünya**: Pembe-mor çimenli küçük bir ada; kalp ağaçları, pembe çiçekler, kalpli fenerler, küçük bir köprü, gölet, kalp şeklinde çeşme, salıncak, uçuşan kalp parçacıkları, gün batımı gökyüzü.
4. **Karakterler**: Erkek seçen erkek, kadın seçen kadın karakterle girer (hazır ücretsiz animasyonlu karakter modelleri: yürüme, koşma, zıplama, bekleme). Her oyuncunun başında kullanıcı adı yazar.
5. **Online**: Aynı anda giren herkes aynı dünyada birbirini görür ve hareketlerini canlı izler.
6. **Mobil kontroller**: Sol altta joystick (yürüme), sağ altta Zıpla butonu, ekranı sağ tarafta kaydırarak kamera çevirme. Bilgisayarda WASD + Boşluk da çalışır.
7. **Notlar ve mektuplar**: Dünyaya dağılmış parlayan minik notlar ("Aden Never'ı çok seviyor", "Sen benim her şeyimsin" vb.) ve zarflar. Yaklaşınca "Oku" butonu çıkar, mektup güzel bir kâğıt görünümünde açılır. Toplanan notlar sayacı.
8. **Ekstralar**: Diğer oyuncuya kalp gönderme butonu (karakterin üstünde kalp uçar), emoji tepkileri (😍 💋 🌹), salıncakta oturma, gizli bir "aşk notu" bulmacası.
9. **Müzik**: Hafif romantik arka plan müziği; sağ üstte ses aç/kapat butonu.

## Sıfır kasma için önlemler
- Düşük poligonlu, hafif modeller; tek seferlik yükleme ekranı.
- Ekran çözünürlüğü telefona göre sınırlandırılır, gölgeler basit ve tek ışık.
- Tekrarlanan objeler (çiçek, ağaç) tek seferde çizilir.
- Online konum bilgisi saniyede ~10 kez gönderilir, diğer oyuncular arada yumuşak kaydırılır — internet yavaş olsa da akıcı görünür.
- Ağır efekt/filtre kullanılmaz.

## Online altyapı
- Lovable Cloud açılır (veritabanı + canlı bağlantı). Hesap/şifre yok; sadece kullanıcı adı ve cinsiyet ile anlık giriş.
- Herkes tek bir ortak dünya odasına bağlanır; çıkan oyuncu dünyadan kaybolur.

## Teknik detaylar
- React Three Fiber + drei, oyun sayfası sadece tarayıcıda çalışır.
- Karakterler: Quaternius/Kenney CC0 animasyonlu GLB modelleri (erkek/kadın).
- Çok oyunculu: Cloud Realtime kanalı (presence ile oyuncu listesi, broadcast ile konum/kalp/emoji), ~10Hz gönderim, istemci tarafında interpolasyon. Veritabanı tablosu gerekmez.
- Müzik: telifsiz hafif loop ses dosyası, ilk dokunuşta başlar; ses tercihi cihazda hatırlanır.
- Yatay kilit: ekran oranı kontrolü + mümkünse tam ekran ve yön kilidi.
- Sayfa başlığı ve paylaşım metinleri "Aden'in Harikalar Dünyası" olarak ayarlanır.
