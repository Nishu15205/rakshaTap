import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET - Fetch all contacts
export async function GET() {
  try {
    const userId = 'default_user';
    const contacts = await db.emergencyContact.findMany({
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
  try {
    const userId = 'default_user';
    const body = await request.json();
    const { name, phone, email, relationship, telegramChatId, isPrimary } = body;

    // If setting as primary, remove primary from others
    if (isPrimary) {
      await db.emergencyContact.updateMany({
        where: { userId },
        data: { isPrimary: false },
      });
    }

    // Get count for priority
    const count = await db.emergencyContact.count({ where: { userId } });

    const contact = await db.emergencyContact.create({
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
