<script setup>
import { Eye, TrendingUp } from 'lucide-vue-next'

defineProps({
  stats: {
    type: Object,
    default: () => ({ totalClicks: 0, todayClicks: 0 }),
  },
})

const _t = useI18n().t
</script>

<template>
  <div
    v-if="stats" class="
      flex items-center space-x-4 text-sm text-muted-foreground
    "
  >
    <div class="flex items-center space-x-1">
      <Eye class="h-3 w-3" />
      <span>{{ stats.totalClicks || 0 }} {{ $t('links.total_clicks') }}</span>
    </div>
    <div class="flex items-center space-x-1">
      <TrendingUp class="h-3 w-3" />
      <span>{{ stats.todayClicks || 0 }} {{ $t('links.today_clicks') }}</span>
    </div>
  </div>
</template>
