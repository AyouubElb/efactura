'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { ChoiceField } from '@/components/choice-field';
import { PanelForm, PanelSheet, usePanelSubmit } from '@/components/panel-form';
import { usePanel } from '@/components/record-panel';
import { TextField } from '@/components/text-field';
import { FieldGroup } from '@/components/ui/field';
import { inviteMember } from './team.actions';
import { inviteSchema, type InviteInput } from './team.schemas';

const ROLES = [
  { value: 'staff', label: 'Collaborateur' },
  { value: 'admin', label: 'Administrateur' },
];

export function InvitePanel() {
  const { open, close } = usePanel<never>();
  return (
    <PanelSheet open={open} onClose={close} title="Inviter une personne">
      <InviteForm onSent={close} />
    </PanelSheet>
  );
}

function InviteForm({ onSent }: { onSent: () => void }) {
  const form = useForm<InviteInput>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { fullName: '', email: '', role: 'staff' },
  });
  const { onSubmit, pending, formError } = usePanelSubmit(
    form,
    inviteMember,
    ({ email }) => {
      toast.success(`Invitation envoyée à ${email}.`);
      onSent();
    },
  );

  return (
    <PanelForm
      onSubmit={onSubmit}
      pending={pending}
      formError={formError}
      submitLabel="Envoyer l'invitation"
      pendingLabel="Envoi en cours"
    >
      <FieldGroup>
        <TextField
          control={form.control}
          name="fullName"
          id="invite-name"
          label="Nom complet"
          autoComplete="off"
        />
        <TextField
          control={form.control}
          name="email"
          id="invite-email"
          label="E-mail"
          help="Le lien pour choisir un mot de passe part à cette adresse. Il reste valable 7 jours."
          type="email"
          inputMode="email"
          autoComplete="off"
        />
        <ChoiceField
          control={form.control}
          name="role"
          legend="Rôle"
          choices={ROLES}
          help="L'administrateur gère aussi l'équipe et les paramètres, et voit les montants du tableau de bord."
        />
      </FieldGroup>
    </PanelForm>
  );
}
