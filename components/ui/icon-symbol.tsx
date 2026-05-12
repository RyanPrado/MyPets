import {
  AlertTriangle,
  ChevronRight,
  Code2,
  Compass,
  Home,
  PawPrint,
  PencilLine,
  Plus,
  PlusCircle,
  RefreshCw,
  Search,
  Send,
  Trash2,
  type LucideIcon,
} from 'lucide-react-native';
import { type StyleProp, type ViewStyle, type OpaqueColorValue } from 'react-native';

/**
 * Symbolic names used across the app. We keep the SF-Symbol-style keys for
 * backwards compat with the existing call sites (e.g. `house.fill`,
 * `plus.circle.fill`) and map them to lucide icons. New code can use the
 * lucide-native names too — they're added as additional keys below.
 */
const MAPPING: Record<string, LucideIcon> = {
  // legacy SF-Symbol keys (still referenced from app/(tabs)/_layout.tsx and prior code)
  'house.fill': Home,
  'paperplane.fill': Send,
  'chevron.left.forwardslash.chevron.right': Code2,
  'chevron.right': ChevronRight,
  'plus.circle.fill': PlusCircle,
  plus: Plus,
  'pawprint.fill': PawPrint,
  'square.and.pencil': PencilLine,
  trash: Trash2,
  // shadcn redesign additions
  search: Search,
  'alert-triangle': AlertTriangle,
  'refresh-cw': RefreshCw,
  compass: Compass,
};

export type IconSymbolName = keyof typeof MAPPING;

export function IconSymbol({
  name,
  size = 24,
  color,
  style,
  weight,
}: {
  name: IconSymbolName;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<ViewStyle>;
  weight?: 'light' | 'regular' | 'medium' | 'semibold' | 'bold';
}) {
  const Icon = MAPPING[name];
  if (!Icon) {
    if (__DEV__) {
      console.warn(`IconSymbol: unknown name "${name}"`);
    }
    return null;
  }

  // map shadcn-style weight names to lucide strokeWidth
  const strokeWidth =
    weight === 'light'
      ? 1.5
      : weight === 'medium'
        ? 2
        : weight === 'semibold' || weight === 'bold'
          ? 2.4
          : 2;

  return <Icon size={size} color={color as string} strokeWidth={strokeWidth} style={style} />;
}
