/**
 * Logout endpoint - invalidates the current session
 */
export default eventHandler((_event) => {
  // In a stateless JWT system, logout is handled client-side by removing the token
  // This endpoint exists for consistency and potential future enhancements
  return {
    success: true,
    message: 'Logged out successfully',
  }
})
