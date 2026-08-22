// Lifecycle controller for the network diagram: click-to-drill-down
// between scenes, a breadcrumb trail, keyboard support, and (Phase B)
// triggered packet-flow playback. The playback engine itself lives in
// packets.ts and only overlays the existing SVG — everything here is
// still just DOM chrome + orchestration, the same split Phase A used.
import { SCENES, ENTRY_SCENE_ID } from './scenes';
import { renderScene } from './render';
import { SEQUENCES, playSequence, type PlaybackHandle } from './packets';

const stacks = new WeakMap<HTMLElement, string[]>();
const playbacks = new WeakMap<HTMLElement, PlaybackHandle | null>();

let cacheGroupCounter = 0;

function chromeOf(stage: HTMLElement) {
  return {
    canvas: stage.querySelector<HTMLElement>('.net-canvas'),
    heading: stage.querySelector<HTMLElement>('.net-scene-title'),
    intro: stage.querySelector<HTMLElement>('.net-intro'),
    detail: stage.querySelector<HTMLElement>('.net-detail'),
    staticDetail: stage.querySelector<HTMLElement>('.net-static-detail'),
    breadcrumb: stage.querySelector<HTMLElement>('.net-breadcrumb'),
    breadcrumbList: stage.querySelector<HTMLOListElement>('.net-breadcrumb ol'),
    sequenceRoot: stage.querySelector<HTMLElement>('.net-sequence'),
    watchButton: stage.querySelector<HTMLButtonElement>('.net-watch'),
    cacheToggle: stage.querySelector<HTMLElement>('.net-cache-toggle'),
    steps: stage.querySelector<HTMLOListElement>('.net-steps'),
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
      stopPlayback(stage);
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

// Shows/hides the Watch button and cache toggle for whichever scene is
// now current, and resets the button's idle label. Safe to call whether
// or not the scene has a sequence at all (entry, l0).
function updateSequenceChrome(stage: HTMLElement, sceneId: string) {
  const { sequenceRoot, watchButton, cacheToggle } = chromeOf(stage);
  const sequence = SEQUENCES[sceneId];
  if (sequenceRoot) sequenceRoot.hidden = !sequence;
  if (!sequence) return;
  if (watchButton) {
    watchButton.textContent = sequence.label;
    watchButton.dataset.idleLabel = sequence.label;
    watchButton.setAttribute('aria-disabled', 'false');
  }
  if (cacheToggle) cacheToggle.hidden = !sequence.cachedSteps;
}

// Cancels any in-flight playback for this stage and resets its chrome to
// idle. Called on every scene change and on every node/breadcrumb click,
// so a sequence never keeps animating into a diagram the user has since
// navigated away from, or fights a click the user just made.
function stopPlayback(stage: HTMLElement) {
  const handle = playbacks.get(stage);
  if (!handle) return;
  handle.cancel();
  playbacks.set(stage, null);

  const { watchButton, steps, cacheToggle } = chromeOf(stage);
  if (watchButton) {
    watchButton.setAttribute('aria-disabled', 'false');
    watchButton.textContent = watchButton.dataset.idleLabel ?? watchButton.textContent ?? '';
  }
  if (steps) steps.innerHTML = '';
  cacheToggle?.querySelectorAll<HTMLInputElement>('input').forEach((r, i) => {
    r.checked = i === 0;
  });
}

function wireSequence(stage: HTMLElement) {
  const { watchButton, cacheToggle, steps } = chromeOf(stage);
  if (!watchButton) return;

  // `name` can't be hardcoded in the static template: two stage instances
  // on one page would otherwise cross-select each other's radio group,
  // since grouping is by `name` alone with no wrapping <form>.
  if (cacheToggle) {
    const groupName = `net-cache-${cacheGroupCounter++}`;
    cacheToggle.querySelectorAll<HTMLInputElement>('input').forEach((r) => {
      r.name = groupName;
    });
  }

  watchButton.addEventListener('click', () => {
    if (watchButton.getAttribute('aria-disabled') === 'true') return;

    const stack = stacks.get(stage);
    const sceneId = stack?.[stack.length - 1];
    const scene = sceneId ? SCENES[sceneId] : undefined;
    const sequence = sceneId ? SEQUENCES[sceneId] : undefined;
    const svg = chromeOf(stage).canvas?.querySelector<SVGSVGElement>('svg.net-svg');
    if (!scene || !sequence || !svg || !steps) return;

    const useCached = cacheToggle?.querySelector<HTMLInputElement>('input:checked')?.value === 'cached';
    steps.innerHTML = '';
    watchButton.setAttribute('aria-disabled', 'true');

    const handle = playSequence(svg, scene, sequence, !!useCached, (step) => {
      steps.querySelector('[aria-current]')?.removeAttribute('aria-current');
      const li = document.createElement('li');
      li.textContent = step.caption;
      li.setAttribute('aria-current', 'step');
      steps.append(li);
    });
    playbacks.set(stage, handle);

    handle.done.then(() => {
      // A node click or scene change may have already cancelled this
      // exact handle (or started a new one) while it was finishing its
      // last delay — only apply the "completed" state if it's still the
      // one in flight.
      if (playbacks.get(stage) !== handle) return;
      playbacks.set(stage, null);
      watchButton.setAttribute('aria-disabled', 'false');
      watchButton.textContent = `↻ Replay: ${sequence.title}`;
      steps.querySelector('[aria-current]')?.removeAttribute('aria-current');
    });
  });
}

function showScene(stage: HTMLElement, stack: string[]) {
  stopPlayback(stage);

  const scene = SCENES[stack[stack.length - 1]!];
  const { canvas, heading, intro, detail, staticDetail } = chromeOf(stage);
  if (!scene || !canvas) return;

  canvas.innerHTML = renderScene(scene);
  if (heading) heading.textContent = scene.title;
  if (intro) intro.textContent = scene.intro;
  if (detail) detail.innerHTML = '';
  if (staticDetail) staticDetail.hidden = true;

  renderBreadcrumb(stage, stack);
  updateSequenceChrome(stage, scene.id);
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
  updateSequenceChrome(stage, ENTRY_SCENE_ID);

  // The entry scene is already server-rendered with identical markup —
  // wire it up rather than re-rendering it on boot.
  wireNodes(stage);
  wireSequence(stage);
}
