import type {ExtensionAuthState,LocalConversation} from "./types";

const QUEUE_KEY="replayLocalQuickAccess";
const AUTH_KEY="replayAuth";
const MAX_QUEUE_SIZE=25;

export async function getQuickAccess():Promise<LocalConversation[]>{
  const result=await chrome.storage.local.get(QUEUE_KEY);
  const value=result[QUEUE_KEY];
  return Array.isArray(value)?value as LocalConversation[]:[];
}

export async function setQuickAccess(conversations:LocalConversation[]){
  await chrome.storage.local.set({[QUEUE_KEY]:conversations.slice(-MAX_QUEUE_SIZE)});
}

export async function upsertLocalConversation(conversation:LocalConversation):Promise<LocalConversation[]>{
  const current=await getQuickAccess();
  const existingIndex=current.findIndex(item=>sameConversation(item,conversation));
  let next:LocalConversation[];

  if(existingIndex>=0){
    const updated={
      ...current[existingIndex],
      ...conversation,
      firstSeenAt:current[existingIndex].firstSeenAt
    };
    next=[...current.slice(0,existingIndex),...current.slice(existingIndex+1),updated];
  }else{
    next=[...current,conversation];
  }

  next=next.slice(-MAX_QUEUE_SIZE);
  await setQuickAccess(next);
  return next;
}

export async function updateLocalConversation(localId:string,patch:Partial<LocalConversation>){
  const current=await getQuickAccess();
  const next=current.map(item=>item.localId===localId?{...item,...patch}:item);
  await setQuickAccess(next);
  return next;
}

export async function getAuthState():Promise<ExtensionAuthState>{
  const result=await chrome.storage.local.get(AUTH_KEY);
  const value=result[AUTH_KEY];

  if(!value||typeof value!=="object"){
    return {accessToken:null,user:null};
  }

  return {
    accessToken:typeof value.accessToken==="string"?value.accessToken:null,
    user:value.user??null
  };
}

export async function setAuthState(auth:ExtensionAuthState){
  await chrome.storage.local.set({[AUTH_KEY]:auth});
}

export async function clearAuthState(){
  await chrome.storage.local.remove(AUTH_KEY);
}

export function sameConversation(a:LocalConversation,b:LocalConversation){
  if(a.providerConversationId&&b.providerConversationId){
    return a.provider===b.provider&&a.providerConversationId===b.providerConversationId;
  }
  return a.provider===b.provider&&a.url===b.url;
}

export {MAX_QUEUE_SIZE};