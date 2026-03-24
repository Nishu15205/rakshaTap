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
  MessageCircle,
  HelpCircle,
  Check,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useRakshaStore, EmergencyContact } from '@/store/raksha-store';
import { cn } from '@/lib/utils';

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
  telegramChatId: string;
}

const initialFormData: ContactFormData = {
  name: '',
  phone: '',
  email: '',
  relationship: 'other',
  isPrimary: false,
  telegramChatId: '',
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
          telegramChatId: (contact as EmergencyContact & { telegramChatId?: string }).telegramChatId || '',
        }
      : initialFormData
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    await onSubmit(formData);
    setIsSubmitting(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-sm text-zinc-400 mb-1 block">Name *</label>
        <Input
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="Contact name"
          className="bg-zinc-800 border-zinc-700 text-white"
          required
        />
      </div>

      <div>
        <label className="text-sm text-zinc-400 mb-1 block">Phone Number *</label>
        <Input
          value={formData.phone}
          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          placeholder="+91 9876543210"
          className="bg-zinc-800 border-zinc-700 text-white"
          type="tel"
          required
        />
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
        <div className="flex items-center gap-2 mb-1">
          <label className="text-sm text-zinc-400">Telegram Chat ID</label>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <HelpCircle className="w-3 h-3 text-zinc-500" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p>Get your Chat ID by messaging @userinfobot on Telegram. This enables real-time alerts!</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <Input
          value={formData.telegramChatId}
          onChange={(e) => setFormData({ ...formData, telegramChatId: e.target.value })}
          placeholder="123456789"
          className="bg-zinc-800 border-zinc-700 text-white"
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

interface ContactsPanelProps {
  className?: string;
}

export function ContactsPanel({ className }: ContactsPanelProps) {
  const { contacts, setContacts, addContact, updateContact, removeContact } = useRakshaStore();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<EmergencyContact | undefined>();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleAddContact = async (data: ContactFormData) => {
    try {
      const response = await fetch('/api/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          userId: 'default_user',
        }),
      });
      
      if (response.ok) {
        const result = await response.json();
        addContact({
          id: result.contact.id,
          name: result.contact.name,
          phone: result.contact.phone,
          email: result.contact.email || undefined,
          relationship: result.contact.relationship || undefined,
          isPrimary: result.contact.isPrimary,
          priority: result.contact.priority,
        });
      }
    } catch (error) {
      console.error('Error adding contact:', error);
    }
    setIsDialogOpen(false);
  };

  const handleUpdateContact = async (data: ContactFormData) => {
    if (!editingContact) return;

    try {
      const response = await fetch(`/api/contacts/${editingContact.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      
      if (response.ok) {
        updateContact(editingContact.id, {
          name: data.name,
          phone: data.phone,
          email: data.email,
          relationship: data.relationship,
          isPrimary: data.isPrimary,
        });
      }
    } catch (error) {
      console.error('Error updating contact:', error);
    }
    setEditingContact(undefined);
    setIsDialogOpen(false);
  };

  const handleDeleteContact = async (id: string) => {
    setDeletingId(id);
    try {
      await fetch(`/api/contacts/${id}`, { method: 'DELETE' });
      removeContact(id);
    } catch (error) {
      console.error('Error deleting contact:', error);
    }
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
            <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-md">
              <DialogHeader>
                <DialogTitle>
                  {editingContact ? 'Edit Contact' : 'Add Emergency Contact'}
                </DialogTitle>
                <DialogDescription className="text-zinc-400">
                  Add contacts who will receive emergency alerts. For Telegram alerts, add their Chat ID.
                </DialogDescription>
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
                  'flex items-center gap-3 p-3 rounded-lg transition-all',
                  'bg-zinc-800/50 hover:bg-zinc-800',
                  deletingId === contact.id && 'opacity-50'
                )}
              >
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
                    <span>{contact.phone}</span>
                    {contact.relationship && (
                      <>
                        <span>•</span>
                        <span className="capitalize">{contact.relationship}</span>
                      </>
                    )}
                  </div>
                  {(contact as EmergencyContact & { telegramChatId?: string }).telegramChatId && (
                    <div className="flex items-center gap-1 text-blue-400 text-xs mt-1">
                      <MessageCircle className="w-3 h-3" />
                      <span>Telegram enabled</span>
                      <Check className="w-3 h-3" />
                    </div>
                  )}
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
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </CardContent>
    </Card>
  );
}
