import { Browser, BrowserContext, chromium, Page } from "playwright";
import { env } from "./env";
import { logger } from "./logger";
import { restartHaVm } from "./proxmox";
import { hasActiveJobs } from "./ha-jobs";

const module = "Main";

async function run() {

  while (true) {

    let browser: Browser;
    let context: BrowserContext;
    let page: Page;

    const cleanup = async (includeBrowser: boolean) => {

      await page   ?.close().catch(() => {});
      await context?.close().catch(() => {});

      if (includeBrowser)
        await browser?.close().catch(() => {});
    }
  
    try {
      
      logger.debug(module, "Initializing Playwright for UI health check");
      
      browser = await chromium.launch({ headless: true });
      context = await browser.newContext({ ignoreHTTPSErrors: true });
      page    = await context.newPage();
    
      let loops = 0;
    
      while (env.REINIT_BROWSER_LOOPS > loops) {
    
        loops++;
        
        try {
          await page.goto(
            env.HA_URL, 
            { 
              waitUntil: "domcontentloaded",
              timeout: env.UI_LOAD_TIMEOUT_MS 
            }
          );
          
          // Validates bypass of initial loading screen by verifying core app component presence
          await page.waitForSelector(
            "home-assistant",
            { timeout: env.UI_LOAD_TIMEOUT_MS }
          );
          
          logger.info(module, "UI health check passed, core component loaded");
      
        } catch (error) {
          logger.error(module, "UI health check failed, loading screen hang detected", error);
      
          const isWorking = await hasActiveJobs();
      
          // if (isWorking) {
          //   logger.info(module, "Supervisor has active jobs. Deferring restart.");

          //   await cleanup(false);
          //   context = await browser.newContext({ ignoreHTTPSErrors: true });
          //   page    = await context.newPage();

          // } else {
          //   await restartHaVm();
          //   break; // Exit loop after triggering restart, reinitializing browser
          // }
          
        }

        if(env.NODE_ENV === "development")
          break;
    
        await new Promise(resolve => setTimeout(resolve, env.CHECK_INTERVAL_MS));
      }
      
      await cleanup(true);
  
    } catch (error) {
      logger.error(module, "Unexpected error in watchdog main loop", error);
  
      await cleanup(true);
    }

    if(env.NODE_ENV === "development") {
      logger.debug(module, "Demo run done")
      break;
    }
  }

};

logger.info(module, "-- Watchdog service started --");
run();