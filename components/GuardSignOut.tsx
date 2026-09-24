"use client";
import {useAuth,useClerk} from "@clerk/nextjs";
import {useRef,useState} from "react";
import {LogOut} from "lucide-react";
import {stopParentPhoneNotifications} from "@/app/guard/dashboard/parent-notifications-client.js";

export function useGuardSignOut(){
  const {signOut}=useClerk(),{userId}=useAuth(),pending=useRef(false);
  const [error,setError]=useState(""),[leaving,setLeaving]=useState(false);
  async function leave(){
    if(pending.current)return;
    pending.current=true;setLeaving(true);setError("");
    try{
      await stopParentPhoneNotifications({userId:userId||undefined});
      await signOut({redirectUrl:"/guard/sign-in/"});
    }catch{
      setError("Could not stop this device’s alerts. Try again, or turn off BodeeGuard notifications in browser settings before signing out.");
      pending.current=false;setLeaving(false);
    }
  }
  return {leave,error,leaving};
}
export default function GuardSignOut({className}:{className?:string}){
  const {leave,error,leaving}=useGuardSignOut();
  return <div>
    <button type="button" className={className} disabled={leaving} onClick={()=>void leave()}><LogOut size={17}/>{leaving?"Signing out…":"Sign out of this device"}</button>
    <p>Signing out turns off message alerts on this device. Your other devices stay connected.</p>
    {error&&<p role="alert">{error}</p>}
  </div>;
}
