const otpCache = new Map<string, number>();

export async function getOtpDuration(
  fromLat: number,
  fromLon: number,
  toLat: number,
  toLon: number
): Promise<number | null> {

  const key = `${fromLat},${fromLon}->${toLat},${toLon}`;

  if (otpCache.has(key)) {
    return otpCache.get(key)!;
  }

  const query = {
    query: `{
      plan(
        from:{lat:${fromLat},lon:${fromLon}}
        to:{lat:${toLat},lon:${toLon}}
        transportModes:[{mode:WALK},{mode:TRANSIT}]
        numItineraries:1
      ){
        itineraries{
          duration
        }
      }
    }`
  };

  try {

    const res = await fetch(
      "http://localhost:8080/otp/routers/default/index/graphql",
      {
        method:"POST",
        headers:{ "Content-Type":"application/json" },
        body: JSON.stringify(query)
      }
    );

    const data:any = await res.json();

    const duration = data?.data?.plan?.itineraries?.[0]?.duration ?? null;

    if (duration) otpCache.set(key, duration);

    return duration;

  } catch {
    return null;
  }
}