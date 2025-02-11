import {COMPLEX_MULTIPLICATION} from "./complexShaders.js";
import {WORKGROUP_SIZE} from "./data.js";

export {lensShader};

const lensShader = `
@group(0) @binding(0) var<uniform> size: vec2f;
@group(0) @binding(1) var<storage, read_write> beam: array<vec2f>;
@group(0) @binding(2) var<storage> lens_array: array<f32>;

${COMPLEX_MULTIPLICATION}

@compute
@workgroup_size(${WORKGROUP_SIZE}, ${WORKGROUP_SIZE})
fn lens(
	@builtin(global_invocation_id) pos: vec3u
	) {
	let index = pos.x + pos.y*u32(size.x);
//	beam[index] = vec2f(lens_array[index], 0);
	let beam_factor = vec2f(cos(lens_array[index]), -sin(lens_array[index]));
	beam[index] = mulComplex(beam[index], beam_factor);
}
`
