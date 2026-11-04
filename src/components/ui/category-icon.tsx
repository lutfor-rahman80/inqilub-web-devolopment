import {
  BookHeart, BookOpen, Droplet, Gift, GraduationCap, HandHeart, HeartHandshake,
  LifeBuoy, Megaphone, MoonStar, Shirt, Stethoscope, Trophy, type LucideIcon,
} from "lucide-react";

/** Icon names stored in activity_categories.icon → components. */
export const CATEGORY_ICONS: Record<string, LucideIcon> = {
  "hand-heart": HandHeart,
  "life-buoy": LifeBuoy,
  droplet: Droplet,
  "graduation-cap": GraduationCap,
  "book-open": BookOpen,
  "moon-star": MoonStar,
  shirt: Shirt,
  stethoscope: Stethoscope,
  megaphone: Megaphone,
  trophy: Trophy,
  "book-heart": BookHeart,
  gift: Gift,
  "heart-handshake": HeartHandshake,
};

export function CategoryIcon({ name, className = "size-6" }: { name: string; className?: string }) {
  const Icon = CATEGORY_ICONS[name] ?? HeartHandshake;
  return <Icon className={className} aria-hidden="true" />;
}
