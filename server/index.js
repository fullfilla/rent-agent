import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { existsSync, createReadStream } from "node:fs";
import { extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const rootDir = resolve(__dirname, "..");
const distDir = join(rootDir, "dist");
const port = Number(process.env.PORT || 3000);

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".ico": "image/x-icon",
};

const providers = {
  beike: {
    label: "贝壳",
    baseUrl: process.env.BEIKE_API_BASE_URL,
    endpoint: process.env.BEIKE_API_ENDPOINT || "/rent/listings",
    apiKey: process.env.BEIKE_API_KEY,
  },
  anjuke: {
    label: "安居客",
    baseUrl: process.env.ANJUKE_API_BASE_URL,
    endpoint: process.env.ANJUKE_API_ENDPOINT || "/rent/listings",
    apiKey: process.env.ANJUKE_API_KEY,
  },
  wuba: {
    label: "58同城",
    baseUrl: process.env.WUBA_API_BASE_URL,
    endpoint: process.env.WUBA_API_ENDPOINT || "/rent/listings",
    apiKey: process.env.WUBA_API_KEY,
  },
};

function sendJson(res, status, payload) {
  res.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(payload));
}

function isConfigured(provider) {
  return Boolean(provider.baseUrl && provider.apiKey);
}

async function fetchProviderListings(key, provider, query) {
  if (!isConfigured(provider)) {
    return { provider: key, label: provider.label, configured: false, listings: [] };
  }

  const url = new URL(provider.endpoint, provider.baseUrl);
  query.forEach((value, name) => {
    url.searchParams.set(name, value);
  });

  const response = await fetch(url, {
    headers: {
      authorization: `Bearer ${provider.apiKey}`,
      "x-api-key": provider.apiKey,
      accept: "application/json",
    },
  });

  if (!response.ok) {
    return {
      provider: key,
      label: provider.label,
      configured: true,
      error: `HTTP ${response.status}`,
      listings: [],
    };
  }

  const data = await response.json();
  const listings = Array.isArray(data) ? data : Array.isArray(data.listings) ? data.listings : [];
  return { provider: key, label: provider.label, configured: true, listings };
}

async function handleApiListings(req, res) {
  const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
  const providerParam = url.searchParams.get("provider");
  const entries = Object.entries(providers).filter(([key]) => !providerParam || providerParam === "all" || providerParam === key);

  const results = await Promise.all(entries.map(([key, provider]) => fetchProviderListings(key, provider, url.searchParams)));
  const listings = results.flatMap((result) => result.listings);

  sendJson(res, 200, {
    mode: listings.length > 0 ? "provider-api" : "mock-fallback",
    providers: results.map(({ provider, label, configured, error }) => ({ provider, label, configured, error })),
    listings,
  });
}

async function serveStatic(req, res) {
  const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
  const safePath = url.pathname === "/" ? "/index.html" : decodeURIComponent(url.pathname);
  const filePath = resolve(distDir, `.${safePath}`);

  if (!filePath.startsWith(distDir)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  const target = existsSync(filePath) ? filePath : join(distDir, "index.html");
  const ext = extname(target);
  res.writeHead(200, { "content-type": mimeTypes[ext] || "application/octet-stream" });
  createReadStream(target).pipe(res);
}

const server = createServer(async (req, res) => {
  try {
    if (req.url?.startsWith("/api/health")) {
      sendJson(res, 200, { ok: true });
      return;
    }

    if (req.url?.startsWith("/api/listings")) {
      await handleApiListings(req, res);
      return;
    }

    await serveStatic(req, res);
  } catch (error) {
    sendJson(res, 500, { error: error instanceof Error ? error.message : "Unknown server error" });
  }
});

if (!existsSync(join(distDir, "index.html"))) {
  console.error("dist/index.html not found. Run `npm run build` before `npm start`.");
  process.exit(1);
}

server.listen(port, "0.0.0.0", () => {
  console.log(`Rent Agent server listening on http://0.0.0.0:${port}`);
});
