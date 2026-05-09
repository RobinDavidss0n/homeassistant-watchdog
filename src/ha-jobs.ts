import { env } from "./env";
import { logger } from "./logger";

const executeGuestCommand = async (command: string[]): Promise<string> => {

  const execRes = await fetch(
    `${env.PROXMOX_HOST}/api2/json/nodes/${env.PROXMOX_NODE}/qemu/${env.HA_VM_ID}/agent/exec`,
    {
      method: "POST",
      headers: {
        "Authorization": env.PROXMOX_TOKEN,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ command })
    }
  );

  if (!execRes.ok) {
    throw new Error(`Agent exec failed: ${execRes.status}`);
  }

  const execData = await execRes.json();
  const pid = execData.data.pid;

  for (let i = 0; i < 5; i++) {
    
    await new Promise((resolve) => setTimeout(resolve, 1000));
    
    const statusRes = await fetch(
      `${env.PROXMOX_HOST}/api2/json/nodes/${env.PROXMOX_NODE}/qemu/${env.HA_VM_ID}/agent/exec-status?pid=${pid}`,
      { headers: { "Authorization": env.PROXMOX_TOKEN } }
    );

    if (!statusRes.ok) continue;

    const statusData = await statusRes.json();

    logger.debug(() => "statusData:")
    logger.debug(() => JSON.stringify(statusData))

    if (statusData.data.exited === 1) {
      
      if (statusData.data.exitcode !== 0) {
        throw new Error(`Guest agent command failed with exit code ${statusData.data.exitcode}`);
      }
      return statusData.data["out-data"] || "";
    }
  }

  throw new Error("Guest agent command timed out");
};

export const hasActiveJobs = async (): Promise<boolean> => {

  try {
    logger.debug(() => "Checking Supervisor for active jobs via QEMU guest agent");
    
    const output = await executeGuestCommand(["ha", "jobs", "info"]);
    
    if (!output) {
      logger.info("Guest agent returned empty output. Assuming active jobs to prevent unsafe restart.");
      return true;
    }

    const jobsSection = output.split("jobs:")[1] || "";
    const jobCount = (jobsSection.match(/^-/gm) || []).length;

    logger.debug(() => `Supervisor reported ${jobCount} active job(s)`);
    return jobCount > 0;

  } catch (error) {
    logger.error("Failed to check HA active jobs. Assuming active to prevent unsafe restart.", error);
    return true;
  }
};