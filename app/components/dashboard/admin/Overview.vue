<script setup>
import { Activity, Link, TrendingUp, Users } from 'lucide-vue-next'

const _t = useI18n().t
const stats = ref(null)
const loading = ref(true)
const error = ref(null)

async function loadStats() {
  try {
    loading.value = true
    const data = await useAPI('/api/admin/stats/overview')
    stats.value = data
  }
  catch (e) {
    console.error('Failed to load admin stats:', e)
    error.value = e.message
  }
  finally {
    loading.value = false
  }
}

onMounted(() => {
  loadStats()
})
</script>

<template>
  <div class="space-y-4">
    <div
      v-if="loading" class="
        grid gap-4
        md:grid-cols-2
        lg:grid-cols-4
      "
    >
      <Card v-for="i in 4" :key="i">
        <CardHeader
          class="flex flex-row items-center justify-between space-y-0 pb-2"
        >
          <div class="h-4 w-24 animate-pulse rounded bg-muted" />
        </CardHeader>
        <CardContent>
          <div class="h-8 w-16 animate-pulse rounded bg-muted" />
        </CardContent>
      </Card>
    </div>

    <div
      v-else-if="error" class="
        rounded-lg border border-destructive bg-destructive/10 p-4
      "
    >
      <p class="text-sm text-destructive">
        {{ $t('admin.error_loading_stats') }}: {{ error }}
      </p>
    </div>

    <div
      v-else-if="stats" class="
        grid gap-4
        md:grid-cols-2
        lg:grid-cols-4
      "
    >
      <Card>
        <CardHeader
          class="flex flex-row items-center justify-between space-y-0 pb-2"
        >
          <CardTitle class="text-sm font-medium">
            {{ $t('admin.total_users') }}
          </CardTitle>
          <Users class="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div class="text-2xl font-bold">
            {{ stats.totalUsers }}
          </div>
          <p class="text-xs text-muted-foreground">
            {{ $t('admin.active_today') }}: {{ stats.todayActiveUsers }}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader
          class="flex flex-row items-center justify-between space-y-0 pb-2"
        >
          <CardTitle class="text-sm font-medium">
            {{ $t('admin.total_links') }}
          </CardTitle>
          <Link class="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div class="text-2xl font-bold">
            {{ stats.totalLinks }}
          </div>
          <p class="text-xs text-muted-foreground">
            {{ $t('admin.new_today') }}: {{ stats.todayNewLinks }}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader
          class="flex flex-row items-center justify-between space-y-0 pb-2"
        >
          <CardTitle class="text-sm font-medium">
            {{ $t('admin.today_active_users') }}
          </CardTitle>
          <Activity class="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div class="text-2xl font-bold">
            {{ stats.todayActiveUsers }}
          </div>
          <p class="text-xs text-muted-foreground">
            {{ $t('admin.of_total') }} {{ stats.totalUsers }}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader
          class="flex flex-row items-center justify-between space-y-0 pb-2"
        >
          <CardTitle class="text-sm font-medium">
            {{ $t('admin.today_new_links') }}
          </CardTitle>
          <TrendingUp class="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div class="text-2xl font-bold">
            {{ stats.todayNewLinks }}
          </div>
          <p class="text-xs text-muted-foreground">
            {{ $t('admin.of_total') }} {{ stats.totalLinks }}
          </p>
        </CardContent>
      </Card>
    </div>
  </div>
</template>
