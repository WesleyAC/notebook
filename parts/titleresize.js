function tr() {
	for (let e of document.getElementsByTagName("h1")) {
		if (e.scrollWidth != e.clientWidth) {
			const fontSize = parseFloat(window.getComputedStyle(e)["font-size"].split("px")[0]);
			e.style.fontSize = (fontSize * e.clientWidth / e.scrollWidth) + 'px';
		}
	}
};

document.fonts.ready.then(tr);
window.addEventListener('orientationchange', tr, false);
