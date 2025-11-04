/**
 * Get current user information
 */
export default eventHandler((event) => {
  const user = event.context.user

  if (!user) {
    throw createError({
      status: 401,
      statusText: 'Unauthorized',
      message: 'Not authenticated',
    })
  }

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    avatar: user.avatar,
    role: user.role,
  }
})
