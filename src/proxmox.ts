import { env } from "./env";
import { logger } from "./logger";

export const restartHaVm = async (): Promise<void> => {
	logger.info(`Triggering restart for VM ${env.VM_ID} on node ${env.PROXMOX_NODE}`);

	try {
		const response = await fetch(
			`${env.PROXMOX_HOST}/api2/json/nodes/${env.PROXMOX_NODE}/qemu/${env.VM_ID}/status/reset`,
			{
				method: "POST",
				headers: {
					"Authorization": env.PROXMOX_TOKEN
				}
			}
		);

		if (!response.ok) {
			throw new Error(`Proxmox API responded with status: ${response.status}`);
		}

		logger.debug(() => "Restart command sent successfully to Proxmox API");
	} catch (error) {
		logger.error("Failed to execute VM restart", error);
	}
};