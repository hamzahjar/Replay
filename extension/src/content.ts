import type {ConversationMessage,CurrentConversation,MessageRole,Provider} from "./types";

const PROVIDER:Provider="chatgpt";
let lastSignature="";
let lastConversationId:string|null=null;

function normalizeText(value:string){
  return value.replace(/\u00a0/g," ").replace(/\s+/g," ").trim();
}

function getConversationId():string|null{
  return window.location.pathname.match(/^\/c\/([a-zA-Z0-9_-]+)(?:\/|$)/)?.[1]??null;
}

function getRole(element:Element):MessageRole{
  const role=normalizeText(
    element.getAttribute("data-message-author-role") ??
    element.getAttribute("data-role") ??
    ""
  ).toLowerCase();

  if(role==="user")return "user";
  if(role==="assistant")return "assistant";
  if(role==="system")return "system";
  return "unknown";
}

function findMessageElements():Element[]{
  const selectors=[
    "[data-message-author-role]",
    "[data-testid^='conversation-turn-']"
  ];

  for(const selector of selectors){
    const elements=Array.from(document.querySelectorAll(selector));
    if(elements.length)return elements;
  }

  return [];
}

function extractMessages():ConversationMessage[]{
  const messages:ConversationMessage[]=[];

  for(const element of findMessageElements()){
    const role=getRole(element);
    const contentElement=element.querySelector(".markdown")??element;
    const content=normalizeText(contentElement.textContent??"");

    if(!content)continue;

    const previous=messages.at(-1);
    if(previous?.role===role&&previous.content===content)continue;

    messages.push({role,content});
  }

  return messages;
}

function getStableTitle(conversationId:string|null):string{
  if(conversationId){
    const links=Array.from(
      document.querySelectorAll<HTMLAnchorElement>("a[href*='/c/']")
    );

    for(const link of links){
      const href=link.getAttribute("href")??"";
      if(!href.includes(`/c/${conversationId}`))continue;

      const title=normalizeText(link.textContent??"");
      if(title&&title.toLowerCase()!=="chatgpt")return title;
    }
  }

  const headingCandidates=Array.from(
    document.querySelectorAll("main h1, header h1, h1")
  );

  for(const element of headingCandidates){
    const title=normalizeText(element.textContent??"");
    if(title&&title.toLowerCase()!=="chatgpt")return title;
  }

  return conversationId?"Untitled ChatGPT Conversation":"New ChatGPT Conversation";
}

/*
  Until the backend AI preview endpoint is connected, this is deliberately only
  a local fallback. It uses multiple parts of the accessible conversation rather
  than presenting the first message as the description.

  Once the backend is connected, AI-generated short/long descriptions will
  replace this fallback without exposing the OpenAI API key to the extension.
*/
function createLocalDescriptions(title:string,messages:ConversationMessage[]){
  const meaningful=messages
    .filter(message=>message.role==="user"||message.role==="assistant")
    .map(message=>normalizeText(message.content))
    .filter(Boolean);

  const selected:string[]=[];
  const seen=new Set<string>();

  for(const text of meaningful){
    const sentences=text.split(/(?<=[.!?])\s+/).map(normalizeText).filter(Boolean);

    for(const sentence of sentences){
      const key=sentence.toLowerCase().slice(0,80);
      if(seen.has(key))continue;

      seen.add(key);
      selected.push(sentence);

      if(selected.length>=4)break;
    }

    if(selected.length>=4)break;
  }

  if(selected.length===0){
    return {
      shortDescription:`A conversation titled ${title}.`,
      longDescription:`A conversation titled ${title}.`
    };
  }

  const longDescription=selected.slice(0,4).join(" ");
  const shortDescription=longDescription.length>170
    ?`${longDescription.slice(0,167).trimEnd()}…`
    :longDescription;

  return {shortDescription,longDescription};
}

function buildConversation():CurrentConversation{
  const providerConversationId=getConversationId();
  const title=getStableTitle(providerConversationId);
  const messages=extractMessages();
  const descriptions=createLocalDescriptions(title,messages);

  return {
    provider:PROVIDER,
    providerConversationId,
    title,
    shortDescription:descriptions.shortDescription,
    longDescription:descriptions.longDescription,
    url:window.location.href,
    messages,
    detectedAt:new Date().toISOString()
  };
}

function signatureFor(conversation:CurrentConversation){
  return JSON.stringify({
    provider:conversation.provider,
    id:conversation.providerConversationId,
    title:conversation.title,
    url:conversation.url,
    messageCount:conversation.messages.length
  });
}

function notifyExtension(){
  const conversation=buildConversation();
  const signature=signatureFor(conversation);

  if(signature===lastSignature)return;

  lastSignature=signature;

  chrome.runtime.sendMessage({
    type:"CURRENT_CONVERSATION_UPDATED",
    conversation
  }).catch(()=>{});
}

function observeConversation(){
  const conversationId=getConversationId();

  if(conversationId!==lastConversationId){
    lastConversationId=conversationId;
    lastSignature="";
  }

  notifyExtension();
}

const observer=new MutationObserver(()=>{
  window.setTimeout(observeConversation,500);
});

observer.observe(document.documentElement,{
  childList:true,
  subtree:true,
  characterData:true
});

window.setTimeout(observeConversation,700);

chrome.runtime.onMessage.addListener((message,_sender,sendResponse)=>{
  if(message?.type==="GET_CURRENT_CONVERSATION"){
    sendResponse(buildConversation());
    return true;
  }

  return false;
});