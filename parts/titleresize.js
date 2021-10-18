function tr() {
  let minFontSize = parseFloat(window.getComputedStyle(document.getElementById("dateline"))["font-size"].split("px")[0]);
	for (let e of document.getElementsByTagName("h1")) {
		if (e.scrollWidth != e.clientWidth) {
			const fontSize = parseFloat(window.getComputedStyle(e)["font-size"].split("px")[0]);
			e.style.fontSize = Math.max(fontSize * e.clientWidth / e.scrollWidth, minFontSize) + 'px';
		}
	}
}

document.fonts.ready.then(tr);
window.addEventListener('orientationchange', tr, false);
