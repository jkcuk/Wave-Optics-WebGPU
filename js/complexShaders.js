export {COMPLEX_MULTIPLICATION, MOD_SQUARE};

const COMPLEX_MULTIPLICATION = `
fn mulComplex(
	a: vec2f,
	b: vec2f
	) -> vec2f {
	return vec2f(a.x * b.x - a.y * b.y, a.x * b.y + a.y * b.x);
}
`;

const MOD_SQUARE = `
fn modSquare(
	a: vec2f
	) -> f32 {
	return a.x * a.x + a.y * a.y;
}
`;
