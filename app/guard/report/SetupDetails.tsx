import type {Setup} from './types';
export default function SetupDetails({setup}:{setup:Setup}){
  return <div>
    <p><strong>Children:</strong> {setup.students.map(s=>s.name+(s.grade?' · Grade '+s.grade:'')+(s.schoolProvider?' · '+s.schoolProvider:'')).join('; ')||'No children selected'}</p>
    {setup.setupIncluded===false?<p>Setup details were not attached.</p>:<>
      {setup.devices?.map(d=><p key={d.id}><strong>{d.name}</strong> · {d.platform} · App {d.appVersion} ({d.releaseChannel})<br/><small>Last check-in: {d.lastSeenAt?new Date(d.lastSeenAt).toLocaleString():'Not yet reported'} · {d.locked?'Computer locked':'Computer not locked'} · Settings {d.acknowledgedRevision}/{d.settingsRevision}</small></p>)}
      {!setup.devices?.length&&<p>No linked computers in this selection.</p>}
      {setup.school&&<p>School time zone: {setup.school.timeZone||'Not set'} · Rules revision {setup.school.rulesRevision}</p>}
      {!!setup.recentErrors?.length&&<p><strong>Recent errors:</strong> {setup.recentErrors.map(e=>e.reference+' · '+e.code+' · '+e.stage).join('; ')}</p>}
      {setup.browser&&<p><strong>Parent device:</strong> {String(setup.browser.platform)} · {String(setup.browser.browser)} · {String(setup.browser.displayMode)}<br/><small>Time zone: {String(setup.browser.timeZone)} · Website {String(setup.browser.release)}</small></p>}
      {setup.capturedAt&&<small>Latest reported setup, captured {new Date(setup.capturedAt).toLocaleString()}. A check-in does not guarantee the computer is still online.</small>}
    </>}
  </div>;
}
