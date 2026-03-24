import { NextRequest, NextResponse } from 'next/server';
import { db, isDatabaseAvailable } from '@/lib/db';

// GET - Fetch a single contact
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Demo mode
  if (!isDatabaseAvailable()) {
    return NextResponse.json({
      contact: {
        id,
        name: 'Demo Contact',
        phone: '+91 9876543210',
        email: null,
        telegramChatId: null,
        relationship: 'other',
        isPrimary: false,
        priority: 0,
      },
      demo: true,
    });
  }

  try {
    const contact = await db!.emergencyContact.findUnique({
      where: { id },
    });

    if (!contact) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
    }

    return NextResponse.json({ contact });
  } catch (error) {
    console.error('Error fetching contact:', error);
    return NextResponse.json({ error: 'Failed to fetch contact' }, { status: 500 });
  }
}

// PUT - Update a contact
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const { name, phone, email, relationship, isPrimary } = body;

  // Demo mode
  if (!isDatabaseAvailable()) {
    return NextResponse.json({
      contact: {
        id,
        name: name || 'Demo Contact',
        phone: phone || '+91 9876543210',
        email: email || null,
        telegramChatId: null,
        relationship: relationship || 'other',
        isPrimary: isPrimary || false,
        priority: 0,
      },
      demo: true,
      message: 'Demo mode - contact not persisted',
    });
  }

  try {
    const userId = 'default_user';

    // If setting as primary, remove primary from others
    if (isPrimary) {
      await db!.emergencyContact.updateMany({
        where: { userId, NOT: { id } },
        data: { isPrimary: false },
      });
    }

    const contact = await db!.emergencyContact.update({
      where: { id },
      data: {
        name,
        phone,
        email,
        relationship,
        isPrimary,
        telegramChatId: null,
      },
    });

    return NextResponse.json({ contact });
  } catch (error) {
    console.error('Error updating contact:', error);
    return NextResponse.json({ error: 'Failed to update contact' }, { status: 500 });
  }
}

// DELETE - Delete a contact
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Demo mode
  if (!isDatabaseAvailable()) {
    return NextResponse.json({
      success: true,
      demo: true,
      message: 'Demo mode - contact deleted from session only',
    });
  }

  try {
    await db!.emergencyContact.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting contact:', error);
    return NextResponse.json({ error: 'Failed to delete contact' }, { status: 500 });
  }
}
