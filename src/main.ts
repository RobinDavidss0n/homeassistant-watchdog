import { Browser, BrowserContext, chromium, Page } from "playwright";
import { env } from "./env";
import { logger } from "./logger";
import { restartHaVm } from "./proxmox";
import { hasActiveJobs } from "./ha-jobs";

async function run() {

  while (true) {

    await new Promise(resolve => setTimeout(resolve, env.CHECK_INTERVAL_MS));
    
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
      
      logger.info("Initializing Playwright for UI health check");
      
      browser = await chromium.launch({ headless: true });
      context = await browser.newContext({ ignoreHTTPSErrors: true });
      page    = await context.newPage();
    
      let loops = 0;
      const BYTES_TO_MB = 1024 * 1024;
    
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
          
          logger.info("UI health check passed, core component loaded");
      
        } catch (error) {
          logger.error("UI health check failed, loading screen hang detected", error);
      
          const isWorking = await hasActiveJobs();
      
          if (isWorking) {
            logger.info("Supervisor has active jobs. Deferring restart.");

            await cleanup(false);
            context = await browser.newContext({ ignoreHTTPSErrors: true });
            page    = await context.newPage();

          } else {
            await restartHaVm();
            break; // Exit loop after triggering restart, reinitializing browser
          }
          
        }
    
        await new Promise(resolve => setTimeout(resolve, env.CHECK_INTERVAL_MS));
      }
      
      await cleanup(true);
  
    } catch (error) {
      logger.error("Unexpected error in watchdog main loop", error);
  
      await cleanup(true);
    }
  }

};

logger.info("Watchdog service started");

run();