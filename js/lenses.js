import {device} from "./device.js";
import {width, height, k, xScaling} from "./data.js";

export {lensBuffer, generateSimpleLens, generateFresnelLens, setXPeriod, setYPeriod, setXShift, setYShift, setFocalLength, setLensScaling};
/*
export {simpleLens, fresnelLens, reverseFresnelLens};

const simpleLens = new Float32Array(width * height);
const focalLength = 1e-4;

const fresnelLens = new Float32Array(width * height);
const reverseFresnelLens = new Float32Array(width * height);
const xPeriod = width/11;
const yPeriod = height/11;
const xShift = width/40;
const yShift = height/40;
const shift = 40;

// % is the remainder operator in js, to get x mod y use ((x % y) + y) % y

for (let i = 0; i < height; i++) {
	const y = i - height/2;
	const shiftedI = Math.floor((((i + yShift) % height) + height) % height);
	for (let j = 0; j < width; j++) {
		const x = j - width/2;
		const shiftedJ = Math.floor((((j + yShift) % width) + width) % width);
		const index = i * width + j;
		const shiftedIndex = shiftedI * width + shiftedJ;
		simpleLens[index] = (x**2 + y**2) / (focalLength * xScaling);
		fresnelLens[index] = ((modulatedParabola(x, xPeriod) + modulatedParabola(y, yPeriod)) / (focalLength * xScaling)) * 0.01;
		reverseFresnelLens[shiftedIndex] = -fresnelLens[index];
	}
}
*/
function modulatedParabola(x, period) {
	return (((((x + period/2) % period) + period) % period - period/2)**2 - (period/2)**2) * Math.floor((x + period/2)/period)*period;
}

const lensArray = new Float32Array(width * height);
const lensBuffer = device.createBuffer({
	label: "lens array buffer",
	size: lensArray.byteLength,
	usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
});

let xPeriod, yPeriod, xShift, yShift, focalLength, lensScaling;

function generateSimpleLens() {
	for (let i = 0; i < height; i++) {
		const y = i - height/2;
		for (let j = 0; j < width; j++) {
			const x = j - width/2;
			const index = i * width + j;
			lensArray[index] = (x**2 + y**2) / focalLength * lensScaling;
		}
	}
	device.queue.writeBuffer(lensBuffer, 0, lensArray);
}

function generateFresnelLens(reverse) {
	for (let i = 0; i < height; i++) {
		const y = i - height/2;
		const shiftedI = Math.floor((((i + yShift) % height) + height) % height);
		for (let j = 0; j < width; j++) {
			const x = j - width/2;
			const shiftedJ = Math.floor((((j + xShift) % width) + width) % width);
			const index = reverse ?
				shiftedI * width + shiftedJ :
				i * width + j;
			lensArray[index] = ((modulatedParabola(x, xPeriod) + modulatedParabola(y, yPeriod)) / focalLength) * lensScaling;
			if (reverse) lensArray[index] = -lensArray[index];
		}
	}

	device.queue.writeBuffer(lensBuffer, 0, lensArray);
}

function setXPeriod() {
	xPeriod = width / parseFloat(document.getElementById("xCount").value);
}

function setYPeriod() {
	yPeriod = height / parseFloat(document.getElementById("yCount").value);
}

function setXShift() {
	xShift = parseFloat(document.getElementById("xShift").value) * xScaling;
}

function setYShift() {
	yShift = parseFloat(document.getElementById("yShift").value) * xScaling;
}

function setFocalLength() {
	focalLength = parseFloat(document.getElementById("focalLength").value) * xScaling;
}

function setLensScaling() {
	lensScaling = k / (2 * xScaling);
}

setXPeriod();
setYPeriod();
setXShift();
setYShift();
setFocalLength();
setLensScaling();
