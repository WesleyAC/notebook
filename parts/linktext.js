// https://stackoverflow.com/questions/7616461/generate-a-hash-from-string-in-javascript
const cyrb53 = function(str, seed = 0) {
	let h1 = 0xdeadbeef ^ seed, h2 = 0x41c6ce57 ^ seed;
	for (let i = 0, ch; i < str.length; i++) {
		ch = str.charCodeAt(i);
		h1 = Math.imul(h1 ^ ch, 2654435761);
		h2 = Math.imul(h2 ^ ch, 1597334677);
	}
	h1 = Math.imul(h1 ^ (h1>>>16), 2246822507) ^ Math.imul(h2 ^ (h2>>>13), 3266489909);
	h2 = Math.imul(h2 ^ (h2>>>16), 2246822507) ^ Math.imul(h1 ^ (h1>>>13), 3266489909);
	return 4294967296 * (2097151 & h2) + (h1>>>0);
};

// https://stackoverflow.com/questions/7781963/js-get-array-of-all-selected-nodes-in-contenteditable-div/7784176
function nextNode(node) {
	if (node.hasChildNodes()) {
		return node.firstChild;
	} else {
		while (node && !node.nextSibling) {
			node = node.parentNode;
		}
		if (!node) {
			return null;
		}
		return node.nextSibling;
	}
}

function getRangeSelectedNodes(range) {
	var node = range.startContainer;
	var endNode = range.endContainer;

	// Special case for a range that is contained within a single node
	if (node == endNode) {
		return [node];
	}

	// Iterate nodes until we hit the end container
	var rangeNodes = [];
	while (node && node != endNode) {
		rangeNodes.push( node = nextNode(node) );
	}

	// Add partially selected nodes at the start of the range
	node = range.startContainer;
	while (node && node != range.commonAncestorContainer) {
		rangeNodes.unshift(node);
		node = node.parentNode;
	}

	return rangeNodes;
}

// https://stackoverflow.com/questions/6213227/fastest-way-to-convert-a-number-to-radix-64-in-javascript
const Base64 = {
	_Rixits: "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-_",

	// This cannot handle negative numbers and only works on the 
	//     integer part, discarding the fractional part.
	// Doing better means deciding on whether you're just representing
	// the subset of javascript numbers of twos-complement 32-bit integers 
	// or going with base-64 representations for the bit pattern of the
	// underlying IEEE floating-point number, or representing the mantissae
	// and exponents separately, or some other possibility. For now, bail
	fromNumber: function(number) {
		if (isNaN(Number(number)) || number === null ||
			number === Number.POSITIVE_INFINITY)
			throw "The input is not valid";
		if (number < 0)
			throw "Can't represent negative numbers now";

		var rixit; // like 'digit', only in some non-decimal radix 
		var residual = Math.floor(number);
		var result = '';
		for (;;) {
			rixit = residual % 64
			result = this._Rixits.charAt(rixit) + result;
			residual = Math.floor(residual / 64);

			if (residual == 0) { break; }
		}
		return result;
	},

	toNumber: function(rixits) {
		var result = 0;
		rixits = rixits.split('');
		for (var e = 0; e < rixits.length; e++) {
			result = (result * 64) + this._Rixits.indexOf(rixits[e]);
		}
		return result;
	}
}

function hashnode(n) {
	return Base64.fromNumber(cyrb53(n.wholeText));
}

// TODO: deal with multiple elements having the same hash

if (!!(window.history && history.replaceState) && typeof(Range) != "undefined") {
	document.onselectionchange = () => {
		const selection = window.getSelection();
		if (!selection.isCollapsed) {
			const nodes = getRangeSelectedNodes(selection.getRangeAt(0)).filter((n) => { return n.nodeType == 3 });
			const hashes = nodes.map((n) => {
				return hashnode(n);
			});

			let anchor_offsets = new Map();
			anchor_offsets.set(hashnode(selection.anchorNode), [selection.anchorOffset]);
			anchor_offsets.set(hashnode(selection.focusNode), [selection.focusOffset]);
			if (anchor_offsets.size == 1) { anchor_offsets.set(hashnode(selection.anchorNode), [selection.anchorOffset, selection.focusOffset].sort()); }

			if (hashes.length > 0) {
				const version = "1";
				const start_hash = hashes[0];
				const start_offset = Math.min(...anchor_offsets.get(start_hash));
				const end_hash = hashes[hashes.length-1];
				const end_offset = Math.max(...anchor_offsets.get(end_hash));
				const fragment = `#${version}.${start_hash}:${start_offset}.${end_hash}:${end_offset}`
				history.replaceState(null, null, fragment);
				return;
			} 
		}
		history.replaceState(null, null, window.location.pathname);
	};

	if (window.location.hash.length > 0) {
		let [version, start_hash_full, end_hash_full] = window.location.hash.slice(1).split(".");
		if (version == "1") {
			let range = new Range();
			let [start_hash, start_offset] = start_hash_full.split(":");
			let [end_hash, end_offset] = end_hash_full.split(":");
			let n, walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
			while (n = walk.nextNode()) { // eslint-disable-line no-cond-assign
				const h = hashnode(n);
				if (h == start_hash) { range.setStart(n, start_offset); }
				if (h == end_hash) { range.setEnd(n, end_offset); }
			}
			document.getSelection().removeAllRanges();
			document.getSelection().addRange(range);
			range.startContainer.parentElement.scrollIntoView();
		} else {
			console.log("unknown link version: ", version);
		}
	}
}
