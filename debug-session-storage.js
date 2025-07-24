// Debug script to test session storage
console.log('🔍 Debug - Testing session storage functionality')

// Test setting and getting session storage
sessionStorage.setItem('test_key', 'test_value')
const retrieved = sessionStorage.getItem('test_key')
console.log('🔍 Debug - Session storage test:', { set: 'test_value', retrieved })

// Check if we can access session storage from different contexts
console.log('🔍 Debug - Session storage available:', typeof sessionStorage !== 'undefined')
console.log('🔍 Debug - All session storage keys:', Object.keys(sessionStorage))

// Test the specific keys we're using
const oauthNextUrl = sessionStorage.getItem('oauth_next_url')
const telegramToken = sessionStorage.getItem('telegram_auth_token')
const telegramId = sessionStorage.getItem('telegram_auth_id')

console.log('🔍 Debug - Our specific session storage items:', {
  oauth_next_url: oauthNextUrl,
  telegram_auth_token: telegramToken ? 'present' : 'missing',
  telegram_auth_id: telegramId ? 'present' : 'missing'
})

// Test URL encoding/decoding
const testUrl = '/auth/telegram'
const encoded = encodeURIComponent(testUrl)
const decoded = decodeURIComponent(encoded)
console.log('🔍 Debug - URL encoding test:', { original: testUrl, encoded, decoded }) 