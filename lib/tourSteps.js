// webapp/lib/tourSteps.js
const tourSteps = [
  {
    target: ".dashboard-search-bar", // Main search bar
    content: "This is your main search bar. Ask your clinical question here. (tip: include details to get complete answers)",
    disableBeacon: true,
  },
  {
    target: ".dashboard-acute-toggle", // Acute mode toggle
    content: "Toggle Acute mode for acute care questions. Example: How to treat hypertensive emergency?",
  },
  {
    target: ".sidebar-new-search", // New Search button in sidebar
    content: "Start a new search or conversation.",
  },
  {
    target: ".sidebar-guidelines", // Guidelines button in sidebar
    content: "Search clinical guidelines from established international, national sources etc.",
  },
  {
    target: ".sidebar-drug-info", // Drug Information button in sidebar
    content: "Access trusted drug information directly through European Medicines Agency (EMA) approved documents—covering indications, dosing (posology), administration methods, contraindications, and more.",
  },
  {
    target: ".sidebar-visual-abstract", // Visual Abstract button in sidebar
    content: "Generate visual abstracts for any text. (tip: Give your medical research paper content to generate a visual abstract)",
  },
  {
    target: ".sidebar-history", // History button in sidebar
    content: "Collection of past conversations, visual abstracts, and saved guidelines.",
  },
  {
    target: ".sidebar-profile", // Profile button in sidebar
    content: "Manage your account here. Access your profile andsubscription settings.",
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
    content: "Here's your AI-powered answer. Dr.Info distills complex medical literature and guidelines into clear, specialty-specific insights. It saves you time, reduces cognitive load, and provides evidence-based precise answers.",
    disableBeacon: true,
    scrollToFirstStep: false, // Completely disable Joyride's scrolling
    placement: "bottom", // Position tooltip at bottom
    scrollOffset: 0, // No scroll offset
    disableScrolling: true, // Disable scrolling for this step
  },
  {
    target: ".drinfo-citation-grid-step", // Step 2: citation grid
    content: "Review your sources instantly. See the top references behind each answer at a glance—with direct links to the original documents. Want the full list? Just click \"Show All\" for complete source transparency.",
    disableScrolling: true, // Disable scrolling for this step
  },
  {
    target: ".follow-up-question-search", // Step 3: follow-up question search bar
    content: "Need more detail? Just ask. Use the follow-up field to clarify, go deeper, or add new context to your original question—Dr.Info will adapt and refine the answer accordingly.",
    disableScrolling: true, // Disable scrolling for this step
  },
  {
    target: ".drinfo-feedback-step", // Step 4: feedback buttons
    content: "Tell us how we did. Was the answer helpful? Click to rate—and if you can, leave a quick comment. Your feedback directly shapes improvements. Built with physicians, for physicians.",
    disableScrolling: true, // Disable scrolling for this step
  },
  {
    target: ".drinfo-visual-abstract-step", // Step 5: Create visual abstract button
    content: "Transform text into visuals! Click this button to generate AI-powered infographics from your answer. Perfect for creating visual abstracts, diagrams, or illustrations that make complex medical concepts easier to understand and share.",
    disableScrolling: true, // Disable scrolling for this step
  },
  {
    target: ".drinfo-share-step", // Step 6: share button
    content: "Share with a colleague. Use this button to send the full answer page—via link or your preferred channel. Perfect for teaching moments, second opinions, or just keeping your team in the loop.",
    disableScrolling: true, // Disable scrolling for this step
  },
]; 
