// Notification Service - Native Phone Features (SMS, Call) + Telegram

export interface NotificationResult {
  success: boolean;
  notificationId?: string;
  error?: string;
}

export interface EmergencyAlertData {
  contactName: string;
  contactPhone: string;
  contactEmail?: string;
  telegramChatId?: string;
  userName?: string;
  message: string;
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp: Date;
}

/**
 * Generate SMS URL for native phone app
 * Opens the phone's SMS app with pre-filled message
 */
export function generateSMSUrl(phone: string, message: string): string {
  // Clean phone number
  const cleanPhone = phone.replace(/[^0-9+]/g, '');
  // Encode message
  const encodedMessage = encodeURIComponent(message);
  // Return sms: URL scheme
  return `sms:${cleanPhone}?body=${encodedMessage}`;
}

/**
 * Generate Tel URL for direct calling
 */
export function generateTelUrl(phone: string): string {
  const cleanPhone = phone.replace(/[^0-9+]/g, '');
  return `tel:${cleanPhone}`;
}

/**
 * Generate WhatsApp URL
 */
export function generateWhatsAppUrl(phone: string, message: string): string {
  // Remove + and leading zeros for WhatsApp
  const cleanPhone = phone.replace(/[^0-9]/g, '');
  const encodedMessage = encodeURIComponent(message);
  return `https://wa.me/${cleanPhone}?text=${encodedMessage}`;
}

/**
 * Generate Google Maps URL for location sharing
 */
export function generateMapsUrl(latitude: number, longitude: number): string {
  return `https://www.google.com/maps?q=${latitude},${longitude}`;
}

/**
 * Send Telegram notification using Bot API
 */
export async function sendTelegramNotification(
  botToken: string,
  chatId: string,
  data: EmergencyAlertData
): Promise<NotificationResult> {
  try {
    const googleMapsUrl = generateMapsUrl(data.latitude, data.longitude);
    
    const message = `
🚨 *EMERGENCY ALERT* 🚨

${data.message}

📍 *Location:*
• Latitude: ${data.latitude.toFixed(6)}
• Longitude: ${data.longitude.toFixed(6)}
• Accuracy: ${data.accuracy ? `${data.accuracy.toFixed(0)}m` : 'Unknown'}

🗺 *Maps:*
[Open in Google Maps](${googleMapsUrl})

📱 *Contact:* ${data.contactPhone}
⏰ *Time:* ${data.timestamp.toLocaleString()}

_This is an automated emergency alert from RakshaTap_
`;

    const response = await fetch(
      `https://api.telegram.org/bot${botToken}/sendMessage`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
          parse_mode: 'Markdown',
          disable_web_page_preview: false,
        }),
      }
    );

    const result = await response.json();

    if (!response.ok) {
      console.error('Telegram API error:', result);
      return {
        success: false,
        error: result.description || 'Failed to send Telegram message',
      };
    }

    return {
      success: true,
      notificationId: `tg_${result.result.message_id}`,
    };
  } catch (error) {
    console.error('Telegram notification error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Generate full emergency message
 */
export function generateEmergencyMessage(
  userName: string,
  customMessage: string,
  latitude: number,
  longitude: number
): string {
  const mapsUrl = generateMapsUrl(latitude, longitude);
  return `🚨 EMERGENCY ALERT!

${customMessage}

📍 My Location: ${mapsUrl}
Coordinates: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}
📅 Time: ${new Date().toLocaleString()}

- ${userName} via RakshaTap Safety App`;
}

/**
 * Send emergency alert through all available channels
 */
export async function sendEmergencyAlert(
  data: EmergencyAlertData,
  options: {
    telegramBotToken?: string;
    enableTelegram?: boolean;
  }
): Promise<{
  telegram?: NotificationResult;
  smsUrl?: string;
  telUrl?: string;
  whatsappUrl?: string;
}> {
  const results: {
    telegram?: NotificationResult;
    smsUrl?: string;
    telUrl?: string;
    whatsappUrl?: string;
  } = {};

  const fullMessage = generateEmergencyMessage(
    data.userName || 'User',
    data.message,
    data.latitude,
    data.longitude
  );

  // Generate native phone URLs (always available)
  results.smsUrl = generateSMSUrl(data.contactPhone, fullMessage);
  results.telUrl = generateTelUrl(data.contactPhone);
  results.whatsappUrl = generateWhatsAppUrl(data.contactPhone, fullMessage);

  // Send Telegram notification if configured
  if (options.enableTelegram && options.telegramBotToken && data.telegramChatId) {
    results.telegram = await sendTelegramNotification(
      options.telegramBotToken,
      data.telegramChatId,
      data
    );
  }

  return results;
}
