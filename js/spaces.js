import {fourierTransform} from "./fft.js";
import {beamBuffer} from "./data.js";

export {space, setSpace};

let space = 'x';
function setSpace(newSpace) {
	if (newSpace == space) return space;

	if (newSpace == 'x') {
		fourierTransform(true, beamBuffer);
	} else if (newSpace == 'k') {
		fourierTransform(false, beamBuffer);
	} else throw new Error("unknown space: ", newSpace);
	return space = newSpace;
}
