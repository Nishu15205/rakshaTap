import { NextRequest, NextResponse } from 'next/server';
import { db, isDatabaseAvailable } from '@/lib/db';
import { generateEmergencyMessage, generateSMSUrl, generateTelUrl } from '@/lib/notifications';

// Demo contacts for demo mode
const DEMO_CONTACTS = [
  { id: '1', name: 'Mom', phone: '+91 9876543210', isPrimary: true },
  { id: '2', name: 'Dad', phone: '+91 9876543211', isPrimary: false },
  { id: '3', name: 'Best Friend', phone: '+91 9876543212', isPrimary: false },
];

// Demo alerts storage
let demoAlerts: Array<{
  id: string;
  latitude: number;
  longitude: number;
  address?: string;
  status: string;
  createdAt: string;
}> = [];

// GET - Fetch all alerts
export async function GET() {
  // Demo mode
  if (!isDatabaseAvailable()) {
    return NextResponse.json({
      alerts: demoAlerts,
      demo: true,
    });
  }

  try {
    const alerts = await db!.alert.findMany({
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
  const body = await request.json();
  const { latitude, longitude, address, accuracy, userId = 'default_user', message } = body;

  const defaultMessage = 'EMERGENCY! I need help. This is my current location.';
  const alertMessage = message || defaultMessage;

  // Generate full emergency message
  const fullMessage = generateEmergencyMessage('User', alertMessage, latitude, longitude);

  // Demo mode
  if (!isDatabaseAvailable()) {
    const newAlert = {
      id: Date.now().toString(),
      latitude,
      longitude,
      address,
      status: 'sent',
      createdAt: new Date().toISOString(),
    };

    demoAlerts.unshift(newAlert);
    // Keep only last 20 alerts
    demoAlerts = demoAlerts.slice(0, 20);

    // Prepare notification URLs for demo contacts
    const alertResults = DEMO_CONTACTS.map(contact => ({
      contact: contact.name,
      alertId: Date.now().toString(),
      status: 'sent',
      notifications: {
        sms: {
          success: true,
          native: true,
          url: generateSMSUrl(contact.phone, fullMessage),
        },
        call: { url: generateTelUrl(contact.phone) },
        whatsapp: {
          url: `https://wa.me/${contact.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(fullMessage)}`,
        },
      },
    }));

    return NextResponse.json({
      success: true,
      alertsCount: DEMO_CONTACTS.length,
      deliveredCount: 0,
      sentCount: DEMO_CONTACTS.length,
      results: alertResults,
      demo: true,
      primaryContact: {
        name: DEMO_CONTACTS[0].name,
        phone: DEMO_CONTACTS[0].phone,
        smsUrl: generateSMSUrl(DEMO_CONTACTS[0].phone, fullMessage),
        telUrl: generateTelUrl(DEMO_CONTACTS[0].phone),
      },
      message: 'Demo mode - alerts not persisted. Tap SMS or Call to notify contacts!',
    });
  }

  try {
    // Get user settings
    const userSettings = await db!.userSettings.findUnique({
      where: { userId },
    });

    // Get all emergency contacts
    const contacts = await db!.emergencyContact.findMany({
      where: { userId },
      orderBy: [{ isPrimary: 'desc' }, { priority: 'asc' }],
    });

    // Get user info
    const user = await db!.user.findUnique({
      where: { id: userId },
    });

    const actualMessage = userSettings?.alertMessage || defaultMessage;

    // If no contacts, still create an alert
    if (contacts.length === 0) {
      const alert = await db!.alert.create({
        data: {
          userId,
          latitude,
          longitude,
          address,
          accuracy,
          message: actualMessage,
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

      const status = 'sent';
      sentCount++;

      // Create alert record
      const alert = await db!.alert.create({
        data: {
          userId,
          contactId: contact.id,
          latitude,
          longitude,
          address,
          accuracy,
          message: actualMessage,
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
