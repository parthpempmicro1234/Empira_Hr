const VIEWPORT_PADDING = 8;
const TOOLTIP_GAP = 8;
export const CALENDAR_TOOLTIP_WIDTH = 188;
export const CALENDAR_TOOLTIP_EST_HEIGHT = 76;

/**
 * Prefer tooltip above anchor; flip below if clipped at top.
 * Horizontally center on cell; clamp to viewport.
 *
 * @param {DOMRect} anchorRect
 * @param {number} [tooltipWidth]
 * @param {number} [tooltipHeight]
 * @returns {{ top: number, left: number, placement: 'top' | 'bottom' }}
 */
export function computeCalendarTooltipPosition(
  anchorRect,
  tooltipWidth = CALENDAR_TOOLTIP_WIDTH,
  tooltipHeight = CALENDAR_TOOLTIP_EST_HEIGHT
) {
  if (!anchorRect) {
    return { top: VIEWPORT_PADDING, left: VIEWPORT_PADDING, placement: 'top' };
  }

  const vw = window.innerWidth;
  const vh = window.innerHeight;

  let left = anchorRect.left + anchorRect.width / 2 - tooltipWidth / 2;
  if (left < VIEWPORT_PADDING) left = VIEWPORT_PADDING;
  if (left + tooltipWidth > vw - VIEWPORT_PADDING) {
    left = vw - tooltipWidth - VIEWPORT_PADDING;
  }

  let top = anchorRect.top - tooltipHeight - TOOLTIP_GAP;
  let placement = 'top';

  if (top < VIEWPORT_PADDING) {
    top = anchorRect.bottom + TOOLTIP_GAP;
    placement = 'bottom';
    if (top + tooltipHeight > vh - VIEWPORT_PADDING) {
      top = Math.max(VIEWPORT_PADDING, vh - tooltipHeight - VIEWPORT_PADDING);
    }
  }

  return { top, left, placement };
}

/**
 * Refine position once tooltip is measured in the DOM.
 */
export function refineCalendarTooltipPosition(anchorRect, tooltipEl) {
  const width = tooltipEl?.offsetWidth ?? CALENDAR_TOOLTIP_WIDTH;
  const height = tooltipEl?.offsetHeight ?? CALENDAR_TOOLTIP_EST_HEIGHT;
  return computeCalendarTooltipPosition(anchorRect, width, height);
}
