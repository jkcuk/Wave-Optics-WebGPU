import {device} from "./device.js";
import {canvasWidth, canvasHeight} from "./render.js";

export {width, height, beamArray, beamBuffer, dataSizeBuffer, WORKGROUP_SIZE};
export {xScaling, kScaling, k, generateGaussian, setWidthInMetres, setW0, setWavelength, deltaZ, setDeltaZ};

const width = canvasWidth;
const height = canvasHeight;

const WORKGROUP_SIZE = 8;

let widthInMetres, w0, wavelength, xScaling, kScaling, k, deltaZ;

const beamArray = new Float32Array(width * height * 2);
const beamBuffer = device.createBuffer({
	label: "beam",
	size: beamArray.byteLength,
	usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST,
});
function generateGaussian() {
	const xScaled_w0 = xScaling * w0;
	for (let i = 0; i < beamArray.length; i += 2) {
		const x = (i / 2) % width - width / 2;
		const y = Math.floor(((i / 2) / width)) - height / 2;
		beamArray[i] = Math.exp(-(x**2 + y**2) / (xScaled_w0**2));
	}
	device.queue.writeBuffer(beamBuffer, 0, beamArray);
}

const propagationArray = new Float32Array(width * height);
const propagationBuffer = device.createBuffer({
	label: "propagation factor",
	size: propagationArray.byteLength,
	usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
});
function generatePropagationArray() {
	const kSquared = k**2 / kScaling**2;
	for (let i = 0; i < height; i++) {
		const k_y = (i + height/2) % height - height/2;
		for (let j = 0; j < width; j++) {
			const k_x = (j + width/2) % width - width/2;
			const index = i * width + j;
			propagationArray[index] = kSquared - k_x**2 - k_y**2;
		}
	}
}

function setWidthInMetres() {
	widthInMetres = parseFloat(document.getElementById("size").value);
	xScaling = width / widthInMetres;
	kScaling = 2 / widthInMetres;
}

function setW0() {
	w0 = parseFloat(document.getElementById("w0").value);
}

function setWavelength() {
	wavelength = parseFloat(document.getElementById("wavelength").value);
	k = 2 * Math.PI / wavelength;
}

function setDeltaZ() {
	deltaZ = parseFloat(document.getElementById("deltaZ").value);
}

setWavelength();
setW0();
setWidthInMetres();
generateGaussian();
setDeltaZ();

//const widthInMetres = 2e-4;

/*
 * Scaling factors are required to work in the integer units required by the
 * GPU, which coordinate space the calculation is in (position or momentum) affects
 * which scaling factor is used, as they have different units.
 */
//const xScaling = width / widthInMetres; // Scaling factor used in position space.
//const kScaling = 2 / widthInMetres; // Scaling factor used in k-space.

//const w0 = 5e-5;
//const wavelength = 700e-9;
//const k = 2 * Math.PI / wavelength;

const dataSizeArray = new Float32Array([width, height]);
const dataSizeBuffer = device.createBuffer({
	label: "data size uniform",
	size: dataSizeArray.byteLength,
	usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
});
device.queue.writeBuffer(dataSizeBuffer, 0, dataSizeArray);
