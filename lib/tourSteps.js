// webapp/lib/tourSteps.js
const tourSteps = [
  {
    target: ".dashboard-search-bar", // Main search bar
    content: "Ask any medical question and get a concise, guideline-backed answer in seconds. Add more detail to your query for improved relevance",
    disableBeacon: true,
  },
  // {
  //   target: ".dashboard-acute-toggle", // Acute mode toggle
  //   content: "Toggle Acute Mode for acute care type questions. Example: 'How to approach intensive dyspnea?'",
  // },
  {
    target: ".sidebar-new-search", // New Search button in sidebar
    content: "Start a new search or conversation.",
    placement: "right",
    offset: 20,
    disableBeacon: true,
  },
  {
    target: ".sidebar-guidelines", // Guidelines button in sidebar
    content: "Search clinical guidelines from established International, National, and European sources, US sources etc.",
    placement: "right",
    offset: 20,
  },
  {
    target: ".sidebar-drug-info", // Drug Information button in sidebar
    content: "Access trusted drug information directly from EMA approved documents including indications, dosing, administration, contraindications, and more.",
    placement: "right",
    offset: 20,
  },
  {
    target: ".sidebar-visual-abstract", // Visual Abstract button in sidebar
    content: "Generate visual abstracts from any text. Tip: Paste research paper content for a clear visual summary.",
    placement: "right",
    offset: 20,
  },
  {
    target: ".sidebar-history", // History button in sidebar
    content: "Collection of past conversations, visual abstracts, and saved guidelines.",
    placement: "right",
    offset: 20,
  },
  {
    target: ".sidebar-profile", // Profile button in sidebar
    content: "Manage your account here. You can access your profile and subscription settings.",
    placement: "right",
    offset: 20,
  },
];

export default tourSteps;

export const guidelineTourSteps = [
  {
    target: ".guidelines-search-bar", // Step 1: search bar
    content: "This is the search bar. You can search for clinical guidelines here!",
    disableBeacon: true,
  },
  {
    target: ".guidelines-search-bar", // Step 2: ask user to search
    content: "Try searching for a guideline by typing and pressing Enter or clicking the arrow.",
  },
  {
    target: ".guidelines-accordion", // Step 3: show the accordions
    content: "These are the National, European, International, and US guideline accordions.",
  },
  {
    target: ".guideline-summary-btn", // Step 4: first guideline summary button
    content: "Click here to get an AI summary of a guideline!",
  },
];

export const drugTourSteps = [
  {
    target: ".druginfo-search-bar", // Step 1: search bar
    content: "This is the drug search bar. You can search for drugs by brand or active ingredient!",
    disableBeacon: true,
  },
  {
    target: ".druginfo-search-bar", // Step 2: ask user to type
    content: "Try typing a drug name or ingredient in the search bar.",
  },
  {
    target: ".druginfo-recommendations", // Step 3: show the recommendation list
    content: "Here you'll see recommended drugs matching your search.",
  },
  {
    target: ".druginfo-table", // Step 4: show the drug table
    content: "This table lists all drugs for the selected letter, with brand names and active substances.",
  },
];

export const drinfoSummaryTourSteps = [
  {
    target: ".drinfo-answer-content", // Step 1: AI generated answer content
    content: "Here's your AI-powered answer. Dr.Info turns complex medical literature into clear, specialty-specific insights — saving time, reducing cognitive load, and delivering evidence-based insights.",
    disableBeacon: true,
    scrollToFirstStep: false, // Completely disable Joyride's scrolling
    placement: "bottom", // Position tooltip at bottom
    scrollOffset: 0, // No scroll offset
    disableScrolling: true, // Disable scrolling for this step
    offset: 20, // Add offset for mobile
  },
  {
    target: ".drinfo-citation-grid-step", // Step 2: citation grid
    content: "Review sources instantly with direct links. Click 'Show All' to see all the references.",
    disableScrolling: true, // Disable scrolling for this step
    placement: "bottom", // Position tooltip at bottom
    offset: 20, // Add offset for mobile
  },
  {
    target: ".follow-up-question-search", // Step 3: follow-up question search bar
    content: "Need more detail? Use the follow-up field to clarify, add context, or go deeper — DR. INFO will adapt and refine the answer accordingly.",
    disableScrolling: true, // Disable scrolling for this step
    placement: "top", // Position tooltip at top for better mobile visibility
    offset: 20, // Add offset for mobile
  },
  {
    target: ".drinfo-feedback-step", // Step 4: feedback buttons
    content: "Tell us how we did. Was the answer helpful? Rate it and leave a quick comment — your feedback drives improvements. DR. INFO is built with physicians, for physicians.",
    disableScrolling: true, // Disable scrolling for this step
    placement: "top", // Position tooltip at top for better mobile visibility
    offset: 20, // Add offset for mobile
  },
  {
    target: ".drinfo-visual-abstract-step", // Step 5: Create visual abstract button
    content: "Transform text into visuals. Generate AI-powered visual abstracts, infographics, and diagrams to make complex concepts easy to understand and share.",
    disableScrolling: true, // Disable Joyride scrolling - we'll use custom scroll
    placement: "top", // Position tooltip at top for better mobile visibility
    offset: 20, // Add offset for mobile
  },
  {
    target: ".drinfo-share-step", // Step 6: share button (responsive)
    content: "Easily share your conversations with colleagues.",
    disableScrolling: true, // Disable scrolling for this step
    placement: "top", // Position tooltip at top for better mobile visibility
    offset: 20, // Add offset for mobile
  },
]; 
