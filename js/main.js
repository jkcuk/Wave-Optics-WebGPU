import {render} from "./render.js";
import {propagate, setPropagationInterval, clearPropagationInterval} from "./propagation.js";
import {generateGaussian, setWidthInMetres, setW0, setWavelength, setDeltaZ, deltaZ} from "./data.js";
import {generateSimpleLens, generateFresnelLens, setXPeriod, setYPeriod, setXShift, setYShift, setFocalLength, setLensScaling} from "./lenses.js";
import {lens} from "./lens.js";
import {transverse} from "./transverse.js";
import {setSpace} from "./spaces.js";

function init() {
	setSpace("x");
	generateGaussian();
	if (document.getElementById("fresnel").checked) {
		generateFresnelLens(false);
		lens();
		generateFresnelLens(true);
	} else {
		generateSimpleLens();
	}
	lens();
}

document.getElementById("size").addEventListener("change", (event) => {
	clearPropagationInterval();
	setWidthInMetres();
	setLensScaling();
	init();
	render(true);
});

document.getElementById("w0").addEventListener("change", (event) => {
	setW0();
	init();
	render(true);
});

document.getElementById("wavelength").addEventListener("change", (event) => {
	clearPropagationInterval();
	setWavelength();
	setLensScaling();
});

document.getElementById("reset").addEventListener("click", (event) => {
	clearPropagationInterval();
	init();
	render(true);
});

document.getElementById("xCount").addEventListener("change", (event) => {
	clearPropagationInterval();
	setXPeriod();
	if (document.getElementById("fresnel").checked) {
		init();
		render(true);
	}
});

document.getElementById("yCount").addEventListener("change", (event) => {
	clearPropagationInterval();
	setYPeriod();
	if (document.getElementById("fresnel").checked) {
		init();
		render(true);
	}
});

document.getElementById("xShift").addEventListener("change", (event) => {
	clearPropagationInterval();
	setXShift();
	if (document.getElementById("fresnel").checked) {
		init();
		render(true);
	}
});

document.getElementById("yShift").addEventListener("change", (event) => {
	clearPropagationInterval();
	setYShift();
	if (document.getElementById("fresnel").checked) {
		init();
		render(true);
	}
});

document.getElementById("focalLength").addEventListener("change", (event) => {
	clearPropagationInterval();
	setFocalLength();
	init();
	render(true);
});

document.getElementById("simple").addEventListener("change", (event) => {
	clearPropagationInterval();
	init();
	render(true);
});
document.getElementById("fresnel").addEventListener("change", (event) => {
	clearPropagationInterval();
	init();
	render(true);
});

document.getElementById("propagationSlider").addEventListener("change", (event) => {
	init();
	const value = document.getElementById("propagationSlider").value;
	document.getElementById("propagationRange").value = value;
	propagate(deltaZ * value);
	render(true);
});

document.getElementById("propagationRange").addEventListener("change", (event) => {
	init();
	const value = document.getElementById("propagationRange").value;
	document.getElementById("propagationSlider").value = value;
	propagate(deltaZ * value);
	render(true);
});

document.getElementById("deltaZ").addEventListener("change", (event) => {
	clearPropagationInterval();
	setDeltaZ();
});

document.getElementById("propagate").addEventListener("click", (event) => {
	if (document.getElementById("static").checked) {
		init();
		propagate(deltaZ);
		render(true);
	} else if (document.getElementById("singlePropagate").checked) {
		propagate(deltaZ);
		render(true);
	} else if (document.getElementById("xzPlane").checked) {
		init();
		transverse("xz");
		render(false);
	} else if (document.getElementById("yzPlane").checked) {
		init();
		transverse("yz");
		render(false);
	}
});

document.getElementById("phase").addEventListener("change", (event) => {
	render(false);
});

document.getElementById("exposure").addEventListener("input", (event) => {
	document.getElementById("exposureText").value = 10**document.getElementById("exposure").value;
	render(false);
});

document.getElementById("exposureText").addEventListener("change", (event) => {
	document.getElementById("exposure").value = Math.log10(parseFloat(document.getElementById("exposureText").value));
	render(false);
});

async function test() {
	propagate(deltaZ);
	await render(true);
}

document.getElementById("start").addEventListener("click", (event) => {
	setPropagationInterval(test, 1000/5);
});
document.getElementById("stop").addEventListener("click", (event) => {
	clearPropagationInterval();
});

init();
render(true);
