import {device} from "./device.js";
import {width, height, k, xScaling, dataSizeBuffer, beamBuffer, WORKGROUP_SIZE} from "./data.js";
import {setSpace} from "./spaces.js";
import {lensBuffer} from "./lenses.js";
import {lensShader} from "./lensShader.js";

export {lens};

// lens calculations happen in position space, so k must be scaled appropriately
const lensFactorArray = new Float32Array([k / 2 / xScaling]);
const lensFactorBuffer = device.createBuffer({
	label: "lens factor uniform",
	size: lensFactorArray.byteLength,
	usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
});
device.queue.writeBuffer(lensFactorBuffer, 0, lensFactorArray);

const lensShaderModule = device.createShaderModule({
	label: "lens shader",
	code: lensShader,
});

const lensPipeline = device.createComputePipeline({
	label: "lens pipeline",
	layout: "auto",
	compute: {
		module: lensShaderModule,
		entryPoint: "lens"
	}
});

const lensBindGroup = device.createBindGroup({
	label: "lens bind group",
	layout: lensPipeline.getBindGroupLayout(0),
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
		resource: {buffer: lensBuffer},
	}],
});

const workgroupCountX = width / WORKGROUP_SIZE;
const workgroupCountY = height / WORKGROUP_SIZE;

function lens() {
	setSpace('x');

	const encoder = device.createCommandEncoder();
	const pass = encoder.beginComputePass();
	pass.setPipeline(lensPipeline);
	pass.setBindGroup(0, lensBindGroup);
	pass.dispatchWorkgroups(workgroupCountX, workgroupCountY);
	pass.end();
	device.queue.submit([encoder.finish()]);
}
