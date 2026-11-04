import type { SocialPlatform } from "@/lib/site/urls";
import { FacebookIcon } from "@/components/ui/facebook-icon";

/**
 * Small, simplified brand marks for the social links (lucide has no brand
 * icons). Decorative: the visible platform name is the accessible label.
 */
type IconProps = { className?: string };

const base = (className = "size-5") => ({ viewBox: "0 0 24 24", className, "aria-hidden": true as const, focusable: "false" as const });

function YouTubeIcon({ className }: IconProps) {
  return (
    <svg {...base(className)} fill="currentColor">
      <path d="M23 7.2a3 3 0 0 0-2.1-2.1C19 4.6 12 4.6 12 4.6s-7 0-8.9.5A3 3 0 0 0 1 7.2 31 31 0 0 0 .5 12a31 31 0 0 0 .5 4.8 3 3 0 0 0 2.1 2.1c1.9.5 8.9.5 8.9.5s7 0 8.9-.5a3 3 0 0 0 2.1-2.1 31 31 0 0 0 .5-4.8 31 31 0 0 0-.5-4.8zM9.75 15.02V8.98L15.5 12l-5.75 3.02z" />
    </svg>
  );
}

function InstagramIcon({ className }: IconProps) {
  return (
    <svg {...base(className)} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="0.6" fill="currentColor" />
    </svg>
  );
}

function TikTokIcon({ className }: IconProps) {
  return (
    <svg {...base(className)} fill="currentColor">
      <path d="M16.6 5.82A4.28 4.28 0 0 1 15.54 3h-3.09v12.4a2.59 2.59 0 0 1-2.59 2.5 2.59 2.59 0 0 1-2.59-2.59 2.59 2.59 0 0 1 3.4-2.46V9.69a5.7 5.7 0 0 0-.81-.06A5.69 5.69 0 0 0 4.17 15.3 5.69 5.69 0 0 0 9.86 21a5.69 5.69 0 0 0 5.69-5.69V9.01a7.33 7.33 0 0 0 4.28 1.37V7.3a4.28 4.28 0 0 1-3.23-1.48z" />
    </svg>
  );
}

function XIcon({ className }: IconProps) {
  return (
    <svg {...base(className)} fill="currentColor">
      <path d="M18.24 2.25h3.31l-7.23 8.26 8.5 11.24h-6.65l-5.21-6.82-5.97 6.82H1.68l7.73-8.84L1.25 2.25h6.83l4.71 6.23zm-1.16 17.52h1.83L7.08 4.13H5.12z" />
    </svg>
  );
}

function WhatsAppIcon({ className }: IconProps) {
  return (
    <svg {...base(className)} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3.5 20.5l1.3-4.2A8.5 8.5 0 1 1 8 19.5z" />
      <path d="M9 8.6c.2-.5.5-.6.8-.6h.5l1 2.1-.7.9c.5 1.1 1.3 1.9 2.4 2.4l.9-.7 2.1 1v.5c0 .3-.1.6-.6.8-.6.3-1.6.4-3-.4a8 8 0 0 1-3.1-3.1c-.7-1.3-.6-2.3-.3-2.9z" fill="currentColor" stroke="none" />
    </svg>
  );
}

function TelegramIcon({ className }: IconProps) {
  return (
    <svg {...base(className)} fill="currentColor">
      <path d="M21.4 3.6 2.9 10.7c-1.1.4-1.1 1.8 0 2.1l4.6 1.5 1.8 5.5c.2.7 1.1.9 1.6.4l2.6-2.4 4.8 3.5c.6.4 1.5.1 1.6-.6l3.1-15.6c.2-1-.7-1.8-1.6-1.5zM9.9 14.5l-.4 3.3-1.2-3.8 9.4-6.1z" />
    </svg>
  );
}

function LinkedInIcon({ className }: IconProps) {
  return (
    <svg {...base(className)} fill="currentColor">
      <path d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zM3 9.5h4V21H3zM9.5 9.5h3.8v1.6h.06c.53-1 1.83-2.06 3.77-2.06 4.03 0 4.77 2.65 4.77 6.1V21h-4v-5.1c0-1.22-.02-2.79-1.7-2.79-1.7 0-1.96 1.33-1.96 2.7V21h-4z" />
    </svg>
  );
}

const ICONS: Record<SocialPlatform, (p: IconProps) => React.ReactElement> = {
  facebook: FacebookIcon,
  youtube: YouTubeIcon,
  instagram: InstagramIcon,
  tiktok: TikTokIcon,
  x: XIcon,
  whatsapp: WhatsAppIcon,
  telegram: TelegramIcon,
  linkedin: LinkedInIcon,
};

export function SocialIcon({ platform, className = "size-5" }: { platform: SocialPlatform; className?: string }) {
  const Icon = ICONS[platform];
  return <Icon className={className} />;
}
