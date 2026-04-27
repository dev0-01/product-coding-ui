<template>
  <header class="plm-header">
    <div class="header-inner">
      <div class="header-left">
        <div class="brand">
          <div class="brand-mark">
            <svg viewBox="0 0 24 24" fill="none" width="20" height="20">
              <path d="M12 2L2 7l10 5 10-5-10-5z" fill="currentColor" opacity="0.9"/>
              <path d="M2 17l10 5 10-5" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round"/>
              <path d="M2 12l10 5 10-5" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round"/>
            </svg>
          </div>
          <div class="brand-text">
            <span class="brand-name">ArGe PLM</span>
            <span class="brand-divider">|</span>
            <span class="brand-module">Coding Configuration</span>
          </div>
        </div>
      </div>

      <nav class="header-nav">
        <RouterLink to="/product-coding" class="nav-tab">
          <i class="pi pi-box"></i>
          <span>Product Coding</span>
        </RouterLink>
        <RouterLink to="/material-coding" class="nav-tab">
          <i class="pi pi-th-large"></i>
          <span>Material Coding</span>
        </RouterLink>
      </nav>
    </div>
  </header>
</template>

<script setup>
import { RouterLink } from 'vue-router'
</script>

<style scoped>
.plm-header {
  background: var(--plm-header-bg, #1b2a4a);
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  position: sticky;
  top: 0;
  z-index: 100;
  user-select: none;
}

.header-inner {
  display: flex;
  align-items: center;
  height: 42px;
  padding: 0 16px;
  gap: 24px;
}

.header-left {
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

.brand {
  display: flex;
  align-items: center;
  gap: 10px;
}

.brand-mark {
  width: 28px;
  height: 28px;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #56b0f0;
}

.brand-text {
  display: flex;
  align-items: center;
  gap: 8px;
}

.brand-name {
  font-size: 13px;
  font-weight: 700;
  color: var(--plm-header-active, #fff);
  letter-spacing: 0.02em;
}

.brand-divider {
  color: rgba(255, 255, 255, 0.2);
  font-weight: 300;
}

.brand-module {
  font-size: 12px;
  color: var(--plm-header-text, #c8d6e5);
  font-weight: 400;
}

.header-nav {
  display: flex;
  align-items: center;
  gap: 2px;
  flex: 1;
}

.nav-tab {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border-radius: var(--radius-sm);
  font-size: 12px;
  font-weight: 500;
  color: var(--plm-header-text, #c8d6e5);
  text-decoration: none;
  transition: all 0.12s ease;
  white-space: nowrap;
}

.nav-tab i {
  font-size: 12px;
}

.nav-tab:hover {
  background: rgba(255, 255, 255, 0.08);
  color: #fff;
}

.nav-tab.router-link-active {
  background: rgba(255, 255, 255, 0.12);
  color: #fff;
  font-weight: 600;
  box-shadow: inset 0 -2px 0 #56b0f0;
}
</style>
