function tr() {
  let dateline = document.getElementById("dateline");
  if (!dateline) { return; }
  let minFontSize = parseFloat(window.getComputedStyle(dateline)["font-size"].split("px")[0]);
	for (let e of document.getElementsByTagName("h1")) {
		if (e.scrollWidth != e.clientWidth) {
			const fontSize = parseFloat(window.getComputedStyle(e)["font-size"].split("px")[0]);
			e.style.fontSize = Math.max(fontSize * e.clientWidth / e.scrollWidth, minFontSize) + 'px';
		}
	}
}

document.fonts.ready.then(tr);
window.addEventListener('orientationchange', tr, false);
