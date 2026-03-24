import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { generateEmergencyMessage, generateSMSUrl, generateTelUrl, generateWhatsAppUrl } from '@/lib/notifications';

// GET - Fetch all alerts
export async function GET() {
  try {
    const alerts = await db.alert.findMany({
      orderBy: { createdAt: 'desc' },
      include: { contact: true },
      take: 50,
    });
    return NextResponse.json({ alerts });
  } catch (error) {
    console.error('Error fetching alerts:', error);
    return NextResponse.json({ error: 'Failed to fetch alerts' }, { status: 500 });
  }
}

// POST - Create a new alert (SOS triggered)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { latitude, longitude, address, accuracy, userId = 'default_user', message } = body;

    // Get user settings
    const userSettings = await db.userSettings.findUnique({
      where: { userId },
    });

    // Get all emergency contacts
    const contacts = await db.emergencyContact.findMany({
      where: { userId },
      orderBy: [{ isPrimary: 'desc' }, { priority: 'asc' }],
    });

    // Get user info
    const user = await db.user.findUnique({
      where: { id: userId },
    });

    const defaultMessage = userSettings?.alertMessage || 'EMERGENCY! I need help. This is my current location.';
    const alertMessage = message || defaultMessage;

    // Generate full emergency message
    const fullMessage = generateEmergencyMessage(
      user?.name || 'User',
      alertMessage,
      latitude,
      longitude
    );

    // If no contacts, still create an alert
    if (contacts.length === 0) {
      const alert = await db.alert.create({
        data: {
          userId,
          latitude,
          longitude,
          address,
          accuracy,
          message: alertMessage,
          status: 'sent',
          notificationType: 'none',
        },
      });

      return NextResponse.json({
        success: true,
        alertsCount: 1,
        deliveredCount: 0,
        sentCount: 1,
        results: [],
        message: 'No contacts configured. Add emergency contacts to send alerts.',
      });
    }

    // Create alert records for each contact and prepare notification URLs
    const alertResults = [];
    let deliveredCount = 0;
    let sentCount = 0;

    for (const contact of contacts) {
      // Generate notification URLs for native apps
      const smsUrl = generateSMSUrl(contact.phone, fullMessage);
      const telUrl = generateTelUrl(contact.phone);
      const whatsappUrl = `https://wa.me/${contact.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(fullMessage)}`;

      // Determine status - native SMS is always available
      const status = 'sent'; // Will be delivered when user taps SMS button
      sentCount++;

      // Create alert record
      const alert = await db.alert.create({
        data: {
          userId,
          contactId: contact.id,
          latitude,
          longitude,
          address,
          accuracy,
          message: alertMessage,
          status,
          notificationType: 'native_sms',
          notificationId: `native_${Date.now()}_${contact.id}`,
        },
      });

      alertResults.push({
        alert,
        contact: {
          id: contact.id,
          name: contact.name,
          phone: contact.phone,
          isPrimary: contact.isPrimary,
        },
        smsUrl,
        telUrl,
        whatsappUrl,
      });
    }

    return NextResponse.json({
      success: true,
      alertsCount: contacts.length,
      deliveredCount,
      sentCount,
      results: alertResults.map(r => ({
        contact: r.contact.name,
        alertId: r.alert.id,
        status: r.alert.status,
        notifications: {
          sms: { success: true, native: true, url: r.smsUrl },
          call: { url: r.telUrl },
          whatsapp: { url: r.whatsappUrl },
        },
      })),
      primaryContact: contacts.find(c => c.isPrimary) ? {
        name: contacts.find(c => c.isPrimary)?.name,
        phone: contacts.find(c => c.isPrimary)?.phone,
        smsUrl: generateSMSUrl(contacts.find(c => c.isPrimary)!.phone, fullMessage),
        telUrl: generateTelUrl(contacts.find(c => c.isPrimary)!.phone),
      } : contacts[0] ? {
        name: contacts[0].name,
        phone: contacts[0].phone,
        smsUrl: generateSMSUrl(contacts[0].phone, fullMessage),
        telUrl: generateTelUrl(contacts[0].phone),
      } : null,
      message: `Emergency prepared for ${contacts.length} contacts. Tap SMS or Call to notify them!`,
    });
  } catch (error) {
    console.error('Error creating alert:', error);
    return NextResponse.json({ error: 'Failed to create alert', details: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}
