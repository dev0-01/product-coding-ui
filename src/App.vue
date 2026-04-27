<template>
  <div class="plm-app">
    <AppHeader />
    <main class="plm-workspace">
      <RouterView />
    </main>
  </div>
</template>

<script setup>
import { RouterView } from 'vue-router'
import AppHeader from './components/app-header.vue'
</script>

<style scoped>
.plm-app {
  min-height: 100vh;
  background: var(--surface-ground, #ebeef2);
  display: flex;
  flex-direction: column;
}

.plm-workspace {
  flex: 1;
  max-width: 720px;
  width: 100%;
  margin: 0 auto;
  padding: 16px 20px 40px;
}
</style>
