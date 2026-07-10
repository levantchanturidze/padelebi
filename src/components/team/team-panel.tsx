"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { Users, Mail, Share2, Check, X, Copy, UserMinus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  inviteTeamMemberAction,
  removeTeamMemberAction,
  type TeamActionState,
} from "@/app/actions/team";
import { formatGEL } from "@/lib/utils";

export type TeamMemberVM = {
  id: string;
  name: string | null;
  email: string | null;
  status: "INVITED" | "JOINED" | "DECLINED";
  isSelf: boolean;
};

export type TeamPanelProps = {
  bookingId: string;
  teamSize: number;
  seats: { filled: number; open: number; total: number };
  share: { url: string; code: string };
  perPlayerGEL: number;
  owner: { id: string; name: string; email: string; isSelf: boolean };
  members: TeamMemberVM[];
  viewerCanInvite: boolean;
  viewerCanRemove: boolean;
};

/**
 * Team booking roster + invite tools. Rendered inside the booking-detail
 * page for both the organiser (with invite + remove controls) and any
 * signed-in team member (read-only).
 */
export function TeamPanel(props: TeamPanelProps) {
  const t = useTranslations("team");
  const [inviteState, inviteAction, invitePending] = useActionState<
    TeamActionState,
    FormData
  >(inviteTeamMemberAction, undefined);
  const [inviteEmail, setInviteEmail] = useState("");
  const [copied, setCopied] = useState(false);

  const seatsSuffix = t("spotsCount", { filled: props.seats.filled, total: props.seats.total });
  const noSeatsLeft = props.seats.open === 0;

  async function copyShareLink() {
    try {
      await navigator.clipboard.writeText(props.share.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      // Ignore — some browsers refuse clipboard without a secure context.
    }
  }

  return (
    <section
      aria-label={t("teamRoster")}
      className="overflow-hidden rounded-[var(--radius-xl)] border border-border bg-surface shadow-card-md"
    >
      <header className="flex items-center justify-between border-b border-border px-5 py-3">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-brand-700" />
          <span className="text-xs font-semibold uppercase tracking-wider text-muted">
            {t("teamRoster")}
          </span>
        </div>
        <span className="text-sm font-semibold">{seatsSuffix}</span>
      </header>

      <div className="px-5 py-4">
        <p className="mb-3 text-sm text-muted">
          {t("perPlayerAmount", { amount: formatGEL(props.perPlayerGEL) })}
        </p>

        {/* Roster */}
        <ul className="space-y-2">
          <RosterRow
            name={props.owner.name}
            email={props.owner.email}
            statusLabel={t("statusOrganiser")}
            statusTone="brand"
            selfLabel={props.owner.isSelf ? t("you") : null}
          />
          {props.members.map((m) => (
            <RosterRow
              key={m.id}
              name={m.name}
              email={m.email}
              statusLabel={
                m.status === "JOINED"
                  ? t("statusJoined")
                  : m.status === "DECLINED"
                    ? t("statusDeclined")
                    : t("statusInvited")
              }
              statusTone={
                m.status === "JOINED"
                  ? "success"
                  : m.status === "DECLINED"
                    ? "muted"
                    : "warning"
              }
              selfLabel={m.isSelf ? t("you") : null}
              rightSlot={
                props.viewerCanRemove && !m.isSelf ? (
                  <form action={removeTeamMemberAction}>
                    <input type="hidden" name="memberId" value={m.id} />
                    <button
                      type="submit"
                      aria-label={t("remove")}
                      title={t("remove")}
                      className="rounded-full p-1 text-muted hover:bg-red-50 hover:text-danger"
                    >
                      <UserMinus className="h-3.5 w-3.5" />
                    </button>
                  </form>
                ) : null
              }
            />
          ))}
        </ul>

        {/* Invite form + share link (organiser only) */}
        {props.viewerCanInvite && (
          <div className="mt-5 space-y-3 border-t border-border pt-4">
            {inviteState?.error && (
              <p className="rounded-[var(--radius-md)] bg-red-50 px-3 py-2 text-sm text-danger">
                {inviteState.error}
              </p>
            )}
            {inviteState?.success && (
              <p className="rounded-[var(--radius-md)] bg-brand-50 px-3 py-2 text-sm text-foreground">
                {inviteState.success}
              </p>
            )}

            <form
              action={(fd) => {
                inviteAction(fd);
                setInviteEmail("");
              }}
              className="flex gap-2"
            >
              <input type="hidden" name="bookingId" value={props.bookingId} />
              <div className="relative flex-1">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
                <input
                  name="email"
                  type="email"
                  required
                  disabled={noSeatsLeft}
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder={t("emailPlaceholder")}
                  className="w-full rounded-[var(--radius-md)] border border-border bg-surface pl-8 pr-3 py-2 text-sm text-foreground placeholder:text-muted/70 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-200 disabled:opacity-50"
                />
              </div>
              <Button type="submit" size="sm" disabled={invitePending || noSeatsLeft || !inviteEmail}>
                {invitePending ? t("inviting") : t("invite")}
              </Button>
            </form>

            <div className="flex flex-wrap items-center gap-2 rounded-[var(--radius-md)] border border-border bg-background px-3 py-2 text-xs">
              <Share2 className="h-3.5 w-3.5 text-muted" />
              <span className="truncate flex-1 font-mono text-[11px] text-muted">
                {props.share.url}
              </span>
              <button
                type="button"
                onClick={copyShareLink}
                className="inline-flex items-center gap-1 rounded-full border border-cobalt-200 bg-cobalt-50 px-2.5 py-1 text-[11px] font-semibold text-cobalt-700 transition-colors hover:bg-cobalt-100"
              >
                {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                {copied ? t("copied") : t("copyLink")}
              </button>
            </div>

            {noSeatsLeft && (
              <p className="text-xs text-muted">{t("teamFullNote")}</p>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

function RosterRow({
  name,
  email,
  statusLabel,
  statusTone,
  selfLabel,
  rightSlot,
}: {
  name: string | null;
  email: string | null;
  statusLabel: string;
  statusTone: "brand" | "success" | "muted" | "warning";
  selfLabel: string | null;
  rightSlot?: React.ReactNode;
}) {
  const initial = (name ?? email ?? "?").charAt(0).toUpperCase();
  const toneClass = {
    brand: "border-brand-500 bg-brand-50 text-foreground",
    success: "border-emerald-300 bg-emerald-50 text-emerald-700",
    muted: "border-border bg-background text-muted",
    warning: "border-amber-300 bg-amber-50 text-amber-700",
  }[statusTone];

  return (
    <li className="flex items-center gap-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">
        {initial}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">
          {name ?? email ?? "—"}
          {selfLabel && (
            <span className="ml-1.5 text-[11px] font-normal text-muted">({selfLabel})</span>
          )}
        </p>
        {name && email && (
          <p className="truncate text-xs text-muted">{email}</p>
        )}
      </div>
      <span
        className={[
          "shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
          toneClass,
        ].join(" ")}
      >
        {statusLabel}
      </span>
      {rightSlot}
    </li>
  );
}
