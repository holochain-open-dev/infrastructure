import { decode } from '@msgpack/msgpack';

export function utf32Decode(bytes: Uint8Array): string {
	const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
	let result = '';

	for (let i = 0; i < bytes.length; i += 4) {
		result += String.fromCodePoint(view.getInt32(i, true));
	}

	return result;
}

export function decodeComponent(component: Uint8Array): string {
	try {
		const result = utf32Decode(decode(component) as any);
		return result;
	} catch (e) {
		// Nothing to do
	}
	try {
		const result2 = JSON.stringify(decode(component));
		return result2;
	} catch (e) {
		// Nothing to do
	}

	return bin2String(component);
}

function bin2String(array: any) {
	let result = '';
	for (let i = 0; i < array.length; i += 1) {
		result += String.fromCharCode(array[i]);
	}
	return result;
}

export function decodePath(path: Uint8Array[]): string {
	return path.map(c => decodeComponent(c)).join('.');
}
