export interface LayoutNodes {
  root: HTMLElement;
  health: HTMLElement;
  scene: HTMLElement;
  queue: HTMLElement;
  tooltip: HTMLElement;
}

export function createLayout(container: HTMLElement): LayoutNodes {
  container.innerHTML = `
    <main class="cafe-root" aria-label="Cursor Cafe sidebar">
      <header class="cafe-health" id="cafe-health">initializing...</header>
      <section class="cafe-scene" id="cafe-scene" aria-label="Cafe seats"></section>
      <section class="cafe-queue" id="cafe-queue" aria-label="Overflow queue"></section>
      <aside class="cafe-tooltip is-hidden" id="cafe-tooltip" aria-live="polite"></aside>
    </main>
  `;

  const root = container.querySelector<HTMLElement>(".cafe-root");
  const health = container.querySelector<HTMLElement>("#cafe-health");
  const scene = container.querySelector<HTMLElement>("#cafe-scene");
  const queue = container.querySelector<HTMLElement>("#cafe-queue");
  const tooltip = container.querySelector<HTMLElement>("#cafe-tooltip");

  if (!root || !health || !scene || !queue || !tooltip) {
    throw new Error("Failed to initialize webview layout");
  }

  return { root, health, scene, queue, tooltip };
}
