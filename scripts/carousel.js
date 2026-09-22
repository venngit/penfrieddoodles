function setupNewMemberSlider() {
	const viewport = document.getElementById('new-member-slider');
	if (!viewport) return () => {};
	const section = viewport.closest('.new-members');
	const track = viewport.querySelector('.new-member-track');
	const cards = [...track.children];
	const controls = section.querySelectorAll('[data-slider-direction]');
	const controlGroup = section.querySelector('.new-member-controls');
	controlGroup.hidden = cards.length < 2;
	const motion = matchMedia('(prefers-reduced-motion: reduce)');
	const listeners = new AbortController();
	const options = { signal: listeners.signal };
	let autoplay;
	let hovered = section.matches(':hover');
	let paused = false;
	const pauseButton = document.createElement('button');
	pauseButton.type = 'button';
	pauseButton.className = 'slider-button slider-pause';
	section.querySelector('.new-member-controls').prepend(pauseButton);

	function stopAutoplay() {
		window.clearInterval(autoplay);
		autoplay = undefined;
	}
	function showSlide(direction) {
		if (!cards.length) return;
		const step = cards[0].getBoundingClientRect().width + (parseFloat(getComputedStyle(track).gap) || 0);
		const maximum = Math.max(0, viewport.scrollWidth - viewport.clientWidth);
		if (!step || maximum <= 1) return;
		const current = viewport.scrollLeft;
		const left = direction > 0
			? (current >= maximum - 1 ? 0 : Math.min(maximum, current + step))
			: (current <= 1 ? maximum : Math.max(0, current - step));
		viewport.scrollTo({ left, behavior: motion.matches ? 'instant' : 'smooth' });
	}
	function updateAutoplay() {
		stopAutoplay();
		pauseButton.hidden = motion.matches;
		pauseButton.textContent = paused ? 'Play' : 'Pause';
		pauseButton.setAttribute('aria-label', paused ? 'Start automatic doodle rotation' : 'Pause automatic doodle rotation');
		if (!paused && !motion.matches && !hovered && !section.contains(document.activeElement) && !document.hidden && cards.length > 1) {
			autoplay = window.setInterval(() => showSlide(1), 4500);
		}
	}
	controls.forEach(control => control.addEventListener('click', () => {
		showSlide(control.dataset.sliderDirection === 'next' ? 1 : -1);
		paused = true;
		updateAutoplay();
	}, options));
	pauseButton.addEventListener('click', () => { paused = !paused; updateAutoplay(); }, options);
	section.addEventListener('mouseenter', () => { hovered = true; updateAutoplay(); }, options);
	section.addEventListener('mouseleave', () => { hovered = false; updateAutoplay(); }, options);
	section.addEventListener('focusin', stopAutoplay, options);
	section.addEventListener('focusout', () => queueMicrotask(() => {
		if (!listeners.signal.aborted) updateAutoplay();
	}), options);
	viewport.addEventListener('pointerdown', () => { paused = true; updateAutoplay(); }, options);
	document.addEventListener('visibilitychange', updateAutoplay, options);
	motion.addEventListener('change', updateAutoplay, options);
	updateAutoplay();
	return () => {
		stopAutoplay();
		listeners.abort();
		pauseButton.remove();
		controlGroup.hidden = true;
	};
}
