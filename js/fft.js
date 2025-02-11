import {device} from "./device.js";
import {width, height, beamBuffer, dataSizeBuffer, WORKGROUP_SIZE} from "./data.js";
import {reorderShader} from "./reorderShader.js";
import {normalisationShader} from "./fourierNormalisationShader.js";
import {getFourierShader} from "./fourierShader.js";

export {fourierTransform};

/*
 * The first step of the Fast Fourier Transform is to rearrange
 * the data so that it is in the right order. This is done by
 * taking the index of the data and reversing the bits, and using
 * the new value as the new index. This can be done for both axes
 * before the actual FFT begins as the FFT of each axis is done
 * independently of the other, and if the size of the array is
 * known beforehand, the indices can be precalcuated as well.
 */

const reorderArray = new Uint32Array(width * width);
const logWidth = Math.ceil(Math.log2(width));

function bitReverse(input, bitSize) {
	let output = 0;
	for (let i = 0; i < bitSize; i++) {
		output <<= 1;
		output |= input & 1;
		input >>= 1;
	}
	return output;
}

for (let i = 0; i < width; i++) {
	const y = bitReverse(i, logWidth);
	for (let j = 0; j < height; j++) {
		const x = bitReverse(j, logWidth);
		reorderArray[i * width + j] = y * width + x;
	}
}

console.log(reorderArray);

const reorderBuffer = device.createBuffer({
	label: "reorder indices",
	size: reorderArray.byteLength,
	usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
});
device.queue.writeBuffer(reorderBuffer, 0, reorderArray);

const reorderShaderModule = device.createShaderModule({
	label: "pre-fft reorder shader",
	code: reorderShader,
});

const reorderPipeline = device.createComputePipeline({
	label: "pre-fft reorder pipeline",
	layout: "auto",
	compute: {
		entryPoint: "reorder",
		module: reorderShaderModule,
	}
});

/*
 * The FFT requires the roots of unity, which can be precalculated
 * if the size of the array is known.
 * The only difference between the FFT and inverse FFT is the
 * sign of the imaginary component of the roots of unity and the
 * final normalisation, so for simplicity the same shader code is
 * reused but with a different buffer of roots of unity.
 */

const unityArrayPos = new Float32Array(width);
const unityArrayNeg = new Float32Array(width);
for (let i = 0; i < unityArrayPos.length; i += 2) {
	const angle = Math.PI * -i / width;
	unityArrayPos[i] = Math.cos(angle);
	unityArrayPos[i + 1] = Math.sin(angle);
	unityArrayNeg[i] = unityArrayPos[i];
	unityArrayNeg[i + 1] = -unityArrayPos[i + 1];
}

const unityBufferPos = device.createBuffer({
	label: "positive roots of unity",
	size: unityArrayPos.byteLength,
	usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
});
device.queue.writeBuffer(unityBufferPos, 0, unityArrayPos);
const unityBufferNeg = device.createBuffer({
	label: "negative roots of unity",
	size: unityArrayNeg.byteLength,
	usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
});
device.queue.writeBuffer(unityBufferNeg, 0, unityArrayNeg);

/*
 * This particular implementation of the FFT consists of an
 * outer loop of log(N) iterations and an inner loop of N
 * iterations for an array of size N. The inner loop is parallelised
 * in the GPU, but the outer loop is not, and the inner loop
 * must know which iteration of the outer loop it is, so this is
 * passed through a buffer.
 */

let iteration = new Uint32Array([0]);
const iterationBuffer = device.createBuffer({
	label: "iteration",
	size: iteration.byteLength,
	usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
});

/*
 * The shader code for the FFT is slightly different depending
 * on which axis is being transformed, so to reuse code there
 * are two different pipelines. This means that the bind group
 * layout cannot be inferred automatically from a single pipeline
 * as it would be incompatible with the other pipeline.
 */

const fourierBindGroupLayout = device.createBindGroupLayout({
	label: "fourier bind group layout",
	entries: [{
		binding: 0,
		visibility: GPUShaderStage.COMPUTE,
		buffer: {},
	},
	{
		binding: 1,
		visibility: GPUShaderStage.COMPUTE,
		buffer: {type: "storage"},
	},
	{
		binding: 2,
		visibility: GPUShaderStage.COMPUTE,
		buffer: {type: "read-only-storage"},
	},
	{
		binding: 3,
		visibility: GPUShaderStage.COMPUTE,
		buffer: {type: "read-only-storage"},
	}],
});

const fourierPipelineLayout = device.createPipelineLayout({
	label: "fourier pipeline layout",
	bindGroupLayouts: [fourierBindGroupLayout],
});

function getFourierPipeline(axis) {
	const fourierShader = getFourierShader(axis);
	const fourierShaderModule = device.createShaderModule({
		label: "fft shader",
		code: fourierShader,
	});

	const fourierPipeline = device.createComputePipeline({
		label: "fourier pipeline",
		layout: fourierPipelineLayout,
		compute: {
			module: fourierShaderModule,
			entryPoint: "FFT",
		}
	});
	return fourierPipeline;
}

const fourierPipelineX = getFourierPipeline("x");
const fourierPipelineY = getFourierPipeline("y");

/*
 * The inverse FFT requires normalising the array by dividing
 * each element by the size of the array.
 */

const normalisationShaderModule = device.createShaderModule({
	label: "ifft normalisation shader",
	code: normalisationShader,
});

const normalisationPipeline = device.createComputePipeline({
	label: "ifft normalisation pipeline",
	layout: "auto",
	compute: {
		module: normalisationShaderModule,
		entryPoint: "normalise",
	}
});

/*
 * workgroupCount is only half of the actual number of workgroups
 * per axis, because each iteration modifies two elements of the array
 * so it is simply doubled for the other axis, or for the reorder
 * and normalisation pipelines, which only affect one element per iteration.
 */

const workgroupCount = Math.ceil(width / WORKGROUP_SIZE / 2);
function fourierTransform(inverse, buffer) {
	const reorderBindGroup = device.createBindGroup({
		label: "pre-fft reorder bind group",
		layout: reorderPipeline.getBindGroupLayout(0),
		entries: [{
			binding: 0,
			resource: {buffer: dataSizeBuffer},
		},
		{
			binding: 1,
			resource: {buffer: buffer},
		},
		{
			binding: 2,
			resource: {buffer: reorderBuffer},
		}],
	});

	const bindGroup = device.createBindGroup({
		label: "fft bind group",
		layout: fourierBindGroupLayout,
		entries: [{
			binding: 0,
			resource: {buffer: dataSizeBuffer},
		},
		{
			binding: 1,
			resource: {buffer: buffer},
		},
		{
			binding: 2,
			resource: {buffer: inverse ? unityBufferNeg : unityBufferPos},
		},
		{
			binding: 3,
			resource: {buffer: iterationBuffer},
		}],
	});

	const encoder = device.createCommandEncoder();
	const pass = encoder.beginComputePass();
	pass.setPipeline(reorderPipeline);
	pass.setBindGroup(0, reorderBindGroup);
	pass.dispatchWorkgroups(workgroupCount * 2, workgroupCount * 2);
	pass.end();
	device.queue.submit([encoder.finish()]);

	for (let i = 2; i <= width; i *= 2) {
		const encoder = device.createCommandEncoder();
		const pass = encoder.beginComputePass();
		iteration[0] = i;
		device.queue.writeBuffer(iterationBuffer, 0, iteration);
		pass.setPipeline(fourierPipelineX);
		pass.setBindGroup(0, bindGroup);
		pass.dispatchWorkgroups(workgroupCount, workgroupCount * 2);
		pass.end();
		device.queue.submit([encoder.finish()]);
	}

	for (let i = 2; i <= height; i *= 2) {
		const encoder = device.createCommandEncoder();
		const pass = encoder.beginComputePass();
		iteration[0] = i;
		device.queue.writeBuffer(iterationBuffer, 0, iteration);
		pass.setPipeline(fourierPipelineY);
		pass.setBindGroup(0, bindGroup);
		pass.dispatchWorkgroups(workgroupCount * 2, workgroupCount);
		pass.end();
		device.queue.submit([encoder.finish()]);
	}

	if (inverse) {
		const normalisationBindGroup = device.createBindGroup({
			label: "ifft normalisation bind group",
			layout: normalisationPipeline.getBindGroupLayout(0),
			entries: [{
				binding: 0,
				resource: {buffer: dataSizeBuffer},
			},
			{
				binding: 1,
				resource: {buffer: buffer},
			}],
		});

		const encoder = device.createCommandEncoder();
		const pass = encoder.beginComputePass();
		pass.setPipeline(normalisationPipeline);
		pass.setBindGroup(0, normalisationBindGroup);
		pass.dispatchWorkgroups(workgroupCount * 2, workgroupCount * 2);
		pass.end();
		device.queue.submit([encoder.finish()]);
	}
}
