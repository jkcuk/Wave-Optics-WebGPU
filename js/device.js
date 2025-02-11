export {adapter, device};

if (!navigator.gpu) {
	throw new Error("WebGPU not supported.");
}

const adapter = await navigator.gpu.requestAdapter();
if (!adapter) {
	throw new Error("No appropriate GPU adapter found.");
}

const device = await adapter.requestDevice();
