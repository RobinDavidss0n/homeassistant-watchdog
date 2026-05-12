import { setGlobalDispatcher, Agent } from "undici";

// Force Node native fetch to bypass TLS validation
setGlobalDispatcher(new Agent({ connect: { rejectUnauthorized: false } }));

export const env = {
  NODE_ENV:                         process.env.NODE_ENV as "production" | "development",
  PROXMOX_TOKEN:                    process.env.PROXMOX_TOKEN,
  PROXMOX_HOST:                     process.env.PROXMOX_HOST              ?? "https://192.168.50.244:8006",
  PROXMOX_NODE:                     process.env.PROXMOX_NODE              ?? "proxmox",
  HA_TOKEN:                         process.env.HA_TOKEN,
  HA_BASE_URL:                      process.env.HA_BASE_URL               ?? "http://192.168.50.135:8123",
  HA_NOTIFY_SERVICE:                process.env.HA_NOTIFY_SERVICE         ?? "mobile_app_robins_oneplus_13",
  HA_HEALTH_DASH_URL_PATH:          process.env.HA_HEALTH_DASH_URL_PATH   ?? "health-check/0",
  HA_VM_ID:                         process.env.HA_VM_ID                  ?? "100",
  HA_HEALTH_DASH_TEXT:              process.env.HA_HEALTH_DASH_TEXT       ?? "I'm healthy :)",
  FAIL_SCREENSHOT_PATH:             "/ha-watchdog",
  CHECK_INTERVAL_MS:                30 * 1000,
  UI_LOAD_TIMEOUT_MS:               5 * 1000,
  FAILS_BEFORE_RESTART:             3,
  REINIT_BROWSER_LOOPS_TIME_HOURS:  12,
  WAIT_AFTER_JOB_DETECTED_MINUTES:  2,
  WAIT_AFTER_RESTART_MINUTES:       5,

  // Debugging options
  LOG_HA_JOBS_OUTPUT:               false,
  /** Only run one time then stops */
  DEMO_RUN:                         false,

  // Dynamically auto set
  REINIT_BROWSER_LOOPS:             null,
};


if(env.NODE_ENV === "development") {
  env.CHECK_INTERVAL_MS =                5 * 1000;
  env.UI_LOAD_TIMEOUT_MS =               2 * 1000;
  env.FAILS_BEFORE_RESTART =             3;
  env.REINIT_BROWSER_LOOPS_TIME_HOURS =  0.01;
  env.WAIT_AFTER_JOB_DETECTED_MINUTES =  0.25;
  env.WAIT_AFTER_RESTART_MINUTES =       1;
}

// Dynamically calculated based on the set REINIT_BROWSER_LOOPS_TIME_HOURS
env.REINIT_BROWSER_LOOPS = (env.REINIT_BROWSER_LOOPS_TIME_HOURS * 60 * 60 * 1000) / env.CHECK_INTERVAL_MS; 

export const getProxmoxAuthHeader = () => 
  env.PROXMOX_TOKEN.startsWith("PVEAPIToken=") 
    ? env.PROXMOX_TOKEN 
    : `PVEAPIToken=${env.PROXMOX_TOKEN}`;