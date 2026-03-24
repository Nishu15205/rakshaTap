'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, 
  Edit2, 
  Trash2, 
  Phone, 
  Mail, 
  Star, 
  User, 
  Users, 
  Heart,
  Briefcase,
  MessageSquare,
  MessageCircle,
  PhoneCall,
  Check,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useRakshaStore, EmergencyContact } from '@/store/raksha-store';
import { audioService } from '@/lib/audio';
import { cn } from '@/lib/utils';

// Format phone with +91 for India
function formatIndianPhone(phone: string): string {
  let cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('0')) cleaned = cleaned.substring(1);
  if (cleaned.startsWith('91') && cleaned.length === 12) cleaned = cleaned.substring(2);
  if (cleaned.length === 10) return `+91${cleaned}`;
  return phone.startsWith('+') ? phone : `+${cleaned}`;
}

const relationshipOptions = [
  { value: 'parent', label: 'Parent', icon: Heart },
  { value: 'sibling', label: 'Sibling', icon: Users },
  { value: 'spouse', label: 'Spouse', icon: Heart },
  { value: 'friend', label: 'Friend', icon: Users },
  { value: 'colleague', label: 'Colleague', icon: Briefcase },
  { value: 'other', label: 'Other', icon: User },
];

interface ContactFormData {
  name: string;
  phone: string;
  email: string;
  relationship: string;
  isPrimary: boolean;
}

const initialFormData: ContactFormData = {
  name: '',
  phone: '',
  email: '',
  relationship: 'other',
  isPrimary: false,
};

interface ContactFormProps {
  contact?: EmergencyContact;
  onSubmit: (data: ContactFormData) => void;
  onCancel: () => void;
}

function ContactForm({ contact, onSubmit, onCancel }: ContactFormProps) {
  const [formData, setFormData] = useState<ContactFormData>(
    contact
      ? {
          name: contact.name,
          phone: contact.phone,
          email: contact.email || '',
          relationship: contact.relationship || 'other',
          isPrimary: contact.isPrimary,
        }
      : initialFormData
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Auto-format phone with +91
  const handlePhoneBlur = () => {
    if (formData.phone && !formData.phone.startsWith('+')) {
      setFormData({ ...formData, phone: formatIndianPhone(formData.phone) });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    // Format phone before submitting
    const formattedData = {
      ...formData,
      phone: formatIndianPhone(formData.phone),
    };
    await onSubmit(formattedData);
    setIsSubmitting(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-sm text-zinc-400 mb-1 block">Name *</label>
        <Input
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="Contact name (e.g., Mom, Dad)"
          className="bg-zinc-800 border-zinc-700 text-white"
          required
        />
      </div>

      <div>
        <label className="text-sm text-zinc-400 mb-1 block">Phone Number * (India +91 auto-added)</label>
        <Input
          value={formData.phone}
          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          onBlur={handlePhoneBlur}
          placeholder="9876543210 or +91 9876543210"
          className="bg-zinc-800 border-zinc-700 text-white"
          type="tel"
          required
        />
        <p className="text-xs text-zinc-500 mt-1">
          10 digit number will auto-format to +91 XXXXXXXXXX
        </p>
      </div>

      <div>
        <label className="text-sm text-zinc-400 mb-1 block">Email (Optional)</label>
        <Input
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          placeholder="email@example.com"
          className="bg-zinc-800 border-zinc-700 text-white"
          type="email"
        />
      </div>

      <div>
        <label className="text-sm text-zinc-400 mb-1 block">Relationship</label>
        <Select
          value={formData.relationship}
          onValueChange={(value) => setFormData({ ...formData, relationship: value })}
        >
          <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
            <SelectValue placeholder="Select relationship" />
          </SelectTrigger>
          <SelectContent className="bg-zinc-800 border-zinc-700">
            {relationshipOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                <div className="flex items-center gap-2">
                  <option.icon className="w-4 h-4" />
                  {option.label}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="isPrimary"
          checked={formData.isPrimary}
          onChange={(e) => setFormData({ ...formData, isPrimary: e.target.checked })}
          className="w-4 h-4 rounded border-zinc-700 bg-zinc-800"
        />
        <label htmlFor="isPrimary" className="text-sm text-zinc-400">
          Mark as primary emergency contact
        </label>
      </div>

      <div className="flex gap-3 pt-2">
        <Button
          type="button"
          variant="outline"
          className="flex-1 border-zinc-700 text-white hover:bg-zinc-800"
          onClick={onCancel}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          className="flex-1 bg-red-600 hover:bg-red-700"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Saving...' : contact ? 'Update' : 'Add Contact'}
        </Button>
      </div>
    </form>
  );
}

// Contact action state tracking
interface ContactActionState {
  calling: boolean;
  smsSent: boolean;
  smsSending: boolean;
  whatsappOpened: boolean;
}

interface ContactsPanelProps {
  className?: string;
}

export function ContactsPanel({ className }: ContactsPanelProps) {
  const { contacts, addContact, updateContact, removeContact, currentLocation } = useRakshaStore();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<EmergencyContact | undefined>();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [contactActions, setContactActions] = useState<Record<string, ContactActionState>>({});

  // Generate emergency message
  const getEmergencyMessage = () => {
    const mapsUrl = currentLocation 
      ? `https://www.google.com/maps?q=${currentLocation.latitude},${currentLocation.longitude}`
      : '';
    return `🚨 EMERGENCY! I need help!
📍 Location: ${mapsUrl}
📅 Time: ${new Date().toLocaleString()}
- RakshaTap Safety App`;
  };

  // Make direct call using universal tel: link
  const makeDirectCall = (contactId: string, contactName: string, phone: string) => {
    const formattedPhone = formatIndianPhone(phone);
    const telUrl = `tel:${formattedPhone}`;
    
    setContactActions(prev => ({
      ...prev,
      [contactId]: { ...prev[contactId], calling: true }
    }));
    
    // Universal tel: link works on mobile, shows prompt on desktop
    window.location.href = telUrl;
    audioService.speakEmergency(`Calling ${contactName}`);
    
    setTimeout(() => {
      setContactActions(prev => ({
        ...prev,
        [contactId]: { ...prev[contactId], calling: false }
      }));
    }, 3000);
  };

  // Send direct SMS using universal sms: link
  const sendDirectSMS = async (contactId: string, contactName: string, phone: string) => {
    const formattedPhone = formatIndianPhone(phone);
    const message = getEmergencyMessage();
    
    setContactActions(prev => ({
      ...prev,
      [contactId]: { ...prev[contactId], smsSending: true }
    }));

    // Try SMS API first
    try {
      const response = await fetch('/api/sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: formattedPhone,
          message,
          latitude: currentLocation?.latitude,
          longitude: currentLocation?.longitude,
        }),
      });
      
      const data = await response.json();
      
      // Open the universal SMS link
      if (data.universalLinks?.sms) {
        window.location.href = data.universalLinks.sms;
      } else {
        // Fallback to direct SMS link
        const smsUrl = `sms:${formattedPhone}?body=${encodeURIComponent(message)}`;
        window.location.href = smsUrl;
      }
    } catch {
      // Fallback to direct SMS link
      const smsUrl = `sms:${formattedPhone}?body=${encodeURIComponent(message)}`;
      window.location.href = smsUrl;
    }
    
    setContactActions(prev => ({
      ...prev,
      [contactId]: { ...prev[contactId], smsSending: false, smsSent: true }
    }));
    
    audioService.speakEmergency(`Opening SMS to ${contactName}`);
  };

  // Send via WhatsApp
  const sendViaWhatsApp = (contactId: string, contactName: string, phone: string) => {
    const formattedPhone = formatIndianPhone(phone).replace('+', '');
    const message = getEmergencyMessage();
    const whatsappUrl = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`;
    
    setContactActions(prev => ({
      ...prev,
      [contactId]: { ...prev[contactId], whatsappOpened: true }
    }));
    
    window.open(whatsappUrl, '_blank');
    audioService.speakEmergency(`Opening WhatsApp for ${contactName}`);
  };

  const handleAddContact = async (data: ContactFormData) => {
    const newContact: EmergencyContact = {
      id: `contact_${Date.now()}`,
      name: data.name,
      phone: data.phone,
      email: data.email,
      relationship: data.relationship,
      isPrimary: data.isPrimary,
      priority: contacts.length,
    };

    if (data.isPrimary) {
      contacts.forEach((c) => {
        if (c.isPrimary) {
          updateContact(c.id, { isPrimary: false });
        }
      });
    }

    addContact(newContact);
    setIsDialogOpen(false);
  };

  const handleUpdateContact = async (data: ContactFormData) => {
    if (!editingContact) return;

    if (data.isPrimary) {
      contacts.forEach((c) => {
        if (c.isPrimary && c.id !== editingContact.id) {
          updateContact(c.id, { isPrimary: false });
        }
      });
    }

    updateContact(editingContact.id, {
      name: data.name,
      phone: data.phone,
      email: data.email,
      relationship: data.relationship,
      isPrimary: data.isPrimary,
    });
    setEditingContact(undefined);
    setIsDialogOpen(false);
  };

  const handleDeleteContact = async (id: string) => {
    setDeletingId(id);
    await new Promise((resolve) => setTimeout(resolve, 300));
    removeContact(id);
    setDeletingId(null);
  };

  const getRelationshipIcon = (relationship?: string) => {
    const option = relationshipOptions.find((o) => o.value === relationship);
    const Icon = option?.icon || User;
    return <Icon className="w-4 h-4" />;
  };

  const sortedContacts = [...contacts].sort((a, b) => {
    if (a.isPrimary) return -1;
    if (b.isPrimary) return 1;
    return a.priority - b.priority;
  });

  return (
    <Card className={cn('bg-zinc-900 border-zinc-800', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-white flex items-center gap-2 text-base">
            <Users className="w-5 h-5 text-red-500" />
            Emergency Contacts
          </CardTitle>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button
                size="sm"
                className="bg-red-600 hover:bg-red-700"
                onClick={() => {
                  setEditingContact(undefined);
                  setIsDialogOpen(true);
                }}
              >
                <Plus className="w-4 h-4 mr-1" />
                Add
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-zinc-900 border-zinc-800 text-white">
              <DialogHeader>
                <DialogTitle>
                  {editingContact ? 'Edit Contact' : 'Add Emergency Contact'}
                </DialogTitle>
              </DialogHeader>
              <ContactForm
                contact={editingContact}
                onSubmit={editingContact ? handleUpdateContact : handleAddContact}
                onCancel={() => {
                  setIsDialogOpen(false);
                  setEditingContact(undefined);
                }}
              />
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 max-h-80 overflow-y-auto">
        {contacts.length === 0 ? (
          <div className="text-center py-8">
            <Users className="w-12 h-12 text-zinc-700 mx-auto mb-3" />
            <p className="text-zinc-500 text-sm">No emergency contacts added</p>
            <p className="text-zinc-600 text-xs mt-1">
              Add contacts to notify in emergencies
            </p>
          </div>
        ) : (
          <AnimatePresence>
            {sortedContacts.map((contact) => (
              <motion.div
                key={contact.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className={cn(
                  'flex flex-col gap-2 p-3 rounded-lg transition-all',
                  'bg-zinc-800/50 hover:bg-zinc-800',
                  deletingId === contact.id && 'opacity-50'
                )}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center text-white font-bold">
                    {contact.name.charAt(0).toUpperCase()}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-white text-sm font-medium truncate">{contact.name}</p>
                      {contact.isPrimary && (
                        <Badge variant="outline" className="text-xs bg-amber-950 border-amber-700 text-amber-400">
                          <Star className="w-3 h-3 mr-1" />
                          Primary
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-zinc-500 text-xs">
                      <Phone className="w-3 h-3" />
                      <span>{formatIndianPhone(contact.phone)}</span>
                      {contact.relationship && (
                        <>
                          <span>•</span>
                          <span className="capitalize">{contact.relationship}</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-zinc-500 hover:text-white hover:bg-zinc-700"
                      onClick={() => {
                        setEditingContact(contact);
                        setIsDialogOpen(true);
                      }}
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-zinc-500 hover:text-red-400 hover:bg-zinc-700"
                      onClick={() => handleDeleteContact(contact.id)}
                      disabled={deletingId === contact.id}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                
                {/* Quick Action Buttons */}
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className={cn(
                      'flex-1 h-8 text-xs transition-all',
                      contactActions[contact.id]?.calling
                        ? 'border-green-400 text-green-300 bg-green-950'
                        : 'border-green-700 text-green-400 hover:bg-green-950'
                    )}
                    onClick={() => makeDirectCall(contact.id, contact.name, contact.phone)}
                    disabled={contactActions[contact.id]?.calling}
                  >
                    {contactActions[contact.id]?.calling ? (
                      <>
                        <PhoneCall className="w-3 h-3 mr-1 animate-pulse" />
                        Calling...
                      </>
                    ) : (
                      <>
                        <Phone className="w-3 h-3 mr-1" />
                        Call
                      </>
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className={cn(
                      'flex-1 h-8 text-xs transition-all',
                      contactActions[contact.id]?.smsSent
                        ? 'border-blue-400 text-blue-300 bg-blue-950'
                        : 'border-blue-700 text-blue-400 hover:bg-blue-950'
                    )}
                    onClick={() => sendDirectSMS(contact.id, contact.name, contact.phone)}
                    disabled={contactActions[contact.id]?.smsSending}
                  >
                    {contactActions[contact.id]?.smsSending ? (
                      <>
                        <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                        Sending
                      </>
                    ) : contactActions[contact.id]?.smsSent ? (
                      <>
                        <Check className="w-3 h-3 mr-1" />
                        Opened
                      </>
                    ) : (
                      <>
                        <MessageSquare className="w-3 h-3 mr-1" />
                        SMS
                      </>
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className={cn(
                      'h-8 text-xs transition-all',
                      contactActions[contact.id]?.whatsappOpened
                        ? 'border-green-400 text-green-300 bg-green-950'
                        : 'border-green-700 text-green-400 hover:bg-green-950'
                    )}
                    onClick={() => sendViaWhatsApp(contact.id, contact.name, contact.phone)}
                  >
                    {contactActions[contact.id]?.whatsappOpened ? (
                      <Check className="w-3 h-3" />
                    ) : (
                      <MessageCircle className="w-3 h-3" />
                    )}
                  </Button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </CardContent>
    </Card>
  );
}
