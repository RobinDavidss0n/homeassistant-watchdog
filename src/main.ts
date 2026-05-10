import { Browser, BrowserContext, chromium, Page } from "playwright";
import { env } from "./env";
import { logger } from "./logger";
import { restartHaVm } from "./proxmox";
import { hasActiveJobs } from "./ha-jobs";
import dayjs from "dayjs";

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
      let activeFails = 0;
    
      while (env.REINIT_BROWSER_LOOPS > loops) {
    
        loops++;
        
        try {

          // throw new Error("Simulated UI failure for testing");

          await page.goto(
            env.HA_URL_HEALTH_DASH, 
            { 
              waitUntil: "networkidle",
              timeout: env.UI_LOAD_TIMEOUT_MS 
            }
          );
          
          await page.waitForSelector(
            `text="${env.HA_HEALTH_DASH_TEXT}"`,
            { timeout: env.UI_LOAD_TIMEOUT_MS }
          );
          
          logger.debug(module, "UI health check passed :)");

          if(activeFails > 0) {
            logger.info(module, `Healthy :) Resetting active fail count (was ${activeFails})`);
            activeFails = 0;
          }
      
        } catch (error) {

          logger.error(module, `UI health check failed :(`, error);
          
          const isWorking = await hasActiveJobs();
      
          if (isWorking) {
            logger.info(module, "But supervisor has active jobs :) Deferring restart.");

            await cleanup(false);
            context = await browser.newContext({ ignoreHTTPSErrors: true });
            page    = await context.newPage();

            logger.info(module, `Waiting ${env.WAIT_AFTER_JOB_DETECTED_MINUTES} minutes before rechecking...`);
            await new Promise(resolve => setTimeout(resolve, env.WAIT_AFTER_JOB_DETECTED_MINUTES * 60 * 1000));

          } else {
            
            activeFails++;

            if(env.FAILS_BEFORE_RESTART >= activeFails) {
            
              logger.info(module, `UI health check failed, no active jobs, but fail count (${activeFails}) is below threshold (${env.FAILS_BEFORE_RESTART}). Deferring restart.`);
            
            } else {

              logger.info(module, "No active jobs found. Restarting HA VM.");
  
              const timestamp = `${dayjs().format("YYYY-MM-DD _ HH-mm-ss-SSS")}`;
              const path = `${env.FAIL_SCREENSHOT_PATH}/${timestamp}.png`;
  
              await page.screenshot({ path, fullPage: true });
  
              logger.info(module, `Saved failure screenshot to ${path}`);
              await restartHaVm();
  
              logger.info(module, `Waiting ${env.WAIT_AFTER_RESTART_MINUTES} minutes for VM to restart before continuing...`);
              await new Promise(resolve => setTimeout(resolve, env.WAIT_AFTER_RESTART_MINUTES * 60 * 1000));
  
              break; // Exit loop after triggering restart, reinitializing browser
            }

          }
          
        }

        if(env.DEMO_RUN)
          break;
    
        await new Promise(resolve => setTimeout(resolve, env.CHECK_INTERVAL_MS));
      }
      
      await cleanup(true);
  
    } catch (error) {
      logger.error(module, "Unexpected error in watchdog main loop", error);
  
      await cleanup(true);
    }

    if(env.DEMO_RUN) {
      logger.debug(module, "Demo run done")
      // Wait indefinitely to allow inspection of container
      await new Promise(resolve => setTimeout(resolve, 999999999));
      break;
    }
  }

};

logger.info(module, "-- Watchdog service started --");
run();