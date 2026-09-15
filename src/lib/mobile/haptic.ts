/**
 * Feedback tátil discreto (quando o aparelho e o navegador suportam).
 * Nunca obrigatório — falhas são silenciosas.
 */

function canVibrate(): boolean {
  try {
    return typeof navigator !== "undefined" && "vibrate" in navigator;
  } catch {
    return false;
  }
}

export function haptic(pattern: number | number[] = 6) {
  if (!canVibrate()) return;
  try {
    navigator.vibrate(pattern);
  } catch {
    /* não suportado — ignora */
  }
}

/** Toque confirmatório leve (botões, chips). */
export function hapticTap() {
  haptic(8);
}

/** Ação concluída com sucesso. */
export function hapticSuccess() {
  haptic([12, 40, 18]);
}

/** Ação falhou / erro. */
export function hapticError() {
  haptic([30, 50, 30, 50, 40]);
}