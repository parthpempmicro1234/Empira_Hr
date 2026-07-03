function cx(...classes) {
  return classes.filter(Boolean).join(' ');
}

export default function PolicyTabs({ tabs, activeId, onChange }) {
  return (
    <div className="flex shrink-0 gap-0 border-b border-[#243044]" role="tablist" aria-label="Policy sections">
      {tabs.map((tab) => {
        const active = tab.id === activeId;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={active}
            aria-controls={`policy-panel-${tab.id}`}
            id={`policy-tab-${tab.id}`}
            onClick={() => onChange(tab.id)}
            className={cx(
              'relative px-4 py-2.5 text-sm font-medium transition-colors duration-200',
              active ? 'bg-[#5b3ea6] text-white' : 'text-gray-400 hover:text-gray-200'
            )}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
