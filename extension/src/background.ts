import type {CurrentConversation} from "./types";

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

/*
  Only remembers the conversation currently detected in the
  browser. It is deliberately NOT written to the quick-access
  queue here: browsing ChatGPT should not silently collect
  every conversation you open. The popup adds the detected
  conversation to the queue when the user actually opens it.
*/
function handleConversation(
  conversation:CurrentConversation
){
  latestConversation=conversation;
}

chrome.runtime.onMessage.addListener(
  (message,_sender,sendResponse)=>{
    if(
      message?.type===
      "CURRENT_CONVERSATION_UPDATED"
    ){
      handleConversation(
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