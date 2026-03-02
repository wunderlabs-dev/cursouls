export class Animator {
  private frameId: number | undefined;
  private tick = 0;

  constructor(private readonly root: HTMLElement) {}

  public start(): void {
    if (this.frameId !== undefined) {
      return;
    }

    const loop = (): void => {
      this.tick = (this.tick + 1) % 1200;
      this.root.dataset.tick = String(this.tick);
      this.frameId = window.requestAnimationFrame(loop);
    };

    this.frameId = window.requestAnimationFrame(loop);
  }

  public stop(): void {
    if (this.frameId === undefined) {
      return;
    }
    window.cancelAnimationFrame(this.frameId);
    this.frameId = undefined;
  }
}
