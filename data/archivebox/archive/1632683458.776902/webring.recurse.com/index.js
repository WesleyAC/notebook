import sites from './sites.js'

const vue = new Vue({
	el: '#app',
	data: {
		redirect: false,
		visited: null,
		sites,
		timeout: null,
	},
	methods: {
		random: function() {
			const { url } = sites[Math.floor(Math.random() * sites.length)]
			window.location.href = url
		},
		explore: function() {
			this.redirect = true

			const [theSite] = sites
			const visited = JSON.stringify([theSite])

			window.localStorage.setItem('lastVisited', Date.now())
			window.localStorage.setItem('visited', visited)

			document.getElementById('ring').remove()
			this.drawRing()

			this.timeout = setTimeout(this.sendToSite, 4000)
		},
		sendToSite: function() {
			if (this.redirect) {
				let newSite
				let newVisited

				if (this.visited) {
					newSite = sites[this.visited.length]
					newVisited = JSON.stringify([...this.visited, newSite])
				} else {
					;[newSite] = sites
					newVisited = JSON.stringify([newSite])
				}

				window.localStorage.setItem('visited', newVisited)
				window.localStorage.setItem('lastVisted', Date.now())

				window.location.href = newSite.url
			} else {
				window.localStorage.clear()
			}
		},
		cancel: function() {
			this.redirect = false
			this.visited = null
			clearTimeout(this.timeout)

			document.getElementById('ring').remove()
			this.drawRing()

			window.localStorage.clear()
		},
		clear: function() {
			this.redirect = false
			this.visited = null

			document.getElementById('ring').remove()
			this.drawRing()

			window.localStorage.clear()
		},
		drawRing: function() {
			const widthHeight = [window.innerWidth, window.innerHeight]
			const svgWidth = Math.min(...widthHeight) - 300

			let r = (svgWidth - 100) / 2
			const rotateEach = 0
			const count = 6
			const add = (r - 100) / count

			const step = 360 / this.sites.length
			const cx = svgWidth / 2
			const cy = svgWidth / 2
			const pi = 22 / 7
			const cordeg = -6

			const points = []

			for (let g = 0; g < 360; g += step) {
				const y =
					Math.round(
						Math.sin(((g + cordeg + rotateEach) / 180) * pi) * r,
						2,
					) + cx
				const x =
					Math.round(
						Math.cos(((g + cordeg + rotateEach) / 180) * pi) * r,
						2,
					) + cy
				points.push([x, y])
			}
			r -= add

			const svg = document.createElementNS(
				'http://www.w3.org/2000/svg',
				'svg',
			)

			svg.setAttribute('id', 'ring')
			svg.setAttribute('width', svgWidth)
			svg.setAttribute('height', svgWidth)
			svg.setAttributeNS(
				'http://www.w3.org/2000/xmlns/',
				'xmlns:xlink',
				'http://www.w3.org/1999/xlink',
			)

			const svgns = 'http://www.w3.org/2000/svg'
			points.forEach((point, i) => {
				const circle = document.createElementNS(svgns, 'circle')
				circle.setAttributeNS(null, 'cx', point[0])
				circle.setAttributeNS(null, 'cy', point[1])
				circle.setAttributeNS(null, 'r', 5)

				console.log(i, this.visited, this)
				if (
					(this.visited && i === this.visited.length) ||
					(i === 0 && this.redirect && this.visited === null)
				) {
					circle.setAttributeNS(null, 'r', 7)
					circle.setAttributeNS(
						null,
						'style',
						'fill: #354145; stroke: white; stroke-width: 3px;',
					)
				} else if (
					(this.visited && this.visited[i]) ||
					(this.visited && this.visited.length === 1 && i === 0)
				) {
					circle.setAttributeNS(
						null,
						'style',
						'fill: white; stroke: white; stroke-width: 1px;',
					)
				} else {
					circle.setAttributeNS(
						null,
						'style',
						'fill: #5a5a5a; stroke: white; stroke-width: 1px;',
					)
				}

				svg.appendChild(circle)

				const nextIndex = (i + 1) % this.sites.length

				if (
					(this.visited &&
						this.visited[nextIndex] &&
						this.visited[i]) ||
					(this.visited &&
						this.visited[i] &&
						!this.visited[nextIndex])
				) {
					const newLine = document.createElementNS(
						'http://www.w3.org/2000/svg',
						'line',
					)
					newLine.setAttribute('x1', points[i][0])
					newLine.setAttribute('y1', points[i][1])
					newLine.setAttribute('x2', points[nextIndex][0])
					newLine.setAttribute('y2', points[nextIndex][1])
					newLine.setAttribute('stroke', 'white')
					newLine.setAttribute('stroke-width', '2')
					if (
						(!this.visited[nextIndex] &&
							this.visited.length !== this.sites.length) ||
						(i === this.sites.length - 2 &&
							this.visited.length !== this.sites.length)
					) {
						newLine.setAttribute('stroke-dasharray', '4')
					}
					svg.appendChild(newLine)
				}
			})

			const ringVisual = document.getElementById('app')
			ringVisual.firstChild.appendChild(svg)
		},
	},

	mounted() {
		this.visited = JSON.parse(window.localStorage.getItem('visited'))
		this.drawRing()

		const sinceLastVisit =
			Date.now() - window.localStorage.getItem('lastVisited')

		if (this.visited && sinceLastVisit < 1000000) {
			this.redirect = true
			if (this.visited.length >= sites.length) {
				this.timeout = setTimeout(this.clear, 3000)
			} else {
				this.redirect = true
				this.timeout = setTimeout(this.sendToSite, 2500)
			}
		}

		this.$nextTick(() => {
			window.addEventListener('resize', () => {
				document.getElementById('ring').remove()
				this.drawRing()
			})
		})
	},
})
