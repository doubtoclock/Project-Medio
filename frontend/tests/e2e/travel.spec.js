import { expect, test } from '@playwright/test';
import { blockMapTiles, encodePolyline, mockUnauthenticatedUser } from './helpers';

const routeLegs = [
  {
    mode: 'WALK',
    distance: 333,
    startTime: 0,
    endTime: 300_000,
    from: { name: 'Origin', lat: 19.1075, lon: 72.8263 },
    to: { name: 'Juhu Bus Station', lat: 19.107899, lon: 72.826718 },
    legGeometry: {
      points: encodePolyline([
        [19.1075, 72.8263],
        [19.1077, 72.82645],
        [19.107899, 72.826718],
      ]),
    },
  },
  {
    mode: 'BUS',
    distance: 3889,
    startTime: 300_000,
    endTime: 2_460_000,
    from: { name: 'Juhu Bus Station', lat: 19.107899, lon: 72.826718 },
    to: { name: 'Picnic Cottage', lat: 19.130863, lon: 72.813982 },
    route: { shortName: '56', longName: 'Bus 56' },
    legGeometry: {
      points: encodePolyline([
        [19.107899, 72.826718],
        [19.1104, 72.8275],
        [19.1159, 72.8242],
        [19.1226, 72.8178],
        [19.130863, 72.813982],
      ]),
    },
  },
  {
    mode: 'WALK',
    distance: 321,
    startTime: 2_460_000,
    endTime: 2_760_000,
    from: { name: 'Picnic Cottage', lat: 19.130863, lon: 72.813982 },
    to: { name: 'Destination', lat: 19.1312, lon: 72.8146 },
    legGeometry: {
      points: encodePolyline([
        [19.130863, 72.813982],
        [19.131, 72.8142],
        [19.1312, 72.8146],
      ]),
    },
  },
];

test.describe('travel planner', () => {
  test.beforeEach(async ({ page }) => {
    await mockUnauthenticatedUser(page);
    await blockMapTiles(page);

    await page.route('**/api/search?q=*', async (route) => {
      const url = new URL(route.request().url());
      const query = url.searchParams.get('q')?.toLowerCase() || '';
      const suggestions = query.includes('khar')
        ? [{ name: 'Khar West, Mumbai', lat: 19.0700, lng: 72.8338 }]
        : [{ name: 'Juhu, Mumbai', lat: 19.1075, lng: 72.8263 }];

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(suggestions),
      });
    });

    await page.route('**/api/otp/route', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            plan: {
              itineraries: [
                {
                  duration: 2_760,
                  startTime: 0,
                  endTime: 2_760_000,
                  legs: routeLegs,
                },
              ],
            },
          },
          routing: {
            requestedModes: ['WALK', 'BUS'],
            date: '2026-07-22',
            time: '10:00:00',
          },
        }),
      });
    });
  });

  test('finds broad area suggestions and renders multi-color route legs', async ({ page }) => {
    await page.goto('/travel');

    await page.getByPlaceholder('Enter origin...').fill('juhu');
    await page.getByRole('button', { name: /Juhu, Mumbai/i }).click();

    await page.getByPlaceholder('Enter destination...').fill('khar');
    await page.getByRole('button', { name: /Khar West, Mumbai/i }).click();

    await page.getByRole('button', { name: /Find Best Routes/i }).click();

    await expect(page.locator('.route-step-mode', { hasText: 'Walk' }).first()).toBeVisible();
    await expect(page.locator('.route-step-mode', { hasText: 'Bus' })).toBeVisible();
    await expect(page.getByText('Your location - Juhu Bus Station')).toBeVisible();
    await expect(page.getByText('Juhu Bus Station - Picnic Cottage')).toBeVisible();
    await expect(page.getByText('Picnic Cottage - Destination')).toBeVisible();

    await expect(page.locator('path[stroke="#FF453A"]')).toHaveCount(1);
    await expect(page.locator('path[stroke="#F5F5F5"]')).toHaveCount(2);

    const busPathCommands = await page
      .locator('path[stroke="#FF453A"]')
      .first()
      .evaluate((path) => path.getAttribute('d') || '');

    expect((busPathCommands.match(/L/g) || []).length).toBeGreaterThan(1);
  });
});
