// Lifecycle controller for the network diagram: click-to-drill-down
// between scenes, a breadcrumb trail, and keyboard support. Unlike
// ascii/mount.js there is no animation loop yet to pause off-screen —
// scene swaps are plain CSS transitions, and the site's existing global
// `prefers-reduced-motion` rule in base.css already neutralizes those.
// A raf-driven loop arrives with the Phase B packet-flow sequencer, at
// which point this will need the same visibility-gating discipline.
import { SCENES, ENTRY_SCENE_ID } from './scenes';
import { renderScene } from './render';

const stacks = new WeakMap<HTMLElement, string[]>();

function chromeOf(stage: HTMLElement) {
  return {
    canvas: stage.querySelector<HTMLElement>('.net-canvas'),
    heading: stage.querySelector<HTMLElement>('.net-scene-title'),
    intro: stage.querySelector<HTMLElement>('.net-intro'),
    detail: stage.querySelector<HTMLElement>('.net-detail'),
    staticDetail: stage.querySelector<HTMLElement>('.net-static-detail'),
    breadcrumb: stage.querySelector<HTMLElement>('.net-breadcrumb'),
    breadcrumbList: stage.querySelector<HTMLOListElement>('.net-breadcrumb ol'),
  };
}

function renderBreadcrumb(stage: HTMLElement, stack: string[]) {
  const { breadcrumb, breadcrumbList } = chromeOf(stage);
  if (!breadcrumb || !breadcrumbList) return;
  breadcrumb.hidden = stack.length < 2;
  breadcrumbList.innerHTML = '';
  stack.forEach((id, i) => {
    const scene = SCENES[id];
    if (!scene) return;
    const li = document.createElement('li');
    if (i === stack.length - 1) {
      li.textContent = scene.title;
      li.setAttribute('aria-current', 'step');
    } else {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = scene.title;
      btn.addEventListener('click', () => navigate(stage, stack.slice(0, i + 1)));
      li.append(btn);
    }
    breadcrumbList.append(li);
  });
}

function showDetail(stage: HTMLElement, nodeId: string) {
  const stack = stacks.get(stage);
  const { detail } = chromeOf(stage);
  const scene = stack && SCENES[stack[stack.length - 1]!];
  const node = scene?.nodes.find((n) => n.id === nodeId);
  if (!detail || !node) return;

  detail.innerHTML = '';
  const label = document.createElement('p');
  label.className = 'net-detail-label';
  label.textContent = node.label;
  const caption = document.createElement('p');
  caption.textContent = node.caption;
  detail.append(label, caption);

  const child = node.drillInto ? SCENES[node.drillInto] : undefined;
  if (child) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'net-continue';
    btn.textContent = `Continue to ${child.title} →`;
    btn.addEventListener('click', () => navigate(stage, [...(stacks.get(stage) ?? []), child.id]));
    detail.append(btn);
  }
}

function wireNodes(stage: HTMLElement) {
  const { canvas } = chromeOf(stage);
  canvas?.querySelectorAll<HTMLElement>('.net-node').forEach((node) => {
    const activate = () => {
      if (node.dataset.nodeId) showDetail(stage, node.dataset.nodeId);
    };
    node.addEventListener('click', activate);
    node.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        activate();
      }
    });
  });
}

function showScene(stage: HTMLElement, stack: string[]) {
  const scene = SCENES[stack[stack.length - 1]!];
  const { canvas, heading, intro, detail, staticDetail } = chromeOf(stage);
  if (!scene || !canvas) return;

  canvas.innerHTML = renderScene(scene);
  if (heading) heading.textContent = scene.title;
  if (intro) intro.textContent = scene.intro;
  if (detail) detail.innerHTML = '';
  if (staticDetail) staticDetail.hidden = true;

  renderBreadcrumb(stage, stack);
  wireNodes(stage);
  // Standard SPA-navigation pattern: move focus to the new scene's
  // heading so a screen reader announces the level change. Safe to call
  // unconditionally — showScene only ever runs after a user-triggered
  // navigation, never during initial mount.
  heading?.focus();
}

function navigate(stage: HTMLElement, nextStack: string[]) {
  stacks.set(stage, nextStack);
  showScene(stage, nextStack);
}

export function mount(stage: HTMLElement): void {
  stacks.set(stage, [ENTRY_SCENE_ID]);

  const { staticDetail, breadcrumb } = chromeOf(stage);
  // Both exist purely as the no-JS baseline / initial state; once this
  // controller is wired up the interactive detail panel and breadcrumb
  // take over.
  if (staticDetail) staticDetail.hidden = true;
  if (breadcrumb) breadcrumb.hidden = true;

  // The entry scene is already server-rendered with identical markup —
  // wire it up rather than re-rendering it on boot.
  wireNodes(stage);
}
