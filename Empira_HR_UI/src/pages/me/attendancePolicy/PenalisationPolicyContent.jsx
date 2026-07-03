import PolicyInfoBox from './PolicyInfoBox.jsx';
import PolicySection from './PolicySection.jsx';

export default function PenalisationPolicyContent() {
  return (
    <div className="max-w-4xl">
      <p className="text-sm text-gray-400">Below are the details of your Penalisation Policy</p>
      <p className="mt-1 text-sm text-gray-400">Penalisation policy is effective 10 Sept 2024</p>

      <PolicySection title="No Attendance" className="mt-8">
        <p>
          You will be penalized <span className="text-white">1.5 day(s)</span> of Unpaid Leave (Loss of Pay) for
          every single missing attendance day
        </p>
        <PolicyInfoBox>
          You have a buffer period of 2 day(s) to regularize your attendance before the penalization happens.
        </PolicyInfoBox>
      </PolicySection>

      <PolicySection title="Late Arrival">
        <PolicyInfoBox>
          You have a grace period (tolerance) of 30 minutes beyond which your arrival will be considered as late.
        </PolicyInfoBox>
        <p>
          You can come <span className="text-white">3 time(s)</span> late in a month, beyond which you will be
          penalized with <span className="text-white">0 day(s)</span> of Unpaid Leave (Loss of Pay) for every{' '}
          <span className="text-white">1 incident(s)</span>.
        </p>
        <PolicyInfoBox>
          If required 100% effective hours are met, the given day will not be considered for late arrival
          penalization.
        </PolicyInfoBox>
        <PolicyInfoBox>
          You have a buffer period of 2 day(s) to regularize your attendance before the penalization happens.
        </PolicyInfoBox>
      </PolicySection>

      <PolicySection title="Work Hours">
        <p>There is no penalization for number of work hours you spend in office.</p>
      </PolicySection>

      <PolicySection title="Missing Swipes">
        <p>
          In case of missing swipes exceeding <span className="text-white">0 working day(s)</span> in a week,{' '}
          <span className="text-white">1 day(s)</span> of Unpaid Leave (Loss of Pay)
        </p>
        <PolicyInfoBox>
          You have a buffer period of 2 day(s) to regularize your attendance before the penalization happens.
        </PolicyInfoBox>
      </PolicySection>
    </div>
  );
}
