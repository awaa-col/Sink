<script setup>
const _t = useI18n().t
const domains = ref([])
const loading = ref(true)
const error = ref(null)

async function loadDomains() {
  try {
    loading.value = true
    const data = await useAPI('/api/admin/stats/domains')
    domains.value = data.domains
  }
  catch (e) {
    console.error('Failed to load domain stats:', e)
    error.value = e.message
  }
  finally {
    loading.value = false
  }
}

onMounted(() => {
  loadDomains()
})
</script>

<template>
  <Card>
    <CardHeader>
      <CardTitle>{{ $t('admin.top_domains') }}</CardTitle>
      <CardDescription>{{ $t('admin.top_domains_description') }}</CardDescription>
    </CardHeader>
    <CardContent>
      <div v-if="loading" class="space-y-2">
        <div v-for="i in 5" :key="i" class="flex items-center justify-between">
          <div class="h-4 w-48 animate-pulse rounded bg-muted" />
          <div class="h-4 w-12 animate-pulse rounded bg-muted" />
        </div>
      </div>

      <div v-else-if="error" class="text-sm text-destructive">
        {{ $t('admin.error_loading_domains') }}: {{ error }}
      </div>

      <div
        v-else-if="domains.length === 0" class="
          text-center text-sm text-muted-foreground
        "
      >
        {{ $t('admin.no_domains') }}
      </div>

      <div v-else class="space-y-3">
        <div
          v-for="(domain, index) in domains"
          :key="domain.domain"
          class="flex items-center justify-between rounded-lg border p-3"
        >
          <div class="flex items-center space-x-3">
            <div
              class="
                flex h-8 w-8 items-center justify-center rounded-full
                bg-primary/10 text-xs font-semibold text-primary
              "
            >
              {{ index + 1 }}
            </div>
            <div>
              <p class="font-medium">
                {{ domain.domain }}
              </p>
            </div>
          </div>
          <div class="text-right">
            <p class="font-semibold">
              {{ domain.count }}
            </p>
            <p class="text-xs text-muted-foreground">
              {{ $t('admin.links') }}
            </p>
          </div>
        </div>
      </div>
    </CardContent>
  </Card>
</template>
