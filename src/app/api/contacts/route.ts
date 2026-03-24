import { NextRequest, NextResponse } from 'next/server';
import { db, isDatabaseAvailable } from '@/lib/db';

// Demo contacts for when database is not available
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
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
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
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
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
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

// GET - Fetch all contacts
export async function GET() {
  // Demo mode - return demo contacts
  if (!isDatabaseAvailable()) {
    return NextResponse.json({
      contacts: DEMO_CONTACTS,
      demo: true,
      message: 'Demo mode - contacts stored locally',
    });
  }

  try {
    const userId = 'default_user';
    const contacts = await db!.emergencyContact.findMany({
      where: { userId },
      orderBy: [{ isPrimary: 'desc' }, { priority: 'asc' }],
    });
    return NextResponse.json({ contacts });
  } catch (error) {
    console.error('Error fetching contacts:', error);
    return NextResponse.json({ error: 'Failed to fetch contacts' }, { status: 500 });
  }
}

// POST - Create a new contact
export async function POST(request: NextRequest) {
  // Demo mode
  if (!isDatabaseAvailable()) {
    const body = await request.json();
    const { name, phone, email, relationship } = body;

    const newContact = {
      id: Date.now().toString(),
      userId: 'default_user',
      name,
      phone,
      email: email || null,
      telegramChatId: null,
      relationship: relationship || 'other',
      isPrimary: false,
      priority: DEMO_CONTACTS.length,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    return NextResponse.json({
      contact: newContact,
      demo: true,
      message: 'Demo mode - contact saved to browser storage only',
    });
  }

  try {
    const userId = 'default_user';
    const body = await request.json();
    const { name, phone, email, relationship, telegramChatId, isPrimary } = body;

    // If setting as primary, remove primary from others
    if (isPrimary) {
      await db!.emergencyContact.updateMany({
        where: { userId },
        data: { isPrimary: false },
      });
    }

    // Get count for priority
    const count = await db!.emergencyContact.count({ where: { userId } });

    const contact = await db!.emergencyContact.create({
      data: {
        userId,
        name,
        phone,
        email: email || null,
        relationship: relationship || 'other',
        telegramChatId: telegramChatId || null,
        isPrimary: isPrimary || false,
        priority: count,
      },
    });

    return NextResponse.json({ contact });
  } catch (error) {
    console.error('Error creating contact:', error);
    return NextResponse.json({ error: 'Failed to create contact' }, { status: 500 });
  }
}
