"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateMidpoint = void 0;
const calculateMidpoint = (a, b) => ({
    lat: (a.lat + b.lat) / 2,
    lng: (a.lng + b.lng) / 2
});
exports.calculateMidpoint = calculateMidpoint;
//# sourceMappingURL=midpoint.js.map