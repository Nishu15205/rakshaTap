import { NextRequest, NextResponse } from 'next/server';

/**
 * SMS Send API - Sends real SMS via configured webhook
 * 
 * Supported providers:
 * - Twilio
 * - MSG91
 * - Fast2SMS
 * - TextLocal
 * - Custom webhook
 */

interface SMSRequest {
  phone: string;
  message: string;
  latitude?: number;
  longitude?: number;
  userName?: string;
}

// Format phone number with +91 for India
function formatIndianPhone(phone: string): string {
  // Remove all non-digits
  let cleaned = phone.replace(/\D/g, '');
  
  // Remove leading 0 or 91 if present
  if (cleaned.startsWith('0')) {
    cleaned = cleaned.substring(1);
  }
  if (cleaned.startsWith('91') && cleaned.length === 12) {
    cleaned = cleaned.substring(2);
  }
  
  // Ensure 10 digits
  if (cleaned.length === 10) {
    return `+91${cleaned}`;
  }
  
  // Return as-is if already formatted
  return phone.startsWith('+') ? phone : `+${cleaned}`;
}

// Send via Twilio webhook
async function sendViaTwilio(phone: string, message: string, config: { accountSid: string; authToken: string; fromNumber: string }) {
  const url = `https://api.twilio.com/2010-04-01/Accounts/${config.accountSid}/Messages.json`;
  
  const formData = new URLSearchParams();
  formData.append('To', phone);
  formData.append('From', config.fromNumber);
  formData.append('Body', message);

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': 'Basic ' + Buffer.from(`${config.accountSid}:${config.authToken}`).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: formData.toString(),
  });

  return response.json();
}

// Send via MSG91 webhook
async function sendViaMSG91(phone: string, message: string, config: { apiKey: string; senderId: string }) {
  // Format phone for MSG91 (91 prefix without +)
  const formattedPhone = phone.replace('+', '');
  
  const url = `https://api.msg91.com/api/v2/sendsms?country=91&sms=${encodeURIComponent(JSON.stringify({
    message: message,
    to: [formattedPhone.replace('91', '')],
    sender: config.senderId,
    route: '4', // Transactional route
  }))}`;

  const response = await fetch('https://api.msg91.com/api/v2/sendsms', {
    method: 'POST',
    headers: {
      'authkey': config.apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      sender: config.senderId,
      route: '4',
      country: '91',
      sms: [{
        message: message,
        to: [formattedPhone.replace('91', '')],
      }],
    }),
  });

  return response.json();
}

// Send via Fast2SMS webhook
async function sendViaFast2SMS(phone: string, message: string, config: { apiKey: string }) {
  // Format phone for Fast2SMS (without +91)
  const formattedPhone = phone.replace('+91', '').replace('+', '');

  const response = await fetch('https://www.fast2sms.com/dev/bulkV2', {
    method: 'POST',
    headers: {
      'authorization': config.apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      route: 'q', // Quick SMS
      message: message,
      numbers: formattedPhone,
    }),
  });

  return response.json();
}

// Send via custom webhook
async function sendViaCustomWebhook(webhookUrl: string, data: SMSRequest) {
  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      to: data.phone,
      message: data.message,
      latitude: data.latitude,
      longitude: data.longitude,
      userName: data.userName,
      timestamp: new Date().toISOString(),
    }),
  });

  return response.json();
}

export async function POST(request: NextRequest) {
  try {
    const body: SMSRequest = await request.json();
    const { phone, message, latitude, longitude, userName } = body;

    if (!phone || !message) {
      return NextResponse.json(
        { error: 'Phone number and message are required' },
        { status: 400 }
      );
    }

    // Format phone with +91
    const formattedPhone = formatIndianPhone(phone);

    // Get SMS configuration from environment or request
    const smsProvider = process.env.SMS_PROVIDER || 'webhook';
    const smsWebhookUrl = process.env.SMS_WEBHOOK_URL;
    const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID;
    const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
    const twilioFromNumber = process.env.TWILIO_FROM_NUMBER;
    const msg91ApiKey = process.env.MSG91_API_KEY;
    const msg91SenderId = process.env.MSG91_SENDER_ID || 'RKSHTP';
    const fast2smsApiKey = process.env.FAST2SMS_API_KEY;

    let result;

    // Try different providers based on configuration
    if (smsProvider === 'twilio' && twilioAccountSid && twilioAuthToken && twilioFromNumber) {
      result = await sendViaTwilio(formattedPhone, message, {
        accountSid: twilioAccountSid,
        authToken: twilioAuthToken,
        fromNumber: twilioFromNumber,
      });
    } else if (smsProvider === 'msg91' && msg91ApiKey) {
      result = await sendViaMSG91(formattedPhone, message, {
        apiKey: msg91ApiKey,
        senderId: msg91SenderId,
      });
    } else if (smsProvider === 'fast2sms' && fast2smsApiKey) {
      result = await sendViaFast2SMS(formattedPhone, message, {
        apiKey: fast2smsApiKey,
      });
    } else if (smsWebhookUrl) {
      result = await sendViaCustomWebhook(smsWebhookUrl, {
        phone: formattedPhone,
        message,
        latitude,
        longitude,
        userName,
      });
    } else {
      // Demo mode - return simulated response with universal links
      const encodedMessage = encodeURIComponent(message);
      
      return NextResponse.json({
        success: true,
        mode: 'demo',
        phone: formattedPhone,
        message: 'SMS prepared for sending',
        universalLinks: {
          // Universal SMS link - works on mobile and some browsers
          sms: `sms:${formattedPhone}?body=${encodedMessage}`,
          // Alternative format for iOS
          smsIos: `sms:${formattedPhone}/?body=${encodedMessage}`,
          // Tel link for calls
          tel: `tel:${formattedPhone}`,
          // WhatsApp
          whatsapp: `https://wa.me/${formattedPhone.replace('+', '')}?text=${encodedMessage}`,
          // Google Maps for location
          maps: latitude && longitude 
            ? `https://www.google.com/maps?q=${latitude},${longitude}`
            : null,
          // Apple Maps
          appleMaps: latitude && longitude
            ? `https://maps.apple.com/?q=${latitude},${longitude}`
            : null,
        },
        note: 'Configure SMS provider (Twilio/MSG91/Fast2SMS) in environment variables for real SMS delivery',
      });
    }

    return NextResponse.json({
      success: true,
      mode: 'live',
      phone: formattedPhone,
      provider: smsProvider,
      result,
    });

  } catch (error) {
    console.error('SMS API error:', error);
    return NextResponse.json(
      { error: 'Failed to send SMS', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'SMS API Ready',
    providers: {
      twilio: {
        required: ['TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'TWILIO_FROM_NUMBER'],
        note: 'Set SMS_PROVIDER=twilio',
      },
      msg91: {
        required: ['MSG91_API_KEY'],
        optional: ['MSG91_SENDER_ID'],
        note: 'Set SMS_PROVIDER=msg91',
      },
      fast2sms: {
        required: ['FAST2SMS_API_KEY'],
        note: 'Set SMS_PROVIDER=fast2sms',
      },
      webhook: {
        required: ['SMS_WEBHOOK_URL'],
        note: 'Set SMS_WEBHOOK_URL for custom integration',
      },
    },
    phoneFormat: 'Indian numbers auto-formatted with +91 prefix',
  });
}
