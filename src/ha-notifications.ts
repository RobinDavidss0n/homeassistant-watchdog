import { env } from "./env.js";
import { logger } from "./logger.js";

const module = "HA Notifications";

export const sendHaNotification = async (message: string) => {
  
  if (!env.HA_TOKEN || !env.HA_NOTIFY_SERVICE) {
    logger.debug(module, "HA_TOKEN or HA_NOTIFY_SERVICE missing, skipping notification");
    return;
  }
  
  try {
    const response = await fetch(`${env.HA_BASE_URL}/api/services/notify/${env.HA_NOTIFY_SERVICE}`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${env.HA_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ message })
    });
    
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    logger.info(module, `Restart notification sent via ${env.HA_NOTIFY_SERVICE}`);
  } catch (error) {
    logger.error(module, "Failed to send HA notification", error);
  }
};