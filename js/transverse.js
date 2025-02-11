import {device} from "./device.js";
import {width, height, beamBuffer, dataSizeBuffer, deltaZ, WORKGROUP_SIZE} from "./data.js";
import {render, renderBuffer} from "./render.js";
import {fourierTransform} from "./fft.js";
import {propagate, setPropagationInterval, clearPropagationInterval} from "./propagation.js";
import {transverseShader} from "./transverseShader.js";

import {space, setSpace} from "./spaces.js";

export {transverse};
/*
async function transverse() {
	const initEncoder = device.createCommandEncoder();
	initEncoder.clearBuffer(renderBuffer);
	device.queue.submit([initEncoder.finish()]);
	await render(false);
//	const interval = setPropagationInterval(render, 1000/10);

	const middle = renderBuffer.size/2;
	for (let i = 0; i < 2; i++) {
		propagate(deltaZ);
		const encoder = device.createCommandEncoder();
		const size = width * 8;
		const offset = i * size;
		encoder.copyBufferToBuffer(beamBuffer, middle, renderBuffer, offset, size);
		console.log(middle, size, offset);
		device.queue.submit([encoder.finish()]);
	}

//	clearPropagationInterval(interval);
	await render(false);
}*/

const temporaryBuffer = device.createBuffer({
	label: "temporary buffer",
	size: beamBuffer.size,
	usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC,
});

const iterationArray = new Uint32Array(1);
const iterationBuffer = device.createBuffer({
	label: "iteration buffer",
	size: iterationArray.byteLength,
	usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
});

const transverseShaderModule = device.createShaderModule({
	label: "transverse shader",
	code: transverseShader,
});

const workgroupCount = width / WORKGROUP_SIZE;

function transverseRender() {
	console.log("render");
	render(false);
}

async function transverse(plane) {
	console.log("started");
	if (plane == "xz") plane = true;
	else if (plane == "yz") plane = false;
	else return;
	const initEncoder = device.createCommandEncoder();
	initEncoder.clearBuffer(renderBuffer);
	device.queue.submit([initEncoder.finish()]);

	const transversePipeline = device.createComputePipeline({
		label: "transverse pipeline",
		layout: "auto",
		compute: {
			module: transverseShaderModule,
			entryPoint: plane ? "transverseXZ" : "transverseYZ",
		}
	});

	const transverseBindGroup = device.createBindGroup({
		label: "transverse bind group",
		layout: transversePipeline.getBindGroupLayout(0),
		entries: [{
			binding: 0,
			resource: {buffer: dataSizeBuffer},
		},
		{
			binding: 1,
			resource: {buffer: iterationBuffer},
		},
		{
			binding: 2,
			resource: {buffer: temporaryBuffer},
		},
		{
			binding: 3,
			resource: {buffer: renderBuffer},
		}],
	});

	clearPropagationInterval();
	setPropagationInterval(transverseRender, 1000/5);

	setSpace('k');
	for (let i = 0; i < width; i++) {

//		fourierTransform(true, beamBuffer);
		const copyEncoder = device.createCommandEncoder();
		copyEncoder.copyBufferToBuffer(beamBuffer, 0, temporaryBuffer, 0, beamBuffer.size);
		device.queue.submit([copyEncoder.finish()]);
//		fourierTransform(false, beamBuffer);

		fourierTransform(true, temporaryBuffer);

/*		console.log(i);
		propagate(deltaZ);

		const encoder = device.createCommandEncoder();
		encoder.copyBufferToBuffer(beamBuffer, 0, renderBuffer, 0, beamBuffer.size);
		device.queue.submit([encoder.finish()]);
		fourierTransform(true, renderBuffer);
/*
		const copyEncoder = device.createCommandEncoder();
		copyEncoder.copyBufferToBuffer(beamBuffer, 0, temporaryBuffer, 0, beamBuffer.size);
		device.queue.submit([copyEncoder.finish()]);
//		fourierTransform(true, temporaryBuffer);
//		fourierTransform(false, renderBuffer);
//		fourierTransform(true, renderBuffer);

		const encoder = device.createCommandEncoder();
		encoder.copyBufferToBuffer(temporaryBuffer, 0, renderBuffer, 0, temporaryBuffer.size);
		device.queue.submit([encoder.finish()]);
*/
		iterationArray[0] = i;
		device.queue.writeBuffer(iterationBuffer, 0, iterationArray);
		const renderEncoder = device.createCommandEncoder();
		const pass = renderEncoder.beginComputePass();
		pass.setPipeline(transversePipeline);
		pass.setBindGroup(0, transverseBindGroup);
		pass.dispatchWorkgroups(1, workgroupCount);
		pass.end();
		device.queue.submit([renderEncoder.finish()]);
		propagate(deltaZ);

//		await new Promise(r => setTimeout(r, 100));
//		await render(false);
	}

	clearPropagationInterval();

	console.log("done");
}
