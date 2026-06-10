'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { updateUserRole } from '../_crud-actions';

const ROLES = ['owner', 'admin', 'operator', 'viewer'];

export function RoleSelect({ userId, role }: { userId: string; role: string }) {
  const router = useRouter();
  const [value, setValue] = useState(role);
  const [pending, start] = useTransition();

  function change(next: string) {
    setValue(next);
    start(async () => {
      const res = await updateUserRole(userId, next);
      if (res.error) {
        alert(res.error);
        setValue(role);
      } else {
        router.refresh();
      }
    });
  }

  return (
    <select
      value={value}
      onChange={(e) => change(e.target.value)}
      disabled={pending}
      className="input !py-1 w-32"
    >
      {ROLES.map((r) => (
        <option key={r} value={r}>{r}</option>
      ))}
    </select>
  );
}
