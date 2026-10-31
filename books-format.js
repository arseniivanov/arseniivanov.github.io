export function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character]);
}

export function ratingStars(rating) {
  if (!(rating > 0)) return '<span class="star-empty" style="font-size:0.8em; color:#ccc">Not rated</span>';
  return Array.from({ length: 5 }, (_, index) => {
    const fill = Math.max(0, Math.min(100, (rating - index) * 100));
    return `<span class="rating-star" aria-hidden="true"><span class="star-empty">☆</span><span class="star-filled" style="width:${fill}%">★</span></span>`;
  }).join('');
}
