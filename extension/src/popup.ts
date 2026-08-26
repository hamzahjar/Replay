import {
  getAuthState,
  getQuickAccess,
  updateLocalConversation
} from "./storage";

import {
  generatePreviewMetadata,
  login,
  logout,
  openReplayWebsite,
  register,
  saveConversation
} from "./api";

import type {
  CurrentConversation,
  LocalConversation
} from "./types";

const $=<T extends HTMLElement>(id:string)=>{
  const element=document.getElementById(id);

  if(!element){
    throw new Error(`Missing element #${id}`);
  }

  return element as T;
};

const mainView=$<HTMLElement>("main-view");
const loginView=$<HTMLElement>("login-view");
const detailView=$<HTMLElement>("detail-view");

const currentTitle=$<HTMLHeadingElement>("current-title");
const currentEmpty=$<HTMLElement>("current-empty");
const currentCard=$<HTMLButtonElement>("current-card");
const currentShortDescription=
  $<HTMLParagraphElement>(
    "current-short-description"
  );

const quickList=$<HTMLElement>("quick-list");
const quickCount=$<HTMLSpanElement>("quick-count");
const saveAllButton=$<HTMLButtonElement>(
  "save-all-button"
);

const accountButton=$<HTMLButtonElement>(
  "account-button"
);

const websiteButton=$<HTMLButtonElement>(
  "website-button"
);

const refreshButton=$<HTMLButtonElement>(
  "refresh-button"
);

const authTitle=$<HTMLHeadingElement>(
  "auth-title"
);

const authSubtitle=$<HTMLParagraphElement>(
  "auth-subtitle"
);

const loginForm=$<HTMLFormElement>(
  "login-form"
);

const displayNameField=$<HTMLElement>(
  "display-name-field"
);

const displayNameInput=$<HTMLInputElement>(
  "login-display-name"
);

const emailInput=$<HTMLInputElement>(
  "login-email"
);

const passwordInput=$<HTMLInputElement>(
  "login-password"
);

const confirmPasswordField=$<HTMLElement>(
  "confirm-password-field"
);

const confirmPasswordInput=$<HTMLInputElement>(
  "login-confirm-password"
);

const loginSubmit=$<HTMLButtonElement>(
  "login-submit"
);

const loginStatus=$<HTMLParagraphElement>(
  "login-status"
);

const authSwitchText=$<HTMLSpanElement>(
  "auth-switch-text"
);

const authSwitchButton=$<HTMLButtonElement>(
  "auth-switch-button"
);

const backToExtensionButton=$<HTMLButtonElement>(
  "back-to-extension-button"
);

const detailTitle=$<HTMLHeadingElement>(
  "detail-title"
);

const detailShortDescription=
  $<HTMLParagraphElement>(
    "detail-short-description"
  );

const detailLongDescription=
  $<HTMLParagraphElement>(
    "detail-long-description"
  );

const detailMessageCount=$<HTMLSpanElement>(
  "detail-message-count"
);

const detailSyncStatus=$<HTMLSpanElement>(
  "detail-sync-status"
);

const detailSaveButton=$<HTMLButtonElement>(
  "detail-save-button"
);

const detailOriginalButton=
  $<HTMLButtonElement>(
    "detail-original-button"
  );

const detailStatus=$<HTMLParagraphElement>(
  "detail-status"
);

const detailBackButton=$<HTMLButtonElement>(
  "detail-back-button"
);

let currentConversation:
  CurrentConversation|null=null;

let selectedConversation:
  LocalConversation|null=null;

let authMode:"login"|"register"="login";

let lastPreviewSignature="";

let previewInFlight=false;

function showView(
  view:"main"|"login"|"detail"
){
  mainView.classList.toggle(
    "hidden",
    view!=="main"
  );

  loginView.classList.toggle(
    "hidden",
    view!=="login"
  );

  detailView.classList.toggle(
    "hidden",
    view!=="detail"
  );
}

function formatDescription(
  value:string,
  maxLength=170
){
  const normalized=value
    .replace(/\s+/g," ")
    .trim();

  if(normalized.length<=maxLength){
    return normalized;
  }

  return `${normalized
    .slice(0,maxLength-1)
    .trimEnd()}…`;
}

function getSyncStatusText(
  status:LocalConversation["syncStatus"]
){
  if(status==="saved"){
    return "Saved";
  }

  if(status==="saving"){
    return "Saving…";
  }

  if(status==="error"){
    return "Error";
  }

  return "Local only";
}

async function getActiveChatGPTTab(){
  const tabs=await chrome.tabs.query({
    active:true,
    currentWindow:true
  });

  const tab=tabs[0];

  if(!tab?.id||!tab.url){
    return null;
  }

  try{
    const url=new URL(tab.url);

    if(
      url.protocol==="https:"&&
      (
        url.hostname==="chatgpt.com"||
        url.hostname==="www.chatgpt.com"
      )
    ){
      return tab;
    }
  }catch{}

  return null;
}

async function detectCurrent(){
  const tab=await getActiveChatGPTTab();

  if(!tab?.id){
    currentConversation=null;

    renderCurrentEmpty();

    return;
  }

  try{
    const conversation=
      await chrome.tabs.sendMessage(
        tab.id,
        {
          type:"GET_CURRENT_CONVERSATION"
        }
      ) as CurrentConversation;

    if(!conversation){
      renderCurrentEmpty(
        "ChatGPT is open, but no conversation is ready yet."
      );

      return;
    }

    currentConversation=conversation;

    renderCurrentConversation(
      conversation
    );

    /*
      Immediately ask the backend for the AI-generated
      title/short description/long description.

      The local DOM description is only a temporary fallback.
    */
    void maybeGenerateAIPreview(
      conversation
    );
  }catch{
    renderCurrentEmpty(
      "Refresh the ChatGPT tab and open a conversation."
    );
  }
}

function renderCurrentEmpty(
  message=
    "Open a conversation on ChatGPT to preview it here."
){
  currentTitle.textContent=
    "No ChatGPT conversation detected";

  currentCard.classList.add("hidden");

  currentEmpty.classList.remove("hidden");

  const paragraph=
    currentEmpty.querySelector("p");

  if(paragraph){
    paragraph.textContent=message;
  }
}

function renderCurrentConversation(
  conversation:CurrentConversation
){
  currentTitle.textContent=
    conversation.title;

  currentEmpty.classList.add("hidden");

  currentCard.classList.remove("hidden");

  currentShortDescription.textContent=
    formatDescription(
      conversation.shortDescription
    );
}

async function maybeGenerateAIPreview(
  conversation:CurrentConversation
){
  const auth=await getAuthState();

  if(
    !auth.accessToken||
    conversation.messages.length===0
  ){
    return;
  }

  const signature=JSON.stringify({
    provider:conversation.provider,

    id:
      conversation.providerConversationId,

    messageCount:
      conversation.messages.length
  });

  if(
    signature===lastPreviewSignature||
    previewInFlight
  ){
    return;
  }

  lastPreviewSignature=signature;
  previewInFlight=true;

  try{
    const metadata=
      await generatePreviewMetadata(
        conversation
      );

    /*
      Replace the temporary DOM-generated
      descriptions with the actual backend AI
      descriptions.
    */
    currentConversation={
      ...conversation,

      title:
        metadata.title||
        conversation.title,

      shortDescription:
        metadata.short_description||
        conversation.shortDescription,

      longDescription:
        metadata.long_description||
        conversation.longDescription
    };

    renderCurrentConversation(
      currentConversation
    );

    const conversations=
      await getQuickAccess();

    const local=
      conversations.find(item=>
        item.provider===
          conversation.provider&&
        (
          item.providerConversationId===
            conversation.providerConversationId||
          item.url===
            conversation.url
        )
      );

    if(local){
      await updateLocalConversation(
        local.localId,
        {
          title:
            currentConversation.title,

          shortDescription:
            currentConversation.shortDescription,

          longDescription:
            currentConversation.longDescription
        }
      );

      await refreshQuickAccess();
    }
  }catch(error){
    if(
      error instanceof Error&&
      error.message===
        "REPLAY_AUTH_EXPIRED"
    ){
      await refreshAuthUI();
    }
  }finally{
    previewInFlight=false;
  }
}

function renderQuickAccess(
  conversations:LocalConversation[]
){
  quickCount.textContent=
    `${conversations.length} / 25`;

  if(!conversations.length){
    quickList.innerHTML=
      `<div class="quick-empty">Open a ChatGPT conversation to add it to Quick Access.</div>`;

    saveAllButton.disabled=false;

    return;
  }

  saveAllButton.disabled=false;

  const display=[
    ...conversations
  ].reverse();

  quickList.innerHTML=
    display.map(
      (conversation,index)=>`
        <button
          class="quick-item"
          type="button"
          data-local-id="${escapeHtml(
            conversation.localId
          )}"
        >
          <span class="quick-item-number">
            ${index+1}
          </span>

          <span class="quick-item-content">
            <span class="quick-item-title">
              ${escapeHtml(
                conversation.title||
                "Untitled conversation"
              )}
            </span>

            <span class="quick-item-description">
              ${escapeHtml(
                formatDescription(
                  conversation.shortDescription,
                  110
                )
              )}
            </span>
          </span>
        </button>
      `
    )
    .join("");

  quickList
    .querySelectorAll<HTMLButtonElement>(
      ".quick-item"
    )
    .forEach(button=>{
      button.addEventListener(
        "click",
        async()=>{
          const localId=
            button.dataset.localId;

          if(!localId){
            return;
          }

          const conversations=
            await getQuickAccess();

          const conversation=
            conversations.find(
              item=>
                item.localId===localId
            );

          if(conversation){
            openDetails(
              conversation
            );
          }
        }
      );
    });
}

function escapeHtml(value:string){
  return value
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

function openDetails(
  conversation:LocalConversation
){
  selectedConversation=
    conversation;

  detailTitle.textContent=
    conversation.title;

  detailShortDescription.textContent=
    conversation.shortDescription;

  detailLongDescription.textContent=
    conversation.longDescription;

  detailMessageCount.textContent=
    String(
      conversation.messages.length
    );

  detailSyncStatus.textContent=
    getSyncStatusText(
      conversation.syncStatus
    );

  detailSaveButton.textContent=
    conversation.syncStatus==="saved"
      ?"Saved to Replay"
      :"Save to Replay";

  detailSaveButton.disabled=
    conversation.syncStatus==="saved";

  detailOriginalButton.disabled=
    !conversation.url;

  detailStatus.textContent="";

  showView("detail");
}

async function refreshQuickAccess(){
  const conversations=
    await getQuickAccess();

  renderQuickAccess(
    conversations
  );

  if(selectedConversation){
    const updated=
      conversations.find(
        item=>
          item.localId===
          selectedConversation?.localId
      );

    if(updated){
      selectedConversation=
        updated;

      detailSyncStatus.textContent=
        getSyncStatusText(
          updated.syncStatus
        );

      detailSaveButton.textContent=
        updated.syncStatus==="saved"
          ?"Saved to Replay"
          :"Save to Replay";

      detailSaveButton.disabled=
        updated.syncStatus==="saved";

      detailShortDescription.textContent=
        updated.shortDescription;

      detailLongDescription.textContent=
        updated.longDescription;
    }
  }
}

async function refreshAuthUI(){
  const auth=
    await getAuthState();

  if(auth.accessToken){
    accountButton.textContent=
      auth.user?.displayName??
      "Account";
  }else{
    accountButton.textContent=
      "Log in";
  }
}

function showAuth(
  mode:"login"|"register"
){
  authMode=mode;

  loginStatus.textContent="";

  loginStatus.classList.remove(
    "error"
  );

  passwordInput.value="";
  confirmPasswordInput.value="";

  const registering=
    mode==="register";

  authTitle.textContent=
    registering
      ?"Create your account"
      :"Welcome back";

  authSubtitle.textContent=
    registering
      ?"Start organizing your AI conversations."
      :"Sign in to continue to Replay.";

  displayNameField.classList.toggle(
    "hidden",
    !registering
  );

  confirmPasswordField.classList.toggle(
    "hidden",
    !registering
  );

  displayNameInput.required=
    registering;

  confirmPasswordInput.required=
    registering;

  loginSubmit.textContent=
    registering
      ?"Create Account"
      :"Sign In";

  authSwitchText.textContent=
    registering
      ?"Already have an account?"
      :"Don't have an account?";

  authSwitchButton.textContent=
    registering
      ?"Sign in"
      :"Create account";

  showView("login");
}

async function saveOne(
  conversation:LocalConversation
){
  detailStatus.textContent=
    "Saving to Replay…";

  try{
    await saveConversation(
      conversation
    );

    detailStatus.textContent=
      "✓ Saved to your Replay library.";

    await refreshQuickAccess();

    await refreshAuthUI();
  }catch(error){
    if(
      error instanceof Error&&
      error.message===
        "REPLAY_AUTH_REQUIRED"
    ){
      showAuth("login");

      loginStatus.textContent=
        "Log in to Replay to save this conversation.";

      return;
    }

    if(
      error instanceof Error&&
      error.message===
        "REPLAY_AUTH_EXPIRED"
    ){
      showAuth("login");

      loginStatus.textContent=
        "Your Replay session expired. Please sign in again.";

      return;
    }

    detailStatus.textContent=
      error instanceof Error
        ?error.message
        :"Could not save conversation.";
  }
}

async function saveAll(){
  const auth=
    await getAuthState();

  if(!auth.accessToken){
    showAuth("login");

    loginStatus.textContent=
      "Log in to Replay to save your Quick Access conversations.";

    return;
  }

  const conversations=
    await getQuickAccess();

  const unsaved=
    conversations.filter(
      item=>item.syncStatus!=="saved"
    );

  if(!unsaved.length){
    return;
  }

  saveAllButton.disabled=true;

  saveAllButton.textContent=
    `Saving 0 / ${unsaved.length}…`;

  let completed=0;

  for(const conversation of unsaved){
    try{
      await saveConversation(
        conversation
      );
    }catch(error){
      if(
        error instanceof Error&&
        error.message===
          "REPLAY_AUTH_EXPIRED"
      ){
        showAuth("login");

        break;
      }
    }

    completed++;

    saveAllButton.textContent=
      `Saving ${completed} / ${unsaved.length}…`;
  }

  await refreshQuickAccess();

  await refreshAuthUI();

  saveAllButton.textContent=
    "Save All to Replay";

  saveAllButton.disabled=false;
}

loginForm.addEventListener(
  "submit",
  async event=>{
    event.preventDefault();

    loginSubmit.disabled=true;

    loginStatus.classList.remove(
      "error"
    );

    loginStatus.textContent=
      authMode==="login"
        ?"Signing in…"
        :"Creating account…";

    try{
      if(authMode==="register"){
        const displayName=
          displayNameInput.value.trim();

        const email=
          emailInput.value.trim();

        const password=
          passwordInput.value;

        const confirmPassword=
          confirmPasswordInput.value;

        if(!displayName){
          throw new Error(
            "Please enter your name."
          );
        }

        if(
          password!==confirmPassword
        ){
          throw new Error(
            "Passwords do not match."
          );
        }

        await register(
          displayName,
          email,
          password
        );
      }else{
        await login(
          emailInput.value.trim(),
          passwordInput.value
        );
      }

      passwordInput.value="";
      confirmPasswordInput.value="";

      await refreshAuthUI();

      lastPreviewSignature="";

      showView("main");

      if(currentConversation){
        void maybeGenerateAIPreview(
          currentConversation
        );
      }
    }catch(error){
      loginStatus.classList.add(
        "error"
      );

      loginStatus.textContent=
        error instanceof Error
          ?error.message
          :"Unable to authenticate with Replay.";
    }finally{
      loginSubmit.disabled=false;
    }
  }
);

authSwitchButton.addEventListener(
  "click",
  ()=>{
    showAuth(
      authMode==="login"
        ?"register"
        :"login"
    );
  }
);

backToExtensionButton.addEventListener(
  "click",
  ()=>{
    showView("main");
  }
);

accountButton.addEventListener(
  "click",
  async()=>{
    const auth=
      await getAuthState();

    if(auth.accessToken){
      if(confirm("Log out of Replay?")){
        await logout();

        lastPreviewSignature="";

        await refreshAuthUI();
      }

      return;
    }

    showAuth("login");
  }
);

detailBackButton.addEventListener(
  "click",
  ()=>{
    showView("main");
  }
);

currentCard.addEventListener(
  "click",
  async()=>{
    if(!currentConversation){
      return;
    }

    const conversations=
      await getQuickAccess();

    const selected=
      conversations.find(
        item=>
          item.provider===
            currentConversation?.provider&&
          (
            item.providerConversationId===
              currentConversation?.providerConversationId||
            item.url===
              currentConversation?.url
          )
      );

    if(selected){
      openDetails(selected);
    }
  }
);

detailSaveButton.addEventListener(
  "click",
  async()=>{
    if(selectedConversation){
      await saveOne(
        selectedConversation
      );
    }
  }
);

detailOriginalButton.addEventListener(
  "click",
  async()=>{
    if(selectedConversation?.url){
      await chrome.tabs.create({
        url:selectedConversation.url
      });
    }
  }
);

saveAllButton.addEventListener(
  "click",
  ()=>{
    void saveAll();
  }
);

websiteButton.addEventListener(
  "click",
  ()=>{
    void openReplayWebsite();
  }
);

refreshButton.addEventListener(
  "click",
  async()=>{
    refreshButton.disabled=true;

    try{
      await detectCurrent();

      await refreshQuickAccess();

      await refreshAuthUI();
    }finally{
      refreshButton.disabled=false;
    }
  }
);

chrome.runtime.onMessage.addListener(
  message=>{
    if(
      message?.type===
      "CURRENT_CONVERSATION_UPDATED"
    ){
      const conversation=
        message.conversation as CurrentConversation;

      currentConversation=
        conversation;

      /*
        IMPORTANT:

        Do not permanently render the raw DOM
        fallback as the final extension metadata.

        Run the same AI preview flow used when the
        popup initially detects the conversation.
      */
      renderCurrentConversation(
        conversation
      );

      void maybeGenerateAIPreview(
        conversation
      );

      void refreshQuickAccess();
    }
  }
);

void detectCurrent();

void refreshQuickAccess();

void refreshAuthUI();