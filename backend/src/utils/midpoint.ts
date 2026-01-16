export const calculateMidpoint = (a: any, b: any) => ({
  lat: (a.lat + b.lat) / 2,
  lng: (a.lng + b.lng) / 2
});
