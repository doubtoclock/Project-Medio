export const mockUser = {
  id: 'user_test',
  name: 'Medio Tester',
  email: 'tester@medio.local',
  avatarUrl: null,
  notificationsEnabled: true,
  createdAt: '2026-07-22T00:00:00.000Z',
  updatedAt: '2026-07-22T00:00:00.000Z',
};

export async function mockAuthenticatedUser(page) {
  await page.route('**/api/auth/me', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        authenticated: true,
        user: mockUser,
      }),
    });
  });

  await page.route('**/api/auth/profile', async (route) => {
    if (route.request().method() === 'PATCH') {
      const patch = route.request().postDataJSON();
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(buildProfile({ user: { ...mockUser, ...patch } })),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(buildProfile()),
    });
  });

  await page.route('**/api/auth/logout', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });
}

export async function mockUnauthenticatedUser(page) {
  await page.route('**/api/auth/me', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ authenticated: false }),
    });
  });
}

export async function blockMapTiles(page) {
  await page.route(/basemaps\.cartocdn\.com|tile\.openstreetmap\.org/, async (route) => {
    await route.abort();
  });
}

export function encodePolyline(points) {
  let lastLat = 0;
  let lastLng = 0;
  let result = '';

  for (const [lat, lng] of points) {
    const nextLat = Math.round(lat * 1e5);
    const nextLng = Math.round(lng * 1e5);
    result += encodeSignedNumber(nextLat - lastLat);
    result += encodeSignedNumber(nextLng - lastLng);
    lastLat = nextLat;
    lastLng = nextLng;
  }

  return result;
}

function encodeSignedNumber(value) {
  let coordinate = value < 0 ? ~(value << 1) : value << 1;
  let output = '';

  while (coordinate >= 0x20) {
    output += String.fromCharCode((0x20 | (coordinate & 0x1f)) + 63);
    coordinate >>= 5;
  }

  return output + String.fromCharCode(coordinate + 63);
}

function buildProfile(overrides = {}) {
  return {
    user: overrides.user || mockUser,
    stats: {
      tripsCount: 4,
      savedPlacesCount: 1,
      activityCount: 7,
    },
    savedPlaces: [
      {
        _id: 'place_1',
        label: 'Juhu Beach',
        address: 'Juhu, Mumbai',
      },
    ],
    recentTrips: [],
    recentActivity: [],
  };
}
