// Load environment variables first
import { config } from 'dotenv'
import { resolve } from 'path'
config({ path: resolve(process.cwd(), '.env.local') })

import TelegramBot from 'node-telegram-bot-api'
import { createClient } from '@supabase/supabase-js'

// Check if bot token is available
const botToken = process.env.TELEGRAM_BOT_TOKEN
if (!botToken) {
  throw new Error('TELEGRAM_BOT_TOKEN environment variable is not set')
}

// Check if Supabase is configured
const isSupabaseConfigured = 
  typeof process.env.NEXT_PUBLIC_SUPABASE_URL === "string" &&
  process.env.NEXT_PUBLIC_SUPABASE_URL.length > 0 &&
  typeof process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY === "string" &&
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.length > 0

if (!isSupabaseConfigured) {
  console.warn('⚠️ Supabase environment variables are not set. Bot will not be able to link users.')
}

// Create Supabase client for bot
const createSupabaseClient = () => {
  if (!isSupabaseConfigured) {
    console.warn('Supabase environment variables are not set. Using dummy client.')
    return {
      from: () => ({
        select: () => ({
          eq: () => ({
            single: () => Promise.resolve({ data: null, error: null }),
            gte: () => Promise.resolve({ data: [], error: null }),
            lte: () => Promise.resolve({ data: [], error: null }),
            in: () => Promise.resolve({ data: [], error: null }),
            order: () => Promise.resolve({ data: [], error: null }),
          }),
        }),
        insert: () => Promise.resolve({ data: null, error: null }),
        update: () => Promise.resolve({ data: null, error: null }),
        delete: () => ({
          eq: () => Promise.resolve({ data: null, error: null }),
          lt: () => Promise.resolve({ data: null, error: null }),
        }),
        eq: () => Promise.resolve({ data: [], error: null }),
        gte: () => Promise.resolve({ data: [], error: null }),
        lte: () => Promise.resolve({ data: [], error: null }),
        in: () => Promise.resolve({ data: [], error: null }),
        order: () => Promise.resolve({ data: [], error: null }),
        single: () => Promise.resolve({ data: null, error: null }),
      }),
    }
  }

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// Initialize the bot with your token
// Helper to create bot instance with or without polling
function createBotInstance(options: { polling?: boolean } = {}) {
  return new TelegramBot(botToken as string, options)
}

export interface TelegramUser {
  id: number
  username?: string
  first_name?: string
  last_name?: string
}

export class TelegramBotService {
  private bot: TelegramBot
  private processingMessages: Set<string> = new Set()
  private isWebhookMode: boolean

  constructor({ webhookMode = false }: { webhookMode?: boolean } = {}) {
    this.isWebhookMode = webhookMode
    this.bot = createBotInstance({ polling: !webhookMode })
    if (!webhookMode) {
      this.setupHandlers()
    }
  }

  private setupHandlers() {
    // Handle /start command
    this.bot.onText(/\/start/, async (msg: TelegramBot.Message) => {
      const chatId = msg.chat.id
      const telegramUser: TelegramUser = {
        id: msg.from!.id,
        username: msg.from!.username,
        first_name: msg.from!.first_name,
        last_name: msg.from!.last_name,
      }

      await this.handleStartCommand(chatId, telegramUser)
    })

    // Handle text messages
    this.bot.on('message', async (msg: TelegramBot.Message) => {
      if (msg.text && !msg.text.startsWith('/')) {
        await this.handleTextMessage(msg)
      }
    })

    // Handle photo messages - only process the largest photo to avoid duplicates
    this.bot.on('photo', async (msg: TelegramBot.Message) => {
      // Only process the largest photo (last in the array) to avoid duplicates
      if (msg.photo && msg.photo.length > 0) {
        // Always use the largest photo (last in the array)
        await this.handlePhotoMessage(msg)
      }
    })

    // Handle callback queries (when user clicks magic link)
    this.bot.on('callback_query', async (query: TelegramBot.CallbackQuery) => {
      if (query.data?.startsWith('auth_')) {
        await this.handleAuthCallback(query)
      }
    })
  }

  private async handleStartCommand(chatId: number, telegramUser: TelegramUser) {
    try {
      if (!isSupabaseConfigured) {
        await this.bot.sendMessage(
          chatId,
          '❌ Bot is not properly configured. Please contact the administrator.'
        )
        return
      }

      // Check if user is already linked
      const supabase = createSupabaseClient()
      const { data: existingUser } = await supabase
        .from('telegram_users')
        .select('user_id')
        .eq('telegram_id', telegramUser.id)
        .single()

      if (existingUser) {
        await this.bot.sendMessage(
          chatId,
          '✅ You are already linked to your account! You can now use the bot to manage your expenses.'
        )
        return
      }

      // Generate a unique auth token
      const authToken = this.generateAuthToken()
      const magicLink = `${process.env.NEXT_PUBLIC_APP_URL}/auth/telegram?token=${authToken}&telegram_id=${telegramUser.id}`

      // Store pending authentication in database
      console.log('🔍 Bot Debug - Storing token in database:', { token: authToken, telegram_id: telegramUser.id })
      const { error: insertError } = await supabase
        .from('pending_auth')
        .insert({
          token: authToken,
          telegram_id: telegramUser.id
        })

      console.log('🔍 Bot Debug - Insert result:', { insertError })

      if (insertError) {
        console.error('❌ Bot Debug - Error storing pending auth:', insertError)
        await this.bot.sendMessage(
          chatId,
          '❌ Sorry, there was an error generating your authentication link. Please try again.'
        )
        return
      }

      console.log('✅ Bot Debug - Token stored successfully')

      // Clean up old pending auth requests
      await this.cleanupPendingAuth()

      await this.bot.sendMessage(
        chatId,
        `🔐 Welcome to Baxter Expense Manager!

To link your Telegram account to your Baxter account, please click the magic link below:

${magicLink}

⚠️ Important: This link will expire in 10 minutes for security reasons. You can sign in or sign up after clicking the link.`
      )

    } catch (error) {
      console.error('Error handling start command:', error)
      await this.bot.sendMessage(
        chatId,
        '❌ Sorry, there was an error processing your request. Please try again later.'
      )
    }
  }

  private async handleAuthCallback(query: TelegramBot.CallbackQuery) {
    try {
      const chatId = query.message!.chat.id
      const authToken = query.data!.replace('auth_', '')

      const supabase = createSupabaseClient()
      const { data: pending } = await supabase
        .from('pending_auth')
        .select('*')
        .eq('token', authToken)
        .single()

      if (!pending) {
        await this.bot.answerCallbackQuery(query.id!, { text: '❌ Authentication link expired or invalid' })
        return
      }

      // Remove from pending auth
      await supabase
        .from('pending_auth')
        .delete()
        .eq('token', authToken)

      await this.bot.answerCallbackQuery(query.id!, { text: '✅ Authentication successful!' })
      await this.bot.sendMessage(
        chatId,
        '🎉 Successfully linked! Your Telegram account is now connected to your Baxter account. You can now use the bot to manage your expenses.'
      )

    } catch (error) {
      console.error('Error handling auth callback:', error)
      await this.bot.answerCallbackQuery(query.id!, { text: '❌ Authentication failed' })
    }
  }

  private async handleTextMessage(msg: TelegramBot.Message) {
    try {
      const chatId = msg.chat.id
      const telegramId = msg.from!.id
      const text = msg.text!

      console.log('📝 Bot Debug - Received text message:', { telegramId, text })

      // Check if user is linked
      const supabase = createSupabaseClient()
      const { data: linkedUser } = await supabase
        .from('telegram_users')
        .select('user_id')
        .eq('telegram_id', telegramId)
        .single()

      if (!linkedUser) {
        await this.bot.sendMessage(
          chatId,
          '❌ Please link your account first by sending /start'
        )
        return
      }

      // Forward text message to backend
      console.log('📝 Bot Debug - Calling API:', `${process.env.NEXT_PUBLIC_APP_URL}/api/telegram/message`)
      console.log('📝 Bot Debug - Request payload:', {
        telegramId,
        userId: linkedUser.user_id,
        message: text,
        type: 'text'
      })
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/telegram/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          telegramId,
          userId: linkedUser.user_id,
          message: text,
          type: 'text'
        })
      })

      console.log('📝 Bot Debug - API response status:', response.status)
      
      if (response.ok) {
        const result = await response.json()
        console.log('📝 Bot Debug - API response:', result)
        await this.bot.sendMessage(chatId, `✅ Message processed: ${result.message}`)
      } else {
        const errorText = await response.text()
        console.error('📝 Bot Debug - API error response:', errorText)
        console.error('📝 Bot Debug - API error status:', response.status)
        await this.bot.sendMessage(chatId, '❌ Failed to process message. Please try again.')
      }

    } catch (error) {
      console.error('Error handling text message:', error)
      await this.bot.sendMessage(msg.chat.id, '❌ Sorry, there was an error processing your message.')
    }
  }

  private async handlePhotoMessage(msg: TelegramBot.Message) {
    const chatId = msg.chat.id
    const telegramId = msg.from!.id
    const messageId = msg.message_id

    // Create a unique key for this message to prevent duplicate processing
    const messageKey = `${chatId}-${messageId}`
    
    if (this.processingMessages.has(messageKey)) {
      console.log('📸 Bot Debug - Message already being processed, skipping:', messageKey)
      return
    }

    this.processingMessages.add(messageKey)
    console.log('📸 Bot Debug - Received photo message:', { telegramId, messageId })

    try {

      // Check if user is linked
      const supabase = createSupabaseClient()
      const { data: linkedUser } = await supabase
        .from('telegram_users')
        .select('user_id')
        .eq('telegram_id', telegramId)
        .single()

      if (!linkedUser) {
        await this.bot.sendMessage(
          chatId,
          '❌ Please link your account first by sending /start'
        )
        return
      }

      // Get the largest photo (best quality)
      const photo = msg.photo![msg.photo!.length - 1]
      
      // Download the file
      const file = await this.bot.getFile(photo.file_id)
      const fileUrl = `https://api.telegram.org/file/bot${process.env.TELEGRAM_BOT_TOKEN}/${file.file_path}`
      
      console.log('📸 Bot Debug - Downloading file:', fileUrl)

      // Download the image with better error handling
      console.log('📸 Bot Debug - Attempting to download image from:', fileUrl)
      
      let imageResponse
      try {
        imageResponse = await fetch(fileUrl, {
          method: 'GET',
          headers: {
            'User-Agent': 'TelegramBot/1.0'
          }
        })
      } catch (fetchError) {
        console.error('📸 Bot Debug - Fetch error:', fetchError)
        const errorMessage = fetchError instanceof Error ? fetchError.message : 'Unknown fetch error'
        throw new Error(`Failed to download image: ${errorMessage}`)
      }

      if (!imageResponse.ok) {
        throw new Error(`HTTP ${imageResponse.status}: ${imageResponse.statusText}`)
      }

      const imageBuffer = await imageResponse.arrayBuffer()
      const base64Image = Buffer.from(imageBuffer).toString('base64')
      console.log('📸 Bot Debug - Image downloaded successfully, size:', imageBuffer.byteLength, 'bytes')

      // Forward image to backend with ChatGPT Vision
      const apiUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/telegram/message`
      console.log('📸 Bot Debug - Sending image to API for processing...')
      console.log('📸 Bot Debug - API URL:', apiUrl)
      
      let response
      try {
        response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            telegramId,
            userId: linkedUser.user_id,
            message: 'Image uploaded',
            type: 'image',
            imageData: base64Image,
            imageFormat: file.file_path?.split('.').pop() || 'jpg'
          })
        })
      } catch (apiError) {
        console.error('📸 Bot Debug - API call error:', apiError)
        const errorMessage = apiError instanceof Error ? apiError.message : 'Unknown API error'
        throw new Error(`Failed to call API: ${errorMessage}`)
      }

      if (response.ok) {
        const result = await response.json()
        console.log('📸 Bot Debug - API response:', result)
        await this.bot.sendMessage(chatId, `✅ Image processed: ${result.message}`)
      } else {
        const errorText = await response.text()
        console.error('📸 Bot Debug - API error response:', errorText)
        await this.bot.sendMessage(chatId, `❌ Failed to process image. Server error: ${response.status}`)
      }

    } catch (error) {
      console.error('Error handling photo message:', error)
      await this.bot.sendMessage(msg.chat.id, '❌ Sorry, there was an error processing your image.')
    } finally {
      // Remove the message from processing set
      this.processingMessages.delete(messageKey)
    }
  }

  private generateAuthToken(): string {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
  }

  private async cleanupPendingAuth() {
    try {
      const supabase = createSupabaseClient()
      await supabase
        .from('pending_auth')
        .delete()
        .lt('expires_at', new Date().toISOString())
    } catch (error) {
      console.error('Error cleaning up pending auth:', error)
    }
  }

  // Method to link a Telegram user to a Supabase user
  public async linkTelegramUser(telegramId: number, supabaseUserId: string): Promise<boolean> {
    try {
      const supabase = createSupabaseClient()
      
      const { error } = await supabase
        .from('telegram_users')
        .insert({
          telegram_id: telegramId,
          user_id: supabaseUserId
        })

      if (error) {
        console.error('Error linking Telegram user:', error)
        return false
      }

      return true
    } catch (error) {
      console.error('Error linking Telegram user:', error)
      return false
    }
  }

  // Method to get Supabase user ID from Telegram ID
  public async getSupabaseUserId(telegramId: number): Promise<string | null> {
    try {
      const supabase = createSupabaseClient()
      
      const { data, error } = await supabase
        .from('telegram_users')
        .select('user_id')
        .eq('telegram_id', telegramId)
        .single()

      if (error || !data) {
        return null
      }

      return data.user_id
    } catch (error) {
      console.error('Error getting Supabase user ID:', error)
      return null
    }
  }

  // Method to send message to a Telegram user
  public async sendMessage(telegramId: number, message: string): Promise<boolean> {
    try {
      await this.bot.sendMessage(telegramId, message)
      return true
    } catch (error) {
      console.error('Error sending message to Telegram user:', error)
      return false
    }
  }

  // For webhook mode, process a single update
  public async handleWebhookUpdate(update: any) {
    // node-telegram-bot-api provides a 'processUpdate' method for this
    if (typeof this.bot.processUpdate === 'function') {
      await this.bot.processUpdate(update)
    } else {
      throw new Error('Bot does not support processUpdate')
    }
  }

  // Start the bot
  public start() {
    console.log('🤖 Telegram bot started')
    if (!isSupabaseConfigured) {
      console.warn('⚠️ Supabase not configured - bot functionality will be limited')
    }
  }

  // Stop the bot
  public stop() {
    this.bot.stopPolling()
    console.log('🤖 Telegram bot stopped')
  }
} 