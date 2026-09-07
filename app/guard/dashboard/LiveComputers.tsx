"use client";

import { useEffect, useState } from "react";
import type { CloudDashboard } from "./cloud-api";
import { assignCloudStudent, setCloudComputerLock } from "./actions";
import SubmitButton from "../SubmitButton";
import RecoveryCode from "./RecoveryCode";
import styles from "./dashboard.module.css";

export default function LiveComputers({ initial }: { initial: CloudDashboard }) {
  const [snapshot, setSnapshot] = useState(initial);
  const [error, setError] = useState("");
  useEffect(() => {
    let canceled = false;
    let pending = false;
    let controller: AbortController | null = null;
    const refresh = async () => {
      if (document.hidden || pending) return;
      pending = true;
      controller = new AbortController();
      const timeout = setTimeout(() => controller?.abort(), 10000);
      try {
        const response = await fetch("/guard/dashboard/status/", { cache: "no-store", signal: controller.signal });
        if (!response.ok) throw new Error("Connection lost");
        const data = await response.json() as CloudDashboard;
        if (!canceled) { setSnapshot(data); setError(""); }
      } catch { if (!canceled) setError("Connection interrupted. Showing the last received status; computers may have changed since then."); }
      finally { clearTimeout(timeout); pending = false; }
    };
    const interval = setInterval(refresh, 30000);
    document.addEventListener("visibilitychange", refresh);
    return () => { canceled = true; clearInterval(interval); controller?.abort(); document.removeEventListener("visibilitychange", refresh); };
  }, []);
  return <>
    {error && <p className={styles.warning} role="status">{error}</p>}
    {!snapshot.devices.length && <p className={styles.empty}>No child computers paired yet. A cloud-enabled child installation will display a pairing code for you to approve in your account.</p>}
    <div className={styles.grid}>{snapshot.devices.map(device => {
      const age = device.last_seen_at ? Date.parse(snapshot.serverTime) - Date.parse(device.last_seen_at) : Infinity;
      const online = !error && age >= -5000 && age < 90000;
      const child = snapshot.students.find(student => student.id === device.student_id);
      const applied = device.acknowledged_revision === device.revision;
      return <article className={styles.card} key={device.id}>
        <div className={styles.cardHeading}><h3>{child?.name || device.computer_name}</h3><span className={online ? styles.online : styles.offline}>{online ? "Connected" : "Not connected"}</span></div>
        <p>{device.computer_name} · {device.app_version}</p>
        <p>{online ? snapshot.rules.subjects.find(subject => subject.id === device.current_subject)?.title || device.current_subject || "School dashboard" : "Waiting for the child computer to connect to the cloud."}</p>
        <p>{device.locked ? "Parent lock requested" : "Parent lock off"} · {applied && online ? "Confirmed by computer" : "Waiting for confirmation"}</p>
        <form action={assignCloudStudent} className={styles.inlineForm}>
          <input type="hidden" name="deviceId" value={device.id} />
          <label>Child<select name="studentId" defaultValue={device.student_id || ""} key={device.student_id || "unassigned"}>
            <option value="">Choose a child</option>{snapshot.students.map(student => <option key={student.id} value={student.id}>{student.name}</option>)}
          </select></label><SubmitButton className={styles.secondary} pendingLabel="Saving…">Assign</SubmitButton>
        </form>
        <form action={setCloudComputerLock}>
          <input type="hidden" name="deviceId" value={device.id} /><input type="hidden" name="locked" value={String(!device.locked)} />
          <SubmitButton className={device.locked ? styles.button : styles.secondary} pendingLabel="Saving…">{device.locked ? "Resume cloud school" : "Pause cloud school"}</SubmitButton>
        </form>
        <RecoveryCode device={device} />
      </article>;
    })}</div>
    <h3 className={styles.activityHeading}>Received cloud school time</h3>
    <p>Last 14 days of synced activity, grouped by UTC date. These are school-session minutes, not verified lesson completion.</p>
    {!snapshot.activity?.length ? <p className={styles.empty}>No cloud school-time checkpoints received yet.</p> :
      <div className={styles.tableScroll}><table className={styles.activityTable}>
        <caption>School time received from cloud-connected computers</caption>
        <thead><tr><th scope="col">Date (UTC)</th><th scope="col">Child</th><th scope="col">Subject</th><th scope="col">Time</th></tr></thead>
        <tbody>{snapshot.activity.map(row => <tr key={`${row.date_utc}:${row.student_id}:${row.subject_id}`}>
          <td>{row.date_utc}</td><td>{snapshot.students.find(student => student.id === row.student_id)?.name || "Previous student"}</td>
          <td>{snapshot.rules.subjects.find(subject => subject.id === row.subject_id)?.title || "Previous school subject"}</td>
          <td>{Math.floor(row.seconds / 60)}m {row.seconds % 60}s</td>
        </tr>)}</tbody>
      </table></div>}
  </>;
}
