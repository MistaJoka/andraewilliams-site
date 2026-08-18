export class Gallery {
  constructor(pipeline, sceneNames, { intervalMs = 12000, autoplay = true } = {}) {
    this.pipeline = pipeline;
    this.sceneNames = sceneNames;
    this.intervalMs = intervalMs;
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
    this.pipeline.setScene(this.sceneNames[this.index]);
  }
}
