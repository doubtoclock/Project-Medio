import turf from "@turf/turf";

export const generateGrid = (isochroneA: any, isochroneB: any) => {
  const overlap = turf.intersect(isochroneA, isochroneB);
  if (!overlap) return [];

  const bbox = turf.bbox(overlap);
  const grid = turf.squareGrid(bbox, 1, { units: "kilometers" });

  return grid.features.filter((cell) =>
    turf.booleanContains(overlap, cell)
  );
};

export const findEquidistantPoints = (grid: any[], pointA: any, pointB: any) => {
  return grid
    .map((cell) => {
      const center = turf.center(cell).geometry.coordinates;
      const distanceToA = turf.distance(center, [pointA.lng, pointA.lat], {
        units: "kilometers",
      });
      const distanceToB = turf.distance(center, [pointB.lng, pointB.lat], {
        units: "kilometers",
      });
      return { center, distanceToA, distanceToB };
    })
    .filter(
      (cell) =>
        Math.abs(cell.distanceToA - cell.distanceToB) < 1 // Roughly equidistant
    )
    .map((cell) => cell.center);
};
