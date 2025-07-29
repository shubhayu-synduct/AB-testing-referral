export type StatusType = 'processing' | 'searching' | 'summarizing' | 'formatting' | 'complete' | 'complete_image';

const statusMessages: Record<StatusType, string> = {
  processing: "Analyzing your Query",
  searching: "Gathering Sources",
  summarizing: "Generating Precision Answer",
  formatting: "Formatting your Answer",
  complete: "Done",
  complete_image: "Images Ready"
};

export function getStatusMessage(status: StatusType): string {
  return statusMessages[status] || "Processing your request...";
}