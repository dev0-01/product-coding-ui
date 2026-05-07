<template>
  <div class="plm-app">
   
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
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  background: var(--surface-ground, #e4e8ee);
}

.plm-workspace {
  flex: 1;
  width: 100%;
  max-width: 640px;
  margin: 0 auto;
  padding: 24px 32px 28px;
  box-sizing: border-box;
}
</style>
