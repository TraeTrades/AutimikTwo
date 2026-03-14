export type DealerPlatform =
  | "dealercom"
  | "dealeron"
  | "dealerinspire"
  | "dealersocket"
  | "dealercenter"
  | "wordpress"
  | "unknown";

interface DetectionResult {
  platform: DealerPlatform;
  confidence: number;
  hints: string[];
}

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36";

export async function detectPlatform(url: string): Promise<DetectionResult> {
  const hints: string[] = [];
  const scores: Record<DealerPlatform, number> = {
    dealercom: 0,
    dealeron: 0,
    dealerinspire: 0,
    dealersocket: 0,
    dealercenter: 0,
    wordpress: 0,
    unknown: 0,
  };

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(url, {
      headers: {
        "User-Agent": USER_AGENT,
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      redirect: "follow",
      signal: controller.signal,
    });
    clearTimeout(timeout);

    const headers = Object.fromEntries(res.headers.entries());
    const body = await res.text();
    const bodyLower = body.toLowerCase();

    if (headers["server"]?.includes("dealer.com") || bodyLower.includes("dealer.com/content")) {
      scores.dealercom += 3;
      hints.push("server header or content references dealer.com");
    }
    if (bodyLower.includes("dealeron") || bodyLower.includes("dealeron.com")) {
      scores.dealeron += 3;
      hints.push("page references dealeron");
    }
    if (bodyLower.includes("dealerinspire") || bodyLower.includes("di-cdn")) {
      scores.dealerinspire += 3;
      hints.push("page references dealerinspire");
    }
    if (bodyLower.includes("dealersocket") || bodyLower.includes("idms")) {
      scores.dealersocket += 3;
      hints.push("page references dealersocket/idms");
    }
    if (
      bodyLower.includes("dealercenter") ||
      bodyLower.includes("dealercenterwebsite") ||
      (headers["set-cookie"] || "").includes("dealercenter")
    ) {
      scores.dealercenter += 3;
      hints.push("page references dealercenter");
    }
    if (bodyLower.includes("wp-content") || bodyLower.includes("wordpress")) {
      scores.wordpress += 2;
      hints.push("wordpress detected");
    }

    if (bodyLower.includes("/inventory/srp") || bodyLower.includes("ddc-")) {
      scores.dealercom += 2;
      hints.push("ddc/srp pattern found");
    }
    if (bodyLower.includes("foxdealer") || bodyLower.includes("dealerfire")) {
      scores.dealerinspire += 1;
      hints.push("related platform reference");
    }

    const urlLower = url.toLowerCase();
    if (urlLower.includes("dealer.com")) {
      scores.dealercom += 2;
      hints.push("URL contains dealer.com");
    }

    const cfBlocked =
      body.includes("Just a moment") ||
      body.includes("Attention Required") ||
      body.includes("Checking your browser") ||
      body.includes("cf-browser-verification");

    if (cfBlocked) {
      hints.push("cloudflare challenge detected in response");
      if (bodyLower.includes("dealercenterwebsite.net")) {
        scores.dealercenter += 3;
        hints.push("cloudflare error references dealercenterwebsite.net");
      }
    }
  } catch (e: any) {
    hints.push(`fetch failed: ${e.message}`);
  }

  let bestPlatform: DealerPlatform = "unknown";
  let bestScore = 0;
  for (const [platform, score] of Object.entries(scores)) {
    if (score > bestScore) {
      bestScore = score;
      bestPlatform = platform as DealerPlatform;
    }
  }

  return {
    platform: bestScore >= 2 ? bestPlatform : "unknown",
    confidence: bestScore,
    hints,
  };
}

export interface ApiEndpoint {
  url: string;
  platform: DealerPlatform | "generic";
  responseShape: "array" | "nested" | "unknown";
}

export function getApiEndpoints(
  baseUrl: string,
  platform: DealerPlatform
): ApiEndpoint[] {
  const origin = new URL(baseUrl).origin;
  const endpoints: ApiEndpoint[] = [];

  const platformEndpoints: Record<string, string[]> = {
    dealercom: [
      "/api/inventory/search",
      "/apis/widget/INVENTORY_LISTING_DEFAULT_AUTO_ALL:inventory-702/vehicles",
      "/inventory/srp/ajax",
    ],
    dealeron: [
      "/api/inventory",
      "/inventory/search/json",
      "/api/v1/inventory",
    ],
    dealerinspire: [
      "/api/inventory",
      "/wp-json/di/v1/inventory",
      "/inventory.json",
    ],
    dealersocket: [
      "/api/inventory/search",
      "/inventory/json",
    ],
    dealercenter: [
      "/api/inventory",
      "/api/vehicles",
      "/inventory/search",
      "/used-vehicle-inventory/?format=json",
      "/vehicles/used",
    ],
    wordpress: [
      "/wp-json/wp/v2/inventory",
      "/wp-json/inventory/v1/vehicles",
    ],
  };

  const specificEndpoints = platformEndpoints[platform] || [];
  for (const ep of specificEndpoints) {
    endpoints.push({
      url: `${origin}${ep}`,
      platform,
      responseShape: "unknown",
    });
  }

  const genericEndpoints = [
    "/api/inventory",
    "/api/vehicles",
    "/api/inventory/search",
    "/inventory.json",
    "/data/inventory.json",
    "/feeds/inventory.xml",
    "/api/v1/vehicles",
    "/vehicles.json",
    "/api/search?type=vehicle",
    "/inventory/search.json",
  ];

  for (const ep of genericEndpoints) {
    const fullUrl = `${origin}${ep}`;
    if (!endpoints.some((e) => e.url === fullUrl)) {
      endpoints.push({
        url: fullUrl,
        platform: "generic",
        responseShape: "unknown",
      });
    }
  }

  return endpoints;
}
