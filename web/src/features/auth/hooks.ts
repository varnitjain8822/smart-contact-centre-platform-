import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, type MePatch } from '../../lib/api';
import i18n from '../../i18n';
import type { User } from '../../lib/types';

export const useMe = () => useQuery({ queryKey: ['me'], queryFn: () => api.me().then((r) => r.user), retry: false, staleTime: 5 * 60_000 });

export function useLogin() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: api.login, onSuccess: (r) => qc.setQueryData(['me'], r.user) });
}

/** Register returns a plain UserDTO (no locale/notify): keep the language picked on the form, then refetch the full profile. */
export function useRegister() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: { name: string; email: string; password: string }) => {
      await api.register(v);
      const locale = i18n.language === 'hi' ? 'hi' : 'en';
      if (locale !== 'en') await api.updateMe({ locale }).catch(() => {});
      return api.me();
    },
    onSuccess: (r) => qc.setQueryData(['me'], r.user),
  });
}

/** Sign in / sign up with a code: the response carries the full profile. */
export function useOtpVerify() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: api.otpVerify, onSuccess: (r) => qc.setQueryData(['me'], r.user) });
}

export const channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('scc') : null;

/** Clears the cache (unmounting the shell closes the EventSource) and tells other tabs. */
export function useLogout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.logout,
    onSettled: () => { qc.clear(); qc.setQueryData(['me'], null); channel?.postMessage('logout'); },
  });
}

/** PATCH /api/me — name, locale or notify prefs. */
export function useUpdateMe() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: MePatch) => api.updateMe(v),
    onMutate: (v) => qc.setQueryData<User | null>(['me'], (o) => o && {
      ...o, ...(v.locale && { locale: v.locale }),
      ...(v.notify && o.notify && { notify: { inApp: v.notify.inApp ?? o.notify.inApp, email: { ...o.notify.email, ...v.notify.email } } }),
    }),
    onSuccess: (r) => qc.setQueryData<User>(['me'], (old) => ({ ...old, ...r.user })),
    onError: () => void qc.invalidateQueries({ queryKey: ['me'] }),
  });
}

export const useChangePassword = () => useMutation({ mutationFn: api.changePassword });

/** Other devices' cookies stop working; the server re-issues this device's cookie. */
export const useLogoutOthers = () => useMutation({ mutationFn: api.logoutOthers });
