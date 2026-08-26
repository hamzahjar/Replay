import type {CurrentConversation} from "./types";
import {getQuickAccess,upsertLocalConversation} from "./storage";

let latestConversation:CurrentConversation|null=null;

function isChatGPTUrl(url:string){
  try{
    const parsed=new URL(url);

    return parsed.protocol==="https:"&&(
      parsed.hostname==="chatgpt.com"||
      parsed.hostname==="www.chatgpt.com"
    );
  }catch{
    return false;
  }
}

function toLocalConversation(
  conversation:CurrentConversation,
  existing?:Awaited<ReturnType<typeof getQuickAccess>>[number]
){
  const now=new Date().toISOString();

  return {
    ...conversation,

    /*
      Preserve AI-generated descriptions if this conversation
      already has them.

      content.ts provides a local fallback description, but the
      backend-generated descriptions are better and must not be
      overwritten every time ChatGPT's DOM changes.
    */
    shortDescription:
      existing?.shortDescription ||
      conversation.shortDescription,

    longDescription:
      existing?.longDescription ||
      conversation.longDescription,

    localId:conversation.providerConversationId
      ?`${conversation.provider}:${conversation.providerConversationId}`
      :`${conversation.provider}:${conversation.url}`,

    firstSeenAt:
      existing?.firstSeenAt ??
      now,

    lastSeenAt:now,

    syncStatus:
      existing?.syncStatus ??
      "local",

    replayId:existing?.replayId
  };
}

async function handleConversation(
  conversation:CurrentConversation
){
  latestConversation=conversation;

  const existingConversations=await getQuickAccess();

  const existing=existingConversations.find(
    item =>
      item.provider===conversation.provider&&
      (
        (
          conversation.providerConversationId&&
          item.providerConversationId===
            conversation.providerConversationId
        )||
        item.url===conversation.url
      )
  );

  await upsertLocalConversation(
    toLocalConversation(
      conversation,
      existing
    )
  );
}

chrome.runtime.onMessage.addListener(
  (message,_sender,sendResponse)=>{
    if(
      message?.type===
      "CURRENT_CONVERSATION_UPDATED"
    ){
      void handleConversation(
        message.conversation as CurrentConversation
      );

      return;
    }

    if(
      message?.type===
      "GET_BACKGROUND_CURRENT_CONVERSATION"
    ){
      sendResponse(latestConversation);

      return true;
    }

    return false;
  }
);

chrome.tabs.onUpdated.addListener(
  (tabId,changeInfo,tab)=>{
    if(
      changeInfo.status!=="complete"||
      !tab.url||
      !isChatGPTUrl(tab.url)
    ){
      return;
    }

    chrome.tabs.sendMessage(
      tabId,
      {
        type:"GET_CURRENT_CONVERSATION"
      }
    )
      .then(conversation=>{
        if(conversation){
          void handleConversation(
            conversation as CurrentConversation
          );
        }
      })
      .catch(()=>{});
  }
);