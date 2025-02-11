import {device} from "./device.js";
import {width, height, kScaling, k, beamBuffer, dataSizeBuffer, WORKGROUP_SIZE} from "./data.js";
import {propagationShader} from "./propagationShader.js";
import {fourierTransform} from "./fft.js";
import {setSpace} from "./spaces.js";

export {propagate, setPropagationInterval, clearPropagationInterval};

const kSquaredArray = new Float32Array(1);
const kSquaredBuffer = device.createBuffer({
	label: "k squared uniform",
	size: kSquaredArray.byteLength,
	usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
});

const deltaZArray = new Float32Array(1);
const deltaZBuffer = device.createBuffer({
	label: "delta z uniform",
	size: deltaZArray.byteLength,
	usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
});

const propagationArray = new Float32Array(width * height);
const propagationBuffer = device.createBuffer({
	label: "propagation constants",
	size: propagationArray.byteLength,
	usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
});

const propagationShaderModule = device.createShaderModule({
	label: "propagation shader",
	code: propagationShader,
});

const propagationPipeline = device.createComputePipeline({
	label: "propagation pipeline",
	layout: "auto",
	compute: {
		module: propagationShaderModule,
		entryPoint: "propagate",
	}
});

const propagationBindGroup = device.createBindGroup({
	label: "propagation bind group",
	layout: propagationPipeline.getBindGroupLayout(0),
	entries: [{
		binding: 0,
		resource: {buffer: dataSizeBuffer},
	},
	{
		binding: 1,
		resource: {buffer: beamBuffer},
	},
	{
		binding: 2,
		resource: {buffer: kSquaredBuffer},
	},
	{
		binding: 3,
		resource: {buffer: deltaZBuffer},
	}],
});
let propagationInterval = undefined;

const workgroupCount = width / WORKGROUP_SIZE;

function propagate(deltaZ) {
	deltaZArray[0] = deltaZ * kScaling; // propagation occurs in k-space
	device.queue.writeBuffer(deltaZBuffer, 0, deltaZArray);
	kSquaredArray[0] = k * k / kScaling / kScaling;
	device.queue.writeBuffer(kSquaredBuffer, 0, kSquaredArray);

	console.log(deltaZ);

	setSpace('k');

	const encoder = device.createCommandEncoder();
	const pass = encoder.beginComputePass();
	pass.setPipeline(propagationPipeline);
	pass.setBindGroup(0, propagationBindGroup);
	pass.dispatchWorkgroups(workgroupCount, workgroupCount);
	pass.end();
	device.queue.submit([encoder.finish()]);
}

function setPropagationInterval(FUNCTION, interval) {
	if (propagationInterval == undefined);
	propagationInterval = setInterval(FUNCTION, interval);
}

function clearPropagationInterval() {
	if (propagationInterval != undefined) {
		clearInterval(propagationInterval);
		propagationInterval = undefined;
	}
}
