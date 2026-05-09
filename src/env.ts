process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

export const env = {
	PROXMOX_TOKEN: 			process.env.PROXMOX_TOKEN,
	HA_URL: 						"http://homeassistant.local:8123",
	PROXMOX_HOST: 			"https://proxmox.local:8006",
	PROXMOX_NODE: 			"pve",
	VM_ID: 							"100",
	CHECK_INTERVAL_MS: 	60000,
	UI_LOAD_TIMEOUT_MS: 15000
};