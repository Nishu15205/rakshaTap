import { NextResponse } from 'next/server';
import { db, isDatabaseAvailable } from '@/lib/db';

// Demo data for when database is not available
const DEMO_USER = {
  id: 'default_user',
  name: 'User',
  phone: null,
  email: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const DEMO_SETTINGS = {
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
  createdAt: new Date(),
  updatedAt: new Date(),
};

const DEMO_CONTACTS = [
  {
    id: '1',
    userId: 'default_user',
    name: 'Mom',
    phone: '+91 9876543210',
    email: null,
    telegramChatId: null,
    relationship: 'parent',
    isPrimary: true,
    priority: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: '2',
    userId: 'default_user',
    name: 'Dad',
    phone: '+91 9876543211',
    email: null,
    telegramChatId: null,
    relationship: 'parent',
    isPrimary: false,
    priority: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: '3',
    userId: 'default_user',
    name: 'Best Friend',
    phone: '+91 9876543212',
    email: 'friend@example.com',
    telegramChatId: null,
    relationship: 'friend',
    isPrimary: false,
    priority: 2,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

// Setup endpoint to initialize demo data
export async function POST() {
  // If no database, return demo data
  if (!isDatabaseAvailable()) {
    return NextResponse.json({
      success: true,
      message: 'Demo mode - no database configured',
      demo: true,
    });
  }

  try {
    const userId = 'default_user';

    // Create default user if not exists
    let user = await db!.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      user = await db!.user.create({
        data: {
          id: userId,
          name: 'User',
        },
      });
    }

    // Create settings if missing
    const existingSettings = await db!.userSettings.findUnique({
      where: { userId },
    });

    if (!existingSettings) {
      await db!.userSettings.create({
        data: {
          userId,
          autoShareLocation: true,
          alertMessage: 'EMERGENCY! I need help. This is my current location.',
          soundEnabled: true,
          vibrationEnabled: true,
        },
      });
    }

    // Create some demo contacts if none exist
    const existingContacts = await db!.emergencyContact.count({
      where: { userId },
    });

    if (existingContacts === 0) {
      await db!.emergencyContact.createMany({
        data: [
          {
            userId,
            name: 'Mom',
            phone: '+91 9876543210',
            relationship: 'parent',
            isPrimary: true,
            priority: 0,
          },
          {
            userId,
            name: 'Dad',
            phone: '+91 9876543211',
            relationship: 'parent',
            isPrimary: false,
            priority: 1,
          },
          {
            userId,
            name: 'Best Friend',
            phone: '+91 9876543212',
            email: 'friend@example.com',
            relationship: 'friend',
            isPrimary: false,
            priority: 2,
          },
        ],
      });
    }

    return NextResponse.json({ success: true, message: 'Setup complete' });
  } catch (error) {
    console.error('Error in setup:', error);
    return NextResponse.json({ error: 'Setup failed' }, { status: 500 });
  }
}

// GET endpoint to check database status
export async function GET() {
  const dbAvailable = isDatabaseAvailable();

  return NextResponse.json({
    database: dbAvailable ? 'connected' : 'demo_mode',
    demoData: dbAvailable ? null : {
      user: DEMO_USER,
      settings: DEMO_SETTINGS,
      contacts: DEMO_CONTACTS,
    },
  });
}
