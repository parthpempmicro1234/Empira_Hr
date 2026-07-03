import type { Dispatch, ReactNode, SetStateAction } from 'react';
import type { LucideIcon } from 'lucide-react';

export type FilterDropdownItem = { id: string | number; name?: string | null };

export type FilterDropdownHelpers = {
  filtered: FilterDropdownItem[];
  q: string;
  setQ: (value: string) => void;
  open: boolean;
  setOpen: Dispatch<SetStateAction<boolean>>;
  selectedSet: Set<string>;
  toggle: (id: string | number) => void;
  icons: { ChevronRight: LucideIcon };
};

export type FilterDropdownProps = {
  label: string;
  items: FilterDropdownItem[];
  selected: string[];
  onChange: (next: string[]) => void;
  /** Custom list (e.g. nested departments). Omit for default checkbox list. */
  renderList?: (helpers: FilterDropdownHelpers) => ReactNode;
};

declare function FilterDropdown(props: FilterDropdownProps): ReactNode;
export default FilterDropdown;
