import { expect, test } from '@playwright/test';
import {
  blockMapTiles,
  encodePolyline,
  mockAuthenticatedUser,
  mockUnauthenticatedUser,
} from './helpers';

const manualLoginRegressions = [
  'Email address',
  'Send code',
  'Enter verification code',
  'Send again',
  "Didn't receive the code?",
  'Verify',
  'Welcome to MEDIO',
  "You've been verified",
  'Continue',
  'or',
  'you@example.com',
  'Sending code...',
  'Please enter a valid email address',
  'Please enter the full 6-digit code',
  '.login-divider',
  '.login-field',
  '.login-input',
  '.login-otp-section',
  '.login-otp-inputs',
  '.login-otp-slot',
  '.login-success',
  '.login-btn-primary',
  'input[type="email"]',
  'input[inputmode="numeric"]',
  '.login-otp-resend',
];

const privacyTexts = [
  'Your privacy is important to us',
  'Full Name',
  'Email Address',
  'Google profile photo',
  'We do not collect your Google password',
  'Saved places',
  'place labels',
  'addresses',
  'selected coordinates',
  'Meet-point searches',
  'route planning activity',
  'Travel route details',
  'route history',
  'journey summaries',
  'notification settings',
  'units',
  'secure cookies',
  'app tokens',
  'Support information',
  'Create and manage your MEDIO account',
  'Authenticate your identity',
  'saved places',
  'meet-point recommendations',
  'route summaries',
  'We do not sell your personal information',
  'Account Deletion',
  'mapping, routing',
  'database providers',
];

const termsTexts = [
  'Welcome to MEDIO',
  'These Terms & Conditions',
  'By signing in or using MEDIO',
  'About MEDIO',
  'Eligibility',
  'legal capacity',
  'accurate and up to date',
  'lawful purposes',
  'Account Registration',
  'Google Sign-In',
  'Maintaining the security',
  'Acceptable Use',
  'illegal or fraudulent activity',
  'unauthorized access',
  'harmful software',
  'automated tools',
  'User Content',
  'right to submit',
  'Privacy',
  'Privacy Policy',
  'Intellectual Property',
  'Service Availability',
  'Third-Party Services',
  'mapping providers',
  'Disclaimer',
  'travel estimates',
  'Limitation of Liability',
  'Account Suspension',
  'Changes to These Terms',
  'Governing Law',
  'laws of India',
  'Acceptance',
];

const aboutSupportTexts = [
  { path: '/about', text: 'smart meet-point recommendation platform' },
  { path: '/about', text: 'planning meetups simpler' },
  { path: '/about', text: 'Smart meet-point recommendations' },
  { path: '/about', text: 'Secure Google Sign-In' },
  { path: '/about', text: 'Privacy-focused account management' },
  { path: '/about', text: 'continuously improve MEDIO' },
  { path: '/about', text: 'Thank you for choosing MEDIO' },
  { path: '/about', text: 'every meetup easier' },
  { path: '/support', text: 'We are here to help' },
  { path: '/support', text: 'your-email@example.com' },
  { path: '/support', text: 'Login or account issues' },
  { path: '/support', text: 'Bug reports' },
  { path: '/support', text: 'Feature requests' },
  { path: '/support', text: 'Privacy-related questions' },
  { path: '/support', text: 'Account deletion requests' },
  { path: '/support', text: 'We aim to respond' },
];

const profileRemovedItems = [
  'Theme',
  'Private Profile',
  'Security & Biometrics',
  'Connected Accounts',
  'Recent Activity',
  'No activity yet',
  '2 Active',
  'Dark',
  'Light',
  'Security',
  'Biometrics',
  'privacy mode',
  'Connected',
  'recent actions',
  'actions will show up here',
];

const profilePresentItems = [
  'Medio Tester',
  'tester@medio.local',
  'Saved Places',
  'Juhu Beach',
  'Preferences',
  'Notifications',
  'Units',
  'Delete Account',
];

const areaSuggestions = [
  ['juhu', 'Juhu, Mumbai'],
  ['andheri', 'Andheri West, Mumbai'],
  ['andheri east', 'Andheri East, Mumbai'],
  ['bandra', 'Bandra West, Mumbai'],
  ['bandra east', 'Bandra East, Mumbai'],
  ['dadar', 'Dadar, Mumbai'],
  ['worli', 'Worli, Mumbai'],
  ['lower parel', 'Lower Parel, Mumbai'],
  ['powai', 'Powai, Mumbai'],
  ['goregaon', 'Goregaon, Mumbai'],
  ['malad', 'Malad, Mumbai'],
  ['borivali', 'Borivali, Mumbai'],
  ['thane', 'Thane West'],
  ['colaba', 'Colaba, Mumbai'],
  ['churchgate', 'Churchgate, Mumbai'],
  ['bkc', 'BKC, Bandra Kurla Complex, Mumbai'],
  ['versova', 'Versova, Andheri West, Mumbai'],
  ['mira road', 'Mira Road, Mira Bhayandar'],
  ['bhayandar', 'Bhayandar, Mira Bhayandar'],
  ['santacruz', 'Santacruz West, Mumbai'],
  ['santacruz east', 'Santacruz East, Mumbai'],
  ['vile parle', 'Vile Parle West, Mumbai'],
  ['vile parle east', 'Vile Parle East, Mumbai'],
  ['khar', 'Khar West, Mumbai'],
  ['khar east', 'Khar East, Mumbai'],
  ['mahim', 'Mahim, Mumbai'],
  ['prabhadevi', 'Prabhadevi, Mumbai'],
  ['chembur', 'Chembur, Mumbai'],
  ['ghatkopar', 'Ghatkopar, Mumbai'],
  ['kurla', 'Kurla, Mumbai'],
  ['sion', 'Sion, Mumbai'],
  ['mulund', 'Mulund, Mumbai'],
  ['kandivali', 'Kandivali, Mumbai'],
  ['dahisar', 'Dahisar, Mumbai'],
  ['parel', 'Lower Parel, Mumbai'],
];

const routeColorCases = [
  ['WALK', '#F5F5F5'],
  ['BUS', '#FF453A'],
  ['SUBWAY', '#34C759'],
  ['RAIL', '#0A84FF'],
  ['CAR', '#C7C7CC'],
  ['BICYCLE', '#FFD60A'],
  ['TRAM', '#BF5AF2'],
  ['FERRY', '#64D2FF'],
];

const endpointCases = Array.from({ length: 20 }, (_, index) => ({
  mode: index % 2 === 0 ? 'BUS' : 'RAIL',
  from: `Start Stop ${index + 1}`,
  to: `End Stop ${index + 1}`,
}));

const imperialDistanceCases = [
  [80, '262 ft'],
  [120, '394 ft'],
  [160, '525 ft'],
  [200, '0.1 mi'],
  [400, '0.2 mi'],
  [800, '0.5 mi'],
  [1000, '0.6 mi'],
  [1200, '0.7 mi'],
  [1609.344, '1.0 mi'],
  [2400, '1.5 mi'],
  [3200, '2.0 mi'],
  [5000, '3.1 mi'],
  [8000, '5.0 mi'],
  [10000, '6.2 mi'],
  [16093.44, '10 mi'],
];

test.describe('expanded regression matrix', () => {
  test.describe('Google-only login regressions', () => {
    for (const selectorOrText of manualLoginRegressions) {
      test(`manual login artifact is absent: ${selectorOrText}`, async ({ page }) => {
        await mockUnauthenticatedUser(page);
        await page.goto('/login');

        if (selectorOrText.startsWith('.') || selectorOrText.startsWith('input')) {
          await expect(page.locator(selectorOrText)).toHaveCount(0);
        } else {
          await expect(page.getByText(selectorOrText, { exact: true })).toHaveCount(0);
        }
      });
    }
  });

  test.describe('legal content coverage', () => {
    for (const text of privacyTexts) {
      test(`privacy policy includes: ${text}`, async ({ page }) => {
        await mockUnauthenticatedUser(page);
        await page.goto('/privacy');
        await expect(page.getByText(text).first()).toBeVisible();
      });
    }

    for (const text of termsTexts) {
      test(`terms include: ${text}`, async ({ page }) => {
        await mockUnauthenticatedUser(page);
        await page.goto('/terms');
        await expect(page.getByText(text).first()).toBeVisible();
      });
    }

    for (const { path, text } of aboutSupportTexts) {
      test(`${path} includes: ${text}`, async ({ page }) => {
        await mockAuthenticatedUser(page);
        await page.goto(path);
        await expect(page.getByText(text).first()).toBeVisible();
      });
    }
  });

  test.describe('profile regression coverage', () => {
    for (const text of profileRemovedItems) {
      test(`profile does not show removed item: ${text}`, async ({ page }) => {
        await mockAuthenticatedUser(page);
        await page.goto('/profile');
        await expect(page.getByText(text, { exact: true })).toHaveCount(0);
      });
    }

    for (const text of profilePresentItems) {
      test(`profile still shows expected item: ${text}`, async ({ page }) => {
        await mockAuthenticatedUser(page);
        await page.goto('/profile');
        await expect(page.getByText(text).first()).toBeVisible();
      });
    }
  });

  test.describe('area search coverage', () => {
    for (const [query, suggestion] of areaSuggestions) {
      test(`area search suggests ${suggestion} for "${query}"`, async ({ page }) => {
        await setupTravelMocks(page, {
          suggestions: [{ name: suggestion, lat: 19.1, lng: 72.8 }],
          legs: buildLegs([{ mode: 'WALK', from: 'Origin', to: 'Destination', distance: 400 }]),
        });

        await page.goto('/travel');
        await page.getByPlaceholder('Enter origin...').fill(query);
        await expect(page.getByRole('button', { name: suggestion })).toBeVisible();
      });
    }
  });

  test.describe('route color coverage', () => {
    for (const [mode, color] of routeColorCases) {
      test(`route map uses ${color} for ${mode}`, async ({ page }) => {
        await setupTravelMocks(page, {
          suggestions: defaultSuggestions,
          legs: buildLegs([{ mode, from: 'Origin', to: 'Destination', distance: 700 }]),
        });

        await planMockedRoute(page);
        await expect(page.locator(`path[stroke="${color}"]`)).toHaveCount(1);
      });
    }
  });

  test.describe('route endpoint coverage', () => {
    for (const { mode, from, to } of endpointCases) {
      test(`route details show ${from} - ${to}`, async ({ page }) => {
        await setupTravelMocks(page, {
          suggestions: defaultSuggestions,
          legs: buildLegs([{ mode, from, to, distance: 1000, routeName: `${mode} ${from}` }]),
        });

        await planMockedRoute(page);
        await expect(page.getByText(`${from} - ${to}`)).toBeVisible();
      });
    }
  });

  test.describe('imperial unit distance coverage', () => {
    for (const [meters, expected] of imperialDistanceCases) {
      test(`imperial units format ${meters}m as ${expected}`, async ({ page }) => {
        await page.addInitScript(() => localStorage.setItem('medio_units', 'imperial'));
        await setupTravelMocks(page, {
          suggestions: defaultSuggestions,
          legs: buildLegs([{ mode: 'WALK', from: 'Origin', to: 'Destination', distance: meters }]),
        });

        await planMockedRoute(page);
        await expect(page.getByText(expected).first()).toBeVisible();
      });
    }
  });
});

const defaultSuggestions = [
  { name: 'Juhu, Mumbai', lat: 19.1075, lng: 72.8263 },
  { name: 'Khar West, Mumbai', lat: 19.0700, lng: 72.8338 },
];

async function setupTravelMocks(page, { suggestions, legs }) {
  await mockUnauthenticatedUser(page);
  await blockMapTiles(page);

  await page.route('**/api/search?q=*', async (route) => {
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
                duration: 1800,
                startTime: 0,
                endTime: 1_800_000,
                legs,
              },
            ],
          },
        },
        routing: {
          requestedModes: legs.map((leg) => leg.mode),
          date: '2026-07-22',
          time: '10:00:00',
        },
      }),
    });
  });
}

async function planMockedRoute(page) {
  await page.goto('/travel');
  await page.getByPlaceholder('Enter origin...').fill('juhu');
  await page.getByRole('button', { name: 'Juhu, Mumbai' }).first().click();
  await page.getByPlaceholder('Enter destination...').fill('khar');
  await page.getByRole('button', { name: 'Khar West, Mumbai' }).first().click();
  await page.getByRole('button', { name: /Find Best Routes/i }).click();
}

function buildLegs(legs) {
  return legs.map((leg, index) => {
    const fromLat = 19.1075 + index * 0.004;
    const fromLon = 72.8263 - index * 0.003;
    const toLat = fromLat + 0.003;
    const toLon = fromLon - 0.002;

    return {
      mode: leg.mode,
      distance: leg.distance,
      startTime: index * 300_000,
      endTime: (index + 1) * 300_000,
      from: { name: leg.from, lat: fromLat, lon: fromLon },
      to: { name: leg.to, lat: toLat, lon: toLon },
      route: leg.routeName ? { shortName: leg.routeName, longName: leg.routeName } : undefined,
      legGeometry: {
        points: encodePolyline([
          [fromLat, fromLon],
          [fromLat + 0.001, fromLon - 0.0005],
          [fromLat + 0.002, fromLon - 0.0015],
          [toLat, toLon],
        ]),
      },
    };
  });
}
