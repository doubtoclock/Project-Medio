const haversine = (a: any, b: any) => {
  const R = 6371;
  const dLat = (b.lat - a.lat) * Math.PI / 180;
  const dLng = (b.lng - a.lng) * Math.PI / 180;

  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a.lat * Math.PI / 180) *
    Math.cos(b.lat * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;

  return 2 * R * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
};

export const scorePlace = (place: any, a: any, b: any) => {
  const p = { lat: place.lat, lng: place.lng };

  const dA = haversine(a, p);
  const dB = haversine(b, p);

  const fairness = 1 / (1 + Math.abs(dA - dB));
  const transportBonus = place.tags.railway || place.tags.bus_station ? 1.5 : 1;

  return fairness * transportBonus;
};
