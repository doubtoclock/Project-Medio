import { Request, Response } from "express";
import axios from "axios";

export const getRouteFromOTP = async (req: Request, res: Response) => {
  try {
    const { from, to } = req.body;

    if (!from?.lat || !from?.lng || !to?.lat || !to?.lng) {
      return res.status(400).json({
        message: "Missing coordinates",
      });
    }

    const graphqlQuery = {
      query: `
        {
          plan(
            from: { lat: ${from.lat}, lon: ${from.lng} }
            to: { lat: ${to.lat}, lon: ${to.lng} }
            transportModes: [
              { mode: WALK }
              { mode: TRANSIT }
            ]
            numItineraries: 3
          ) {
            itineraries {
              duration
              startTime
              endTime
              legs {
                mode
                startTime
                endTime
                legGeometry {
                  points
                }
              }
            }
          }
        }
      `,
    };

    const otpResponse = await axios.post(
      "http://localhost:8080/otp/routers/default/index/graphql",
      graphqlQuery,
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    console.log(
      "RAW OTP GRAPHQL:",
      JSON.stringify(
        otpResponse.data?.data?.plan?.itineraries?.[0]?.legs?.[0],
        null,
        2
      )
    );

    return res.json(otpResponse.data);

  } catch (error: any) {
    console.error("OTP GRAPHQL ERROR:", error.response?.data || error.message);

    return res.status(500).json({
      message: "Failed to fetch route from OTP",
    });
  }
};