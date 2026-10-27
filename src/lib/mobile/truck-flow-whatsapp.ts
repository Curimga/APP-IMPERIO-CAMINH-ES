export const TRUCK_FLOW_DISPATCHER_GROUP_URL =
  "https://chat.whatsapp.com/JQN4ecdqcxq1zm42sVqXSc?s=cl&p=i&mlu=4&ilr=4&iam=0";

export const TRUCK_FLOW_DISPATCHER_MESSAGE =
  "Conseguem marcar a vistoria do caminhão placa {PLACA}?";

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

  // Start writeText in the click handler before opening WhatsApp or awaiting.
  let copyPromise: Promise<void>;
  try {
    copyPromise = copyMessage(message);
  } catch {
    copyPromise = Promise.reject(new Error("Não foi possível copiar a mensagem."));
  }

  // Keep the group opening in the same click handler to avoid popup blocking.
  openGroup(TRUCK_FLOW_DISPATCHER_GROUP_URL);
  try {
    await copyPromise;
    return { message, copied: true };
  } catch {
    return { message, copied: false };
  }
}
