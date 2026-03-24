import { NextRequest, NextResponse } from 'next/server';
import { db, isDatabaseAvailable } from '@/lib/db';

// Demo user settings for demo mode
const DEMO_USER = {
  id: 'default_user',
  name: 'User',
  phone: null,
  email: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  settings: {
    id: 'demo_settings',
    userId: 'default_user',
    autoShareLocation: true,
    alertMessage: 'EMERGENCY! I need help. This is my current location.',
    soundEnabled: true,
    vibrationEnabled: true,
    telegramBotToken: null,
    enableTelegram: false,
    smsWebhookUrl: null,
    enableSMS: false,
    emailWebhookUrl: null,
    enableEmail: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
};

// In-memory settings for demo mode
let demoSettings = { ...DEMO_USER.settings };

// GET - Fetch user settings
export async function GET() {
  // Demo mode
  if (!isDatabaseAvailable()) {
    return NextResponse.json({
      user: {
        ...DEMO_USER,
        settings: demoSettings,
      },
      demo: true,
    });
  }

  try {
    const userId = 'default_user';

    let user = await db!.user.findUnique({
      where: { id: userId },
      include: { settings: true },
    });

    if (!user) {
      user = await db!.user.create({
        data: {
          id: userId,
          name: 'User',
          settings: {
            create: {
              autoShareLocation: true,
              alertMessage: 'EMERGENCY! I need help. This is my current location.',
              soundEnabled: true,
              vibrationEnabled: true,
              enableTelegram: false,
              enableSMS: false,
              enableEmail: false,
            },
          },
        },
        include: { settings: true },
      });
    } else if (!user.settings) {
      await db!.userSettings.create({
        data: {
          userId,
          autoShareLocation: true,
          alertMessage: 'EMERGENCY! I need help. This is my current location.',
          soundEnabled: true,
          vibrationEnabled: true,
        },
      });
      user = await db!.user.findUnique({
        where: { id: userId },
        include: { settings: true },
      });
    }

    return NextResponse.json({ user });
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json({ error: 'Failed to fetch user' }, { status: 500 });
  }
}

// PUT - Update user settings
export async function PUT(request: NextRequest) {
  const body = await request.json();
  const { name, phone, email, settings } = body;

  // Demo mode
  if (!isDatabaseAvailable()) {
    // Update in-memory settings
    if (settings) {
      demoSettings = {
        ...demoSettings,
        ...settings,
        updatedAt: new Date().toISOString(),
      };
    }

    return NextResponse.json({
      user: {
        ...DEMO_USER,
        name: name || DEMO_USER.name,
        phone: phone || DEMO_USER.phone,
        email: email || DEMO_USER.email,
        settings: demoSettings,
      },
      demo: true,
      message: 'Demo mode - settings not persisted',
    });
  }

  try {
    const userId = 'default_user';

    // Update user info
    if (name || phone || email) {
      await db!.user.update({
        where: { id: userId },
        data: {
          ...(name && { name }),
          ...(phone && { phone }),
          ...(email && { email }),
        },
      });
    }

    // Update settings
    if (settings) {
      const dbSettings: Record<string, unknown> = {};

      if (settings.alertMessage !== undefined) dbSettings.alertMessage = settings.alertMessage;
      if (settings.autoShareLocation !== undefined) dbSettings.autoShareLocation = settings.autoShareLocation;
      if (settings.soundEnabled !== undefined) dbSettings.soundEnabled = settings.soundEnabled;
      if (settings.vibrationEnabled !== undefined) dbSettings.vibrationEnabled = settings.vibrationEnabled;
      if (settings.telegramBotToken !== undefined) dbSettings.telegramBotToken = settings.telegramBotToken;
      if (settings.enableTelegram !== undefined) dbSettings.enableTelegram = settings.enableTelegram;
      if (settings.smsWebhookUrl !== undefined) dbSettings.smsWebhookUrl = settings.smsWebhookUrl;
      if (settings.enableSMS !== undefined) dbSettings.enableSMS = settings.enableSMS;
      if (settings.emailWebhookUrl !== undefined) dbSettings.emailWebhookUrl = settings.emailWebhookUrl;
      if (settings.enableEmail !== undefined) dbSettings.enableEmail = settings.enableEmail;

      await db!.userSettings.upsert({
        where: { userId },
        update: dbSettings,
        create: {
          userId,
          ...dbSettings,
        },
      });
    }

    const user = await db!.user.findUnique({
      where: { id: userId },
      include: { settings: true },
    });

    return NextResponse.json({ user });
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}
