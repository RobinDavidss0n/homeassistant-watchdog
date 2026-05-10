import { env, getProxmoxAuthHeader } from "./env";
import { logger } from "./logger";

const module = "Proxmox";

export const restartHaVm = async (): Promise<void> => {
  logger.info(module, `Triggering restart for VM ${env.HA_VM_ID} on node ${env.PROXMOX_NODE}`);

  try {
    const response = await fetch(
      `${env.PROXMOX_HOST}/api2/json/nodes/${env.PROXMOX_NODE}/qemu/${env.HA_VM_ID}/status/reset`,
      {
        method: "POST",
        headers: {
          "Authorization": getProxmoxAuthHeader()
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Proxmox API responded with status: ${response.status}`);
    }

    logger.info(module, "Restart command sent successfully to Proxmox API");
    
  } catch (error) {
    logger.error(module, "Failed to execute VM restart", error);
  }
};