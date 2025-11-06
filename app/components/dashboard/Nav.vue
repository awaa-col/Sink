<script setup>
const route = useRoute()
const user = ref(null)

// Check if user is admin
onMounted(async () => {
  try {
    const userData = await useAPI('/api/auth/me')
    user.value = userData
  }
  catch (e) {
    // User not authenticated or error
    console.error('Failed to get user info:', e)
  }
})
</script>

<template>
  <section class="flex justify-between">
    <Tabs
      v-if="route.path !== '/dashboard/link'"
      :default-value="route.path"
      @update:model-value="navigateTo"
    >
      <TabsList>
        <TabsTrigger
          value="/dashboard/links"
        >
          {{ $t('nav.links') }}
        </TabsTrigger>
        <TabsTrigger value="/dashboard/analysis">
          {{ $t('nav.analysis') }}
        </TabsTrigger>
        <TabsTrigger value="/dashboard/realtime">
          {{ $t('nav.realtime') }}
        </TabsTrigger>
        <TabsTrigger v-if="user && user.role === 'admin'" value="/dashboard/admin">
          {{ $t('nav.admin') }}
        </TabsTrigger>
      </TabsList>
    </Tabs>
    <slot name="left" />
    <div>
      <slot />
    </div>
  </section>
</template>
