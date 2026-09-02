<script lang="ts">
  // The Phase 3 deliverable, made visible: click any building or road, see
  // its real id/tags/height/provenance. Each entry of `features` is a
  // GeoJSON Feature as returned by api/features.py's
  // feature_kwargs_to_geojson -- properties are always {id, tags, isArea,
  // heightM, source}.
  //
  // Phase 4 adds the edit affordances (Edit vertices / Save / Cancel) --
  // this panel stays a thin view over App.svelte's edit state/handlers, the
  // same way it's always been a thin view over `features`; the actual
  // TerraDraw instance and PATCH/undo calls live in App.svelte, which owns
  // the map.
  //
  // Phase 14: `feature: Feature | null` became `features: Feature[]` for
  // marquee multi-select. A plain click still puts exactly one element in
  // the array -- singleFeature below, and everything under it, is BYTE-
  // IDENTICAL to the pre-Phase-14 single-feature view, just gated on
  // `features.length === 1` instead of `feature !== null`. A NEW summary
  // view (count, id list, Union) appears for `features.length > 1`.
  // Vertex-editing has no defined meaning for a multi-selection, so
  // isEditing/onStartEdit/gridSnapEnabled/etc. stay meaningful ONLY in the
  // single-feature branch, same signatures as before.

  import { terraDrawModeForGeometryType } from "../core/edit";

  interface Props {
    features: GeoJSON.Feature[];
    onClose: () => void;
    isEditing: boolean;
    hasUnsavedChanges: boolean;
    saving: boolean;
    saveError: string | null;
    saveNotice: string | null;
    onStartEdit: () => void;
    onSaveEdit: () => void;
    onCancelEdit: () => void;
    gridSnapEnabled: boolean;
    orthoSnapEnabled: boolean;
    onDelete: () => void;
    deleting: boolean;
    onUnion: () => void;
    unioning: boolean;
    unionError: string | null;
    unionNotice: string | null;
  }

  let {
    features,
    onClose,
    isEditing,
    hasUnsavedChanges,
    saving,
    saveError,
    saveNotice,
    onStartEdit,
    onSaveEdit,
    onCancelEdit,
    gridSnapEnabled = $bindable(),
    orthoSnapEnabled = $bindable(),
    onDelete,
    deleting,
    onUnion,
    unioning,
    unionError,
    unionNotice,
  }: Props = $props();

  // Local-only: a destructive action gets an inline "are you sure" step,
  // but the confirmation itself is pure UI state -- App.svelte only needs
  // to know about the actual deletion (onDelete), never the in-between
  // "asking" state. Reset whenever the selection changes (single OR
  // multi), so switching features never leaves a stale confirm prompt armed.
  let confirmingDelete = $state(false);
  $effect(() => {
    features;
    confirmingDelete = false;
  });

  const singleFeature = $derived(features.length === 1 ? features[0] : null);
  const tagEntries = $derived(
    singleFeature ? Object.entries((singleFeature.properties?.tags ?? {}) as Record<string, string>) : [],
  );
  const editableMode = $derived(singleFeature ? terraDrawModeForGeometryType(singleFeature.geometry.type) : null);
</script>

{#if singleFeature}
  <div class="panel">
    <div class="panel-header">
      <span class="title">Feature</span>
      <button class="close" onclick={onClose} aria-label="Close" disabled={isEditing}>×</button>
    </div>
    <dl>
      <dt>id</dt>
      <dd><code>{singleFeature.properties?.id}</code></dd>

      <dt>geometry</dt>
      <dd>{singleFeature.geometry.type}{singleFeature.properties?.isArea ? " (area)" : ""}</dd>

      <dt>height</dt>
      <dd>{singleFeature.properties?.heightM ?? 0} m</dd>

      <dt>source</dt>
      <dd><code>{singleFeature.properties?.source}</code></dd>
    </dl>

    <div class="edit-controls">
      {#if isEditing}
        <button class="save" onclick={onSaveEdit} disabled={saving}>
          {saving ? "Saving…" : "Save"}
        </button>
        <button class="cancel" onclick={onCancelEdit} disabled={saving}>Cancel</button>
        {#if hasUnsavedChanges}
          <span class="unsaved">unsaved changes</span>
        {/if}
      {:else if confirmingDelete}
        <span class="confirm-text">Delete this feature?</span>
        <button class="delete" onclick={onDelete} disabled={deleting}>
          {deleting ? "Deleting…" : "Confirm"}
        </button>
        <button class="cancel" onclick={() => (confirmingDelete = false)} disabled={deleting}>Cancel</button>
      {:else if editableMode}
        <button class="edit" onclick={onStartEdit}>Edit vertices</button>
        <button class="delete" onclick={() => (confirmingDelete = true)}>Delete</button>
      {:else}
        <button class="delete" onclick={() => (confirmingDelete = true)}>Delete</button>
      {/if}
    </div>
    {#if isEditing}
      <!-- Phase 5: semantic snapping (vertex/junction/midpoint/ghost
           line/segment) is always on while editing; grid/ortho are more
           opinionated (grid snap has no tolerance -- it always redirects
           the cursor) so they stay opt-in. -->
      <div class="snap-controls">
        <label><input type="checkbox" bind:checked={gridSnapEnabled} /> Snap to grid</label>
        <label><input type="checkbox" bind:checked={orthoSnapEnabled} /> Snap to angle</label>
      </div>
    {/if}
    {#if saveError}
      <div class="save-error">{saveError}</div>
    {/if}
    {#if saveNotice}
      <div class="save-notice">{saveNotice}</div>
    {/if}

    {#if tagEntries.length > 0}
      <div class="tags-header">tags</div>
      <table>
        <tbody>
          {#each tagEntries as [key, value] (key)}
            <tr>
              <td class="tag-key">{key}</td>
              <td class="tag-value">{value}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    {:else}
      <div class="no-tags">no tags</div>
    {/if}
  </div>
{:else if features.length > 1}
  <!-- Phase 14: marquee multi-select summary. No vertex editing (no single
       geometry to edit), no tags table (N different tag sets) -- just the
       count, every selected id, and the two actions that operate on a
       whole selection: Union and Delete all. -->
  <div class="panel">
    <div class="panel-header">
      <span class="title">{features.length} Features Selected</span>
      <button class="close" onclick={onClose} aria-label="Close">×</button>
    </div>
    <ul class="multi-id-list">
      {#each features as f (f.properties?.id)}
        <li><code>{f.properties?.id}</code></li>
      {/each}
    </ul>

    <div class="edit-controls">
      {#if confirmingDelete}
        <span class="confirm-text">Delete all {features.length} features?</span>
        <button class="delete" onclick={onDelete} disabled={deleting}>
          {deleting ? "Deleting…" : "Confirm"}
        </button>
        <button class="cancel" onclick={() => (confirmingDelete = false)} disabled={deleting}>Cancel</button>
      {:else}
        <button class="edit" onclick={onUnion} disabled={unioning}>
          {unioning ? "Merging…" : "Union"}
        </button>
        <button class="delete" onclick={() => (confirmingDelete = true)}>Delete all</button>
      {/if}
    </div>
    {#if unionError}
      <div class="save-error">{unionError}</div>
    {/if}
    {#if unionNotice}
      <div class="save-notice">{unionNotice}</div>
    {/if}
  </div>
{/if}

<style>
  .panel {
    position: absolute;
    top: 12px;
    right: 12px;
    width: 280px;
    max-height: calc(100% - 24px);
    overflow-y: auto;
    background: rgba(20, 20, 20, 0.92);
    color: #eee;
    border-radius: 8px;
    padding: 12px 14px;
    font-size: 13px;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.4);
  }
  .panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
  }
  .title {
    font-weight: 600;
    text-transform: uppercase;
    font-size: 11px;
    letter-spacing: 0.05em;
    color: #999;
  }
  .close {
    background: none;
    border: none;
    color: #ccc;
    font-size: 18px;
    line-height: 1;
    cursor: pointer;
    padding: 0 4px;
  }
  .close:hover {
    color: #fff;
  }
  dl {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 4px 10px;
    margin: 0 0 10px 0;
  }
  dt {
    color: #888;
  }
  dd {
    margin: 0;
    word-break: break-all;
  }
  code {
    font-family: ui-monospace, monospace;
    font-size: 12px;
  }
  .edit-controls {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 0 0 10px 0;
  }
  .edit-controls button {
    border: none;
    border-radius: 4px;
    padding: 5px 10px;
    font-size: 12px;
    cursor: pointer;
  }
  .edit-controls button:disabled {
    cursor: default;
    opacity: 0.6;
  }
  .edit {
    background: #2d3f52;
    color: #cfe4ff;
  }
  .edit:hover {
    background: #37506a;
  }
  .save {
    background: #2d5a3f;
    color: #cdf5da;
  }
  .save:hover:not(:disabled) {
    background: #367049;
  }
  .cancel {
    background: #444;
    color: #ddd;
  }
  .cancel:hover:not(:disabled) {
    background: #555;
  }
  .delete {
    background: #5a2d2d;
    color: #f5cdcd;
  }
  .delete:hover:not(:disabled) {
    background: #704949;
  }
  .confirm-text {
    color: #f0b0b0;
    font-size: 12px;
  }
  .unsaved {
    color: #e0b34a;
    font-size: 11px;
    font-style: italic;
  }
  .snap-controls {
    display: flex;
    gap: 12px;
    margin: 0 0 10px 0;
    font-size: 11px;
    color: #bbb;
  }
  .snap-controls label {
    display: flex;
    align-items: center;
    gap: 4px;
    cursor: pointer;
  }
  .save-error {
    background: rgba(180, 50, 50, 0.25);
    color: #ffb3b3;
    border-radius: 4px;
    padding: 6px 8px;
    font-size: 12px;
    margin: 0 0 10px 0;
  }
  .save-notice {
    background: rgba(180, 140, 50, 0.2);
    color: #f0d090;
    border-radius: 4px;
    padding: 6px 8px;
    font-size: 12px;
    margin: 0 0 10px 0;
  }
  .tags-header {
    color: #888;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin: 8px 0 4px 0;
  }
  table {
    width: 100%;
    border-collapse: collapse;
  }
  .tag-key {
    color: #4a9eff;
    padding-right: 8px;
    vertical-align: top;
    white-space: nowrap;
  }
  .tag-value {
    word-break: break-all;
  }
  .no-tags {
    color: #666;
    font-style: italic;
  }
  .multi-id-list {
    list-style: none;
    margin: 0 0 10px 0;
    padding: 0;
    max-height: 160px;
    overflow-y: auto;
    font-size: 12px;
  }
  .multi-id-list li {
    padding: 2px 0;
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  }
</style>
