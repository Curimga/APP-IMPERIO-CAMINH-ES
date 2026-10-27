export const TRUCK_FLOW_DISPATCHER_GROUP_URL =
  "https://chat.whatsapp.com/JQN4ecdqcxq1zm42sVqXSc?s=cl&p=i&mlu=4&ilr=4&iam=0";

export const TRUCK_FLOW_DISPATCHER_MESSAGE =
  "Conseguem marcar a vistoria do caminhão placa {PLACA}, isso é possível?";

export function truckFlowDispatcherMessage(plate: string | null | undefined): string | null {
  const cleanPlate = plate?.trim();
  if (!cleanPlate) return null;
  return TRUCK_FLOW_DISPATCHER_MESSAGE.replace("{PLACA}", cleanPlate);
}

export async function notifyDispatcherOnWhatsApp({
  plate,
  openGroup,
  copyMessage,
}: {
  plate: string | null | undefined;
  openGroup: (url: string) => unknown;
  copyMessage: (message: string) => Promise<void>;
}) {
  const message = truckFlowDispatcherMessage(plate);
  if (!message) return { message: null, copied: false };

  // Keep this synchronous from the click handler so browsers allow the new tab.
  openGroup(TRUCK_FLOW_DISPATCHER_GROUP_URL);
  try {
    await copyMessage(message);
    return { message, copied: true };
  } catch {
    return { message, copied: false };
  }
}
