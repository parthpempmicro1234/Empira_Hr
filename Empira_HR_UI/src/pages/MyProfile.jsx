import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Eye, EyeOff, FileText, Hash, IdCard, Lock, Mail, MapPin, Phone } from 'lucide-react';
import Modal from '../components/Modal.jsx';
import ProfileHeader from '../components/ProfileHeader';
import AboutSection from '../components/profile/AboutSection.jsx';
import JobTabPage from './profile/job/JobTabPage.jsx';
import { useLocation } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getEmployeeProfile, patchEmployeeProfile } from '../services/employeeProfile';
import { lookupZipcode } from '../services/zipcode';
import { normalizeApiError } from '../services/errors';

function cx(...classes) {
  return classes.filter(Boolean).join(' ');
}

function HeaderStat({ label, value }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wider text-slate-500">{label}</div>
      <div className="mt-1 text-sm text-slate-200">{value}</div>
    </div>
  );
}

function KeyValue({ label, value }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wider text-slate-500">{label}</div>
      <div className="mt-1 text-sm font-medium text-slate-200">{value}</div>
    </div>
  );
}

function FieldLabel({ children }) {
  return (
    <label className="mb-1 block text-[11px] uppercase tracking-wider text-slate-500">
      {children}
    </label>
  );
}

function Input({
  value,
  onChange,
  placeholder,
  type = 'text',
  readOnly = false,
  locked = false,
  invalid = false,
  list,
}) {
  return (
    <div className="group relative">
      <input
        type={type}
        value={value}
        readOnly={readOnly}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder={placeholder}
        list={list}
        className={cx(
          'h-10 w-full rounded-md border border-slate-700 bg-slate-950 px-3 text-sm text-slate-200 outline-none',
          'placeholder:text-slate-500',
          'focus:ring-2 focus:ring-accent/35 focus:border-accent/60',
          invalid ? 'border-red-500/50 focus:ring-red-500/50 focus:border-red-500/50' : '',
          locked ? 'bg-slate-950/40 text-slate-300 opacity-90 pr-9' : ''
        )}
      />
      {locked ? (
        <>
          <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-slate-400">
            <Lock className="h-4 w-4" />
          </span>
          <span className="pointer-events-none absolute right-2 top-[calc(100%+8px)] hidden w-[240px] rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-slate-200 shadow-sm group-hover:block">
            Locked field. Contact IT to change work email.
          </span>
        </>
      ) : null}
    </div>
  );
}

function Select({ value, onChange, options, disabled = false }) {
  return (
    <select
      value={value}
      disabled={disabled}
      onChange={(e) => onChange?.(e.target.value)}
      className={cx(
        'h-10 w-full rounded-md border border-slate-700 bg-slate-950 px-3 text-sm text-slate-200 outline-none',
        'focus:ring-2 focus:ring-accent/35 focus:border-accent/60',
        disabled ? 'opacity-70' : ''
      )}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value} className="bg-slate-950 text-slate-200">
          {o.label}
        </option>
      ))}
    </select>
  );
}

function ModalActions({ primaryLabel, onCancel, onPrimary, primaryTone = 'accent' }) {
  return (
    <div className="mt-6 flex items-center justify-end gap-3">
      <button
        type="button"
        onClick={onCancel}
        className="rounded-lg border border-slate-700 bg-slate-950/30 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-accent/35"
      >
        Cancel
      </button>
      <button
        type="button"
        onClick={onPrimary}
        className={cx(
          'rounded-lg px-4 py-2 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-accent/40',
          primaryTone === 'accent'
            ? 'bg-accent text-accent-foreground hover:brightness-110'
            : 'bg-slate-100 text-slate-950 hover:bg-white'
        )}
      >
        {primaryLabel}
      </button>
    </div>
  );
}

function ProfileCard({ title, onEdit, showEdit = true, children }) {
  return (
    <section
      className={cx(
        'rounded-lg border border-slate-800 bg-slate-900 p-5 shadow-sm',
        'transition duration-300 ease-out will-change-transform',
        'hover:-translate-y-0.5 hover:border-slate-700'
      )}
    >
      <div className="mb-4 flex items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="text-sm font-semibold text-slate-100">{title}</div>
        {showEdit ? (
          <button
            type="button"
            onClick={onEdit}
            className="text-sm font-medium text-accent transition hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-accent/35 focus:ring-offset-0"
          >
            Edit
          </button>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function VerifiedPill() {
  return (
    <span className="rounded-md bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-200 ring-1 ring-emerald-400/25">
      Verified
    </span>
  );
}

function IdentityBlock({ title, subtitle, verified = true, children }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-950/20">
      <div className="flex items-start justify-between gap-3 border-b border-slate-800 px-4 py-3">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-slate-100">{title}</div>
          <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-slate-400">
            <span className="inline-flex items-center gap-2">
              <span className="grid h-6 w-6 place-items-center rounded-md bg-slate-900 ring-1 ring-slate-800">
                <IdCard className="h-3.5 w-3.5 text-slate-300" />
              </span>
              <span className="font-medium text-slate-300">{subtitle}</span>
            </span>
            {verified ? <VerifiedPill /> : null}
          </div>
        </div>
        <div className="text-xs text-slate-500">1 files</div>
      </div>
      <div className="p-4">
        <div className="grid grid-cols-2 gap-x-6 gap-y-4">{children}</div>
      </div>
    </div>
  );
}

function FieldError({ message }) {
  return <div className="mt-1 text-[10px] text-red-400">{message}</div>;
}

function AddressBlock({ title, data }) {
  const line1 = data?.line1 || '—';
  const line2 = data?.line2 || '';
  const city = data?.city || '—';
  const state = data?.state || '—';
  const country = data?.country || '—';
  const zip = data?.pincode || '—';

  return (
    <div className="rounded-lg border border-slate-800 bg-slate-950/20 p-4">
      <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">{title}</div>
      <div className="mt-3 space-y-1 text-sm text-slate-300">
        <div className="font-medium text-slate-200">{line1}</div>
        {line2 ? <div className="text-slate-300">{line2}</div> : null}
        <div className="text-slate-400">
          {city}, {state}
        </div>
        <div className="text-slate-400">
          {country} - {zip}
        </div>
      </div>
    </div>
  );
}

function maskSensitive(v) {
  const s = String(v || '');
  if (!s) return '—';
  const digits = s.replace(/\D/g, '');
  if (digits.length <= 4) return s;
  return `${'X'.repeat(Math.max(0, digits.length - 4))}${digits.slice(-4)}`;
}

export default function MyProfile() {
  const location = useLocation();
  const employeeIdParam = useMemo(() => {
    const sp = new URLSearchParams(location.search);
    const v = sp.get('id');
    if (!v) return null;
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? n : null;
  }, [location.search]);

  const viewMode = employeeIdParam != null;
  const [activeTab, setActiveTab] = useState('PROFILE');

  const [profile, setProfile] = useState(() => ({
    primary: {
      firstName: 'Parth',
      middleName: '',
      lastName: 'Patel',
      displayName: 'Parth Patel',
      gender: 'Male',
      dob: '',
      maritalStatus: '',
      bloodGroup: '',
      physicallyHandicapped: 'No',
      nationality: 'Indian',
    },
    contact: {
      workEmail: 'parth.p@empiricinfotech.com',
      personalEmail: '',
      mobileNumber: '+91-9184165585',
      workNumber: '',
      residenceNumber: '',
    },
    addresses: {
      sameAsCurrent: false,
      current: {
        country: 'India',
        countryId: '',
        line1: '',
        line2: '',
        city: '',
        cityId: '',
        cityOptions: [],
        state: 'Gujarat',
        stateId: '',
        pincode: '',
      },
      permanent: {
        country: 'India',
        countryId: '',
        line1: '',
        line2: '',
        city: '',
        cityId: '',
        cityOptions: [],
        state: 'Gujarat',
        stateId: '',
        pincode: '',
      },
    },
    relations: [],
    identity: [],
  }));

  const [modal, setModal] = useState({ open: false, section: null });
  const [draft, setDraft] = useState(null);
  const [modalErrors, setModalErrors] = useState({});
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);
  const [revealIdentity, setRevealIdentity] = useState({ aadhaar: false, pan: false });
  const [docPreview, setDocPreview] = useState({ open: false, title: 'Document', url: '' });

  const queryClient = useQueryClient();

  const profileQuery = useQuery({
    queryKey: ['employeeProfile'],
    queryFn: getEmployeeProfile,
    enabled: !viewMode,
  });

  useEffect(() => {
    if (!profileQuery.data) return;
    const d = profileQuery.data;
    const basic = d.basic ?? {};
    const addresses = d.addresses ?? {};
    const current = addresses.current ?? {};
    const permanent = addresses.permanent ?? {};
    setProfile((p) => ({
      ...p,
      primary: {
        ...p.primary,
        firstName: basic.fname ?? '',
        middleName: '',
        lastName: basic.lname ?? '',
        displayName: basic.display_name ?? '',
        gender: basic.gender ? String(basic.gender).replace(/\b\w/g, (c) => c.toUpperCase()) : '',
        dob: basic.date_of_birth ?? '',
        maritalStatus: basic.marital_status ? String(basic.marital_status).replace(/\b\w/g, (c) => c.toUpperCase()) : '',
        bloodGroup: basic.blood_group ?? '',
        nationality: basic.nationality ?? '',
      },
      contact: {
        ...p.contact,
        workEmail: basic.work_email ?? p.contact.workEmail,
        personalEmail: basic.personal_email ?? '',
        mobileNumber: basic.mobile_number ?? '',
      },
      addresses: {
        ...p.addresses,
        current: {
          ...p.addresses.current,
          line1: current.address_line1 ?? '',
          line2: current.address_line2 ?? '',
          pincode: current.zip ?? '',
          countryId: current.country != null ? String(current.country) : '',
          stateId: current.state != null ? String(current.state) : '',
          cityId: current.city != null ? String(current.city) : '',
          country: current.country_name ?? p.addresses.current.country,
          state: current.state_name ?? p.addresses.current.state,
          city: current.city_name ?? p.addresses.current.city,
          cityOptions: [],
        },
        permanent: {
          ...p.addresses.permanent,
          line1: permanent.address_line1 ?? '',
          line2: permanent.address_line2 ?? '',
          pincode: permanent.zip ?? '',
          countryId: permanent.country != null ? String(permanent.country) : '',
          stateId: permanent.state != null ? String(permanent.state) : '',
          cityId: permanent.city != null ? String(permanent.city) : '',
          country: permanent.country_name ?? p.addresses.permanent.country,
          state: permanent.state_name ?? p.addresses.permanent.state,
          city: permanent.city_name ?? p.addresses.permanent.city,
          cityOptions: [],
        },
      },
      identity: Array.isArray(d.identity) ? d.identity : [],
    }));
  }, [profileQuery.data]);

  const patchMutation = useMutation({
    mutationFn: (payload) => patchEmployeeProfile(payload),
    onSuccess: async () => {
      setModalErrors({});
      closeModal();
      await queryClient.invalidateQueries({ queryKey: ['employeeProfile'] });
      setToast('Updated successfully');
      if (toastTimer.current) window.clearTimeout(toastTimer.current);
      toastTimer.current = window.setTimeout(() => setToast(null), 2200);
    },
    onError: (err) => {
      const n = normalizeApiError(err);
      setModalErrors(n.fieldErrors || {});
    },
  });

  const [zipLoading, setZipLoading] = useState({ current: false, permanent: false });
  const [zipError, setZipError] = useState({ current: '', permanent: '' });
  const zipTimers = useRef({ current: null, permanent: null });
  const lastZip = useRef({ current: '', permanent: '' });

  const openEdit = (section) => {
    setModal({ open: true, section });
    setDraft(structuredClone(profile[section]));
    setModalErrors({});
    setZipError({ current: '', permanent: '' });
  };

  const closeModal = () => {
    setModal({ open: false, section: null });
    setDraft(null);
    setModalErrors({});
    setZipError({ current: '', permanent: '' });
  };

  const closeDocPreview = () => setDocPreview({ open: false, title: 'Document', url: '' });

  const saveDraft = () => {
    if (!modal.section || !draft) return;
    if (modal.section === 'primary') {
      patchMutation.mutate({
        basic: {
          fname: draft.firstName || '',
          lname: draft.lastName || '',
          display_name: draft.displayName || '',
          gender: draft.gender ? String(draft.gender).toLowerCase() : '',
          date_of_birth: draft.dob || null,
          marital_status: draft.maritalStatus ? String(draft.maritalStatus).toLowerCase() : '',
          blood_group: draft.bloodGroup || null,
          nationality: draft.nationality || null,
        },
      });
      return;
    }
    if (modal.section === 'contact') {
      patchMutation.mutate({
        basic: {
          personal_email: draft.personalEmail || null,
          mobile_number: draft.mobileNumber || null,
        },
      });
      return;
    }
    if (modal.section === 'addresses') {
      const cur = draft.current;
      const per = draft.permanent;
      const missing =
        !cur.line1 ||
        !cur.countryId ||
        !cur.stateId ||
        !cur.cityId ||
        !cur.pincode ||
        !per.line1 ||
        !per.countryId ||
        !per.stateId ||
        !per.cityId ||
        !per.pincode;
      if (missing) {
        setModalErrors({ _global: ['Please complete all required address fields.'] });
        return;
      }
      patchMutation.mutate({
        addresses: {
          current: {
            address_line1: cur.line1 || null,
            address_line2: cur.line2 || null,
            zip: cur.pincode || null,
            country: cur.countryId ? Number(cur.countryId) : null,
            state: cur.stateId ? Number(cur.stateId) : null,
            city: cur.cityId ? Number(cur.cityId) : null,
          },
          permanent: {
            address_line1: per.line1 || null,
            address_line2: per.line2 || null,
            zip: per.pincode || null,
            country: per.countryId ? Number(per.countryId) : null,
            state: per.stateId ? Number(per.stateId) : null,
            city: per.cityId ? Number(per.cityId) : null,
          },
        },
      });
      return;
    }
    // fallback (relations etc.)
    setProfile((p) => ({ ...p, [modal.section]: draft }));
    closeModal();
  };

  const syncPermanentFromCurrent = (nextSame) => {
    setDraft((d) => {
      if (!d) return d;
      const next = { ...d, sameAsCurrent: nextSame };
      if (nextSame) next.permanent = { ...next.current, cityOptions: [...(next.current.cityOptions || [])] };
      return next;
    });
  };

  const isValidZip = (z) => /^\d{6}$/.test(String(z || ''));

  const runZipLookup = async (target, code) => {
    if (lastZip.current[target] === code) return;
    lastZip.current[target] = code;
    setZipError((p) => ({ ...p, [target]: '' }));
    setZipLoading((p) => ({ ...p, [target]: true }));
    try {
      const r = await lookupZipcode(code);
      setDraft((d) => {
        if (!d) return d;
        const addr = target === 'current' ? d.current : d.permanent;
        const nextAddr = {
          ...addr,
          pincode: r.zipcode || code,
          country: r.country,
          countryId: String(r.country_id),
          state: r.state,
          stateId: String(r.state_id),
          cityOptions: Array.isArray(r.cities) ? r.cities : [],
          city: '',
          cityId: '',
        };
        const next = target === 'current' ? { ...d, current: nextAddr } : { ...d, permanent: nextAddr };
        if (d.sameAsCurrent && target === 'current') {
          return { ...next, permanent: { ...nextAddr, cityOptions: [...(nextAddr.cityOptions || [])] } };
        }
        return next;
      });
    } catch (e) {
      setZipError((p) => ({ ...p, [target]: 'Invalid zipcode.' }));
      setDraft((d) => {
        if (!d) return d;
        const addr = target === 'current' ? d.current : d.permanent;
        const cleared = { ...addr, countryId: '', stateId: '', cityId: '', city: '', cityOptions: [] };
        const next = target === 'current' ? { ...d, current: cleared } : { ...d, permanent: cleared };
        if (d.sameAsCurrent && target === 'current') return { ...next, permanent: cleared };
        return next;
      });
    } finally {
      setZipLoading((p) => ({ ...p, [target]: false }));
    }
  };

  // debounced lookup on zipcode change (500ms)
  useEffect(() => {
    if (!draft || modal.section !== 'addresses') return;
    const z = String(draft.current?.pincode || '');
    if (zipTimers.current.current) window.clearTimeout(zipTimers.current.current);
    zipTimers.current.current = window.setTimeout(() => {
      if (isValidZip(z)) runZipLookup('current', z);
    }, 500);
    return () => {
      if (zipTimers.current.current) window.clearTimeout(zipTimers.current.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft?.current?.pincode, modal.section]);

  useEffect(() => {
    if (!draft || modal.section !== 'addresses') return;
    const z = String(draft.permanent?.pincode || '');
    if (zipTimers.current.permanent) window.clearTimeout(zipTimers.current.permanent);
    zipTimers.current.permanent = window.setTimeout(() => {
      if (isValidZip(z)) runZipLookup('permanent', z);
    }, 500);
    return () => {
      if (zipTimers.current.permanent) window.clearTimeout(zipTimers.current.permanent);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft?.permanent?.pincode, modal.section]);

  return (
    <div className="relative">
      {/* Full-page background (independent from wrapper padding) */}
      <div className="fixed inset-0 -z-10 bg-background" />

      {/* Unified page wrapper for perfect alignment */}
      <div className="w-full px-6 sm:px-8">
        <ProfileHeader
          activeTab={activeTab}
          onTabChange={setActiveTab}
          employeeId={employeeIdParam ?? 'me'}
          viewMode={viewMode}
        />

      {/* Main content */}
      <div className="mt-6">
        <div className="transition-opacity duration-300">
          {activeTab === 'PROFILE' ? (
            <div className="grid gap-6 lg:grid-cols-2">
              <ProfileCard title="Primary Details" onEdit={() => openEdit('primary')} showEdit={!viewMode}>
                <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                  <KeyValue label="FIRST NAME" value={profile.primary.firstName || '—'} />
                  <KeyValue label="MIDDLE NAME" value={profile.primary.middleName || '—'} />
                  <KeyValue label="LAST NAME" value={profile.primary.lastName || '—'} />
                  <KeyValue label="DISPLAY NAME" value={profile.primary.displayName || '—'} />
                  <KeyValue label="GENDER" value={profile.primary.gender || '—'} />
                  <KeyValue label="DATE OF BIRTH" value={profile.primary.dob || '—'} />
                  <KeyValue label="MARITAL STATUS" value={profile.primary.maritalStatus || '—'} />
                  <KeyValue label="BLOOD GROUP" value={profile.primary.bloodGroup || '—'} />
                  <KeyValue
                    label="PHYSICALLY HANDICAPPED"
                    value={profile.primary.physicallyHandicapped || '—'}
                  />
                  <KeyValue label="NATIONALITY" value={profile.primary.nationality || '—'} />
                </div>
              </ProfileCard>

              <ProfileCard title="Contact Details" onEdit={() => openEdit('contact')} showEdit={!viewMode}>
                <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                  <KeyValue label="WORK EMAIL" value={profile.contact.workEmail || '—'} />
                  <KeyValue label="PERSONAL EMAIL" value={profile.contact.personalEmail || '—'} />
                  <KeyValue label="MOBILE NUMBER" value={profile.contact.mobileNumber || '—'} />
                  <KeyValue label="WORK NUMBER" value={profile.contact.workNumber || '—'} />
                  <KeyValue label="RESIDENCE NUMBER" value={profile.contact.residenceNumber || '—'} />
                </div>
              </ProfileCard>

              <ProfileCard title="Addresses" onEdit={() => openEdit('addresses')} showEdit={!viewMode}>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <AddressBlock title="Current Address" data={profile.addresses.current} />
                  <AddressBlock title="Permanent Address" data={profile.addresses.permanent} />
                </div>
              </ProfileCard>

              <ProfileCard title="Relations" onEdit={() => openEdit('relations')} showEdit={!viewMode}>
                <div className="rounded-lg border border-slate-800 bg-slate-950/30 p-4 text-sm text-slate-400">
                  No relations added yet.
                </div>
              </ProfileCard>

              <ProfileCard title="Professional Summary" onEdit={() => {}} showEdit={false}>
                <div className="space-y-2">
                  <div className="text-[11px] uppercase tracking-wider text-slate-500">
                    PROFESSIONAL SUMMARY
                  </div>
                  <div className="text-sm text-slate-300">- Not Set.</div>
                </div>
              </ProfileCard>

              <ProfileCard title="Identity Information" showEdit={false}>
                <div className="space-y-4">
                  {(() => {
                    const aadhaar = profile.identity?.find((x) =>
                      String(x.identity_type || x.type || '').toLowerCase().includes('aadhaar')
                    );
                    const pan = profile.identity?.find((x) =>
                      String(x.identity_type || x.type || '').toLowerCase().includes('pan')
                    );

                    const aadhaarNumber = aadhaar?.document_number ?? aadhaar?.number ?? '';
                    const aadhaarName = aadhaar?.name_on_document ?? aadhaar?.name ?? '—';
                    const aadhaarDob = aadhaar?.date_of_birth ?? '—';
                    const aadhaarParent = aadhaar?.parent_name ?? '—';
                    const aadhaarVerified = Boolean(aadhaar?.is_verified);
                    const aadhaarFile = aadhaar?.document_file ?? '';

                    const panNumber = pan?.document_number ?? pan?.number ?? '';
                    const panName = pan?.name_on_document ?? pan?.name ?? '—';
                    const panDob = pan?.date_of_birth ?? '—';
                    const panParent = pan?.parent_name ?? '—';
                    const panVerified = Boolean(pan?.is_verified);
                    const panFile = pan?.document_file ?? '';

                    return (
                      <>
                        <IdentityBlock title="Address Proof" subtitle="Aadhaar Card" verified={aadhaarVerified}>
                    <KeyValue
                      label="AADHAAR NUMBER"
                      value={
                        <div className="flex items-center gap-2">
                          <span className="inline-block min-w-[12ch] font-mono tabular-nums">
                            {aadhaarNumber
                              ? revealIdentity.aadhaar
                                ? aadhaarNumber
                                : maskSensitive(aadhaarNumber)
                              : '—'}
                          </span>
                          {aadhaarNumber ? (
                            <button
                              type="button"
                              onClick={() => setRevealIdentity((p) => ({ ...p, aadhaar: !p.aadhaar }))}
                              className="grid h-7 w-7 place-items-center rounded-md bg-slate-950/40 text-slate-300 hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-accent/35"
                              aria-label={revealIdentity.aadhaar ? 'Hide Aadhaar number' : 'Show Aadhaar number'}
                            >
                              {revealIdentity.aadhaar ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                          ) : null}
                          {aadhaarFile ? (
                            <button
                              type="button"
                              onClick={() => setDocPreview({ open: true, title: 'Aadhaar Document', url: aadhaarFile })}
                              className="grid h-7 w-7 place-items-center rounded-md bg-slate-950/40 text-slate-300 hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-accent/35"
                              aria-label="View Aadhaar file"
                            >
                              <FileText className="h-4 w-4" />
                            </button>
                          ) : null}
                        </div>
                      }
                    />
                    <KeyValue label="ENROLLMENT NUMBER" value="—" />
                    <KeyValue label="DATE OF BIRTH" value={aadhaarDob || '—'} />
                    <KeyValue label="NAME" value={aadhaarName || '—'} />
                    <KeyValue label="ADDRESS" value="—" />
                    <KeyValue label="PARENT NAME" value={aadhaarParent || '—'} />
                  </IdentityBlock>

                  <IdentityBlock title="Payroll" subtitle="Pan Card" verified={panVerified}>
                    <KeyValue
                      label="PERMANENT ACCOUNT NUMBER"
                      value={
                        <div className="flex items-center gap-2">
                          <span className="inline-block min-w-[12ch] font-mono tabular-nums">
                            {panNumber ? (revealIdentity.pan ? panNumber : maskSensitive(panNumber)) : '—'}
                          </span>
                          {panNumber ? (
                            <button
                              type="button"
                              onClick={() => setRevealIdentity((p) => ({ ...p, pan: !p.pan }))}
                              className="grid h-7 w-7 place-items-center rounded-md bg-slate-950/40 text-slate-300 hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-accent/35"
                              aria-label={revealIdentity.pan ? 'Hide PAN number' : 'Show PAN number'}
                            >
                              {revealIdentity.pan ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                          ) : null}
                          {panFile ? (
                            <button
                              type="button"
                              onClick={() => setDocPreview({ open: true, title: 'PAN Document', url: panFile })}
                              className="grid h-7 w-7 place-items-center rounded-md bg-slate-950/40 text-slate-300 hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-accent/35"
                              aria-label="View PAN file"
                            >
                              <FileText className="h-4 w-4" />
                            </button>
                          ) : null}
                        </div>
                      }
                    />
                    <KeyValue label="NAME" value={panName || '—'} />
                    <KeyValue label="DATE OF BIRTH" value={panDob || '—'} />
                    <KeyValue label="PARENT NAME" value={panParent || '—'} />
                  </IdentityBlock>
                      </>
                    );
                  })()}
                </div>
              </ProfileCard>
            </div>
          ) : activeTab === 'ABOUT' ? (
            <AboutSection
              profile={profile}
              openEdit={viewMode ? undefined : openEdit}
              viewMode={viewMode}
              employeeId={employeeIdParam}
            />
          ) : activeTab === 'JOB' ? (
            <JobTabPage enabled={!viewMode} />
          ) : (
            <section className="rounded-lg border border-slate-800 bg-slate-900 p-5 shadow-sm">
              <div className="text-sm font-semibold text-slate-100">{activeTab}</div>
              <div className="mt-2 text-sm text-slate-400">Content coming soon.</div>
            </section>
          )}
        </div>
      </div>

      <Modal
        open={modal.open}
        title={
          modal.section === 'primary'
            ? 'Edit Primary Details'
            : modal.section === 'contact'
              ? 'Edit Contact Details'
              : modal.section === 'addresses'
                ? 'Edit Addresses'
                : modal.section === 'relations'
                  ? 'Edit Relations'
                  : 'Edit'
        }
        onClose={closeModal}
      >
        {modal.section === 'primary' && draft ? (
          <>
            <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
              <div>
                <FieldLabel>First Name</FieldLabel>
                <Input
                  value={draft.firstName}
                  invalid={!!modalErrors.fname}
                  onChange={(v) => setDraft((d) => ({ ...d, firstName: v }))}
                />
                {modalErrors.fname ? <FieldError message={modalErrors.fname?.[0]} /> : null}
              </div>
              <div>
                <FieldLabel>Middle Name</FieldLabel>
                <Input value={draft.middleName} onChange={(v) => setDraft((d) => ({ ...d, middleName: v }))} />
              </div>
              <div>
                <FieldLabel>Last Name</FieldLabel>
                <Input
                  value={draft.lastName}
                  invalid={!!modalErrors.lname}
                  onChange={(v) => setDraft((d) => ({ ...d, lastName: v }))}
                />
                {modalErrors.lname ? <FieldError message={modalErrors.lname?.[0]} /> : null}
              </div>
              <div>
                <FieldLabel>Display Name</FieldLabel>
                <Input
                  value={draft.displayName}
                  invalid={!!modalErrors.display_name}
                  onChange={(v) => setDraft((d) => ({ ...d, displayName: v }))}
                />
                {modalErrors.display_name ? <FieldError message={modalErrors.display_name?.[0]} /> : null}
              </div>
              <div>
                <FieldLabel>Gender</FieldLabel>
                <Select
                  value={draft.gender}
                  onChange={(v) => setDraft((d) => ({ ...d, gender: v }))}
                  options={[
                    { value: '', label: 'Select' },
                    { value: 'Male', label: 'Male' },
                    { value: 'Female', label: 'Female' },
                    { value: 'Other', label: 'Other' },
                  ]}
                />
              </div>
              <div>
                <FieldLabel>Date of Birth</FieldLabel>
                <Input
                  type="date"
                  value={draft.dob}
                  invalid={!!modalErrors.date_of_birth}
                  onChange={(v) => setDraft((d) => ({ ...d, dob: v }))}
                />
                {modalErrors.date_of_birth ? <FieldError message={modalErrors.date_of_birth?.[0]} /> : null}
              </div>
              <div>
                <FieldLabel>Marital Status</FieldLabel>
                <Select
                  value={draft.maritalStatus}
                  onChange={(v) => setDraft((d) => ({ ...d, maritalStatus: v }))}
                  options={[
                    { value: '', label: 'Select' },
                    { value: 'Single', label: 'Single' },
                    { value: 'Married', label: 'Married' },
                    { value: 'Divorced', label: 'Divorced' },
                  ]}
                />
              </div>
              <div>
                <FieldLabel>Blood Group</FieldLabel>
                <Select
                  value={draft.bloodGroup}
                  onChange={(v) => setDraft((d) => ({ ...d, bloodGroup: v }))}
                  options={[
                    { value: '', label: 'Select' },
                    { value: 'A+', label: 'A+' },
                    { value: 'A-', label: 'A-' },
                    { value: 'B+', label: 'B+' },
                    { value: 'B-', label: 'B-' },
                    { value: 'AB+', label: 'AB+' },
                    { value: 'AB-', label: 'AB-' },
                    { value: 'O+', label: 'O+' },
                    { value: 'O-', label: 'O-' },
                  ]}
                />
              </div>
              <div>
                <FieldLabel>Physically Handicapped</FieldLabel>
                <Select
                  value={draft.physicallyHandicapped}
                  onChange={(v) => setDraft((d) => ({ ...d, physicallyHandicapped: v }))}
                  options={[
                    { value: 'No', label: 'No' },
                    { value: 'Yes', label: 'Yes' },
                  ]}
                />
              </div>  
              <div>
                <FieldLabel>Nationality</FieldLabel>
                <Input value={draft.nationality} onChange={(v) => setDraft((d) => ({ ...d, nationality: v }))} />
              </div>
            </div>
            <ModalActions
              primaryLabel={patchMutation.isPending ? 'Updating...' : 'Update'}
              onCancel={closeModal}
              onPrimary={saveDraft}
            />
          </>
        ) : null}

        {modal.section === 'contact' && draft ? (
          <>
            <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
              <div className="sm:col-span-1">
                <FieldLabel>Work Email</FieldLabel>
                <Input value={draft.workEmail} readOnly locked />
              </div>
              <div className="sm:col-span-1">
                <FieldLabel>Personal Email</FieldLabel>
                <Input
                  value={draft.personalEmail}
                  invalid={!!modalErrors.personal_email}
                  onChange={(v) => setDraft((d) => ({ ...d, personalEmail: v }))}
                />
                {modalErrors.personal_email ? <FieldError message={modalErrors.personal_email?.[0]} /> : null}
              </div>
              <div>
                <FieldLabel>Mobile Number</FieldLabel>
                <Input
                  value={draft.mobileNumber}
                  invalid={!!modalErrors.mobile_number}
                  onChange={(v) => setDraft((d) => ({ ...d, mobileNumber: v }))}
                />
                {modalErrors.mobile_number ? <FieldError message={modalErrors.mobile_number?.[0]} /> : null}
              </div>
              <div>
                <FieldLabel>Work Number</FieldLabel>
                <Input value={draft.workNumber} onChange={(v) => setDraft((d) => ({ ...d, workNumber: v }))} />
              </div>
              <div>
                <FieldLabel>Residence Number</FieldLabel>
                <Input
                  value={draft.residenceNumber}
                  onChange={(v) => setDraft((d) => ({ ...d, residenceNumber: v }))}
                />
              </div>
            </div>
            <ModalActions
              primaryLabel={patchMutation.isPending ? 'Updating...' : 'Update'}
              onCancel={closeModal}
              onPrimary={saveDraft}
            />
          </>
        ) : null}

        {modal.section === 'addresses' && draft ? (
          <>
            {modalErrors._global?.[0] ? (
              <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 p-2 text-sm text-red-200">
                {modalErrors._global[0]}
              </div>
            ) : null}
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-4">
                <div className="text-sm font-semibold text-slate-100">Current Address</div>
                <div className="grid gap-4">
                  <div>
                    <FieldLabel>Country</FieldLabel>
                    <Select
                      value={draft.current.countryId || ''}
                      onChange={(v) =>
                        setDraft((d) => ({
                          ...d,
                          current: { ...d.current, countryId: v },
                          permanent: d.sameAsCurrent ? { ...d.current, countryId: v } : d.permanent,
                        }))
                      }
                      options={[
                        { value: '', label: zipLoading.current ? 'Loading...' : draft.current.country || 'Select' },
                        ...(draft.current.countryId
                          ? [{ value: draft.current.countryId, label: draft.current.country || '—' }]
                          : []),
                      ]}
                      disabled
                    />
                  </div>
                  <div>
                    <FieldLabel>Address Line 1</FieldLabel>
                    <Input
                      value={draft.current.line1}
                      onChange={(v) =>
                        setDraft((d) => ({
                          ...d,
                          current: { ...d.current, line1: v },
                          permanent: d.sameAsCurrent ? { ...d.permanent, line1: v } : d.permanent,
                        }))
                      }
                    />
                  </div>
                  <div>
                    <FieldLabel>Address Line 2</FieldLabel>
                    <Input
                      value={draft.current.line2}
                      onChange={(v) =>
                        setDraft((d) => ({
                          ...d,
                          current: { ...d.current, line2: v },
                          permanent: d.sameAsCurrent ? { ...d.permanent, line2: v } : d.permanent,
                        }))
                      }
                    />
                  </div>
                  <div>
                    <FieldLabel>City</FieldLabel>
                    <Select
                      value={draft.current.cityId || ''}
                      onChange={(v) => {
                        const selected = (draft.current.cityOptions || []).find(
                          (c) => String(c.city_id) === String(v)
                        );
                        const cityName = selected?.city || '';
                        setDraft((d) => ({
                          ...d,
                          current: { ...d.current, cityId: v, city: cityName },
                          permanent: d.sameAsCurrent
                            ? { ...d.permanent, cityId: v, city: cityName }
                            : d.permanent,
                        }));
                      }}
                      options={[
                        { value: '', label: 'Select City' },
                        ...(draft.current.cityOptions || []).map((c) => ({
                          value: String(c.city_id),
                          label: c.city,
                        })),
                      ]}
                      disabled={zipLoading.current || !(draft.current.cityOptions || []).length}
                    />
                  </div>
                  <div>
                    <FieldLabel>State</FieldLabel>
                    <Select
                      value={draft.current.stateId || ''}
                      onChange={(v) =>
                        setDraft((d) => ({
                          ...d,
                          current: { ...d.current, stateId: v },
                          permanent: d.sameAsCurrent ? { ...d.permanent, stateId: v } : d.permanent,
                        }))
                      }
                      options={[
                        { value: '', label: zipLoading.current ? 'Loading...' : draft.current.state || 'Select' },
                        ...(draft.current.stateId ? [{ value: draft.current.stateId, label: draft.current.state || '—' }] : []),
                      ]}
                      disabled
                    />
                  </div>
                  <div>
                    <FieldLabel>Pincode</FieldLabel>
                    <Input
                      value={draft.current.pincode}
                      invalid={!!zipError.current}
                      onChange={(v) => {
                        const numeric = String(v || '').replace(/\D/g, '').slice(0, 6);
                        lastZip.current.current = '';
                        setDraft((d) => ({
                          ...d,
                          current: { ...d.current, pincode: numeric },
                          permanent: d.sameAsCurrent ? { ...d.permanent, pincode: numeric } : d.permanent,
                        }));
                      }}
                    />
                    <div className="mt-1 min-h-[14px] text-[10px] text-slate-500">
                      {zipLoading.current ? 'Looking up zipcode...' : zipError.current ? (
                        <span className="text-red-400">{zipError.current}</span>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-semibold text-slate-100">Permanent Address</div>
                  <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-slate-300">
                    <input
                      type="checkbox"
                      checked={draft.sameAsCurrent}
                      onChange={(e) => syncPermanentFromCurrent(e.target.checked)}
                      className="h-4 w-4 rounded border-slate-700 bg-slate-950 accent-accent"
                    />
                    Same as Current Address
                  </label>
                </div>

                <div className="grid gap-4">
                  <div>
                    <FieldLabel>Country</FieldLabel>
                    <Select
                      value={draft.permanent.countryId || ''}
                      disabled
                      onChange={(v) =>
                        setDraft((d) => ({ ...d, permanent: { ...d.permanent, countryId: v } }))
                      }
                      options={[
                        { value: '', label: zipLoading.permanent ? 'Loading...' : draft.permanent.country || 'Select' },
                        ...(draft.permanent.countryId
                          ? [{ value: draft.permanent.countryId, label: draft.permanent.country || '—' }]
                          : []),
                      ]}
                    />
                  </div>
                  <div>
                    <FieldLabel>Address Line 1</FieldLabel>
                    <Input
                      value={draft.permanent.line1}
                      readOnly={draft.sameAsCurrent}
                      onChange={(v) =>
                        setDraft((d) => ({ ...d, permanent: { ...d.permanent, line1: v } }))
                      }
                    />
                  </div>
                  <div>
                    <FieldLabel>Address Line 2</FieldLabel>
                    <Input
                      value={draft.permanent.line2}
                      readOnly={draft.sameAsCurrent}
                      onChange={(v) =>
                        setDraft((d) => ({ ...d, permanent: { ...d.permanent, line2: v } }))
                      }
                    />
                  </div>
                  <div>
                    <FieldLabel>City</FieldLabel>
                    <Select
                      value={draft.permanent.cityId || ''}
                      disabled={
                        draft.sameAsCurrent || zipLoading.permanent || !(draft.permanent.cityOptions || []).length
                      }
                      onChange={(v) => {
                        const selected = (draft.permanent.cityOptions || []).find(
                          (c) => String(c.city_id) === String(v)
                        );
                        setDraft((d) => ({
                          ...d,
                          permanent: {
                            ...d.permanent,
                            cityId: v,
                            city: selected?.city || '',
                          },
                        }));
                      }}
                      options={[
                        { value: '', label: 'Select City' },
                        ...(draft.permanent.cityOptions || []).map((c) => ({
                          value: String(c.city_id),
                          label: c.city,
                        })),
                      ]}
                    />
                  </div>
                  <div>
                    <FieldLabel>State</FieldLabel>
                    <Select
                      value={draft.permanent.stateId || ''}
                      disabled
                      onChange={(v) => setDraft((d) => ({ ...d, permanent: { ...d.permanent, stateId: v } }))}
                      options={[
                        { value: '', label: zipLoading.permanent ? 'Loading...' : draft.permanent.state || 'Select' },
                        ...(draft.permanent.stateId ? [{ value: draft.permanent.stateId, label: draft.permanent.state || '—' }] : []),
                      ]}
                    />
                  </div>
                  <div>
                    <FieldLabel>Pincode</FieldLabel>
                    <Input
                      value={draft.permanent.pincode}
                      readOnly={draft.sameAsCurrent}
                      invalid={!!zipError.permanent}
                      onChange={(v) => {
                        const numeric = String(v || '').replace(/\D/g, '').slice(0, 6);
                        lastZip.current.permanent = '';
                        setDraft((d) => ({ ...d, permanent: { ...d.permanent, pincode: numeric } }));
                      }}
                    />
                    <div className="mt-1 min-h-[14px] text-[10px] text-slate-500">
                      {zipLoading.permanent ? 'Looking up zipcode...' : zipError.permanent ? (
                        <span className="text-red-400">{zipError.permanent}</span>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <ModalActions
              primaryLabel={patchMutation.isPending ? 'Updating...' : 'Update'}
              onCancel={closeModal}
              onPrimary={saveDraft}
            />
          </>
        ) : null}

        {modal.section === 'relations' && draft ? (
          <>
            <div className="rounded-lg border border-slate-800 bg-slate-950/30 p-6">
              <div className="text-sm font-semibold text-slate-100">No relations yet</div>
              <div className="mt-1 text-sm text-slate-400">
                Add family members or emergency contacts to keep your profile complete.
              </div>
              <button
                type="button"
                className="mt-4 text-sm font-semibold text-accent hover:brightness-110"
                onClick={() => {}}
              >
                + Add new relation
              </button>
            </div>
            <ModalActions primaryLabel="Save" onCancel={closeModal} onPrimary={saveDraft} />
          </>
        ) : null}
      </Modal>

      <Modal open={docPreview.open} title={docPreview.title} onClose={closeDocPreview}>
        {docPreview.url ? (
          <div className="space-y-3">
            <div className="text-sm text-slate-400 break-all">{docPreview.url}</div>
            {/\.(png|jpe?g|gif|webp)$/i.test(docPreview.url) ? (
              <img src={docPreview.url} alt={docPreview.title} className="max-h-[70vh] w-full rounded-lg object-contain" />
            ) : (
              <iframe
                title={docPreview.title}
                src={docPreview.url}
                className="h-[70vh] w-full rounded-lg border border-slate-800 bg-slate-950"
              />
            )}
            <a
              href={docPreview.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 text-sm font-semibold text-accent hover:brightness-110"
            >
              Open in new tab <span aria-hidden="true">›</span>
            </a>
          </div>
        ) : (
          <div className="text-sm text-slate-400">No file available.</div>
        )}
      </Modal>

      {toast ? (
        <div className="fixed bottom-6 right-6 z-50 rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-medium text-slate-100 shadow-lg">
          {toast}
        </div>
      ) : null}
      </div>
    </div>
  );
}

