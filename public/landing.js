(() => {
  const titleCaseLabels = new Map([
    ['SPONSORED PRO', 'Sponsored Pro'],
    ['INVITATION-BASED', 'Invitation-Based'],
    ['AGGREGATE REPORTING', 'Aggregate Reporting'],
  ]);
  document.querySelectorAll('.org-tags span').forEach((label) => {
    const replacement = titleCaseLabels.get(label.textContent.trim());
    if (replacement) label.textContent = replacement;
  });

  const elements = [...document.querySelectorAll('.reveal')];
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) {
    elements.forEach((element) => element.classList.add('is-visible'));
    return;
  }

  const clamp = (value, minimum = 0, maximum = 1) => Math.min(maximum, Math.max(minimum, value));
  const smoothstep = (value) => value * value * (3 - 2 * value);
  const easeOutBack = (value) => {
    const overshoot = 1.45;
    const shifted = value - 1;
    return 1 + (overshoot + 1) * shifted ** 3 + overshoot * shifted ** 2;
  };
  let frame = 0;

  elements.forEach((element) => {
    element.style.transition = 'none';
    element.style.willChange = 'opacity, transform';
  });

  const update = () => {
    frame = 0;
    const viewportHeight = window.innerHeight;
    const entryStart = viewportHeight * 0.98;
    const entryEnd = viewportHeight * 0.62;
    const exitStart = viewportHeight * 0.2;

    for (const element of elements) {
      const rect = element.getBoundingClientRect();
      const entering = clamp((entryStart - rect.top) / (entryStart - entryEnd));
      const leaving = rect.bottom < exitStart ? clamp(rect.bottom / exitStart) : 1;
      const nearTop = rect.bottom < exitStart;
      const entryMotion = easeOutBack(entering);
      const exitMotion = smoothstep(leaving);
      const motion = nearTop ? exitMotion : entryMotion;
      const opacity = nearTop
        ? exitMotion
        : smoothstep(clamp(entering * 1.35));
      const horizontalDirection = element.classList.contains('from-left')
        ? -1
        : element.classList.contains('from-right')
          ? 1
          : 0;
      const horizontalOffset = nearTop ? 0 : horizontalDirection * 42 * (1 - motion);
      const verticalOffset = nearTop
        ? -18 * (1 - motion)
        : (horizontalDirection ? 16 : 30) * (1 - motion);
      const scale = nearTop ? 0.985 + 0.015 * motion : 0.965 + 0.035 * motion;
      const rotation = nearTop ? 0 : horizontalDirection * -1.15 * (1 - motion);

      element.style.opacity = opacity.toFixed(3);
      element.style.transform = `translate3d(${horizontalOffset.toFixed(2)}px, ${verticalOffset.toFixed(2)}px, 0) scale(${scale.toFixed(4)}) rotate(${rotation.toFixed(2)}deg)`;
      element.classList.toggle('is-visible', opacity > 0.5);
    }

    if (elements.every((element) => {
      const rect = element.getBoundingClientRect();
      return rect.bottom < 0 || rect.top > viewportHeight;
    })) {
      elements.forEach((element) => { element.style.willChange = 'auto'; });
    }
  };

  const requestUpdate = () => {
    if (!frame) frame = window.requestAnimationFrame(update);
  };

  window.addEventListener('scroll', requestUpdate, { passive: true });
  window.addEventListener('resize', requestUpdate);
  update();
})();
