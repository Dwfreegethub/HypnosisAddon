const TAG = "[HypnosisAddon]";

function log(...args: unknown[]): void {
	console.log(TAG, ...args);
}

function waitForServerSocket(callback: () => void): void {
	if (typeof ServerSocket !== "undefined" && ServerSocket) {
		callback();
		return;
	}
	const interval = setInterval(() => {
		if (typeof ServerSocket !== "undefined" && ServerSocket) {
			clearInterval(interval);
			callback();
		}
	}, 500);
}

function showIndicator(): void {
	const el = document.createElement("div");
	el.textContent = "Hypnosis Add-on: loaded";
	Object.assign(el.style, {
		position: "fixed",
		bottom: "4px",
		right: "4px",
		zIndex: "9999",
		padding: "2px 6px",
		background: "rgba(0,0,0,0.6)",
		color: "#fff",
		fontSize: "10px",
		fontFamily: "monospace",
		borderRadius: "3px",
		pointerEvents: "none",
	});
	document.body.appendChild(el);
}

function hookSocket(): void {
	log("ServerSocket found, attaching listener");
	ServerSocket.on("ChatRoomMessage", (data: unknown) => {
		log("ChatRoomMessage", data);
	});
}

log("script loaded, waiting for ServerSocket...");
showIndicator();
waitForServerSocket(hookSocket);
