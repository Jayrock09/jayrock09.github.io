/*
  Voxy page enhancements
  - Swap letter/emoji logos with the actual Modrinth project icon (when available)
  - Uses Modrinth public API client-side (no keys)
*/

(function () {
  const cards = document.querySelectorAll('article.shaderCard[data-modrinth]');
  if (!cards.length) return;

  const cachePrefix = 'mr_icon_url:';

  /**
   * @param {string} slug
   * @returns {Promise<string|null>} icon_url
   */
  async function fetchIconUrl(slug) {
    const cached = localStorage.getItem(cachePrefix + slug);
    if (cached) return cached;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    try {
      const res = await fetch('https://api.modrinth.com/v2/project/' + encodeURIComponent(slug), {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json'
        }
      });
      if (!res.ok) return null;
      const data = await res.json();
      const iconUrl = data && typeof data.icon_url === 'string' ? data.icon_url : null;
      if (iconUrl) localStorage.setItem(cachePrefix + slug, iconUrl);
      return iconUrl;
    } catch {
      return null;
    } finally {
      clearTimeout(timeout);
    }
  }

  async function hydrateCard(card) {
    const slug = card.getAttribute('data-modrinth');
    if (!slug) return;

    const img = card.querySelector('.shaderCard__logoImg');
    if (!img) return;

    const iconUrl = await fetchIconUrl(slug);
    if (!iconUrl) return;

    img.src = iconUrl;
    img.addEventListener('load', () => {
      card.classList.add('has-icon');
    }, { once: true });

    // If it fails to load, just keep the fallback.
    img.addEventListener('error', () => {
      try { localStorage.removeItem(cachePrefix + slug); } catch {}
    }, { once: true });
  }

  // Stagger slightly so the page feels smoother.
  (async () => {
    for (const card of cards) {
      // eslint-disable-next-line no-await-in-loop
      await hydrateCard(card);
    }
  })();
})();
