import { setGlobalDispatcher, Agent } from "undici";

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

// Force Node native fetch to bypass TLS validation
setGlobalDispatcher(new Agent({ connect: { rejectUnauthorized: false } }));

export const env = {
  NODE_ENV:                  process.env.NODE_ENV as "production" | "development",
  PROXMOX_TOKEN:             process.env.PROXMOX_TOKEN,
  HA_URL:                    "http://192.168.50.135:8123/health",
  PROXMOX_HOST:              "https://192.168.50.244:8006",
  PROXMOX_NODE:              "proxmox",
  HA_VM_ID:                  "100",
  CHECK_INTERVAL_MS:         10 * 1000,
  UI_LOAD_TIMEOUT_MS:        2.5 * 1000,
  REINIT_BROWSER_LOOPS_TIME: 12, // In hours
  REINIT_BROWSER_LOOPS: 0,
};

// Dynamically calculated based on the set REINIT_BROWSER_LOOPS_TIME
env.REINIT_BROWSER_LOOPS = (env.REINIT_BROWSER_LOOPS_TIME * 60 * 60 * 1000) / env.CHECK_INTERVAL_MS; 