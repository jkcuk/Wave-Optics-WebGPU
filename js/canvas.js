/*
 * this file exists solely to avoid a circular import
 * originally this functionality was contained in render.js, but it imports
 * from data.js, which also needs the canvas size
 */

import {device} from "./device.js";

export {context, canvasFormat, canvasWidth, canvasHeight};

const canvas = document.getElementById("display");
const context = canvas.getContext("webgpu");
const canvasFormat = navigator.gpu.getPreferredCanvasFormat();

context.configure({
	device: device,
	format: canvasFormat,
});

// cannot export object members
const canvasWidth = canvas.width;
const canvasHeight = canvas.height;
