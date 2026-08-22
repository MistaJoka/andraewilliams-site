// Lifecycle controller for the network diagram: click-to-drill-down
// between scenes, a breadcrumb trail, keyboard support, and (Phase B/C)
// triggered packet-flow playback — normal sequences and, on scenes that
// have one, an attack sequence. The playback engine itself lives in
// packets.ts and only overlays the existing SVG — everything here is
// still just DOM chrome + orchestration, the same split Phase A used.
import { SCENES, ENTRY_SCENE_ID, type NetScene } from './scenes';
import { renderScene } from './render';
import { SEQUENCES, MITM_SEQUENCES, playSequence, type PacketSequence, type PlaybackHandle } from './packets';
import { buildSubnetTool } from './subnet-tool';

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
    spoofTrigger: stage.querySelector<HTMLElement>('.net-spoof-trigger'),
    spoofButton: stage.querySelector<HTMLButtonElement>('.net-spoof'),
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

  if (node.tool === 'subnet') detail.append(buildSubnetTool());

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

// Shows/hides the Watch button, cache toggle and spoof trigger for
// whichever scene is now current, and resets each button's idle label.
// The three are independent: a scene can have a normal sequence, an
// attack sequence, both, or neither (entry, l0).
function updateSequenceChrome(stage: HTMLElement, sceneId: string) {
  const { sequenceRoot, watchButton, cacheToggle, spoofTrigger, spoofButton } = chromeOf(stage);
  const sequence = SEQUENCES[sceneId];
  const mitm = MITM_SEQUENCES[sceneId];
  if (sequenceRoot) sequenceRoot.hidden = !sequence && !mitm;

  if (watchButton) {
    watchButton.hidden = !sequence;
    if (sequence) {
      watchButton.textContent = sequence.label;
      watchButton.dataset.idleLabel = sequence.label;
      watchButton.setAttribute('aria-disabled', 'false');
    }
  }
  if (cacheToggle) cacheToggle.hidden = !sequence?.cachedSteps;

  if (spoofTrigger) spoofTrigger.hidden = !mitm;
  if (spoofButton && mitm) {
    spoofButton.textContent = mitm.label;
    spoofButton.dataset.idleLabel = mitm.label;
    spoofButton.setAttribute('aria-disabled', 'false');
  }
}

// Cancels any in-flight playback for this stage and resets its chrome to
// idle — always, not just when a handle is currently tracked: a sequence
// that finished naturally (via startPlayback's done.then) can still have
// left a "compromised" mark on the diagram that the next interaction
// should clear. Called on every scene change and on every node/breadcrumb
// click, so a sequence never keeps animating into a diagram the user has
// since navigated away from, or fights a click the user just made.
function stopPlayback(stage: HTMLElement) {
  const handle = playbacks.get(stage);
  if (handle) {
    handle.cancel();
    playbacks.set(stage, null);
  }

  const { canvas, watchButton, spoofButton, steps, cacheToggle } = chromeOf(stage);
  if (watchButton && !watchButton.hidden) {
    watchButton.setAttribute('aria-disabled', 'false');
    watchButton.textContent = watchButton.dataset.idleLabel ?? watchButton.textContent ?? '';
  }
  if (spoofButton && !spoofButton.hidden) {
    spoofButton.setAttribute('aria-disabled', 'false');
    spoofButton.textContent = spoofButton.dataset.idleLabel ?? spoofButton.textContent ?? '';
  }
  if (steps) steps.innerHTML = '';
  cacheToggle?.querySelectorAll<HTMLInputElement>('input').forEach((r, i) => {
    r.checked = i === 0;
  });
  canvas?.querySelectorAll('.net-node--compromised').forEach((el) => el.classList.remove('net-node--compromised'));
}

// Shared by the Watch and Spoof buttons: reset the step list, disable the
// button that started this, play, then on natural completion relabel for
// replay and apply any compromised-node marks the sequence declares.
// Callers are responsible for calling stopPlayback() first — this never
// does it itself, so it can be used for either trigger uniformly.
function startPlayback(
  stage: HTMLElement,
  scene: NetScene,
  svg: SVGSVGElement,
  sequence: PacketSequence,
  useCached: boolean,
  triggerButton: HTMLButtonElement,
) {
  const { steps } = chromeOf(stage);
  if (!steps) return;

  steps.innerHTML = '';
  triggerButton.setAttribute('aria-disabled', 'true');

  const handle = playSequence(svg, scene, sequence, useCached, (step) => {
    steps.querySelector('[aria-current]')?.removeAttribute('aria-current');
    const li = document.createElement('li');
    li.textContent = step.caption;
    li.setAttribute('aria-current', 'step');
    steps.append(li);
  });
  playbacks.set(stage, handle);

  handle.done.then(() => {
    // A node click or scene change may have already cancelled this exact
    // handle (or started a new one) while it was finishing its last delay
    // — only apply the "completed" state if it's still the one in flight.
    if (playbacks.get(stage) !== handle) return;
    playbacks.set(stage, null);
    triggerButton.setAttribute('aria-disabled', 'false');
    triggerButton.textContent = `↻ Replay: ${sequence.title}`;
    steps.querySelector('[aria-current]')?.removeAttribute('aria-current');
    sequence.compromises?.forEach((id) => {
      svg.querySelector(`[data-node-id="${id}"]`)?.classList.add('net-node--compromised');
    });
  });
}

function wireSequence(stage: HTMLElement) {
  const { watchButton, cacheToggle, spoofButton } = chromeOf(stage);

  // `name` can't be hardcoded in the static template: two stage instances
  // on one page would otherwise cross-select each other's radio group,
  // since grouping is by `name` alone with no wrapping <form>.
  if (cacheToggle) {
    const groupName = `net-cache-${cacheGroupCounter++}`;
    cacheToggle.querySelectorAll<HTMLInputElement>('input').forEach((r) => {
      r.name = groupName;
    });
  }

  const currentScene = () => {
    const stack = stacks.get(stage);
    const id = stack?.[stack.length - 1];
    return id ? SCENES[id] : undefined;
  };
  const svgOf = () => chromeOf(stage).canvas?.querySelector<SVGSVGElement>('svg.net-svg');

  watchButton?.addEventListener('click', () => {
    if (watchButton.getAttribute('aria-disabled') === 'true') return;
    const scene = currentScene();
    const sequence = scene ? SEQUENCES[scene.id] : undefined;
    const svg = svgOf();
    if (!scene || !sequence || !svg) return;

    stopPlayback(stage);
    const useCached = cacheToggle?.querySelector<HTMLInputElement>('input:checked')?.value === 'cached';
    startPlayback(stage, scene, svg, sequence, !!useCached, watchButton);
  });

  spoofButton?.addEventListener('click', () => {
    if (spoofButton.getAttribute('aria-disabled') === 'true') return;
    const scene = currentScene();
    const mitm = scene ? MITM_SEQUENCES[scene.id] : undefined;
    const svg = svgOf();
    if (!scene || !mitm || !svg) return;

    stopPlayback(stage);
    startPlayback(stage, scene, svg, mitm, false, spoofButton);
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
