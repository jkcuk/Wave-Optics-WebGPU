import {WORKGROUP_SIZE} from "./data.js";

export {reorderShader};

const reorderShader = `
@group(0) @binding(0) var<uniform> size: vec2f;
@group(0) @binding(1) var<storage, read_write> beam: array<vec2f>;
@group(0) @binding(2) var<storage> order: array<u32>;

@compute
@workgroup_size(${WORKGROUP_SIZE}, ${WORKGROUP_SIZE})
fn reorder(
	@builtin(global_invocation_id) pos: vec3u
	) {
	let i = pos.x + pos.y * u32(size.x);
	let j = order[i];
	if (j >= i) {
		let temp = beam[j];
		beam[j] = beam[i];
		beam[i] = temp;
	}
}
`;
