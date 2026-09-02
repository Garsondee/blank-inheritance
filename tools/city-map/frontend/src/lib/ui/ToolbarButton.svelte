<script lang="ts">
  // map-editor plan Phase 13: a "big chunky button" -- label on top, a small
  // preview swatch below showing "a version of what that looks like" (the
  // user's own words), reusing core/toolbarConfig.ts's previewStyleForButton
  // so the swatch can never silently drift from the real live-map styling.
  //
  // A road/rail button draws a stroke at its real relative width (so a
  // motorway visibly reads wider than a footway); a building preset draws a
  // filled+outlined square -- the height differentiation between presets
  // already comes through previewStyleForButton's own roof-color blend, no
  // extra sizing logic needed here.

  import type { ToolbarButtonConfig } from "../core/toolbarConfig";
  import { previewStyleForButton } from "../core/toolbarConfig";

  interface Props {
    config: ToolbarButtonConfig;
    disabled: boolean;
    onclick: () => void;
  }

  let { config, disabled, onclick }: Props = $props();

  const style = $derived(previewStyleForButton(config));

  // Real widths range ~1.8m (footway) to 22m (motorway) -- clamped so a
  // footway's stroke stays visibly present and a motorway's never overflows
  // the swatch box.
  const strokeWidthPx = $derived(Math.max(2, Math.min(12, style.lineWidthM * 0.5)));
</script>

<button class="toolbar-button" {disabled} {onclick} title={config.label}>
  <span class="label">{config.label}</span>
  <svg class="swatch" width="40" height="24" viewBox="0 0 40 24">
    {#if config.geometryType === "LineString"}
      <line x1="4" y1="12" x2="36" y2="12" stroke={style.lineColor} stroke-width={strokeWidthPx} stroke-linecap="round" />
    {:else}
      <rect x="7" y="4" width="26" height="16" fill={style.fillColor} stroke={style.lineColor} stroke-width="1.5" />
    {/if}
  </svg>
</button>

<style>
  .toolbar-button {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    padding: 6px 8px;
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: 6px;
    background: rgba(255, 255, 255, 0.06);
    color: #e8e8e8;
    cursor: pointer;
    font-size: 11px;
    line-height: 1.2;
  }
  .toolbar-button:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.14);
  }
  .toolbar-button:disabled {
    opacity: 0.45;
    cursor: default;
  }
  .label {
    white-space: nowrap;
    max-width: 90px;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .swatch {
    display: block;
  }
</style>
