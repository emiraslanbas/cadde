#!/bin/bash
# Bu dosyaya çift tıklayınca Cadde telefonunda açılmaya hazır hale gelir.
cd "$(dirname "$0")" || exit 1

echo ""
echo "  Cadde başlatılıyor..."
echo ""

if ! command -v node >/dev/null 2>&1; then
  echo "  Node.js bulunamadı."
  echo "  https://nodejs.org adresinden LTS sürümünü indirip kur,"
  echo "  sonra bu dosyaya tekrar çift tıkla."
  echo ""
  read -r -p "  Kapatmak için Enter'a bas. "
  exit 1
fi

# Paket listesi değiştiyse (ör. Expo sürümü yükseltildiyse) eksikleri indir.
if [ ! -f node_modules/.package-lock.json ] || [ package-lock.json -nt node_modules/.package-lock.json ]; then
  echo "  Gerekli paketler indiriliyor (birkaç dakika sürebilir)..."
  echo ""
  npm install --no-audit --no-fund --legacy-peer-deps || { read -r -p "  Kurulum başarısız oldu. Kapatmak için Enter'a bas. "; exit 1; }
fi

echo ""
echo "  Birazdan ekranda bir QR kodu çıkacak."
echo "  iPhone'unda Kamera uygulamasıyla bu QR kodunu okut, açılan bağlantıya dokun."
echo "  Tünel modu açık: telefon ve bilgisayar farklı ağlarda da olabilir."
echo "  Durdurmak için bu pencerede Control + C tuşlarına bas."
echo ""

# Başka bir Expo projesi 8081'i kullanıyorsa boş bir port seç.
PORT=8081
while lsof -nP -iTCP:"$PORT" -sTCP:LISTEN >/dev/null 2>&1; do
  PORT=$((PORT + 1))
done

npx expo start --tunnel --port "$PORT"
