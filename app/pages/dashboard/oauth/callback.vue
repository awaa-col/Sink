<script setup>
import { toast } from 'vue-sonner'

const { t } = useI18n()
const router = useRouter()
const route = useRoute()

onMounted(() => {
  const token = route.query.token

  if (token) {
    // Store JWT token
    localStorage.setItem('SinkSiteToken', String(token))

    toast.success(t('oauth.login_success'))

    // Redirect to dashboard
    setTimeout(() => {
      router.push('/dashboard/links')
    }, 500)
  }
  else {
    toast.error(t('oauth.login_failed'))
    setTimeout(() => {
      router.push('/dashboard/login')
    }, 2000)
  }
})
</script>

<template>
  <div class="flex h-screen items-center justify-center">
    <Card class="w-full max-w-md">
      <CardHeader>
        <CardTitle>{{ $t('oauth.processing') }}</CardTitle>
        <CardDescription>{{ $t('oauth.please_wait') }}</CardDescription>
      </CardHeader>
      <CardContent class="flex justify-center py-8">
        <div
          class="
            h-8 w-8 animate-spin rounded-full border-4 border-primary
            border-t-transparent
          "
        />
      </CardContent>
    </Card>
  </div>
</template>
