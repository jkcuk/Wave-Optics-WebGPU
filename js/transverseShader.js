import {WORKGROUP_SIZE} from "./data.js";

export {transverseShader};

const transverseShader = `
@group(0) @binding(0) var<uniform> size: vec2f;
@group(0) @binding(1) var<uniform> iteration: u32;
@group(0) @binding(2) var<storage> beam: array<vec2f>;
@group(0) @binding(3) var<storage, read_write> render: array<vec2f>;

@compute
@workgroup_size(1, ${WORKGROUP_SIZE})
fn transverseXZ(
	@builtin(global_invocation_id) pos: vec3u
	) {
	let beam_index = u32(size.y)/2 * u32(size.x) + pos.y;
	let out_index = iteration + pos.y * u32(size.x);
	render[out_index] = beam[beam_index];
}

@compute
@workgroup_size(1, ${WORKGROUP_SIZE})
fn transverseYZ(
	@builtin(global_invocation_id) pos: vec3u
	) {
	let beam_index = u32(size.x)/2 + pos.y * u32(size.x);
	let out_index = iteration + pos.y * u32(size.x);
	render[out_index] = beam[beam_index];
}
`;
