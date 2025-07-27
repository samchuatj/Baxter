// Personal Assistant System Types and Interfaces
// Phase 1: Basic PA functionality

export interface PersonalAssistant {
  id: string
  user_id: string
  pa_telegram_id: number
  pa_name: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface GroupChat {
  id: string
  user_id: string
  chat_id: number
  chat_title: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface PAWebAccessToken {
  id: string
  user_id: string
  pa_telegram_id: number
  access_token: string
  expires_at: string
  created_at: string
}

export interface PAContext {
  user_id: string
  pa_telegram_id: number
  pa_name: string
  user_name: string
  permissions: PAPermissions
}

export interface PAPermissions {
  add_expenses: boolean
  edit_expenses: boolean
  view_expenses: boolean
  generate_reports: boolean
}

export interface GroupChatRegistration {
  chat_id: number
  chat_title: string
  user_id: string
}

export interface PAAddition {
  pa_telegram_id: number
  pa_name: string
  user_id: string
  chat_id: number
}

export interface PATokenRequest {
  pa_telegram_id: number
  chat_id: number
}

export interface PATokenValidation {
  token: string
}

export interface PATokenValidationResult {
  valid: boolean
  pa_context?: PAContext
  error?: string
}

// Bot command types
export type BotCommand = 
  | '/register'
  | '/add-pa'
  | '/remove-pa'
  | '/list-pas'
  | '/web-access'
  | '/help';

// Error types
export interface PAError {
  code: 'PA_NOT_FOUND' | 'GROUP_NOT_REGISTERED' | 'INVALID_TOKEN' | 'TOKEN_EXPIRED' | 'UNAUTHORIZED' | 'DUPLICATE_PA'
  message: string
  details?: any
}

// API response types
export interface PAResponse<T = any> {
  success: boolean
  data?: T
  error?: PAError
} 