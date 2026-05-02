export interface OtpLeg {
  mode: string;
  distance?: number;
  startTime: number;
  endTime: number;
  from?: {
    name?: string;
  };
  to?: {
    name?: string;
  };
  route?: {
    shortName?: string;
    longName?: string;
  };
  legGeometry?: {
    points?: string;
  };
}

export interface OtpItinerary {
  duration: number;
  startTime?: number;
  endTime?: number;
  legs?: OtpLeg[];
}

export interface OtpRouteResponse {
  data?: {
    plan?: {
      itineraries?: OtpItinerary[];
    };
  };
  routing?: {
    requestedModes?: string[];
    date?: string;
    time?: string;
    adjustedToNextMetroService?: boolean;
  };
  errors?: unknown;
  message?: string;
}
