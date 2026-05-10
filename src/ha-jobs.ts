import { env } from "./env";
import { logger } from "./logger";

const module = "HA Jobs";

const executeGuestCommand = async (command: string[]): Promise<string> => {

  const execRes = await fetch(
    `${env.PROXMOX_HOST}/api2/json/nodes/${env.PROXMOX_NODE}/qemu/${env.HA_VM_ID}/agent/exec`,
    {
      method: "POST",
      headers: {
        "Authorization": env.PROXMOX_TOKEN.startsWith("PVEAPIToken=") 
          ? env.PROXMOX_TOKEN 
          : `PVEAPIToken=${env.PROXMOX_TOKEN}`,
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
      { 
        headers: { 
          "Authorization": env.PROXMOX_TOKEN.startsWith("PVEAPIToken=") 
            ? env.PROXMOX_TOKEN 
            : `PVEAPIToken=${env.PROXMOX_TOKEN}` 
        }
      }
    );

    if (!statusRes.ok) {
      logger.error(module, `Failed to fetch exec status: ${statusRes.status}`);
      continue;
    }

    const statusData = await statusRes.json();

    if(env.LOG_HA_JOBS_OUTPUT) {
      logger.debug(module, "statusData:")
      console.log(statusData);    
    }

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
    logger.debug(module, "Checking Supervisor for active jobs via QEMU guest agent");
    
    const output = await executeGuestCommand(["ha", "jobs", "info"]);
    
    if (!output) {
      logger.info(module, "Guest agent returned empty output. Assuming active jobs to prevent unsafe restart.");
      return true;
    }

    const matches = output.match(/^\s*done:\s*false\s*$/gm);
    const activeJobCount = matches ? matches.length : 0;

    logger.debug(module, `Supervisor reported ${activeJobCount} active job(s)`);
    return activeJobCount > 0;

  } catch (error) {

    logger.error(module, 
      "Failed to check HA active jobs. Assuming active to prevent unsafe restart.", 
      error instanceof Error ? error.stack || error.message : error
    );
    return true;
  }
};