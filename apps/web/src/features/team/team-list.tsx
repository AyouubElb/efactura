'use client';

import { useState, useTransition } from 'react';
import { createColumnHelper } from '@tanstack/react-table';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/confirm-dialog';
import {
  DataTable,
  type CardLines,
  type ListFeatures,
  type RowAction,
  type RowActions,
} from '@/components/data-table';
import { Stamp, type StampTone } from '@/components/stamp';
import { ROLE_LABELS } from '@/features/auth/auth.types';
import type { ActionFailure } from '@/lib/action-result';
import { momentInMorocco } from '@/lib/format';
import { changeRole, inviteMember, setMemberOff } from './team.actions';
import type { TeamMember } from './team.types';

function stampOf(member: TeamMember): { tone: StampTone; label: string } {
  if (member.status === 'active') {
    return { tone: 'done', label: 'Compte actif' };
  }
  if (member.status === 'off') {
    return { tone: 'closed', label: 'Compte désactivé' };
  }
  switch (member.inviteEmail?.status) {
    case 'queued':
      return { tone: 'way', label: 'Envoi en cours' };
    case 'failed':
      return { tone: 'act', label: "Échec de l'envoi" };
    case 'expired':
      return { tone: 'check', label: 'Invitation expirée' };
    default:
      return { tone: 'way', label: 'Invitation envoyée' };
  }
}

function MemberStamp({ member }: { member: TeamMember }) {
  const { tone, label } = stampOf(member);
  return <Stamp tone={tone}>{label}</Stamp>;
}

const helper = createColumnHelper<ListFeatures, TeamMember>();

const columns = helper.columns([
  helper.accessor('fullName', {
    header: 'Nom',
    cell: (info) => <span className="font-semibold">{info.getValue()}</span>,
  }),
  helper.accessor('email', {
    header: 'E-mail',
    cell: (info) => info.getValue(),
  }),
  helper.accessor('role', {
    header: 'Rôle',
    cell: (info) => ROLE_LABELS[info.getValue()],
  }),
  helper.accessor('status', {
    header: 'Statut',
    cell: (info) => <MemberStamp member={info.row.original} />,
  }),
  helper.accessor('lastLoginAt', {
    header: 'Dernière connexion',
    cell: (info) => {
      const moment = info.getValue();
      return moment ? (
        momentInMorocco(moment)
      ) : (
        <span className="text-pencil">Jamais</span>
      );
    },
    meta: { className: 'hidden xl:table-cell' },
  }),
]);

function card(member: TeamMember): CardLines {
  return {
    title: member.fullName,
    titleEnd: <MemberStamp member={member} />,
    detail: member.email,
    detailEnd: ROLE_LABELS[member.role],
  };
}

type Outcome<T> = { ok: true; data: T } | ActionFailure;

export function TeamList({
  members,
  meId,
}: {
  members: TeamMember[];
  meId: string;
}) {
  const [, startTransition] = useTransition();
  // The person stays while the dialog closes, so its title doesn't empty mid-animation
  const [turningOff, setTurningOff] = useState<TeamMember | null>(null);
  const [confirming, setConfirming] = useState(false);

  function run<T>(
    working: string,
    action: () => Promise<Outcome<T>>,
    done: (data: T) => string,
  ) {
    const toastId = toast.loading(working);
    startTransition(async () => {
      const result = await action();
      if (result.ok) {
        toast.success(done(result.data), { id: toastId });
      } else {
        toast.error(result.error, { id: toastId });
      }
    });
  }

  function actions(member: TeamMember): RowActions {
    const label = `Actions pour ${member.fullName}`;
    if (member.id === meId) {
      return {
        label,
        items: [],
        note: <span className="text-xs text-pencil">Vous</span>,
      };
    }
    if (member.status === 'off') {
      return {
        label,
        items: [
          {
            label: 'Réactiver le compte',
            onSelect: () =>
              run(
                'Réactivation en cours',
                () => setMemberOff(member.id, false),
                ({ fullName, status }) =>
                  status === 'invited'
                    ? `Compte de ${fullName} réactivé. Renvoyez-lui l'invitation.`
                    : `Compte de ${fullName} réactivé.`,
              ),
          },
        ],
      };
    }
    const items: RowAction[] = [];
    if (member.status === 'invited') {
      items.push({
        label: "Renvoyer l'invitation",
        onSelect: () =>
          run(
            'Envoi en cours',
            () =>
              inviteMember({
                fullName: member.fullName,
                email: member.email,
                role: member.role,
              }),
            ({ email }) => `Invitation renvoyée à ${email}.`,
          ),
      });
    }
    const nextRole = member.role === 'admin' ? 'staff' : 'admin';
    items.push(
      {
        label:
          nextRole === 'admin'
            ? 'Passer administrateur'
            : 'Passer collaborateur',
        onSelect: () =>
          run(
            'Changement en cours',
            () => changeRole(member.id, nextRole),
            ({ fullName, role }) =>
              `Rôle de ${fullName} : ${ROLE_LABELS[role]}.`,
          ),
      },
      {
        label: 'Désactiver le compte',
        danger: true,
        onSelect: () => {
          setTurningOff(member);
          setConfirming(true);
        },
      },
    );
    return { label, items };
  }

  async function turnOff(): Promise<string | null> {
    if (!turningOff) {
      return null;
    }
    const result = await setMemberOff(turningOff.id, true);
    if (!result.ok) {
      return result.error;
    }
    toast.success(`Compte de ${result.data.fullName} désactivé.`);
    return null;
  }

  return (
    <>
      <DataTable
        label="Équipe"
        columns={columns}
        data={members}
        actions={actions}
        card={card}
      />
      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title={`Désactiver le compte de ${turningOff?.fullName ?? ''} ?`}
        keepLabel="Garder le compte"
        confirmLabel="Oui, désactiver le compte"
        pendingLabel="Désactivation en cours"
        onConfirm={turnOff}
      >
        <p>
          Cette personne est déconnectée tout de suite et ne pourra plus se
          connecter.
        </p>
        <p>Vous pourrez réactiver le compte.</p>
      </ConfirmDialog>
    </>
  );
}
