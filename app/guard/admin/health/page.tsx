import {auth} from '@clerk/nextjs/server';
import {notFound,redirect} from 'next/navigation';
import {operatorApi,OperatorError} from '../operator-api';
import OperationsPanel from './OperationsPanel';
import type {Snapshot} from './OperationsPanel';
export const metadata={title:'BodeeGuard service health',robots:{index:false,follow:false}};
export default async function HealthPage(){
 if(!(await auth()).isAuthenticated)redirect('/guard/sign-in/?redirect_url=%2Fadmin%2Fhealth%2F');
 let initial:Snapshot|null=null;
 try{initial=await operatorApi<Snapshot>('/operations');}catch(error){if(error instanceof OperatorError&&[401,403].includes(error.status))notFound();}
 return <OperationsPanel initial={initial}/>;
}
