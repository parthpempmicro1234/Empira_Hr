import PolicyInfoBox from './PolicyInfoBox.jsx';
import PolicySection from './PolicySection.jsx';

export default function TimeTrackingPolicyContent() {
  return (
    <div className="max-w-4xl">
      <p className="text-sm text-gray-400">Below are the details of time tracking policy assigned to you</p>

      <PolicySection title="Bio-Metric & Web Clock-In" className="mt-8">
        <p>Your attendance is automatically tracked using biometric device(s)</p>
        <PolicyInfoBox>
          In case you forget ID/Access card, you are allowed to mark using web clock-in.
        </PolicyInfoBox>
        <p>
          Your attendance is tracked using web clock-in, i.e you have to log in to Keka website and mark your
          attendance (Browser Only)
        </p>
      </PolicySection>

      <PolicySection title="Remote Punches/Clock-In">
        <p>Your attendance is tracked from clock-in/out done from Keka web browser</p>
      </PolicySection>

      <PolicySection title="Work from Home (WFH)">
        <p>You are allowed to take 1 day(s) of WFH in a Month.</p>
        <p>You cannot apply for WFH on Holidays &amp; Weekly Offs.</p>
        <p>WFH request can be raised only 1 time(s) in a Month.</p>
        <p>You can request for full day, half day WFH</p>
        <p>
          You are required to clock-in/out when doing WFH. In case of late clock-in, no clock-in, or less
          effective/gross hours clocked, the system will penalise based on penalisation policy assigned to you.
        </p>
        <p>WFH request requires 2 day(s) of prior notice, containing at least 2 working day(s)</p>
        <PolicyInfoBox>Approval is required for all WFH requests</PolicyInfoBox>
      </PolicySection>

      <PolicySection title="Regularization">
        <p>
          In case of penalisation due to attendance discrepancy, you are allowed to request regularisation, 30
          time(s) in a Month.
        </p>
        <p>
          You are allowed to raise regularisation request for past dates of current month till last day of current
          month.
        </p>
        <p>You are allowed to raise regularisation request for past 5 day(s).</p>
      </PolicySection>
    </div>
  );
}
