<script setup lang="ts">
const src = `${import.meta.env.BASE_URL}logo.svg`
</script>

<template>
  <img class="logo" :src="src" alt="" width="36" height="36" />
</template>

<style scoped>
.logo {
  display: block;
  flex: none;
  width: 36px;
  height: 36px;
}
</style>
