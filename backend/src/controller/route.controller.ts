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
        query Plan($fromLat: Float!, $fromLon: Float!, $toLat: Float!, $toLon: Float!) {
          plan(
            from: { lat: $fromLat, lon: $fromLon }
            to: { lat: $toLat, lon: $toLon }
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
                distance
                startTime
                endTime

                from {
                  name
                }

                to {
                  name
                }

                route {
                  shortName
                  longName
                }

                legGeometry {
                  points
                }
              }
            }
          }
        }
      `,
      variables: {
        fromLat: from.lat,
        fromLon: from.lng,
        toLat: to.lat,
        toLon: to.lng,
      },
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

    // Debug first leg safely
    const firstLeg =
      otpResponse.data?.data?.plan?.itineraries?.[0]?.legs?.[0];

    console.log(
      "RAW OTP LEG:",
      JSON.stringify(firstLeg, null, 2)
    );

    return res.json(otpResponse.data);

  } catch (error: any) {
    console.error(
      "OTP GRAPHQL ERROR:",
      error.response?.data || error.message
    );

    return res.status(500).json({
      message: "Failed to fetch route from OTP",
    });
  }
};
