import { Request, Response } from "express";
import axios from "axios";

export const getRouteFromOTP = async (req: Request, res: Response) => {
  try {
    const { fromLat, fromLon, toLat, toLon } = req.query;

    if (!fromLat || !fromLon || !toLat || !toLon) {
      return res.status(400).json({
        message: "Missing coordinates",
      });
    }

    const otpResponse = await axios.get(
      "http://localhost:8080/otp/routers/default/plan",
      {
        params: {
          fromPlace: `${fromLat},${fromLon}`,
          toPlace: `${toLat},${toLon}`,
          mode: "TRANSIT,WALK",
          numItineraries: 3,
        },
      }
    );

    return res.json(otpResponse.data);

  } catch (error: any) {
    console.error("OTP ERROR:", error.message);
    return res.status(500).json({
      message: "Failed to fetch route from OTP",
    });
  }
};
