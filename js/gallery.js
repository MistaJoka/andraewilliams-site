const GLITCH_CLASS = 'glitching';

export class Gallery {
  constructor(pipeline, sceneNames, { intervalMs = 12000, autoplay = true, glitchMs = 220 } = {}) {
    this.pipeline = pipeline;
    this.sceneNames = sceneNames;
    this.intervalMs = intervalMs;
    this.glitchMs = glitchMs;
    this.index = 0;
    this.autoplay = autoplay;
    this.timer = null;
  }

  start() {
    if (!this.autoplay || this.sceneNames.length < 2) return;
    this.timer = setInterval(() => this.next(), this.intervalMs);
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  next() {
    this.index = (this.index + 1) % this.sceneNames.length;
    const canvas = this.pipeline.canvas;
    canvas.classList.add(GLITCH_CLASS);
    this.pipeline.setScene(this.sceneNames[this.index]);
    setTimeout(() => canvas.classList.remove(GLITCH_CLASS), this.glitchMs);
  }
}
