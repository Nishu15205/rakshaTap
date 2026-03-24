import { NextRequest, NextResponse } from 'next/server';

/**
 * Voice Call API - Make real phone calls via Twilio
 * 
 * Twilio Voice API for emergency calls
 */

interface CallRequest {
  phone: string;
  message?: string;
  latitude?: number;
  longitude?: number;
}

// Format phone number with +91 for India
function formatIndianPhone(phone: string): string {
  let cleaned = phone.replace(/\D/g, '');
  
  if (cleaned.startsWith('0')) {
    cleaned = cleaned.substring(1);
  }
  if (cleaned.startsWith('91') && cleaned.length === 12) {
    cleaned = cleaned.substring(2);
  }
  
  if (cleaned.length === 10) {
    return `+91${cleaned}`;
  }
  
  return phone.startsWith('+') ? phone : `+${cleaned}`;
}

// Make call via Twilio
async function makeTwilioCall(
  phone: string, 
  message: string, 
  config: { 
    accountSid: string; 
    authToken: string; 
    fromNumber: string;
    twimlUrl?: string;
  }
) {
  const url = `https://api.twilio.com/2010-04-01/Accounts/${config.accountSid}/Calls.json`;
  
  // Create TwiML URL or use default
  const twiml = `
    <Response>
      <Say voice="alice" language="en-IN">
        ${message}
      </Say>
      <Pause length="2"/>
      <Say voice="alice" language="en-IN">
        This is an emergency alert from RakshaTap Safety App.
      </Say>
    </Response>
  `;
  
  // For emergency calls, we'll use TwiML Bin or direct TwiML
  const formData = new URLSearchParams();
  formData.append('To', phone);
  formData.append('From', config.fromNumber);
  
  if (config.twimlUrl) {
    formData.append('Url', config.twimlUrl);
  } else {
    // Use TwiML directly
    formData.append('Twiml', twiml);
  }

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

export async function POST(request: NextRequest) {
  try {
    const body: CallRequest = await request.json();
    const { phone, message, latitude, longitude } = body;

    if (!phone) {
      return NextResponse.json(
        { error: 'Phone number is required' },
        { status: 400 }
      );
    }

    const formattedPhone = formatIndianPhone(phone);

    // Get Twilio configuration
    const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID;
    const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
    const twilioFromNumber = process.env.TWILIO_FROM_NUMBER;
    const twilioTwimlUrl = process.env.TWILIO_TWIML_URL;

    // Default emergency message
    const emergencyMessage = message || 
      `Emergency Alert! This is an urgent call from RakshaTap Safety App. ` +
      `The user has triggered an SOS alert. ` +
      (latitude && longitude 
        ? `Their location is ${latitude.toFixed(4)}, ${longitude.toFixed(4)}. ` +
          `Check Google Maps at maps.google.com?q=${latitude},${longitude}`
        : 'Location not available.');

    if (twilioAccountSid && twilioAuthToken && twilioFromNumber) {
      // Make real call via Twilio
      const result = await makeTwilioCall(formattedPhone, emergencyMessage, {
        accountSid: twilioAccountSid,
        authToken: twilioAuthToken,
        fromNumber: twilioFromNumber,
        twimlUrl: twilioTwimlUrl,
      });

      return NextResponse.json({
        success: true,
        mode: 'live',
        phone: formattedPhone,
        provider: 'twilio',
        result,
      });
    } else {
      // Demo mode - return tel: link
      return NextResponse.json({
        success: true,
        mode: 'demo',
        phone: formattedPhone,
        message: 'Call initiated (demo mode)',
        universalLinks: {
          tel: `tel:${formattedPhone}`,
          skype: `skype:${formattedPhone}?call`,
          whatsapp: `https://wa.me/${formattedPhone.replace('+', '')}`,
        },
        note: 'Configure TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_FROM_NUMBER in .env for real calls',
        setupGuide: {
          step1: 'Create account at twilio.com',
          step2: 'Buy a phone number (or use trial)',
          step3: 'Add credentials to .env file',
          step4: 'Restart the server',
        },
      });
    }

  } catch (error) {
    console.error('Call API error:', error);
    return NextResponse.json(
      { error: 'Failed to make call', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'Call API Ready',
    provider: 'twilio',
    required: ['TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'TWILIO_FROM_NUMBER'],
    optional: ['TWILIO_TWIML_URL'],
    pricing: {
      india: '~$0.02 per minute',
      trial: 'Free trial with Twilio logo message',
    },
    setup: {
      step1: 'Go to twilio.com and create account',
      step2: 'Verify your email and phone',
      step3: 'Get Account SID and Auth Token from Console',
      step4: 'Buy a phone number (~$1/month)',
      step5: 'Add to .env file',
    },
  });
}
