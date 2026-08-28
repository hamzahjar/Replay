import type {CurrentConversation,ExtensionAuthState,LocalConversation} from "./types";

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


/*
  Builds the stored form of a detected conversation, preserving
  any AI-generated descriptions and sync state already recorded
  for it.
*/
export function toLocalConversation(
  conversation:CurrentConversation,
  existing?:LocalConversation
):LocalConversation{
  const now=new Date().toISOString();

  return {
    ...conversation,
    shortDescription:
      existing?.shortDescription||conversation.shortDescription,
    longDescription:
      existing?.longDescription||conversation.longDescription,
    localId:conversation.providerConversationId
      ?`${conversation.provider}:${conversation.providerConversationId}`
      :`${conversation.provider}:${conversation.url}`,
    firstSeenAt:existing?.firstSeenAt??now,
    lastSeenAt:now,
    syncStatus:existing?.syncStatus??"local",
    replayId:existing?.replayId
  };
}

/*
  Adds the conversation the user is currently viewing to the
  quick-access queue. Called only when the popup is opened, so
  simply browsing ChatGPT does not collect conversations.
*/
export async function rememberCurrentConversation(
  conversation:CurrentConversation
):Promise<LocalConversation[]>{
  const current=await getQuickAccess();
  const existing=current.find(
    item=>
      item.provider===conversation.provider&&
      (
        (
          conversation.providerConversationId&&
          item.providerConversationId===conversation.providerConversationId
        )||
        item.url===conversation.url
      )
  );

  return upsertLocalConversation(
    toLocalConversation(conversation,existing)
  );
}

/*
  Removes every locally queued conversation. Used on sign-out so
  one account's conversations are not visible to the next.
*/
export async function clearQuickAccess(){
  await chrome.storage.local.remove(QUEUE_KEY);
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