<script setup lang="ts">
import { ref } from 'vue'

const props = defineProps<{ compact?: boolean; busy?: boolean; error?: string }>()
const emit = defineEmits<{ file: [File] }>()

const dragging = ref(false)
const input = ref<HTMLInputElement>()

function pick(files: FileList | null | undefined) {
  const f = files?.[0]
  if (f) emit('file', f)
}
function onDrop(e: DragEvent) {
  dragging.value = false
  pick(e.dataTransfer?.files)
}
function onChange(e: Event) {
  pick((e.target as HTMLInputElement).files)
  ;(e.target as HTMLInputElement).value = ''
}
</script>

<template>
  <button v-if="props.compact" type="button" class="btn" :disabled="busy" @click="input?.click()">
    {{ busy ? 'Reading…' : 'Upload new file' }}
    <input ref="input" type="file" accept=".xlsx" hidden @change="onChange" />
  </button>
  <label
    v-else
    class="drop"
    :class="{ dragging }"
    @dragover.prevent="dragging = true"
    @dragleave.prevent="dragging = false"
    @drop.prevent="onDrop"
  >
    <input ref="input" type="file" accept=".xlsx" hidden @change="onChange" />
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M12 16V4m0 0-4 4m4-4 4 4" />
      <path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
    </svg>
    <strong>{{ busy ? 'Reading your file…' : 'Drop your Excel export here' }}</strong>
    <span>or click to choose an <code>.xlsx</code> file</span>
    <span v-if="error" class="error" role="alert">{{ error }}</span>
  </label>
</template>

<style scoped>
.drop {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 56px 24px;
  border: 1.5px dashed var(--border-strong);
  border-radius: 16px;
  background: var(--surface-1);
  color: var(--text-secondary);
  cursor: pointer;
  text-align: center;
  transition: border-color 0.15s, background 0.15s;
}
.drop:hover,
.drop.dragging {
  border-color: var(--accent);
  background: var(--accent-wash);
}
.drop svg {
  color: var(--accent);
}
.drop strong {
  color: var(--text-primary);
  font-size: 17px;
}
.error {
  color: var(--critical);
  margin-top: 8px;
}
</style>
