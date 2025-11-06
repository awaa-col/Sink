<script setup lang="ts">
import DomainStats from '@/components/dashboard/admin/DomainStats.vue'
import Overview from '@/components/dashboard/admin/Overview.vue'
import QuotaCard from '@/components/dashboard/admin/QuotaCard.vue'

definePageMeta({
  layout: 'dashboard',
  middleware: 'auth',
})

const _t = useI18n().t
const router = useRouter()
const user = ref(null)
const loading = ref(true)

// Check if user is admin
async function checkAdmin() {
  try {
    loading.value = true
    const userData = await useAPI('/api/auth/me')
    user.value = userData

    if (userData.role !== 'admin') {
      // Not an admin, redirect to links page
      router.push('/dashboard/links')
    }
  }
  catch (e) {
    console.error('Failed to check admin status:', e)
    router.push('/dashboard/login')
  }
  finally {
    loading.value = false
  }
}

onMounted(() => {
  checkAdmin()
})
</script>

<template>
  <div class="space-y-6">
    <div v-if="loading" class="flex items-center justify-center py-8">
      <div
        class="
          h-8 w-8 animate-spin rounded-full border-4 border-primary
          border-t-transparent
        "
      />
    </div>

    <div v-else-if="user && user.role === 'admin'">
      <div class="mb-6">
        <h1 class="text-3xl font-bold tracking-tight">
          {{ $t('admin.dashboard') }}
        </h1>
        <p class="text-muted-foreground">
          {{ $t('admin.dashboard_description') }}
        </p>
      </div>

      <!-- Overview Stats -->
      <Overview />

      <!-- Quota and Domain Stats -->
      <div
        class="
          mt-6 grid gap-6
          md:grid-cols-2
        "
      >
        <QuotaCard />
        <DomainStats />
      </div>
    </div>
  </div>
</template>
