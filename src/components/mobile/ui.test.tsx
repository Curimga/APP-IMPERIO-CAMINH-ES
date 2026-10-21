// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToggleSwitch } from "./ui";

afterEach(cleanup);

describe("ToggleSwitch", () => {
  it("reflete o estado ligado/desligado", () => {
    const { rerender } = render(
      <ToggleSwitch checked={false} onCheckedChange={() => {}} label="Notificações" />,
    );
    const control = screen.getByRole("switch", { name: "Notificações" });
    expect(control).toHaveAttribute("aria-checked", "false");

    rerender(<ToggleSwitch checked onCheckedChange={() => {}} label="Notificações" />);
    expect(control).toHaveAttribute("aria-checked", "true");
  });

  it("altera o estado ao deslizar o botão", async () => {
    const onCheckedChange = vi.fn();
    render(<ToggleSwitch checked={false} onCheckedChange={onCheckedChange} label="Notificações" />);

    await userEvent.click(screen.getByRole("switch", { name: "Notificações" }));
    expect(onCheckedChange).toHaveBeenCalledWith(true);
  });

  it("não altera quando desabilitado", async () => {
    const onCheckedChange = vi.fn();
    render(
      <ToggleSwitch
        checked={false}
        onCheckedChange={onCheckedChange}
        disabled
        label="Notificações"
      />,
    );

    await userEvent.click(screen.getByRole("switch", { name: "Notificações" }));
    expect(onCheckedChange).not.toHaveBeenCalled();
  });
});
