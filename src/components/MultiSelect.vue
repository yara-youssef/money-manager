<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

export interface Option {
  value: string
  label?: string
  group?: string
  hint?: string
}

const props = defineProps<{ label: string; options: Option[]; allLabel?: string }>()
const selected = defineModel<Set<string>>({ required: true })

const open = ref(false)
const query = ref('')
const root = ref<HTMLElement>()

const visible = computed(() => {
  const q = query.value.trim().toLowerCase()
  return q ? props.options.filter((o) => (o.label ?? o.value).toLowerCase().includes(q)) : props.options
})

const groups = computed(() => {
  const m = new Map<string, Option[]>()
  for (const o of visible.value) m.set(o.group ?? '', [...(m.get(o.group ?? '') ?? []), o])
  return [...m.entries()]
})

const summary = computed(() => {
  const n = selected.value.size
  if (n === props.options.length) return props.allLabel ?? 'All'
  if (n === 0) return 'None'
  if (n === 1) return [...selected.value][0]
  return `${n} of ${props.options.length}`
})

function toggle(v: string) {
  const s = new Set(selected.value)
  if (s.has(v)) s.delete(v)
  else s.add(v)
  selected.value = s
}
function setGroup(values: string[], on: boolean) {
  const s = new Set(selected.value)
  for (const v of values) (on ? s.add(v) : s.delete(v))
  selected.value = s
}
function only(v: string) {
  selected.value = new Set([v])
}

function onDocClick(e: MouseEvent) {
  if (open.value && root.value && !root.value.contains(e.target as Node)) open.value = false
}
function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape') open.value = false
}
onMounted(() => {
  document.addEventListener('mousedown', onDocClick)
  document.addEventListener('keydown', onKey)
})
onBeforeUnmount(() => {
  document.removeEventListener('mousedown', onDocClick)
  document.removeEventListener('keydown', onKey)
})
</script>

<template>
  <div ref="root" class="ms">
    <button type="button" class="field-btn" :aria-expanded="open" @click="open = !open">
      <span class="field-label">{{ label }}</span>
      <span class="field-value">{{ summary }}</span>
      <svg class="chev" width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><path d="M3 4.5 6 7.5 9 4.5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" /></svg>
    </button>
    <div v-if="open" class="panel" role="listbox" aria-multiselectable="true">
      <input v-model="query" class="search" type="search" :placeholder="`Search ${label.toLowerCase()}…`" />
      <div class="bulk">
        <button type="button" class="link" @click="setGroup(options.map((o) => o.value), true)">Select all</button>
        <button type="button" class="link" @click="setGroup(options.map((o) => o.value), false)">Clear</button>
      </div>
      <div class="list">
        <template v-for="[group, items] in groups" :key="group">
          <div v-if="group" class="group">
            <span>{{ group }}</span>
            <span class="group-actions">
              <button type="button" class="link" @click="setGroup(items.map((o) => o.value), true)">all</button>
              <button type="button" class="link" @click="setGroup(items.map((o) => o.value), false)">none</button>
            </span>
          </div>
          <div v-for="o in items" :key="o.value" class="row">
            <label>
              <input type="checkbox" :checked="selected.has(o.value)" @change="toggle(o.value)" />
              <span class="name">{{ o.label ?? o.value }}</span>
              <span v-if="o.hint" class="hint">{{ o.hint }}</span>
            </label>
            <button type="button" class="link only" @click="only(o.value)">only</button>
          </div>
        </template>
        <p v-if="!visible.length" class="empty">No matches</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.ms {
  position: relative;
}
.panel {
  position: absolute;
  z-index: 20;
  top: calc(100% + 6px);
  left: 0;
  width: min(320px, calc(100vw - 32px));
  background: var(--surface-1);
  border: 1px solid var(--border);
  border-radius: 10px;
  box-shadow: var(--shadow);
  padding: 8px;
}
.search {
  width: 100%;
}
.bulk {
  display: flex;
  gap: 12px;
  padding: 8px 4px 4px;
}
.list {
  max-height: 320px;
  overflow-y: auto;
}
.group {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--text-muted);
  padding: 10px 4px 4px;
}
.group-actions {
  display: flex;
  gap: 8px;
  text-transform: none;
  letter-spacing: 0;
}
.row {
  display: flex;
  align-items: center;
  border-radius: 6px;
}
.row:hover {
  background: var(--hover);
}
.row label {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 4px;
  cursor: pointer;
  min-width: 0;
}
.name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.hint {
  margin-left: auto;
  color: var(--text-muted);
  font-size: 12px;
  font-variant-numeric: tabular-nums;
}
.only {
  visibility: hidden;
  padding: 0 6px;
}
.row:hover .only,
.only:focus-visible {
  visibility: visible;
}
.empty {
  color: var(--text-muted);
  padding: 8px 4px;
  margin: 0;
}
</style>
