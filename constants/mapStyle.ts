// Android (Google Haritalar) için gece görünümü. iOS'ta Apple Haritalar'ın kendi koyu modu kullanılır.
export const DARK_MAP_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#1a1b22' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#8b8b96' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0a0a0d' }] },
  { featureType: 'administrative', elementType: 'geometry', stylers: [{ color: '#2a2b33' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#2b2d36' }] },
  { featureType: 'road', elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#363947' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0e1626' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#3d4a63' }] },
];
