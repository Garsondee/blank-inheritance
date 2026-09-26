/**
 * The Radio — the player's own loudness controls, as a phone app.
 * design/audio-system.md §7.2.
 *
 * These three knobs write FOUNDRY'S OWN client settings
 * (core.globalPlaylistVolume / globalAmbientVolume / globalInterfaceVolume),
 * not a private copy: the same numbers the native Playlists sidebar sliders
 * use, so the two can never disagree, and a player who has already set their
 * levels there finds the Radio already agreeing with them.
 *
 * The GM's faders sit ABOVE these in the chain (foundry/audio-engine.mjs), so
 * both exist at once: the GM balances music against ambience for the table,
 * each player sets how loud the whole thing is for them.
 *
 * Deliberately no track titles. A player's handset is not the place to
 * announce that "The Observer's Theme" just started (doctrine Law 11) — the
 * meter says something is playing, which is all a volume control needs.
 */

import { foundrySliderToVolume, volumeToFoundrySlider, vuStep } from "../core/audio-mix.mjs";
import { meterFaceGeometry, vuNeedleDegrees, VU_SCALE, VU_SWEEP_DEG } from "../core/audio-desk.mjs";
import { vuFace } from "../core/vu-meter.mjs";
import { readMeters } from "./audio-engine.mjs";

const CHANNELS = [
  { id: "music", setting: "globalPlaylistVolume", labelKey: "BLANKINHERITANCE.Audio.Bus.Music" },
  { id: "ambience", setting: "globalAmbientVolume", labelKey: "BLANKINHERITANCE.Audio.Bus.Ambience" },
  { id: "interface", setting: "globalInterfaceVolume", labelKey: "BLANKINHERITANCE.Audio.Bus.Interface" }
];

/** Foundry stores a gain; the knob shows the slider position that produces it. */
function knobPosition(setting) {
  return volumeToFoundrySlider(game.settings.get("core", setting) ?? 0.5);
}

const frameFor = (position) => Math.round(Math.min(1, Math.max(0, position)) * 127);
const percentFor = (position) => `${Math.round(position * 100)}%`;

/**
 * The meter's printed face: the SAME scale, geometry and crop the Sound
 * Desk's channel meters use (core/vu-meter.mjs#vuFace +
 * core/audio-desk.mjs#meterFaceGeometry), so the needle lands on the printed
 * numbers and the window shows exactly the drawn part. Rebuilt 2026-09-23:
 * the first Radio meter was a bare orange rectangle with a needle and no
 * scale at all ("the Comms radio panel's meter is a mess").
 */
function meterMarkup() {
  const face = vuFace({ min: VU_SCALE.min, max: VU_SCALE.max, danger: VU_SCALE.danger, labelCount: 5, minorPerGap: 2 });
  const geo = meterFaceGeometry();
  const ticks = face.ticks
    .map((t) => `<line class="bi-radio__tick${t.major ? " is-major" : ""}" x1="${t.x1}" y1="${t.y1}" x2="${t.x2}" y2="${t.y2}"></line>`)
    .join("");
  const labels = face.labels.map((l) => `<text class="bi-radio__num" x="${l.x}" y="${l.y}">${l.text}</text>`).join("");
  return `
      <div class="bi-radio__meter">
        <svg class="bi-radio__face" viewBox="${geo.viewBox}" preserveAspectRatio="xMidYMax meet" aria-hidden="true">
          ${face.dangerBand ? `<path class="bi-radio__danger" d="${face.dangerBand}"></path>` : ""}
          <path class="bi-radio__arc" d="${face.arc}"></path>
          ${ticks}${labels}
          <text class="bi-radio__vu" x="${face.pivot.x}" y="${face.pivot.y - 30}">VU</text>
        </svg>
        <i class="bi-radio__needle" data-radio-needle style="--needle: ${-VU_SWEEP_DEG / 2}deg; bottom: ${geo.needleBottomPct}%; height: ${geo.needleHeightPct}%"></i>
        <i class="bi-radio__pivot" style="bottom: ${geo.needleBottomPct}%" aria-hidden="true"></i>
        <i class="bi-radio__gloss" aria-hidden="true"></i>
      </div>`;
}

export function renderRadio(mount) {
  // Three knobs side by side, legend above, value below — the north star's
  // own Mix / Size / Damp row — rather than a list.
  const knobs = CHANNELS.map((c) => {
    const position = knobPosition(c.setting);
    return `
      <li class="bi-radio__channel" data-channel="${c.id}">
        <span class="bi-radio__label">${game.i18n.localize(c.labelKey)}</span>
        <button type="button" class="bi-knob bi-radio__knob" style="--frame: ${frameFor(position)}"
          data-setting="${c.setting}" aria-label="${game.i18n.localize(c.labelKey)}"></button>
        <span class="bi-radio__value" data-value-for="${c.setting}">${percentFor(position)}</span>
      </li>`;
  }).join("");

  mount.innerHTML = `
    <div class="bi-radio">
      ${meterMarkup()}
      <ul class="bi-radio__channels">${knobs}</ul>
      <div class="bi-radio__foot">
        <button type="button" class="bi-comms__action bi-radio__mute" data-radio-mute aria-pressed="${game.audio.globalMute === true}">
          <i class="bi-radio__mute-lamp" aria-hidden="true"></i>
          <span data-radio-mute-label>${game.i18n.localize(game.audio.globalMute ? "BLANKINHERITANCE.Audio.Unmute" : "BLANKINHERITANCE.Audio.MuteAll")}</span>
        </button>
        <p class="bi-radio__note">${game.i18n.localize("BLANKINHERITANCE.Audio.RadioNote")}</p>
      </div>
    </div>`;

  const cleanups = [];

  for (const knob of mount.querySelectorAll("[data-setting]")) {
    const setting = knob.dataset.setting;
    const readout = mount.querySelector(`[data-value-for="${setting}"]`);
    const onPointerDown = (event) => {
      event.preventDefault();
      const startY = event.clientY;
      const startPosition = knobPosition(setting);
      let latest = startPosition;
      const move = (ev) => {
        // A full turn in 140px of travel: fine enough to set a level, coarse
        // enough that a shaky hand cannot silence someone by accident.
        latest = Math.min(1, Math.max(0, startPosition + (startY - ev.clientY) / 140));
        knob.style.setProperty("--frame", String(frameFor(latest)));
        if (readout) readout.textContent = percentFor(latest);
      };
      const up = async () => {
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
        await game.settings.set("core", setting, foundrySliderToVolume(latest));
      };
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
    };
    knob.addEventListener("pointerdown", onPointerDown);
    cleanups.push(() => knob.removeEventListener("pointerdown", onPointerDown));
  }

  const muteButton = mount.querySelector("[data-radio-mute]");
  const onMute = () => {
    game.audio.globalMute = !game.audio.globalMute;
    muteButton.setAttribute("aria-pressed", String(game.audio.globalMute));
    const label = muteButton.querySelector("[data-radio-mute-label]");
    if (label) label.textContent = game.i18n.localize(game.audio.globalMute ? "BLANKINHERITANCE.Audio.Unmute" : "BLANKINHERITANCE.Audio.MuteAll");
  };
  muteButton?.addEventListener("click", onMute);
  cleanups.push(() => muteButton?.removeEventListener("click", onMute));

  // The needle: this player's own output level, so "is anything playing?" is
  // answerable without naming what is playing.
  const needle = mount.querySelector("[data-radio-needle]");
  let smoothed = -Infinity;
  let last = performance.now();
  let raf = null;
  const tick = (now) => {
    if (!needle?.isConnected) {
      raf = null;
      return;
    }
    const levels = readMeters();
    const loudest = Math.max(levels.music?.rmsDb ?? -Infinity, levels.ambience?.rmsDb ?? -Infinity, levels.stings?.rmsDb ?? -Infinity);
    smoothed = vuStep(smoothed, loudest, now - last);
    last = now;
    needle.style.setProperty("--needle", `${vuNeedleDegrees(smoothed + 18).toFixed(2)}deg`);
    raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);
  cleanups.push(() => {
    if (raf) cancelAnimationFrame(raf);
  });

  return () => {
    for (const fn of cleanups) fn();
  };
}

/** Exported for tests and diagnostics: the settings this app is allowed to write. */
export const RADIO_CHANNELS = CHANNELS;
