/**
 * PULSO Centralized Icon Taxonomy
 * ─────────────────────────────────────────────────────────────────────────────
 * Single source of truth for all icons across the PULSO Mobile App and Portal.
 * Rules:
 * - Lucide icons only. 2px outline stroke. No fills, gradients, or glows.
 * - One icon per concept, identical everywhere.
 * - Standard sizes: 20px (inline text), 24px (list/card), 32px (hero).
 * - Standard colors: white/slate for neutral, PULSO orange (#ff6b00) for active/primary,
 *   green (#22c55e) for resolved/confirmed, red/amber for warning/emergency. No teal.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React from 'react';
import {
  Camera,
  MapPin,
  Send,
  ArrowRight,
  Search,
  CheckCircle2,
  Phone,
  PhoneCall,
  Droplets,
  Lightbulb,
  Cone,
  AlertTriangle,
  Building2,
  Signpost,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  X,
  Clock,
  Check,
  History,
  Bell
} from 'lucide-react';

import { FlagPH, FlagUS } from '../components/FlagIcons';
export { FlagPH, FlagUS };

export const PULSO_CORE_ICONS = {
  // Primary reporting actions
  photo: Camera,
  category: Lightbulb,
  location: MapPin,
  send: ArrowRight,
  submit: Send,
  track: Search,
  resolved: CheckCircle2,
  emergency: Phone,
  emergencyCall: PhoneCall,

  // Navigation & utility
  updates: History,
  notifications: Bell,
  'language-ph': FlagPH,
  'language-us': FlagUS,
  back: ChevronLeft,
  next: ArrowRight,
  forward: ChevronRight,
  close: X,
  check: Check,
  time: Clock,
  warning: AlertTriangle,

  // Canonical Infrastructure Categories (identical in Tutorial, Quick Report, and Wizard)
  'Water Supply & Distribution': Droplets,
  'Power & Street Lighting': Lightbulb,
  'Roads & Bridges': Cone,
  'Public Safety & Hazards': AlertTriangle,
  'Public Buildings & Facilities': Building2,
  'Traffic & Road Signs': Signpost,
  'Others': MoreHorizontal
};

/**
 * Returns the standardized Lucide icon component for an action or category name.
 */
export function getPulsoIcon(nameOrCategory) {
  if (!nameOrCategory) return MoreHorizontal;
  return PULSO_CORE_ICONS[nameOrCategory] || PULSO_CORE_ICONS[nameOrCategory.trim()] || MoreHorizontal;
}
