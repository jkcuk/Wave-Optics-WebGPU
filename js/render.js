import {device} from "./device.js";
import {context, canvasFormat, canvasWidth, canvasHeight} from "./canvas.js";
import {beamArray, beamBuffer, dataSizeBuffer} from "./data.js";
import {renderVertexShader, renderPhaseShader, renderIntensityShader} from "./renderShader.js";
import {setSpace} from "./spaces.js";

export {render, imageSizeBuffer, canvasWidth, canvasHeight, renderBuffer};

const imageSizeArray = new Float32Array([canvasWidth, canvasHeight]);
const imageSizeBuffer = device.createBuffer({
	label: "image size uniform",
	size: imageSizeArray.byteLength,
	usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
});
device.queue.writeBuffer(imageSizeBuffer, 0, imageSizeArray);

const vertices = new Float32Array([
	-1, -1,
	 1, -1,
	 1,  1,
	-1, -1,
	 1,  1,
	-1,  1,
]);

const vertexBuffer = device.createBuffer({
	label: "image vertices",
	size: vertices.byteLength,
	usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
});

device.queue.writeBuffer(vertexBuffer, 0, vertices);

const vertexBufferLayout = {
	arrayStride: 8,
	attributes: [{
		format: "float32x2",
		offset: 0,
		shaderLocation: 0,
	}],
};

const readBuffer = device.createBuffer({
	label: "read buffer",
	size: beamArray.byteLength,
	usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
});

const renderBuffer = device.createBuffer({
	label: "render buffer",
	size: beamArray.byteLength,
	usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST,
});

const maxValueBuffer = device.createBuffer({
	label: "maximum value of beam",
	size: 4,
	usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
});

const renderVertexShaderModule = device.createShaderModule({
	label: "render vertex shader",
	code: renderVertexShader,
});

const renderPhaseShaderModule = device.createShaderModule({
	label: "render phase shader",
	code: renderPhaseShader,
});

const renderIntensityShaderModule = device.createShaderModule({
	label: "render intensity shader",
	code: renderIntensityShader,
});

/*
 * There are different fragment shaders for displaying
 * phase or not, so the pipeline can change and the 
 * bind group therefore cannot derive its layout from the
 * pipeline.
 */

const renderBindGroupLayout = device.createBindGroupLayout({
	label: "render bind group layout",
	entries: [{
		binding: 0,
		visibility: GPUShaderStage.FRAGMENT,
		buffer: {},
	},
	{
		binding: 1,
		visibility: GPUShaderStage.FRAGMENT,
		buffer: {},
	},
	{
		binding: 2,
		visibility: GPUShaderStage.FRAGMENT,
		buffer: {type: "read-only-storage"},
	},
	{
		binding: 3,
		visibility: GPUShaderStage.FRAGMENT,
		buffer: {type: "read-only-storage"},
	}],
});

const renderPipelineLayout = device.createPipelineLayout({
	label: "render pipeline layout",
	bindGroupLayouts: [renderBindGroupLayout],
});

const renderPhasePipeline = device.createRenderPipeline({
	label: "render phase pipeline",
	layout: renderPipelineLayout,
	vertex: {
		module: renderVertexShaderModule,
		entryPoint: "vertexMain",
		buffers: [vertexBufferLayout]
	},
	fragment: {
		module: renderPhaseShaderModule,
		entryPoint: "fragmentMain",
		targets: [{
			format: canvasFormat
		}]
	}
});

const renderIntensityPipeline = device.createRenderPipeline({
	label: "render intensity pipeline",
	layout: renderPipelineLayout,
	vertex: {
		module: renderVertexShaderModule,
		entryPoint: "vertexMain",
		buffers: [vertexBufferLayout],
	},
	fragment: {
		module: renderIntensityShaderModule,
		entryPoint: "fragmentMain",
		targets: [{
			format: canvasFormat
		}]
	},
});

const renderBindGroup = device.createBindGroup({
	label: "renderer bind group",
	layout: renderBindGroupLayout,
	entries: [{
		binding: 0,
		resource: {buffer: dataSizeBuffer},
	},
	{
		binding: 1,
		resource: {buffer: imageSizeBuffer},
	},
	{
		binding: 2,
		resource: {buffer: renderBuffer},
	},
	{
		binding: 3,
		resource: {buffer: maxValueBuffer},
	}],
});

async function render(overwrite) {
	if (overwrite) setSpace('x');
	const readEncoder = device.createCommandEncoder();
	if (overwrite) readEncoder.copyBufferToBuffer(beamBuffer, 0, renderBuffer, 0, beamArray.byteLength);
	readEncoder.copyBufferToBuffer(renderBuffer, 0, readBuffer, 0, beamArray.byteLength);
	device.queue.submit([readEncoder.finish()]);
	await readBuffer.mapAsync(GPUMapMode.READ, 0, beamArray.byteLength);
	const copyBuffer = readBuffer.getMappedRange(0, beamArray.byteLength);
	const data = copyBuffer.slice(0);
	readBuffer.unmap();
	const readArray = new Float32Array(data);
	console.log(readArray);
	const max = new Float32Array([readArray[0]**2 + readArray[1]**2]);
	for (let i = 2; i < readArray.length; i += 2) {
		const length = readArray[i]**2 + readArray[i+1]**2;
		if (length > max[0]) max[0] = length;
	}
	max[0] /= 10**parseFloat(document.getElementById("exposure").value);
	device.queue.writeBuffer(maxValueBuffer, 0, max);

	const encoder = device.createCommandEncoder();
	const pass = encoder.beginRenderPass({
		colorAttachments: [{
			view: context.getCurrentTexture().createView(),
			loadOp: "clear",
			storeOp: "store",
		}]
	});
	pass.setPipeline(document.getElementById("phase").checked ?
		renderPhasePipeline : renderIntensityPipeline);
	pass.setBindGroup(0, renderBindGroup);
	pass.setVertexBuffer(0, vertexBuffer);
	pass.draw(vertices.length / 2);
	pass.end();
	device.queue.submit([encoder.finish()]);
}
