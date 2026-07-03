import type { OrgBasis } from './orgTreeTypes';

function cx(...classes: Array<string | null | undefined | false>) {
  return classes.filter(Boolean).join(' ');
}

export type OrgTreeTab = 'organization' | 'department' | 'me';

function tabFromState(basis: OrgBasis, groupByDepartment: boolean): OrgTreeTab | null {
  if (basis === 'employee') return null;
  if (basis === 'my') return 'me';
  if (basis === 'org' && groupByDepartment) return 'department';
  return 'organization';
}

type Props = {
  basis: OrgBasis;
  groupByDepartment: boolean;
  isLoading: boolean;
  onSelect: (tab: OrgTreeTab) => void;
};

/**
 * View switcher aligned with the reference OrgTree (organization / department / me).
 */
export default function OrgTabs({ basis, groupByDepartment, isLoading, onSelect }: Props) {
  const active = tabFromState(basis, groupByDepartment);

  const tabs: { id: OrgTreeTab; label: string }[] = [
    { id: 'organization', label: 'Organization' },
    { id: 'department', label: 'Department' },
    { id: 'me', label: 'Me' },
  ];

  return (
    <div className="flex flex-col gap-2">
      <div className="inline-flex rounded-lg border border-border bg-card p-1 shadow-sm">
        {tabs.map((tab) => {
          const isActive = active === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              disabled={isLoading}
              onClick={() => onSelect(tab.id)}
              className={cx(
                'rounded-md px-4 py-2 text-sm font-semibold transition capitalize',
                isActive ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground',
                isLoading && 'cursor-not-allowed opacity-50'
              )}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
      {basis === 'employee' ? (
        <p className="text-[11px] text-muted-foreground">Person view — pick a tab to return to org-wide trees.</p>
      ) : null}
    </div>
  );
}
