import {auth} from '@clerk/nextjs/server';
import {redirect} from 'next/navigation';
import ReportForm from './ReportForm';
export const metadata={title:'Report a bug · BodeeGuard',robots:{index:false,follow:false}};
export default async function ReportPage(){
  if(!(await auth()).isAuthenticated)redirect('/guard/sign-in/?redirect_url=%2Fguard%2Freport%2F');
  const release=process.env.BODEEGUARD_MONITOR_RELEASE||process.env.VERCEL_GIT_COMMIT_SHA||'unknown';
  return <ReportForm release={/^[a-f0-9]{7,40}$/.test(release)?release:'unknown'}/>;
}
