import {WORKGROUP_SIZE} from "./data.js";
import {COMPLEX_MULTIPLICATION} from "./complexShaders.js";

export {propagationShader};

const propagationShader = `
@group(0) @binding(0) var<uniform> size: vec2f;
@group(0) @binding(1) var<storage, read_write> beam: array<vec2f>;
@group(0) @binding(2) var<uniform> k_squared: f32;
@group(0) @binding(3) var<uniform> delta_z: f32;

${COMPLEX_MULTIPLICATION}

@compute
@workgroup_size(${WORKGROUP_SIZE}, ${WORKGROUP_SIZE})
fn propagate(
	@builtin(global_invocation_id) pos: vec3u
	) {
// Quadrant swapping is done implicitly when calculating k_x and k_y.
	let k_x = ((f32(pos.x) + size.x/2)%size.x - size.x/2);
	let k_y = ((f32(pos.y) + size.y/2)%size.y - size.y/2);
	let index = pos.x + pos.y * u32(size.x);
	let k_z_squared = k_squared - k_x*k_x - k_y*k_y;
/*
 * each element of the array must be multiplied by an exponential that may
 * be real or imaginary. There is no complex data type so this must be checked
 * explicitly.
 */
	var factor: vec2f;
	if (k_z_squared < 0) {
		let k_z = sqrt(-k_z_squared);
		factor = vec2f(exp(-k_z * delta_z), 0);
	} else {
		let k_z = sqrt(k_z_squared);
		factor = vec2f(cos(k_z * delta_z), sin(k_z * delta_z));
	}
	beam[index] = mulComplex(beam[index], factor);
}
`;
