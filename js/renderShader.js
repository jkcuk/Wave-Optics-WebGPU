import {MOD_SQUARE} from "./complexShaders.js";

export {renderVertexShader, renderPhaseShader, renderIntensityShader};

const renderVertexShader = `
@vertex
fn vertexMain(
	@location(0) pos: vec2f
	) -> @builtin(position) vec4f {
	return vec4f(pos, 0, 1);
}
`;

const renderPhaseShader = `
@group(0) @binding(0) var<uniform> dataSize: vec2f;
@group(0) @binding(1) var<uniform> imageSize: vec2f;
@group(0) @binding(2) var<storage> beam: array<vec2f>;
@group(0) @binding(3) var<storage> max: f32;

${MOD_SQUARE}

@vertex
fn vertexMain(
	@location(0) pos: vec2f
	) -> @builtin(position) vec4f {
	return vec4f(pos, 0, 1);
}

@fragment
fn fragmentMain(
	@builtin(position) pos: vec4f
	) -> @location(0) vec4f {
	const THREE_OVER_PI = 0.9549296586;
	let scale = dataSize / imageSize;
	let i = u32(pos.x * scale.x) + u32(pos.y * scale.y) * u32(dataSize.x);
	let squareMagnitude = modSquare(beam[i]);
	let valueSquared = squareMagnitude / max; // normalise
	let hue = atan2(beam[i].y, beam[i].x);
	let huePrime = (hue * THREE_OVER_PI + 6) % 6; // hue but in the range [0, 6)
	let mid = sqrt(valueSquared) * (1 - abs(huePrime % 2 - 1));
	let midSquared = mid * mid;
	switch (i32(huePrime % 6)) {
		case 0: { return vec4f(valueSquared, midSquared, 0, 1); }
		case 1: { return vec4f(midSquared, valueSquared, 0, 1); }
		case 2: { return vec4f(0, valueSquared, midSquared, 1); }
		case 3: { return vec4f(0, midSquared, valueSquared, 1); }
		case 4: { return vec4f(midSquared, 0, valueSquared, 1); }
		case 5: { return vec4f(valueSquared, 0, midSquared, 1); }
		default: { return vec4f(0, 0, 0, 1); }
	}
}
`;

const renderIntensityShader = `
@group(0) @binding(0) var<uniform> dataSize: vec2f;
@group(0) @binding(1) var<uniform> imageSize: vec2f;
@group(0) @binding(2) var<storage> beam: array<vec2f>;
@group(0) @binding(3) var<storage> max: f32;

${MOD_SQUARE}

@vertex
fn vertexMain(
	@location(0) pos: vec2f
	) -> @builtin(position) vec4f {
	return vec4f(pos, 0, 1);
}

@fragment
fn fragmentMain(
	@builtin(position) pos: vec4f
	) -> @location(0) vec4f {
	let scale = dataSize / imageSize;
	let i = u32(pos.x * scale.x) + u32(pos.y * scale.y) * u32(dataSize.x);
	let squareMagnitude = modSquare(beam[i]);
	let valueSquared = squareMagnitude / max;
	return vec4f(valueSquared, valueSquared, valueSquared, 1);
}
`;
