"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.findEquidistantPoints = exports.generateGrid = void 0;
const turf_1 = __importDefault(require("@turf/turf"));
const generateGrid = (isochroneA, isochroneB) => {
    const overlap = turf_1.default.intersect(isochroneA, isochroneB);
    if (!overlap)
        return [];
    const bbox = turf_1.default.bbox(overlap);
    const grid = turf_1.default.squareGrid(bbox, 1, { units: "kilometers" });
    return grid.features.filter((cell) => turf_1.default.booleanContains(overlap, cell));
};
exports.generateGrid = generateGrid;
const findEquidistantPoints = (grid, pointA, pointB) => {
    return grid
        .map((cell) => {
        const center = turf_1.default.center(cell).geometry.coordinates;
        const distanceToA = turf_1.default.distance(center, [pointA.lng, pointA.lat], {
            units: "kilometers",
        });
        const distanceToB = turf_1.default.distance(center, [pointB.lng, pointB.lat], {
            units: "kilometers",
        });
        return { center, distanceToA, distanceToB };
    })
        .filter((cell) => Math.abs(cell.distanceToA - cell.distanceToB) < 1 // Roughly equidistant
    )
        .map((cell) => cell.center);
};
exports.findEquidistantPoints = findEquidistantPoints;
//# sourceMappingURL=grid.js.map