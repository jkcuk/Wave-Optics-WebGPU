import {device} from "./device.js";
import {COMPLEX_MULTIPLICATION} from "./complexShaders.js";
import {WORKGROUP_SIZE} from "./data.js";

export {getFourierShader};

function getFourierShader(axis) {
	if (axis != "x" && axis != "y") return null;
	const even_index_def = axis == "x" ? 
		"i + j + (pos.y * u32(size.x))" :
		"(i + j) * u32(size.y) + pos.x";
	const odd_index_def = axis == "x" ?
		"i + j + offset + (pos.y * u32(size.x))" :
		"(i + j + offset) * u32(size.y) + pos.x";
/*
	let even_index_def = "i + j + (pos.y * u32(size.x))";
	let odd_index_def = "i + j + offset + (pos.y * u32(size.x))";
	if (axis == "y") {
		even_index_def = "(i + j) * u32(size.y) + pos.x";
		odd_index_def = "(i + j + offset) * u32(size.y) + pos.x";
	}
*/
	const fourierShader = `
@group(0) @binding(0) var<uniform> size: vec2f;
@group(0) @binding(1) var<storage, read_write> beam: array<vec2f>;
@group(0) @binding(2) var<storage> unity: array<vec2f>;
@group(0) @binding(3) var<storage> iteration: u32;
@group(0) @binding(4) var<storage> axis: u32;

${COMPLEX_MULTIPLICATION}

@compute
@workgroup_size(${WORKGROUP_SIZE}, ${WORKGROUP_SIZE})
fn FFT(
	@builtin(global_invocation_id) pos: vec3u
	) {
	let offset = iteration / 2;
	let i = (pos.${axis} * 2) - (pos.${axis} * 2) % iteration;
	let j = pos.${axis} % offset;
	let w = unity[(j * u32(size.${axis}) / iteration)];
	let even_index = ${even_index_def};
	let odd_index = ${odd_index_def};
	let even = beam[even_index];
	let odd = mulComplex(w, beam[odd_index]);
	beam[even_index] = even + odd;
	beam[odd_index] = even - odd;
}
	`;
	return fourierShader;
}
