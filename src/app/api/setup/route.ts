import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// Setup endpoint to initialize demo data
export async function POST() {
  try {
    const userId = 'default_user';

    // Create default user if not exists
    let user = await db.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      user = await db.user.create({
        data: {
          id: userId,
          name: 'User',
        },
      });
    }

    // Create settings if missing
    const existingSettings = await db.userSettings.findUnique({
      where: { userId },
    });

    if (!existingSettings) {
      await db.userSettings.create({
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
    const existingContacts = await db.emergencyContact.count({
      where: { userId },
    });

    if (existingContacts === 0) {
      await db.emergencyContact.createMany({
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
