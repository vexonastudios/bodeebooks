import {auth} from "@clerk/nextjs/server";
import {notFound,redirect} from "next/navigation";
import {operatorApi,OperatorError} from "./operator-api";
import OperatorPanel from "./OperatorPanel";
import type {Overview} from "./types";
export const metadata={title:"BodeeGuard staff",robots:{index:false,follow:false}};
export default async function StaffPage(){
  if(!(await auth()).isAuthenticated)redirect("/guard/sign-in/?redirect_url=%2Fadmin%2F");
  let overview:Overview;
  try{overview=await operatorApi<Overview>();}catch(error){if(error instanceof OperatorError&&[401,403].includes(error.status))notFound();throw error;}
  return <OperatorPanel initial={overview}/>;
}
