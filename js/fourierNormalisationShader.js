import {WORKGROUP_SIZE} from "./data.js";

export {normalisationShader};

const normalisationShader = `
@group(0) @binding(0) var<uniform> size: vec2f;
@group(0) @binding(1) var<storage, read_write> beam: array<vec2f>;

@compute
@workgroup_size(${WORKGROUP_SIZE}, ${WORKGROUP_SIZE})
fn normalise(
	@builtin(global_invocation_id) pos: vec3u
	) {
	beam[pos.x + pos.y * u32(size.x)] /= size.x * size.y;
}
`;
