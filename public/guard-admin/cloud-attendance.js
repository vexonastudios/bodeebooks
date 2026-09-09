import { node, decorateSetup } from './cloud-setup-controls.js';
export function setupCloudAttendance() {
  let generation=0,lastKey='';
  async function request(action,input) {
    const response=await fetch('/guard/dashboard/bridge/',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,...input})});
    const result=await response.json();if(!response.ok)throw Error(result.error||'Check-ins could not be loaded.');return result;
  }
  return {async render(host,date,snapshot,force=false){
    const key=JSON.stringify([date,snapshot.rules.revision,Math.floor(new Date(snapshot.serverTime).getTime()/30000)]);
    if(!force&&key===lastKey&&host.childElementCount)return;lastKey=key;const token=++generation;
    host.replaceChildren(node('h3','School check-in'),node('p','Loading…','cloud-note'));
    try {
      const result=await request('attendance-list',{date});if(token!==generation||!host.isConnected)return;
      host.replaceChildren(node('h3','School check-in'));
      if(!result.rows.length)host.append(node('p',result.enabled?'No check-ins for this day. New coin settings start tomorrow.':'Late coins are off.','cloud-note'));
      for(const record of result.rows){
        const row=node('div','','cloud-day-subject');row.append(node('strong',record.name));
        const status={excused:'Excused','on-time':'On time',late:'Started late','waiting-late':'Waiting for schoolwork',waiting:'Waiting for schoolwork'}[record.status];
        row.append(node('span',`${status}${record.penaltyCoins?` · −${record.penaltyCoins} coins`:''}${record.bonusCoins?` · +${record.bonusCoins} coins`:''}`));
        if(record.status!=='excused'&&(record.status==='late'||record.status==='waiting-late')){
          const button=node('button','Excuse late start','btn btn-secondary');button.type='button';
          button.onclick=async()=>{button.disabled=true;try{await request('attendance-excuse',{date,studentId:record.studentId});await this.render(host,date,snapshot,true);}catch(error){row.append(node('p',error.message,'setup-error'));button.disabled=false;}};row.append(button);
        }
        host.append(row);
      }
      decorateSetup(host);
    }catch(error){if(token===generation&&host.isConnected)host.replaceChildren(node('p',error.message,'cloud-note'));}
  }};
}
