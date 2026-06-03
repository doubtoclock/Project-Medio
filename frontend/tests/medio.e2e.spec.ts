import { expect, test, type Page, type Route, type TestInfo, type ViewportSize } from "@playwright/test";

type ThemeMode = "dark" | "light";
type ViewportCase = {
  name: string;
  size: ViewportSize;
};
type MatrixCase = ViewportCase & {
  theme: ThemeMode;
};
type ApiMode = "success" | "empty" | "error" | "network";
type SearchMockMode = "default" | "stale" | "duplicate-names";

type SavedPlace = {
  _id: string;
  label: string;
  address: string;
  lat?: number;
  lng?: number;
  createdAt?: string;
};

type ActivityItem = {
  _id: string;
  action: string;
  value: string;
  createdAt: string;
};

type ProfilePayload = {
  user: {
    id: string;
    name: string;
    email: string;
    avatarUrl: string | null;
    notificationsEnabled: boolean;
    privacyMode: boolean;
    createdAt: string;
    updatedAt: string;
  };
  stats: {
    tripsCount: number;
    savedPlacesCount: number;
    activityCount: number;
  };
  savedPlaces: Required<SavedPlace>[];
  recentTrips: ActivityItem[];
  recentActivity: ActivityItem[];
};

type MockOptions = {
  authenticated?: boolean;
  theme?: ThemeMode;
  viewport?: ViewportCase;
  places?: SavedPlace[];
  searchMode?: SearchMockMode;
  routeMode?: ApiMode;
  meetMode?: ApiMode;
  profileMode?: ApiMode;
  profilePatchMode?: ApiMode;
  profile?: ProfilePayload;
};

type MedioCase = {
  title: string;
  run: (page: Page, testInfo: TestInfo) => Promise<void>;
};

const backendOrigin = "http://localhost:5001";
const frontendOrigin = "http://127.0.0.1:5173";
const blankPng = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=",
  "base64"
);

const viewports: ViewportCase[] = [
  { name: "mobile", size: { width: 390, height: 844 } },
  { name: "tablet", size: { width: 768, height: 1024 } },
  { name: "desktop", size: { width: 1440, height: 900 } },
];
const themes: ThemeMode[] = ["dark", "light"];
const matrix: MatrixCase[] = viewports.flatMap((viewport) =>
  themes.map((theme) => ({ ...viewport, theme }))
);

const protectedPages = [
  { path: "/meet", heading: "Medio Meet", nav: "Meet" },
  { path: "/travel", heading: "Route Planner", nav: "Travel" },
  { path: "/guide", heading: "Travel Guide", nav: "Guide" },
  { path: "/profile", heading: "Profile", nav: "Profile" },
];

const searchLocations = [
  { name: "Andheri Station", lat: 19.1197, lng: 72.8464 },
  { name: "Bandra Kurla Complex", lat: 19.0697, lng: 72.8697 },
  { name: "Churchgate", lat: 18.9352, lng: 72.8277 },
  { name: "Dadar TT Circle", lat: 19.0178, lng: 72.8478 },
  { name: "Ghatkopar Metro", lat: 19.0863, lng: 72.9081 },
  { name: "Powai Lake", lat: 19.1273, lng: 72.9048 },
];

const duplicateKandivaliLocations = [
  { name: "Kandivali", lat: 19.204, lng: 72.853 },
  { name: "Kandivali", lat: 19.205, lng: 72.854 },
  { name: "Kandivali", lat: 19.206, lng: 72.855 },
  { name: "Kandivali", lat: 19.207, lng: 72.856 },
  { name: "Kandivali West", lat: 19.2141, lng: 72.8373 },
];

const staleSearchLocations = {
  kandivali: [{ name: "Kandivali", lat: 19.204, lng: 72.853 }],
  powai: [{ name: "Powai Lake", lat: 19.1273, lng: 72.9048 }],
};

const defaultPlaces: SavedPlace[] = [
  {
    _id: "place-office",
    label: "Office",
    address: "Bandra Kurla Complex",
    lat: 19.0697,
    lng: 72.8697,
    createdAt: "2026-04-01T10:00:00.000Z",
  },
  {
    _id: "place-home",
    label: "Home",
    address: "Andheri Station",
    lat: 19.1197,
    lng: 72.8464,
    createdAt: "2026-04-02T10:00:00.000Z",
  },
];

const activityItems: ActivityItem[] = [
  {
    _id: "activity-place",
    action: "PLACE_CREATED",
    value: "Saved Office",
    createdAt: "2026-04-05T09:30:00.000Z",
  },
  {
    _id: "activity-route",
    action: "ROUTE_PLANNED",
    value: "Andheri Station to Churchgate",
    createdAt: "2026-04-06T10:30:00.000Z",
  },
  {
    _id: "activity-meet",
    action: "MEET_SEARCHED",
    value: "Found midpoint cafes",
    createdAt: "2026-04-07T11:30:00.000Z",
  },
  {
    _id: "activity-profile",
    action: "PROFILE_UPDATED",
    value: "Updated display name",
    createdAt: "2026-04-08T12:30:00.000Z",
  },
  {
    _id: "activity-delete",
    action: "PLACE_DELETED",
    value: "Removed old shortcut",
    createdAt: "2026-04-09T13:30:00.000Z",
  },
];

const defaultProfile = (patch: Partial<ProfilePayload> = {}): ProfilePayload => {
  const profile: ProfilePayload = {
    user: {
      id: "user-1",
      name: "Mira Shah",
      email: "mira@example.com",
      avatarUrl: null,
      notificationsEnabled: true,
      privacyMode: false,
      createdAt: "2026-01-15T10:00:00.000Z",
      updatedAt: "2026-04-15T10:00:00.000Z",
    },
    stats: {
      tripsCount: 8,
      savedPlacesCount: 2,
      activityCount: activityItems.length,
    },
    savedPlaces: defaultPlaces.map((place) => ({
      ...place,
      lat: place.lat ?? 0,
      lng: place.lng ?? 0,
      createdAt: place.createdAt ?? "2026-04-01T10:00:00.000Z",
    })),
    recentTrips: activityItems.slice(1, 3),
    recentActivity: activityItems,
  };

  return {
    ...profile,
    ...patch,
    user: { ...profile.user, ...patch.user },
    stats: { ...profile.stats, ...patch.stats },
  };
};

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

const routeFixture = (optionCount = 2) => ({
  routing: {
    adjustedToNextMetroService: true,
    time: "10:18 AM",
  },
  data: {
    plan: {
      itineraries: Array.from({ length: optionCount }, (_, index) => ({
        duration: 2100 + index * 420,
        legs: [
          {
            mode: "WALK",
            startTime: 0,
            endTime: 300000,
            from: { name: "Start" },
            to: { name: "Metro Entry" },
            legGeometry: { points: "_p~iF~ps|U_ulLnnqC_mqNvxq`@" },
          },
          {
            mode: "SUBWAY",
            startTime: 300000,
            endTime: 1500000 + index * 300000,
            from: { name: "Metro Entry" },
            to: { name: "Central Station" },
            route: { shortName: index === 0 ? "1" : "3", longName: "Metro Line" },
            legGeometry: { points: "_p~iF~ps|U_ulLnnqC_mqNvxq`@" },
          },
          {
            mode: "BUS",
            startTime: 1500000,
            endTime: 2100000 + index * 420000,
            from: { name: "Central Station" },
            to: { name: "Destination" },
            route: { shortName: "42", longName: "BEST 42" },
            legGeometry: { points: "_p~iF~ps|U_ulLnnqC_mqNvxq`@" },
          },
        ],
      })),
    },
  },
});

const meetFixture = () => [
  {
    id: 1,
    name: "Central Cafe",
    lat: 19.08,
    lon: 72.87,
    category: "Cafe",
    travelTimeA: 22,
    travelTimeB: 24,
    difference: 2,
    average: 23,
    reason: "Balanced and close to transit",
  },
  {
    id: 2,
    name: "Garden Court",
    lat: 19.09,
    lon: 72.88,
    category: "Restaurant",
    travelTimeA: 28,
    travelTimeB: 26,
    difference: 2,
    average: 27,
    reason: "Comfortable indoor option",
  },
  {
    id: 3,
    name: "Metro Mall",
    lat: 19.1,
    lon: 72.89,
    category: "Mall",
    travelTimeA: 31,
    travelTimeB: 29,
    difference: 2,
    average: 30,
    reason: "Easy to identify",
  },
  {
    id: 4,
    name: "Library Steps",
    lat: 19.11,
    lon: 72.9,
    category: "Library",
    travelTimeA: 35,
    travelTimeB: 33,
    difference: 2,
    average: 34,
    reason: "Quiet public landmark",
  },
];

const corsHeaders = {
  "access-control-allow-origin": frontendOrigin,
  "access-control-allow-credentials": "true",
  "access-control-allow-headers": "Content-Type",
  "access-control-allow-methods": "GET,POST,PATCH,DELETE,OPTIONS",
};

async function fulfillJson(route: Route, body: unknown, status = 200) {
  await route.fulfill({
    status,
    headers: {
      ...corsHeaders,
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

const wait = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

async function fulfillJsonIfOpen(route: Route, body: unknown, status = 200) {
  try {
    await fulfillJson(route, body, status);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (
      !/Target page, context or browser has been closed|Request was already handled|intercepted request.*(?:failed|canceled|disposed)/i.test(
        message
      )
    ) {
      throw error;
    }
  }
}

async function installMocks(page: Page, options: MockOptions = {}) {
  const places = clone(options.places ?? defaultPlaces);
  let profile = clone(options.profile ?? defaultProfile());
  let authenticated = options.authenticated ?? true;
  const calls: string[] = [];

  await page.setViewportSize(options.viewport?.size ?? viewports[0].size);
  await page.addInitScript((theme) => {
    window.localStorage.setItem("medio-theme", theme);
  }, options.theme ?? "dark");

  await page.route("**/*", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const method = request.method();

    if (method === "OPTIONS" && url.origin === backendOrigin) {
      await route.fulfill({ status: 204, headers: corsHeaders });
      return;
    }

    if (url.origin !== frontendOrigin && request.resourceType() === "image") {
      const isSvg = url.pathname.endsWith(".svg");
      await route.fulfill({
        status: 200,
        headers: {
          "content-type": isSvg ? "image/svg+xml" : "image/png",
        },
        body: isSvg ? '<svg xmlns="http://www.w3.org/2000/svg" />' : blankPng,
      });
      return;
    }

    if (url.origin === backendOrigin) {
      calls.push(`${method} ${url.pathname}`);

      if (url.pathname === "/api/auth/google") {
        await route.fulfill({
          status: 200,
          headers: { "content-type": "text/html" },
          body: "<!doctype html><title>Google OAuth mocked</title><h1>Google OAuth mocked</h1>",
        });
        return;
      }

      if (url.pathname === "/api/auth/me") {
        await fulfillJson(route, { authenticated });
        return;
      }

      if (url.pathname === "/api/search") {
        const query = url.searchParams.get("q")?.toLowerCase() ?? "";

        if (options.searchMode === "duplicate-names") {
          await fulfillJson(route, duplicateKandivaliLocations);
          return;
        }

        if (options.searchMode === "stale") {
          const isKandivali = query.includes("kandivali");
          await wait(isKandivali ? 800 : 20);
          await fulfillJsonIfOpen(
            route,
            isKandivali ? staleSearchLocations.kandivali : staleSearchLocations.powai
          );
          return;
        }

        const results = searchLocations.filter((location) =>
          location.name.toLowerCase().includes(query[0] ?? "")
        );
        await fulfillJson(route, results.length > 0 ? results : searchLocations);
        return;
      }

      if (url.pathname === "/api/places" && method === "GET") {
        await fulfillJson(route, { places });
        return;
      }

      if (url.pathname === "/api/places" && method === "POST") {
        const created = {
          _id: `place-${places.length + 1}`,
          createdAt: "2026-04-10T10:00:00.000Z",
          ...(request.postDataJSON() as SavedPlace),
        };
        places.push(created);
        await fulfillJson(route, { place: created }, 201);
        return;
      }

      if (url.pathname.startsWith("/api/places/") && method === "DELETE") {
        const id = url.pathname.split("/").pop();
        const index = places.findIndex((place) => place._id === id);
        if (index >= 0) places.splice(index, 1);
        profile = {
          ...profile,
          savedPlaces: profile.savedPlaces.filter((place) => place._id !== id),
          stats: {
            ...profile.stats,
            savedPlacesCount: Math.max(0, profile.stats.savedPlacesCount - 1),
          },
        };
        await fulfillJson(route, { ok: true });
        return;
      }

      if (url.pathname === "/api/otp/route" && method === "POST") {
        if (options.routeMode === "network") {
          await route.abort("failed");
          return;
        }
        if (options.routeMode === "error") {
          await fulfillJson(route, { message: "Route failed" }, 500);
          return;
        }
        if (options.routeMode === "empty") {
          await fulfillJson(route, { data: { plan: { itineraries: [] } } });
          return;
        }
        await fulfillJson(route, routeFixture());
        return;
      }

      if (url.pathname === "/api/meet" && method === "POST") {
        if (options.meetMode === "network") {
          await route.abort("failed");
          return;
        }
        if (options.meetMode === "error") {
          await fulfillJson(route, { message: "Meet failed" }, 500);
          return;
        }
        await fulfillJson(route, options.meetMode === "empty" ? [] : meetFixture());
        return;
      }

      if (url.pathname === "/api/auth/profile" && method === "GET") {
        if (options.profileMode === "network") {
          await route.abort("failed");
          return;
        }
        if (options.profileMode === "error") {
          await fulfillJson(route, { message: "Failed to load profile" }, 500);
          return;
        }
        await fulfillJson(route, profile);
        return;
      }

      if (url.pathname === "/api/auth/profile" && method === "PATCH") {
        if (options.profilePatchMode === "network") {
          await route.abort("failed");
          return;
        }
        if (options.profilePatchMode === "error") {
          await fulfillJson(route, { message: "Failed to update profile" }, 500);
          return;
        }
        const patch = request.postDataJSON() as Partial<ProfilePayload["user"]>;
        profile = {
          ...profile,
          user: {
            ...profile.user,
            ...patch,
            updatedAt: "2026-04-20T10:00:00.000Z",
          },
        };
        await fulfillJson(route, { ...profile, message: "Profile updated successfully" });
        return;
      }

      if (url.pathname === "/api/auth/logout") {
        authenticated = false;
        await fulfillJson(route, { ok: true });
        return;
      }

      await fulfillJson(route, { message: "Unhandled mock endpoint" }, 404);
      return;
    }

    await route.continue();
  });

  return { calls };
}

async function openApp(page: Page, path: string, options: MockOptions = {}) {
  await installMocks(page, options);
  await page.goto(path);
}

async function chooseTravelLocations(page: Page) {
  await page.getByPlaceholder("From...").fill("andheri");
  await page.getByRole("button", { name: "Andheri Station" }).click();
  await page.getByPlaceholder("To...").fill("church");
  await page.getByRole("button", { name: "Churchgate" }).click();
}

async function chooseMeetLocations(page: Page) {
  await page.getByPlaceholder("Location A").fill("andheri");
  await page.getByRole("button", { name: "Andheri Station" }).click();
  await page.getByPlaceholder("Location B").fill("bandra");
  await page.getByRole("button", { name: "Bandra Kurla Complex" }).click();
}

async function findTravelRoute(page: Page, mode = "Local transport") {
  if (mode !== "Local transport") {
    await page.getByRole("button", { name: mode }).click();
  }
  await chooseTravelLocations(page);
  await page.getByRole("button", { name: "Find Route" }).click();
  await expect(page.getByRole("button", { name: "Edit Route" })).toBeVisible();
}

async function findMeetResults(page: Page) {
  await chooseMeetLocations(page);
  await page.getByRole("button", { name: "Find Meeting Point" }).click();
  await expect(page.getByRole("button", { name: /Central Cafe/ })).toBeVisible();
}

async function expectProtectedShell(page: Page, heading: string, navLabel: string) {
  await expect(page.getByRole("heading", { name: heading, exact: true })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Primary navigation" })).toBeVisible();
  await expect(page.getByRole("link", { name: navLabel })).toHaveAttribute("aria-current", "page");
}

const cases: MedioCase[] = [];
const add = (title: string, run: MedioCase["run"]) => cases.push({ title, run });
const variantFor = (index: number) => matrix[index % matrix.length];

for (let index = 0; index < 12; index += 1) {
  const variant = variantFor(index);
  const success = index % 2 === 1;
  add(`public login renders ${success ? "success" : "standard"} state on ${variant.name} ${variant.theme}`, async (page) => {
    await openApp(page, success ? "/login?login=success" : "/login", {
      authenticated: false,
      viewport: variant,
      theme: variant.theme,
    });
    await expect(page.getByRole("heading", { name: success ? "Logged in successfully" : "Welcome Back" })).toBeVisible();
    await expect(page.getByRole("button", { name: /Switch to/ })).toBeVisible();
  });
}

for (let index = 0; index < 6; index += 1) {
  const variant = variantFor(index);
  add(`login redirects authenticated users on ${variant.name} ${variant.theme}`, async (page) => {
    await openApp(page, "/login", { authenticated: true, viewport: variant, theme: variant.theme });
    await expect(page).toHaveURL(/\/meet$/);
    await expect(page.getByRole("heading", { name: "Medio Meet" })).toBeVisible();
  });
}

for (let index = 0; index < 6; index += 1) {
  const variant = variantFor(index);
  add(`google oauth button navigates to backend on ${variant.name} ${variant.theme}`, async (page) => {
    await openApp(page, "/login", { authenticated: false, viewport: variant, theme: variant.theme });
    await page.getByRole("button", { name: "Continue with Google" }).click();
    await expect(page).toHaveURL(/\/api\/auth\/google$/);
    await expect(page.getByRole("heading", { name: "Google OAuth mocked" })).toBeVisible();
  });
}

for (let index = 0; index < 6; index += 1) {
  const variant = variantFor(index);
  add(`splash screen paints startup UI on ${variant.name} ${variant.theme}`, async (page) => {
    await openApp(page, "/", { authenticated: false, viewport: variant, theme: variant.theme });
    await expect(page.getByRole("heading", { name: "MEDIO" })).toBeVisible();
    await expect(page.getByText("Preparing your travel workspace")).toBeVisible();
    await expect(page.getByText(/Progress/)).toBeVisible();
  });
}

for (let index = 0; index < 24; index += 1) {
  const variant = variantFor(index);
  const target = protectedPages[index % protectedPages.length];
  add(`protected route ${target.path} redirects anonymous users on ${variant.name} ${variant.theme}`, async (page) => {
    await openApp(page, target.path, { authenticated: false, viewport: variant, theme: variant.theme });
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole("heading", { name: "Welcome Back" })).toBeVisible();
  });
}

for (let index = 0; index < 6; index += 1) {
  const variant = variantFor(index);
  add(`unknown route returns to splash on ${variant.name} ${variant.theme}`, async (page) => {
    await openApp(page, "/not-a-real-route", { authenticated: false, viewport: variant, theme: variant.theme });
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole("heading", { name: "MEDIO" })).toBeVisible();
  });
}

for (let index = 0; index < 24; index += 1) {
  const variant = variantFor(index);
  const target = protectedPages[index % protectedPages.length];
  add(`authenticated page ${target.path} renders shell on ${variant.name} ${variant.theme}`, async (page) => {
    await openApp(page, target.path, { authenticated: true, viewport: variant, theme: variant.theme });
    await expectProtectedShell(page, target.heading, target.nav);
  });
}

for (let index = 0; index < 48; index += 1) {
  const start = protectedPages[Math.floor(index / 12) % protectedPages.length];
  const target = protectedPages[index % protectedPages.length];
  const viewport = viewports[index % viewports.length];
  add(`bottom navigation moves from ${start.nav} to ${target.nav} on ${viewport.name} case ${index + 1}`, async (page) => {
    await openApp(page, start.path, { authenticated: true, viewport, theme: index % 2 ? "light" : "dark" });
    await page.getByRole("link", { name: target.nav }).click();
    await expect(page).toHaveURL(new RegExp(`${target.path}$`));
    await expectProtectedShell(page, target.heading, target.nav);
  });
}

for (let index = 0; index < 24; index += 1) {
  const variant = variantFor(index);
  const target = protectedPages[index % protectedPages.length];
  add(`theme toggle flips document mode on ${target.nav} ${variant.name} ${variant.theme}`, async (page) => {
    await openApp(page, target.path, { authenticated: true, viewport: variant, theme: variant.theme });
    const before = await page.locator("html").getAttribute("data-theme");
    await page.getByRole("button", { name: /Switch to/ }).click();
    const after = await page.locator("html").getAttribute("data-theme");
    expect(after).not.toBe(before);
  });
}

for (let index = 0; index < 6; index += 1) {
  const variant = variantFor(index);
  add(`theme preference persists from local storage on ${variant.name} ${variant.theme}`, async (page) => {
    await openApp(page, "/guide", { authenticated: true, viewport: variant, theme: variant.theme });
    await expect(page.locator("html")).toHaveAttribute("data-theme", variant.theme);
  });
}

const guideCards = ["City Navigation Tips", "Public Transport Guide"];
for (let index = 0; index < 12; index += 1) {
  const variant = variantFor(index);
  const card = guideCards[index % guideCards.length];
  add(`guide card ${card} is visible on ${variant.name} ${variant.theme}`, async (page) => {
    await openApp(page, "/guide", { authenticated: true, viewport: variant, theme: variant.theme });
    await expect(page.getByRole("heading", { name: card })).toBeVisible();
  });
}

for (let index = 0; index < 6; index += 1) {
  const variant = variantFor(index);
  add(`guide page keeps action controls visible on ${variant.name} ${variant.theme}`, async (page) => {
    await openApp(page, "/guide", { authenticated: true, viewport: variant, theme: variant.theme });
    await expect(page.getByRole("button").last()).toBeVisible();
    await expect(page.getByText("Travel help and tips")).toBeVisible();
  });
}

const travelModes = ["Car", "Bike", "Local transport", "Walk"];
for (let index = 0; index < 24; index += 1) {
  const variant = variantFor(index);
  const mode = travelModes[index % travelModes.length];
  add(`travel route succeeds for ${mode} on ${variant.name} ${variant.theme}`, async (page) => {
    await openApp(page, "/travel", { authenticated: true, viewport: variant, theme: variant.theme });
    await findTravelRoute(page, mode);
    await expect(page.getByText("Swipe down to collapse")).toBeVisible();
    await expect(page.getByText("Showing next metro service at 10:18 AM")).toBeVisible();
  });
}

const localSwitches = ["Use Buses", "Use Locals", "Use Metro"];
for (let index = 0; index < 18; index += 1) {
  const variant = variantFor(index);
  const switchName = localSwitches[index % localSwitches.length];
  add(`travel local switch ${switchName} toggles on ${variant.name} ${variant.theme}`, async (page) => {
    await openApp(page, "/travel", { authenticated: true, viewport: variant, theme: variant.theme });
    const control = page.getByRole("switch", { name: switchName });
    await expect(control).toHaveAttribute("aria-checked", "true");
    await control.click();
    await expect(control).toHaveAttribute("aria-checked", "false");
  });
}

const routeFailureModes: ApiMode[] = ["empty", "error", "network"];
for (let index = 0; index < 18; index += 1) {
  const variant = variantFor(index);
  const routeMode = routeFailureModes[index % routeFailureModes.length];
  add(`travel route ${routeMode} failure shows notice on ${variant.name} ${variant.theme}`, async (page) => {
    await openApp(page, "/travel", { authenticated: true, viewport: variant, theme: variant.theme, routeMode });
    await chooseTravelLocations(page);
    await page.getByRole("button", { name: "Find Route" }).click();
    await expect(page.getByText(routeMode === "network" ? "Could not find a route right now." : "No route found for the selected travel modes.")).toBeVisible();
  });
}

for (let index = 0; index < 12; index += 1) {
  const variant = variantFor(index);
  add(`travel saved place applies destination on ${variant.name} ${variant.theme} case ${index + 1}`, async (page) => {
    await openApp(page, "/travel", { authenticated: true, viewport: variant, theme: variant.theme });
    await page.getByRole("button", { name: "Office", exact: true }).click();
    await expect(page.getByPlaceholder("To...")).toHaveValue("Bandra Kurla Complex");
  });
}

for (let index = 0; index < 12; index += 1) {
  const variant = variantFor(index);
  add(`travel add saved place flow works on ${variant.name} ${variant.theme} case ${index + 1}`, async (page) => {
    await openApp(page, "/travel", { authenticated: true, viewport: variant, theme: variant.theme });
    await page.getByRole("button", { name: "Add" }).click();
    await page.getByPlaceholder("Label (e.g. Home, Gym, Office)").fill(`Gym ${index + 1}`);
    await page.getByPlaceholder("Search address...").fill("powai");
    await page.getByRole("button", { name: "Powai Lake" }).click();
    await page.getByRole("button", { name: "Save Place", exact: true }).click();
    await expect(page.getByRole("button", { name: `Gym ${index + 1}`, exact: true })).toBeVisible();
  });
}

for (let index = 0; index < 6; index += 1) {
  const variant = variantFor(index);
  add(`travel delete saved place removes shortcut on ${variant.name} ${variant.theme}`, async (page) => {
    await openApp(page, "/travel", { authenticated: true, viewport: variant, theme: variant.theme });
    await page.getByRole("button", { name: "Delete saved place Office" }).click();
    await expect(page.getByRole("button", { name: "Office", exact: true })).toHaveCount(0);
  });
}

const travelFields = ["From...", "To..."];
for (let index = 0; index < 12; index += 1) {
  const variant = variantFor(index);
  const field = travelFields[index % travelFields.length];
  add(`travel ${field} suggestions can be selected on ${variant.name} ${variant.theme}`, async (page) => {
    await openApp(page, "/travel", { authenticated: true, viewport: variant, theme: variant.theme });
    await page.getByPlaceholder(field).fill("andheri");
    await page.getByRole("button", { name: "Andheri Station" }).click();
    await expect(page.getByPlaceholder(field)).toHaveValue("Andheri Station");
  });
}

add("travel search keeps only the latest locality results after replacement", async (page) => {
  await openApp(page, "/travel", {
    authenticated: true,
    viewport: viewports[0],
    theme: "dark",
    searchMode: "stale",
  });

  const field = page.getByPlaceholder("From...");
  const firstRequest = page.waitForRequest((request) => {
    const url = new URL(request.url());
    return (
      url.origin === backendOrigin &&
      url.pathname === "/api/search" &&
      url.searchParams.get("q") === "kandivali"
    );
  });

  await field.fill("kandivali");
  await firstRequest;
  await field.fill("");
  await field.fill("powai");
  await expect(page.getByRole("button", { name: "Powai Lake", exact: true })).toBeVisible();
  await wait(900);
  await expect(page.getByRole("button", { name: "Kandivali", exact: true })).toHaveCount(0);
});

add("travel search deduplicates same-named locality suggestions", async (page) => {
  await openApp(page, "/travel", {
    authenticated: true,
    viewport: viewports[2],
    theme: "light",
    searchMode: "duplicate-names",
  });

  await page.getByPlaceholder("To...").fill("kandivali");
  await expect(page.getByRole("button", { name: "Kandivali", exact: true })).toHaveCount(1);
  await expect(page.getByRole("button", { name: "Kandivali West", exact: true })).toBeVisible();
});

for (let index = 0; index < 6; index += 1) {
  const variant = variantFor(index);
  add(`travel route option selector changes active option on ${variant.name} ${variant.theme}`, async (page) => {
    await openApp(page, "/travel", { authenticated: true, viewport: variant, theme: variant.theme });
    await findTravelRoute(page);
    await page.getByRole("button", { name: /Option 2/ }).click();
    await expect(page.getByRole("button", { name: /Option 2/ })).toHaveClass(/bg-primary/);
  });
}

for (let index = 0; index < 6; index += 1) {
  const variant = variantFor(index);
  add(`travel bottom sheet collapses and expands on ${variant.name} ${variant.theme}`, async (page) => {
    await openApp(page, "/travel", { authenticated: true, viewport: variant, theme: variant.theme });
    await findTravelRoute(page);
    await page.getByText("Swipe down to collapse").click();
    await expect(page.getByText(/Tap to expand/)).toBeVisible();
  });
}

for (let index = 0; index < 6; index += 1) {
  const variant = variantFor(index);
  add(`travel disables route when all local transport is off on ${variant.name} ${variant.theme}`, async (page) => {
    await openApp(page, "/travel", { authenticated: true, viewport: variant, theme: variant.theme });
    for (const switchName of localSwitches) {
      await page.getByRole("switch", { name: switchName }).click();
    }
    await chooseTravelLocations(page);
    await expect(page.getByText("Select at least one local transport mode.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Find Route" })).toBeDisabled();
  });
}

const travelStepLabels = ["Walk", "Metro", "Bus"];
for (let index = 0; index < 18; index += 1) {
  const variant = variantFor(index);
  const label = travelStepLabels[index % travelStepLabels.length];
  add(`travel route details include ${label} step on ${variant.name} ${variant.theme}`, async (page) => {
    await openApp(page, "/travel", { authenticated: true, viewport: variant, theme: variant.theme });
    await findTravelRoute(page);
    await expect(page.getByText(label).first()).toBeVisible();
  });
}

for (let index = 0; index < 6; index += 1) {
  const variant = variantFor(index);
  add(`travel map shell renders on ${variant.name} ${variant.theme}`, async (page) => {
    await openApp(page, "/travel", { authenticated: true, viewport: variant, theme: variant.theme });
    await expect(page.locator(".leaflet-container")).toBeVisible();
  });
}

for (let index = 0; index < 6; index += 1) {
  const variant = variantFor(index);
  add(`travel empty saved places still exposes add shortcut on ${variant.name} ${variant.theme}`, async (page) => {
    await openApp(page, "/travel", { authenticated: true, viewport: variant, theme: variant.theme, places: [] });
    await expect(page.getByRole("button", { name: "Add" })).toBeVisible();
  });
}

const meetFields = ["Location A", "Location B"];
for (let index = 0; index < 12; index += 1) {
  const variant = variantFor(index);
  const field = meetFields[index % meetFields.length];
  add(`meet ${field} suggestions can be selected on ${variant.name} ${variant.theme}`, async (page) => {
    await openApp(page, "/meet", { authenticated: true, viewport: variant, theme: variant.theme });
    await page.getByPlaceholder(field).fill("andheri");
    await page.getByRole("button", { name: "Andheri Station" }).click();
    await expect(page.getByPlaceholder(field)).toHaveValue("Andheri Station");
  });
}

add("meet search keeps only the latest locality results after replacement", async (page) => {
  await openApp(page, "/meet", {
    authenticated: true,
    viewport: viewports[1],
    theme: "dark",
    searchMode: "stale",
  });

  const field = page.getByPlaceholder("Location A");
  const firstRequest = page.waitForRequest((request) => {
    const url = new URL(request.url());
    return (
      url.origin === backendOrigin &&
      url.pathname === "/api/search" &&
      url.searchParams.get("q") === "kandivali"
    );
  });

  await field.fill("kandivali");
  await firstRequest;
  await field.fill("");
  await field.fill("powai");
  await expect(page.getByRole("button", { name: "Powai Lake", exact: true })).toBeVisible();
  await wait(900);
  await expect(page.getByRole("button", { name: "Kandivali", exact: true })).toHaveCount(0);
});

add("meet search deduplicates same-named locality suggestions", async (page) => {
  await openApp(page, "/meet", {
    authenticated: true,
    viewport: viewports[2],
    theme: "light",
    searchMode: "duplicate-names",
  });

  await page.getByPlaceholder("Location B").fill("kandivali");
  await expect(page.getByRole("button", { name: "Kandivali", exact: true })).toHaveCount(1);
  await expect(page.getByRole("button", { name: "Kandivali West", exact: true })).toBeVisible();
});

for (let index = 0; index < 12; index += 1) {
  const variant = variantFor(index);
  add(`meet search returns ranked places on ${variant.name} ${variant.theme} case ${index + 1}`, async (page) => {
    await openApp(page, "/meet", { authenticated: true, viewport: variant, theme: variant.theme });
    await findMeetResults(page);
    await expect(page.getByRole("button", { name: /Garden Court/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /Metro Mall/ })).toBeVisible();
  });
}

const meetCategories = ["Cafe", "Restaurant", "Mall"];
for (let index = 0; index < 18; index += 1) {
  const variant = variantFor(index);
  const category = meetCategories[index % meetCategories.length];
  add(`meet category filter ${category} narrows results on ${variant.name} ${variant.theme}`, async (page) => {
    await openApp(page, "/meet", { authenticated: true, viewport: variant, theme: variant.theme });
    await findMeetResults(page);
    await page.getByLabel(category).check();
    await expect(page.getByText(category).first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Show all" })).toBeVisible();
  });
}

const routeSides = ["A", "B"] as const;
for (let index = 0; index < 12; index += 1) {
  const variant = variantFor(index);
  const side = routeSides[index % routeSides.length];
  add(`meet route from user ${side} loads steps on ${variant.name} ${variant.theme}`, async (page) => {
    await openApp(page, "/meet", { authenticated: true, viewport: variant, theme: variant.theme });
    await findMeetResults(page);
    await page.getByRole("button", { name: `Route from User ${side}` }).click();
    await page.getByRole("button", { name: "Show route" }).click();
    await expect(page.getByText(/public route/)).toBeVisible();
    await expect(page.getByText("Metro").first()).toBeVisible();
  });
}

for (let index = 0; index < 6; index += 1) {
  const variant = variantFor(index);
  add(`meet route option selector switches itinerary on ${variant.name} ${variant.theme}`, async (page) => {
    await openApp(page, "/meet", { authenticated: true, viewport: variant, theme: variant.theme });
    await findMeetResults(page);
    await page.getByRole("button", { name: "Show route" }).click();
    await page.getByRole("button", { name: /Option 2/ }).click();
    await expect(page.getByRole("button", { name: /Option 2/ })).toHaveClass(/bg-primary/);
  });
}

for (let index = 0; index < 18; index += 1) {
  const variant = variantFor(index);
  const routeMode = routeFailureModes[index % routeFailureModes.length];
  add(`meet route ${routeMode} failure is messaged on ${variant.name} ${variant.theme}`, async (page) => {
    await openApp(page, "/meet", { authenticated: true, viewport: variant, theme: variant.theme, routeMode });
    await findMeetResults(page);
    await page.getByRole("button", { name: "Show route" }).click();
    await expect(page.getByText(routeMode === "network" ? "Could not load the route right now." : "No public transport route found for this side.")).toBeVisible();
  });
}

for (let index = 0; index < 18; index += 1) {
  const variant = variantFor(index);
  const meetMode = routeFailureModes[index % routeFailureModes.length];
  add(`meet search ${meetMode} response is handled on ${variant.name} ${variant.theme}`, async (page) => {
    await openApp(page, "/meet", { authenticated: true, viewport: variant, theme: variant.theme, meetMode });
    await chooseMeetLocations(page);
    await page.getByRole("button", { name: "Find Meeting Point" }).click();
    await expect(page.getByText(meetMode === "empty" ? "No named meeting spots were found after expanding the search." : "Could not finish the meeting spot search right now.")).toBeVisible();
  });
}

const meetResultNames = ["Central Cafe", "Garden Court", "Metro Mall"];
for (let index = 0; index < 18; index += 1) {
  const variant = variantFor(index);
  const place = meetResultNames[index % meetResultNames.length];
  add(`meet result ${place} can be selected on ${variant.name} ${variant.theme}`, async (page) => {
    await openApp(page, "/meet", { authenticated: true, viewport: variant, theme: variant.theme });
    await findMeetResults(page);
    await page.getByRole("button", { name: new RegExp(place) }).click();
    await expect(page.getByText(new RegExp(`User A to ${place}`))).toBeVisible();
  });
}

for (let index = 0; index < 12; index += 1) {
  const variant = variantFor(index);
  const field = meetFields[index % meetFields.length];
  const clearName = field === "Location A" ? "Clear location A" : "Clear location B";
  add(`meet ${field} clear control resets input on ${variant.name} ${variant.theme}`, async (page) => {
    await openApp(page, "/meet", { authenticated: true, viewport: variant, theme: variant.theme });
    await page.getByPlaceholder(field).fill("andheri");
    await page.getByRole("button", { name: clearName }).click();
    await expect(page.getByPlaceholder(field)).toHaveValue("");
  });
}

for (let index = 0; index < 6; index += 1) {
  const variant = variantFor(index);
  add(`meet route side toggle updates selected side on ${variant.name} ${variant.theme}`, async (page) => {
    await openApp(page, "/meet", { authenticated: true, viewport: variant, theme: variant.theme });
    await findMeetResults(page);
    await page.getByRole("button", { name: "Route from User B" }).click();
    await expect(page.getByText("User B to Central Cafe")).toBeVisible();
  });
}

for (let index = 0; index < 8; index += 1) {
  const variant = variantFor(index);
  add(`meet map shell renders on ${variant.name} ${variant.theme} case ${index + 1}`, async (page) => {
    await openApp(page, "/meet", { authenticated: true, viewport: variant, theme: variant.theme });
    await expect(page.locator(".leaflet-container")).toBeVisible();
  });
}

const tierProfiles = [
  defaultProfile({ stats: { tripsCount: 1, savedPlacesCount: 1, activityCount: 2 } }),
  defaultProfile({ stats: { tripsCount: 4, savedPlacesCount: 1, activityCount: 3 } }),
  defaultProfile({ stats: { tripsCount: 10, savedPlacesCount: 3, activityCount: 5 } }),
];
const tierLabels = ["Explorer", "Silver Member", "Gold Member"];
for (let index = 0; index < 18; index += 1) {
  const variant = variantFor(index);
  const tierIndex = index % tierProfiles.length;
  add(`profile member tier ${tierLabels[tierIndex]} renders on ${variant.name} ${variant.theme}`, async (page) => {
    await openApp(page, "/profile", { authenticated: true, viewport: variant, theme: variant.theme, profile: tierProfiles[tierIndex] });
    await expect(page.getByText(tierLabels[tierIndex])).toBeVisible();
  });
}

const emptyProfileCases = [
  defaultProfile({ savedPlaces: [], stats: { tripsCount: 8, savedPlacesCount: 0, activityCount: 3 } }),
  defaultProfile({ recentTrips: [], stats: { tripsCount: 0, savedPlacesCount: 2, activityCount: 3 } }),
  defaultProfile({ recentActivity: [], stats: { tripsCount: 8, savedPlacesCount: 2, activityCount: 0 } }),
];
const emptyTexts = ["No saved places yet", "No trips yet", "No activity yet"];
for (let index = 0; index < 18; index += 1) {
  const variant = variantFor(index);
  const emptyIndex = index % emptyProfileCases.length;
  add(`profile empty state ${emptyTexts[emptyIndex]} renders on ${variant.name} ${variant.theme}`, async (page) => {
    await openApp(page, "/profile", { authenticated: true, viewport: variant, theme: variant.theme, profile: emptyProfileCases[emptyIndex] });
    if (emptyIndex === 2) {
      await page.getByText("Recent Changes").click();
    }
    await expect(page.getByText(emptyTexts[emptyIndex])).toBeVisible();
  });
}

for (let index = 0; index < 6; index += 1) {
  const variant = variantFor(index);
  add(`profile display name can be saved on ${variant.name} ${variant.theme}`, async (page) => {
    await openApp(page, "/profile", { authenticated: true, viewport: variant, theme: variant.theme });
    await page.getByPlaceholder("Your name").fill(`Mira ${index + 1}`);
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.getByText("Profile updated successfully")).toBeVisible();
    await expect(page.getByRole("heading", { name: `Mira ${index + 1}` })).toBeVisible();
  });
}

for (let index = 0; index < 6; index += 1) {
  const variant = variantFor(index);
  add(`profile avatar URL can be saved on ${variant.name} ${variant.theme}`, async (page) => {
    await openApp(page, "/profile", { authenticated: true, viewport: variant, theme: variant.theme });
    await page.getByPlaceholder("https://...").fill(`https://example.com/avatar-${index + 1}.png`);
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.getByText("Profile updated successfully")).toBeVisible();
  });
}

for (let index = 0; index < 6; index += 1) {
  const variant = variantFor(index);
  add(`profile save errors are shown on ${variant.name} ${variant.theme}`, async (page) => {
    await openApp(page, "/profile", { authenticated: true, viewport: variant, theme: variant.theme, profilePatchMode: "error" });
    await page.getByPlaceholder("Your name").fill(`Broken ${index + 1}`);
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.getByText("Failed to update profile")).toBeVisible();
  });
}

const preferenceNames = ["Toggle Notifications", "Toggle Private Profile"];
for (let index = 0; index < 12; index += 1) {
  const variant = variantFor(index);
  const preference = preferenceNames[index % preferenceNames.length];
  add(`profile preference ${preference} can be toggled on ${variant.name} ${variant.theme}`, async (page) => {
    await openApp(page, "/profile", { authenticated: true, viewport: variant, theme: variant.theme });
    await page.getByRole("button", { name: preference }).click();
    await expect(page.getByText("Profile updated successfully")).toBeVisible();
  });
}

for (let index = 0; index < 6; index += 1) {
  const variant = variantFor(index);
  add(`profile saved place delete refreshes list on ${variant.name} ${variant.theme}`, async (page) => {
    await openApp(page, "/profile", { authenticated: true, viewport: variant, theme: variant.theme });
    await page.getByRole("button", { name: "Delete" }).first().click();
    await expect(page.getByText("Office").first()).toHaveCount(0);
  });
}

for (let index = 0; index < 6; index += 1) {
  const variant = variantFor(index);
  add(`profile recent changes expands on ${variant.name} ${variant.theme}`, async (page) => {
    await openApp(page, "/profile", { authenticated: true, viewport: variant, theme: variant.theme });
    await page.getByText("Recent Changes").click();
    await expect(page.getByText("Updated profile")).toBeVisible();
  });
}

for (let index = 0; index < 6; index += 1) {
  const variant = variantFor(index);
  add(`profile logout returns to login on ${variant.name} ${variant.theme}`, async (page) => {
    await openApp(page, "/profile", { authenticated: true, viewport: variant, theme: variant.theme });
    await page.getByRole("button", { name: "Log Out" }).click();
    await expect(page).toHaveURL(/\/login$/);
  });
}

const profileLoadModes: ApiMode[] = ["error", "network", "error"];
for (let index = 0; index < 18; index += 1) {
  const variant = variantFor(index);
  const profileMode = profileLoadModes[index % profileLoadModes.length];
  add(`profile ${profileMode} load failure renders fallback on ${variant.name} ${variant.theme}`, async (page) => {
    await openApp(page, "/profile", { authenticated: true, viewport: variant, theme: variant.theme, profileMode });
    await expect(page.getByText("Failed to load profile")).toBeVisible();
  });
}

for (let index = 0; index < 6; index += 1) {
  const variant = variantFor(index);
  add(`profile form fields hydrate from payload on ${variant.name} ${variant.theme}`, async (page) => {
    await openApp(page, "/profile", { authenticated: true, viewport: variant, theme: variant.theme });
    await expect(page.getByPlaceholder("Your name")).toHaveValue("Mira Shah");
    await expect(page.getByText("mira@example.com")).toBeVisible();
  });
}

for (let index = 0; index < 6; index += 1) {
  const variant = variantFor(index);
  add(`profile stats display trips saved and activity on ${variant.name} ${variant.theme}`, async (page) => {
    await openApp(page, "/profile", { authenticated: true, viewport: variant, theme: variant.theme });
    const stats = page.locator("section").first();
    await expect(stats.getByText("Trips")).toBeVisible();
    await expect(stats.getByText("Saved")).toBeVisible();
    await expect(stats.getByText("Activity")).toBeVisible();
  });
}

const activityLabels = ["Saved place", "Planned route", "Searched meet point", "Updated profile", "Removed place"];
for (let index = 0; index < 12; index += 1) {
  const variant = variantFor(index);
  const label = activityLabels[index % activityLabels.length];
  add(`profile activity label ${label} appears on ${variant.name} ${variant.theme}`, async (page) => {
    await openApp(page, "/profile", { authenticated: true, viewport: variant, theme: variant.theme });
    await page.getByText("Recent Changes").click();
    await expect(page.getByText(label).first()).toBeVisible();
  });
}

for (let index = 0; index < 4; index += 1) {
  const variant = variantFor(index);
  add(`profile save button starts disabled case ${index + 1} on ${variant.name} ${variant.theme}`, async (page) => {
    await openApp(page, "/profile", { authenticated: true, viewport: variant, theme: variant.theme });
    await expect(page.getByRole("button", { name: "Save" })).toBeDisabled();
  });
}

if (cases.length !== 604) {
  throw new Error(`Expected to register 604 Playwright cases, got ${cases.length}`);
}

test.describe.configure({ mode: "parallel" });

for (const [index, medioCase] of cases.entries()) {
  test(`${String(index + 1).padStart(3, "0")} ${medioCase.title}`, async ({ page }, testInfo) => {
    await medioCase.run(page, testInfo);
  });
}
