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

  const phonePair = document.querySelector('.phone-pair');
  if (phonePair) {
    phonePair.insertAdjacentHTML('beforeend', '<div class="checkin-motion" aria-hidden="true"><span class="checkin-box">✓</span><span class="checkin-copy"><strong>Today’s action complete</strong><span></span></span><span class="checkin-points">+3 pts</span></div>');
    phonePair.querySelector('.checkin-motion').dataset.productMotion = 'checkin';
  }

  const leaderboard = document.querySelector('.leaderboard-ui');
  if (leaderboard) {
    leaderboard.dataset.productMotion = 'leaderboard';
    leaderboard.querySelectorAll('.lb-summary strong').forEach((counter) => {
      const value = Number.parseInt(counter.textContent.replace(/\D/g, ''), 10);
      if (Number.isFinite(value) && !counter.textContent.includes('#')) counter.dataset.count = String(value);
    });
    leaderboard.querySelectorAll('.lb-place em').forEach((label) => {
      const value = Number.parseInt(label.textContent, 10);
      if (!Number.isFinite(value)) return;
      label.innerHTML = `<span data-count="${value}">${value}</span> points`;
    });
  }

  const aiDemo = document.querySelector('.ai-demo');
  if (aiDemo) {
    aiDemo.dataset.productMotion = 'ai';
    const prompt = aiDemo.querySelector('.ai-prompt');
    const fullPrompt = prompt.textContent.trim();
    const prefix = 'I want to ';
    aiDemo.dataset.promptText = fullPrompt.startsWith(prefix) ? fullPrompt.slice(prefix.length) : fullPrompt;
    prompt.textContent = '';
    const prefixText = document.createElement('span');
    prefixText.textContent = fullPrompt.startsWith(prefix) ? prefix : '';
    const typedText = document.createElement('span');
    typedText.className = 'typed-prompt';
    const cursor = document.createElement('span');
    cursor.className = 'typing-cursor';
    cursor.setAttribute('aria-hidden', 'true');
    prompt.append(prefixText, typedText, cursor);
    aiDemo.querySelector('.ai-response').insertAdjacentHTML('afterbegin', '<div class="ai-generate-label" aria-hidden="true"><span class="ai-button-spark">✦</span><span>Generate draft</span></div><div class="ai-working" aria-hidden="true"><span class="ai-spark">✦</span><span>Building your draft</span><span class="ai-working-dots"><i></i><i></i><i></i></span></div>');
    aiDemo.querySelector('.draft-details').insertAdjacentHTML('afterend', '<div class="suggested-actions"><small>Suggested habits</small><div><span>Warm up for 5 minutes</span><span>Easy 20-minute run</span><span>Walk or mobility recovery</span><span>Longer relaxed run</span><span>Strength and stability</span><span>Log effort after each run</span></div></div>');
  }

  const organizationPreview = document.querySelector('.org-preview');
  if (organizationPreview) {
    organizationPreview.dataset.productMotion = 'organization';
    organizationPreview.querySelectorAll('.participation strong').forEach((counter) => {
      const value = Number.parseInt(counter.textContent, 10);
      if (!Number.isFinite(value)) return;
      counter.dataset.count = String(value);
      if (counter.textContent.includes('%')) counter.dataset.suffix = '%';
    });
  }

  const elements = [...document.querySelectorAll('.reveal')];
  const productMotions = [...document.querySelectorAll('[data-product-motion]')];
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const setCounterValues = (group, useFinalValues) => {
    group.querySelectorAll('[data-count]').forEach((counter) => {
      counter.textContent = `${useFinalValues ? counter.dataset.count : '0'}${counter.dataset.suffix || ''}`;
    });
  };
  const aiTimers = new WeakMap();
  const clearAiTimers = (group) => {
    (aiTimers.get(group) || []).forEach((timer) => clearTimeout(timer));
    aiTimers.delete(group);
  };
  const finishAiMotion = (group) => {
    const typedText = group.querySelector('.typed-prompt');
    if (!typedText) return;
    typedText.textContent = group.dataset.promptText;
    group.classList.remove('ai-typing', 'ai-button-pressed', 'ai-processing');
    group.classList.add('ai-typed', 'ai-response-ready');
  };
  const resetAiMotion = (group) => {
    clearAiTimers(group);
    const typedText = group.querySelector('.typed-prompt');
    if (typedText) typedText.textContent = '';
    group.classList.remove('ai-typing', 'ai-typed', 'ai-button-pressed', 'ai-processing', 'ai-response-ready');
  };
  const startAiMotion = (group) => {
    resetAiMotion(group);
    const typedText = group.querySelector('.typed-prompt');
    const promptText = group.dataset.promptText || '';
    if (!typedText) return;
    group.classList.add('ai-typing');
    let index = 0;
    const timers = [];
    const typeNextCharacter = () => {
      index += 1;
      typedText.textContent = promptText.slice(0, index);
      if (index < promptText.length) {
        const timer = setTimeout(typeNextCharacter, 27);
        timers.push(timer);
      } else {
        group.classList.remove('ai-typing');
        group.classList.add('ai-typed', 'ai-button-pressed');
        const pressTimer = setTimeout(() => {
          group.classList.remove('ai-button-pressed');
          group.classList.add('ai-processing');
          const loadingTimer = setTimeout(() => {
            group.classList.remove('ai-processing');
            group.classList.add('ai-response-ready');
          }, 1760);
          timers.push(loadingTimer);
        }, 180);
        timers.push(pressTimer);
      }
    };
    const timer = setTimeout(typeNextCharacter, 180);
    timers.push(timer);
    aiTimers.set(group, timers);
  };

  if (reducedMotion || !('IntersectionObserver' in window)) {
    elements.forEach((element) => element.classList.add('is-visible'));
    productMotions.forEach((group) => {
      group.classList.add('product-motion-active');
      setCounterValues(group, true);
      if (group.dataset.productMotion === 'ai') finishAiMotion(group);
    });
    return;
  }

  const counterFrames = new WeakMap();
  const animateCounters = (group) => {
    const startedAt = performance.now();
    const duration = 720;
    const tick = (now) => {
      const progress = Math.min(1, (now - startedAt) / duration);
      const eased = progress * progress * (3 - 2 * progress);
      group.querySelectorAll('[data-count]').forEach((counter) => {
        const target = Number(counter.dataset.count);
        counter.textContent = `${Math.round(target * eased)}${counter.dataset.suffix || ''}`;
      });
      if (progress < 1) counterFrames.set(group, requestAnimationFrame(tick));
    };
    const existingFrame = counterFrames.get(group);
    if (existingFrame) cancelAnimationFrame(existingFrame);
    counterFrames.set(group, requestAnimationFrame(tick));
  };

  productMotions.forEach((group) => setCounterValues(group, false));
  const productObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      const group = entry.target;
      if (entry.intersectionRatio >= 0.32 && !group.classList.contains('product-motion-active')) {
        group.classList.add('product-motion-active');
        animateCounters(group);
        if (group.dataset.productMotion === 'ai') startAiMotion(group);
      } else if (!entry.isIntersecting) {
        const existingFrame = counterFrames.get(group);
        if (existingFrame) cancelAnimationFrame(existingFrame);
        counterFrames.delete(group);
        group.classList.remove('product-motion-active');
        setCounterValues(group, false);
        if (group.dataset.productMotion === 'ai') resetAiMotion(group);
      }
    });
  }, { threshold: [0, 0.32] });
  productMotions.forEach((group) => productObserver.observe(group));

  const clamp = (value, minimum = 0, maximum = 1) => Math.min(maximum, Math.max(minimum, value));
  const smoothstep = (value) => value * value * (3 - 2 * value);
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
      const entryMotion = smoothstep(entering);
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
