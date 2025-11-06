<script setup>
import { AlertTriangle, Database } from 'lucide-vue-next'

const _t = useI18n().t
const quota = ref(null)
const loading = ref(true)
const error = ref(null)

async function loadQuota() {
  try {
    loading.value = true
    const data = await useAPI('/api/admin/stats/quota')
    quota.value = data
  }
  catch (e) {
    console.error('Failed to load quota:', e)
    error.value = e.message
  }
  finally {
    loading.value = false
  }
}

onMounted(() => {
  loadQuota()
})

function getQuotaColor(percentage) {
  if (percentage >= 90)
    return 'text-destructive'
  if (percentage >= 70)
    return 'text-yellow-500'
  return 'text-green-500'
}

function getProgressColor(percentage) {
  if (percentage >= 90)
    return 'bg-destructive'
  if (percentage >= 70)
    return 'bg-yellow-500'
  return 'bg-primary'
}
</script>

<template>
  <Card>
    <CardHeader>
      <div class="flex items-center justify-between">
        <div>
          <CardTitle>{{ $t('admin.quota_usage') }}</CardTitle>
          <CardDescription>{{ $t('admin.quota_description') }}</CardDescription>
        </div>
        <Database class="h-5 w-5 text-muted-foreground" />
      </div>
    </CardHeader>
    <CardContent>
      <div v-if="loading" class="space-y-4">
        <div class="space-y-2">
          <div class="h-4 w-24 animate-pulse rounded bg-muted" />
          <div class="h-2 w-full animate-pulse rounded bg-muted" />
        </div>
        <div class="space-y-2">
          <div class="h-4 w-24 animate-pulse rounded bg-muted" />
          <div class="h-2 w-full animate-pulse rounded bg-muted" />
        </div>
      </div>

      <div v-else-if="error" class="text-sm text-destructive">
        {{ $t('admin.error_loading_quota') }}: {{ error }}
      </div>

      <div
        v-else-if="!quota?.enabled" class="
          text-center text-sm text-muted-foreground
        "
      >
        {{ $t('admin.quota_disabled') }}
      </div>

      <div v-else class="space-y-4">
        <!-- Reads -->
        <div class="space-y-2">
          <div class="flex items-center justify-between text-sm">
            <span class="font-medium">{{ $t('admin.reads') }}</span>
            <span :class="getQuotaColor(quota.reads.percentage)">
              {{ quota.reads.used.toLocaleString() }} / {{ quota.reads.limit.toLocaleString() }}
              <span class="text-muted-foreground">({{ quota.reads.percentage }}%)</span>
            </span>
          </div>
          <div class="h-2 w-full overflow-hidden rounded-full bg-secondary">
            <div
              :class="getProgressColor(quota.reads.percentage)"
              class="h-full transition-all"
              :style="{ width: `${Math.min(quota.reads.percentage, 100)}%` }"
            />
          </div>
          <div
            v-if="quota.reads.percentage >= 80" class="
              flex items-center space-x-2 text-xs text-yellow-500
            "
          >
            <AlertTriangle class="h-3 w-3" />
            <span>{{ $t('admin.quota_warning') }}</span>
          </div>
        </div>

        <!-- Writes -->
        <div class="space-y-2">
          <div class="flex items-center justify-between text-sm">
            <span class="font-medium">{{ $t('admin.writes') }}</span>
            <span :class="getQuotaColor(quota.writes.percentage)">
              {{ quota.writes.used.toLocaleString() }} / {{ quota.writes.limit.toLocaleString() }}
              <span class="text-muted-foreground">({{ quota.writes.percentage }}%)</span>
            </span>
          </div>
          <div class="h-2 w-full overflow-hidden rounded-full bg-secondary">
            <div
              :class="getProgressColor(quota.writes.percentage)"
              class="h-full transition-all"
              :style="{ width: `${Math.min(quota.writes.percentage, 100)}%` }"
            />
          </div>
          <div
            v-if="quota.writes.percentage >= 80" class="
              flex items-center space-x-2 text-xs text-yellow-500
            "
          >
            <AlertTriangle class="h-3 w-3" />
            <span>{{ $t('admin.quota_warning') }}</span>
          </div>
        </div>

        <div class="pt-2 text-xs text-muted-foreground">
          {{ $t('admin.quota_reset_info') }}
        </div>
      </div>
    </CardContent>
  </Card>
</template>
