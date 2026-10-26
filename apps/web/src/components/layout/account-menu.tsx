import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { ChevronDown, LogOut, ShieldCheck, Store } from "lucide-react";
import type { User } from "../../types";
import { initials, roleLabel } from "../../lib/utils";

interface AccountMenuProps {
  user: User;
  onLogout: () => void;
  loggingOut?: boolean;
}

export function AccountMenu({ user, onLogout, loggingOut }: AccountMenuProps) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger
        className="flex items-center gap-2 rounded-lg border border-transparent p-1 pr-2 transition-colors hover:border-line hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
        aria-label={`Account menu for ${user.name}`}
      >
        <span className="grid size-8 place-items-center rounded-lg bg-ink-900 text-[11px] font-bold text-brand-100">
          {initials(user.name)}
        </span>
        <span className="hidden min-w-0 text-left sm:block">
          <span className="block max-w-32 truncate text-[12px] font-semibold leading-4 text-ink-900">
            {user.name}
          </span>
          <span className="block text-[10px] font-medium uppercase tracking-wider text-ink-400">
            {roleLabel(user.role)}
          </span>
        </span>
        <ChevronDown className="hidden size-3.5 text-ink-400 sm:block" aria-hidden="true" />
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={8}
          className="z-[60] w-64 rounded-xl border border-line bg-surface p-1.5 shadow-pop"
        >
          <div className="flex items-center gap-2.5 px-2.5 py-2">
            <span className="grid size-9 place-items-center rounded-lg bg-brand-50 text-brand-700">
              {user.role === "OWNER" ? (
                <ShieldCheck className="size-4" aria-hidden="true" />
              ) : (
                <Store className="size-4" aria-hidden="true" />
              )}
            </span>
            <div className="min-w-0">
              <p className="truncate text-[12px] font-semibold text-ink-900">{user.name}</p>
              <p className="truncate text-[11px] text-ink-500">{user.email}</p>
            </div>
          </div>
          <DropdownMenu.Separator className="my-1 h-px bg-line" />
          <DropdownMenu.Item
            onSelect={onLogout}
            disabled={loggingOut}
            className="flex cursor-pointer items-center gap-2 rounded-md px-2.5 py-2 text-[12px] font-medium text-ink-600 outline-none transition-colors data-[highlighted]:bg-ink-50 data-[highlighted]:text-ink-900"
          >
            <LogOut className="size-3.5" aria-hidden="true" />
            {loggingOut ? "Signing out…" : "Sign out"}
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
