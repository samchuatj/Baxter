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

  // Public method to set up handlers for webhook mode
  public setupWebhookHandlers() {
    this.setupHandlers()
  }

  private async handleStartCommand(chatId: number, telegramUser: TelegramUser) {
    console.log(`🔍 [START_COMMAND] Starting /start command handling`)
    console.log(`🔍 [START_COMMAND] Chat ID: ${chatId}`)
    console.log(`🔍 [START_COMMAND] Telegram user:`, telegramUser)
    
    try {
      if (!isSupabaseConfigured) {
        console.log(`❌ [START_COMMAND] Supabase not configured`)
        await this.bot.sendMessage(
          chatId,
          '❌ Bot is not properly configured. Please contact the administrator.'
        )
        return
      }

      // Check if user is already linked
      console.log(`🔍 [START_COMMAND] Checking if user ${telegramUser.id} is already linked`)
      const supabase = createSupabaseClient()
      const { data: existingUser, error: existingError } = await supabase
        .from('telegram_users')
        .select('user_id')
        .eq('telegram_id', telegramUser.id)
        .single()

      console.log(`🔍 [START_COMMAND] Existing user check:`, { 
        existingUser: existingUser ? { ...existingUser, user_id: existingUser.user_id ? `${existingUser.user_id.substring(0, 8)}...` : null } : null, 
        existingError 
      })

      if (existingUser) {
        console.log(`✅ [START_COMMAND] User ${telegramUser.id} is already linked to user ${existingUser.user_id ? `${existingUser.user_id.substring(0, 8)}...` : null}`)
        await this.bot.sendMessage(
          chatId,
          '✅ You are already linked to your account! You can now use the bot to manage your expenses.\n\nHere\'s what I can help you with:\n\n• Track your expenses\n• Upload receipts as photos\n• Get summaries and reports\n\nJust send me a message or a photo of a receipt to get started!\n\n💡 Tip: You can also send me photos of receipts to automatically extract expense information.'
        )
        return
      }

      // Generate a unique auth token
      console.log(`🔍 [START_COMMAND] Generating auth token for user ${telegramUser.id}`)
      const authToken = this.generateAuthToken()
      const magicLink = `${process.env.NEXT_PUBLIC_APP_URL}/auth/telegram?token=${authToken}&telegram_id=${telegramUser.id}`
      
      console.log(`🔍 [START_COMMAND] Generated magic link: ${magicLink}`)

      // Store pending authentication in database
      console.log('🔍 [START_COMMAND] Storing token in database:', { 
        token: authToken ? `${authToken.substring(0, 8)}...` : null, 
        telegram_id: telegramUser.id 
      })
      const { error: insertError } = await supabase
        .from('pending_auth')
        .insert({
          token: authToken,
          telegram_id: telegramUser.id
        })

      console.log('🔍 [START_COMMAND] Insert result:', { insertError })

      if (insertError) {
        console.error('❌ [START_COMMAND] Error storing pending auth:', insertError)
        await this.bot.sendMessage(
          chatId,
          '❌ Sorry, there was an error generating your authentication link. Please try again.'
        )
        return
      }

      console.log('✅ [START_COMMAND] Token stored successfully')

      // Clean up old pending auth requests
      console.log('🔍 [START_COMMAND] Cleaning up old pending auth requests')
      await this.cleanupPendingAuth()

      console.log('🔍 [START_COMMAND] Sending magic link message to user')
      await this.bot.sendMessage(
        chatId,
        `👋 Hey there, and welcome to *Baxter Expense Manager*!

We're excited to have you on board. To connect your Telegram account with your Baxter profile, just tap the magic link below:

🔗 [Connect my account](${magicLink})

⚠️ *Heads up:* For your security, this link will expire in 10 minutes. If it times out, no worries — just hit /start in the chat to get a fresh one.

Let's get your expenses under control — together! 💼✨`,
        { parse_mode: 'Markdown' }
      )

    } catch (error: any) {
      console.error('❌ [START_COMMAND] Error handling start command:', error)
      console.error(`🔍 [START_COMMAND] Error type: ${error.constructor.name}`)
      console.error(`🔍 [START_COMMAND] Error message: ${error.message}`)
      console.error(`🔍 [START_COMMAND] Error stack: ${error.stack}`)
      
      try {
        await this.bot.sendMessage(
          chatId,
          '❌ Sorry, there was an error processing your request. Please try again later.'
        )
      } catch (sendError) {
        console.error('❌ [START_COMMAND] Failed to send error message to user:', sendError)
      }
    }
  }

  private async handleAuthCallback(query: TelegramBot.CallbackQuery) {
    console.log(`🔍 [AUTH_CALLBACK] Starting auth callback handling`)
    console.log(`🔍 [AUTH_CALLBACK] Query ID: ${query.id}`)
    console.log(`🔍 [AUTH_CALLBACK] Chat ID: ${query.message?.chat.id}`)
    console.log(`🔍 [AUTH_CALLBACK] User ID: ${query.from?.id}`)
    console.log(`🔍 [AUTH_CALLBACK] Callback data: ${query.data}`)
    
    try {
      const chatId = query.message!.chat.id
      const authToken = query.data!.replace('auth_', '')
      
      console.log(`🔍 [AUTH_CALLBACK] Extracted chat ID: ${chatId}`)
      console.log(`🔍 [AUTH_CALLBACK] Extracted auth token: ${authToken}`)

      const supabase = createSupabaseClient()
      console.log(`🔍 [AUTH_CALLBACK] Looking up pending auth for token: ${authToken}`)
      
      const { data: pending, error: pendingError } = await supabase
        .from('pending_auth')
        .select('*')
        .eq('token', authToken)
        .single()

      console.log(`🔍 [AUTH_CALLBACK] Pending auth lookup result:`, { pending, pendingError })

      if (!pending) {
        console.log(`❌ [AUTH_CALLBACK] No pending auth found for token: ${authToken}`)
        await this.bot.answerCallbackQuery(query.id!, { text: '❌ Authentication link expired or invalid' })
        return
      }

      console.log(`✅ [AUTH_CALLBACK] Found pending auth, removing from database`)
      
      // Remove from pending auth
      const { error: deleteError } = await supabase
        .from('pending_auth')
        .delete()
        .eq('token', authToken)
        
      console.log(`🔍 [AUTH_CALLBACK] Delete result:`, { deleteError })

      console.log(`🔍 [AUTH_CALLBACK] Answering callback query`)
      await this.bot.answerCallbackQuery(query.id!, { text: '✅ Authentication successful!' })
      
      console.log(`🔍 [AUTH_CALLBACK] Sending confirmation message to chat ID: ${chatId}`)
      const messageSent = await this.sendMessage(
        chatId,
        `🎉 Successfully linked! Your Telegram account is now connected to your Baxter account.

Here's what you can do with *Baxter Expense Manager*:

📸 *Upload receipts* — Send me photos of your receipts and I'll extract all the details automatically
📊 *Track spending* — Ask me about your expenses, get summaries, and see spending patterns
💼 *Business categorization* — I'll help categorize your expenses for tax and business purposes
📈 *Smart insights* — Get spending analysis and budget recommendations

Just send a message or a photo of a receipt to get started!`,
        { parse_mode: 'Markdown' }
      )
      
      console.log(`🔍 [AUTH_CALLBACK] Confirmation message result: ${messageSent}`)

    } catch (error: any) {
      console.error(`❌ [AUTH_CALLBACK] Error handling auth callback:`, error)
      console.error(`🔍 [AUTH_CALLBACK] Error type: ${error.constructor.name}`)
      console.error(`🔍 [AUTH_CALLBACK] Error message: ${error.message}`)
      console.error(`🔍 [AUTH_CALLBACK] Error stack: ${error.stack}`)
      
      try {
        await this.bot.answerCallbackQuery(query.id!, { text: '❌ Authentication failed' })
      } catch (answerError) {
        console.error(`❌ [AUTH_CALLBACK] Failed to answer callback query:`, answerError)
      }
    }
  }

  private async handleTextMessage(msg: TelegramBot.Message) {
    try {
      const chatId = msg.chat.id
      const telegramId = msg.from!.id
      const text = msg.text!

      // Extract replied-to message text if present
      let repliedToMessage = null;
      if (msg.reply_to_message) {
        console.log('DEBUG: reply_to_message object:', msg.reply_to_message);
        // Prefer text, but also handle captions (for images)
        repliedToMessage = msg.reply_to_message.text || msg.reply_to_message.caption || null;
      }

      console.log('📝 Bot Debug - Received text message:', { telegramId, text, repliedToMessage })

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

      // Debug log for outgoing API payload
      console.log('Bot Debug - Request payload:', {
        telegramId,
        userId: linkedUser.user_id,
        message: text,
        type: 'text',
        repliedToMessage
      });
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/telegram/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          telegramId,
          userId: linkedUser.user_id,
          message: text,
          type: 'text',
          repliedToMessage
        })
      })

      console.log('📝 Bot Debug - API response status:', response.status)
      
      if (response.ok) {
        const result = await response.json()
        console.log('📝 Bot Debug - API response:', result)
        await this.bot.sendMessage(chatId, result.message)
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
  public async sendMessage(telegramId: number, message: string, options?: any): Promise<boolean> {
    console.log(`🔍 [SEND_MESSAGE] Attempting to send message to user ${telegramId}`)
    console.log(`🔍 [SEND_MESSAGE] Message preview: ${message.substring(0, 100)}${message.length > 100 ? '...' : ''}`)
    console.log(`🔍 [SEND_MESSAGE] Bot instance: ${this.bot ? 'exists' : 'null'}`)
    console.log(`🔍 [SEND_MESSAGE] Webhook mode: ${this.isWebhookMode}`)
    
    try {
      console.log(`🔍 [SEND_MESSAGE] Calling bot.sendMessage(${telegramId}, message)`)
      const result = await this.bot.sendMessage(telegramId, message, options)
      console.log(`✅ [SEND_MESSAGE] Successfully sent message to user ${telegramId}`)
      console.log(`🔍 [SEND_MESSAGE] Telegram API response:`, result)
      return true
    } catch (error: any) {
      console.error(`❌ [SEND_MESSAGE] Failed to send message to user ${telegramId}`)
      console.error(`🔍 [SEND_MESSAGE] Error type: ${error.constructor.name}`)
      console.error(`🔍 [SEND_MESSAGE] Error message: ${error.message}`)
      console.error(`🔍 [SEND_MESSAGE] Error stack: ${error.stack}`)
      
      // Handle specific Telegram API errors
      if (error.response) {
        console.error(`🔍 [SEND_MESSAGE] HTTP Status: ${error.response.statusCode}`)
        console.error(`🔍 [SEND_MESSAGE] Response body:`, error.response.body)
        console.error(`🔍 [SEND_MESSAGE] Response headers:`, error.response.headers)
        
        if (error.response.statusCode === 403) {
          console.log(`⚠️ [SEND_MESSAGE] Cannot send message to user ${telegramId}: User has blocked the bot or hasn't started a conversation`)
          return false
        } else if (error.response.statusCode === 400) {
          console.log(`⚠️ [SEND_MESSAGE] Cannot send message to user ${telegramId}: ${error.response.body?.description || 'Bad request'}`)
          return false
        } else if (error.response.statusCode === 404) {
          console.log(`⚠️ [SEND_MESSAGE] Cannot send message to user ${telegramId}: User not found (404)`)
          return false
        }
      }
      
      // Log additional error properties
      if (error.code) console.error(`🔍 [SEND_MESSAGE] Error code: ${error.code}`)
      if (error.description) console.error(`🔍 [SEND_MESSAGE] Error description: ${error.description}`)
      if (error.parameters) console.error(`🔍 [SEND_MESSAGE] Error parameters:`, error.parameters)
      
      console.error(`❌ [SEND_MESSAGE] Unhandled error sending message to Telegram user ${telegramId}:`, error)
      return false
    }
  }

  // Method to send a receipt file (image or PDF) to a Telegram user
  public async sendReceiptFile(telegramId: number, fileBuffer: Buffer, filename: string, mimeType: string): Promise<boolean> {
    try {
      if (mimeType.startsWith('image/')) {
        // Send as photo
        await this.bot.sendPhoto(telegramId, fileBuffer, { caption: filename });
      } else {
        // Send as document (PDF or other)
        await this.bot.sendDocument(telegramId, fileBuffer, {}, { filename, contentType: mimeType });
      }
      return true;
    } catch (error) {
      console.error('Error sending receipt file to Telegram user:', error);
      return false;
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