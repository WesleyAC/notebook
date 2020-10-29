function offset(el) {
	let rect = el.getBoundingClientRect(),
		scrollLeft = window.pageXOffset || document.documentElement.scrollLeft,
		scrollTop = window.pageYOffset || document.documentElement.scrollTop;
	return { top: rect.top + scrollTop, left: rect.left + scrollLeft, height: rect.height, width: rect.width }
}

function setup_sideline() {
	let old_svgs = document.getElementsByClassName('sideline');
	while(old_svgs[0]) {
		old_svgs[0].parentNode.removeChild(old_svgs[0]);
	}

	const labels = document.getElementsByClassName("sidenote-number");
	for (const label of labels) {
		const note = label.nextSibling.nextSibling; // :(
		let svg_container = document.createElementNS("http://www.w3.org/2000/svg", "svg");
		svg_container.classList.add("sideline");
		svg_container.style.height = document.body.scrollHeight + "px";

		const label_offset = offset(label);
		const note_offset = offset(note);
		const paragraph_offset = offset(label.parentNode);

		let svg_line1 = document.createElementNS("http://www.w3.org/2000/svg", "line");
		svg_container.appendChild(svg_line1);
		svg_line1.setAttribute("stroke-width", "2px");
		svg_line1.setAttribute("stroke", "#555");
		svg_line1.setAttribute("shape-rendering", "crispEdges");
		svg_line1.setAttribute("x1", label_offset.left);
		svg_line1.setAttribute("y1", label_offset.top);
		svg_line1.setAttribute("x2", paragraph_offset.left + paragraph_offset.width +10);
		svg_line1.setAttribute("y2", label_offset.top);

		let svg_line2 = document.createElementNS("http://www.w3.org/2000/svg", "line");
		svg_container.appendChild(svg_line2);
		svg_line2.setAttribute("stroke-width", "2px");
		svg_line2.setAttribute("stroke", "#555");
		svg_line2.setAttribute("x1", paragraph_offset.left + paragraph_offset.width +10);
		svg_line2.setAttribute("y1", label_offset.top);
		svg_line2.setAttribute("x2", note_offset.left-1);
		svg_line2.setAttribute("y2", note_offset.top);

		let svg_line3 = document.createElementNS("http://www.w3.org/2000/svg", "line");
		svg_container.appendChild(svg_line3);
		svg_line3.setAttribute("stroke-width", "2px");
		svg_line3.setAttribute("stroke", "#555");
		svg_line3.setAttribute("shape-rendering", "crispEdges");
		svg_line3.setAttribute("x1", note_offset.left-1);
		svg_line3.setAttribute("y1", note_offset.top);
		svg_line3.setAttribute("x2", note_offset.left-1);
		svg_line3.setAttribute("y2", note_offset.top + note_offset.height);
		note.parentNode.insertBefore(svg_container, note.nextSibling);
	}
}

document.fonts.ready.then(setup_sideline);
window.addEventListener('resize', setup_sideline);
