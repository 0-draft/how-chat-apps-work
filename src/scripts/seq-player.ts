import type { ArrowGeom } from "../lib/layout";
import { activeCard, clamp, stepFromHash } from "../lib/player";
import type { StepKind } from "../lib/sequences/types";

type Arrow = ArrowGeom & { kind: StepKind };

const WIDE = "(min-width: 960px)";
const MOTION = "(prefers-reduced-motion: no-preference)";
const PLAY_MS = 2600;
const LOCK_MS = 900;

export class SeqPlayer extends HTMLElement {
  #arrows: Arrow[] = [];
  #steps: SVGAElement[] = [];
  #cards: HTMLElement[] = [];
  #current = -1;
  #timer: number | undefined;
  #anim: Animation | undefined;
  #unscroll: AbortController | undefined;
  #lockUntil = 0;
  #relock: number | undefined;
  #wide = window.matchMedia(WIDE);
  #abort = new AbortController();
  #userStop: AbortController | undefined;

  get #id(): string {
    return this.dataset.seq ?? "";
  }

  get count(): number {
    return this.#cards.length;
  }

  get step(): number {
    return this.#current;
  }

  connectedCallback(): void {
    this.#arrows = JSON.parse(this.dataset.arrows ?? "[]") as Arrow[];
    this.#steps = [...this.querySelectorAll<SVGAElement>(".step")];
    this.#cards = [...this.querySelectorAll<HTMLElement>(".card")];
    this.#abort = new AbortController();
    this.#current = -1;
    const signal = this.#abort.signal;

    this.classList.add("is-live");
    this.#q("[data-act=prev]")?.addEventListener("click", () => this.#user(this.#current - 1), {
      signal,
    });
    this.#q("[data-act=next]")?.addEventListener("click", () => this.#user(this.#current + 1), {
      signal,
    });
    this.#q("[data-act=restart]")?.addEventListener("click", () => this.#user(0), { signal });
    this.#q("[data-act=play]")?.addEventListener("click", () => this.#togglePlay(), { signal });

    for (const [i, a] of this.#steps.entries()) {
      a.addEventListener(
        "click",
        (e) => {
          e.preventDefault();
          this.#user(i);
        },
        { signal },
      );
    }

    this.addEventListener(
      "keydown",
      (e) => {
        if (!(e.target instanceof Element) || !e.target.closest(".stage")) return;
        if (e.key === "ArrowRight" || e.key === "ArrowDown") this.#user(this.#current + 1);
        else if (e.key === "ArrowLeft" || e.key === "ArrowUp") this.#user(this.#current - 1);
        else return;
        e.preventDefault();
      },
      { signal },
    );

    document.addEventListener(
      "click",
      (e) => {
        const a = (e.target as Element | null)?.closest?.("a[href^='#']");
        if (!a || this.contains(a)) return;
        const i = stepFromHash(a.getAttribute("href") ?? "", this.#id);
        if (i === undefined) return;
        e.preventDefault();
        history.replaceState(null, "", `#${this.#id}-${clamp(i, this.count) + 1}`);
        this.#user(i);
        if (!this.#wide.matches)
          this.scrollIntoView({ behavior: this.#behavior(), block: "start" });
      },
      { signal },
    );

    this.#wide.addEventListener("change", () => this.#mode(), { signal });
    this.#mode();

    window.addEventListener("hashchange", () => this.#fromHash(), { signal });
    if (stepFromHash(location.hash, this.#id) === undefined) {
      this.#set(0, false);
    } else if (document.readyState === "complete") {
      this.#fromHash();
    } else {
      this.#set(clamp(stepFromHash(location.hash, this.#id) ?? 0, this.count), false);
      window.addEventListener("load", () => requestAnimationFrame(() => this.#fromHash()), {
        once: true,
        signal,
      });
    }
  }

  #fromHash(): void {
    const i = stepFromHash(location.hash, this.#id);
    if (i === undefined) return;
    this.go(i, "auto");
    if (!this.#wide.matches) this.scrollIntoView({ block: "start" });
  }

  disconnectedCallback(): void {
    this.#abort.abort();
    this.#unscroll?.abort();
    window.clearTimeout(this.#relock);
    this.#stop();
  }

  #user(i: number): void {
    this.go(i);
    const live = this.#q(".stage-live");
    const title = this.#cards[this.#current]?.querySelector("h3")?.textContent ?? "";
    if (live) live.textContent = `${this.#current + 1} / ${this.count}: ${title}`;
  }

  go(i: number, behavior: ScrollBehavior = this.#behavior()): void {
    const next = clamp(i, this.count);
    if (this.#wide.matches) {
      this.#lockUntil = performance.now() + LOCK_MS;
      window.clearTimeout(this.#relock);
      this.#relock = window.setTimeout(() => this.#fromScroll(), LOCK_MS + 50);
      this.#cards[next]?.scrollIntoView({ behavior, block: "center" });
    }
    this.#set(next, true);
  }

  #fromScroll(): void {
    if (!this.#wide.matches || performance.now() < this.#lockUntil) return;
    const i = activeCard(
      this.#cards.map((c) => c.getBoundingClientRect().top),
      window.innerHeight * 0.5,
    );
    if (i === undefined || i !== this.#current) this.#stop();
    if (i !== undefined && i !== this.#current) this.#set(i, true);
  }

  #q(sel: string): HTMLElement | null {
    return this.querySelector<HTMLElement>(sel);
  }

  #behavior(): ScrollBehavior {
    return window.matchMedia(MOTION).matches ? "smooth" : "auto";
  }

  #mode(): void {
    this.#unscroll?.abort();
    this.dataset.mode = this.#wide.matches ? "scroll" : "stepper";
    if (!this.#wide.matches) return;
    this.#unscroll = new AbortController();
    let queued = false;
    const onScroll = () => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => {
        queued = false;
        this.#fromScroll();
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true, signal: this.#unscroll.signal });
    onScroll();
  }

  #set(i: number, animate: boolean): void {
    if (i === this.#current) return;
    this.#current = i;
    this.#steps.forEach((g, j) => {
      g.classList.toggle("is-past", j < i);
      g.classList.toggle("is-current", j === i);
    });
    this.#cards.forEach((c, j) => {
      c.classList.toggle("is-current", j === i);
      if (j === i) c.setAttribute("aria-current", "step");
      else c.removeAttribute("aria-current");
    });

    const counter = this.#q(".stage-count");
    if (counter) counter.textContent = `${i + 1} / ${this.count}`;
    const caption = this.#q(".stage-caption");
    const title = this.#cards[i]?.querySelector("h3")?.textContent;
    if (caption && title) caption.textContent = title;

    const prev = this.#q("[data-act=prev]") as HTMLButtonElement | null;
    const next = this.#q("[data-act=next]") as HTMLButtonElement | null;
    if (prev) prev.disabled = i === 0;
    if (next) next.disabled = i === this.count - 1;
    this.dataset.step = String(i);

    if (animate) this.#fly(i);
    this.#keepInView(i);
  }

  #keepInView(i: number): void {
    const canvas = this.#q(".stage-canvas");
    const svg = canvas?.querySelector<SVGSVGElement>(".seq-svg");
    const heads = canvas?.querySelector<SVGSVGElement>(".seq-heads");
    const a = this.#arrows[i];
    if (!canvas || !svg || !a) return;
    const scale = svg.getBoundingClientRect().width / Number(svg.getAttribute("width"));
    const top = Number(svg.dataset.top ?? 0);
    const headPx = heads?.getBoundingClientRect().height ?? 0;
    const y = (a.y - top) * scale + headPx;
    const x = ((a.x1 + a.x2) / 2) * scale;
    canvas.scrollTo({
      top: Math.max(0, y - (canvas.clientHeight + headPx) / 2),
      left: Math.max(0, x - canvas.clientWidth / 2),
      behavior: this.#behavior(),
    });
  }

  #fly(i: number): void {
    const packet = this.querySelector<SVGCircleElement>(".packet");
    const a = this.#arrows[i];
    this.#anim?.cancel();
    if (!packet || !a || a.self || !window.matchMedia(MOTION).matches) {
      packet?.setAttribute("visibility", "hidden");
      return;
    }
    packet.setAttribute("class", `packet packet--${a.kind}`);
    packet.setAttribute("visibility", "visible");
    this.#anim = packet.animate(
      [
        { transform: `translate(${a.x1}px, ${a.y}px)`, opacity: 1 },
        { transform: `translate(${a.x2}px, ${a.y}px)`, opacity: a.kind === "lost" ? 0 : 1 },
      ],
      { duration: 560, easing: "cubic-bezier(.3,0,.2,1)", fill: "forwards" },
    );
    this.#anim.onfinish = () => packet.setAttribute("visibility", "hidden");
  }

  #togglePlay(): void {
    if (this.#timer !== undefined) {
      this.#stop();
      return;
    }
    if (this.#current === this.count - 1) this.go(0);
    const btn = this.#q("[data-act=play]");
    btn?.setAttribute("aria-pressed", "true");
    this.#userStop = new AbortController();
    const stop = () => this.#stop();
    for (const type of ["wheel", "touchstart"] as const) {
      window.addEventListener(type, stop, { passive: true, signal: this.#userStop.signal });
    }
    this.#timer = window.setInterval(() => {
      if (this.#current >= this.count - 1) this.#stop();
      else this.go(this.#current + 1);
    }, PLAY_MS);
  }

  #stop(): void {
    this.#userStop?.abort();
    window.clearInterval(this.#timer);
    this.#timer = undefined;
    this.#q("[data-act=play]")?.setAttribute("aria-pressed", "false");
  }
}

if (!customElements.get("seq-player")) customElements.define("seq-player", SeqPlayer);
