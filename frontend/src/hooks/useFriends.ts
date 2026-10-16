import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as friends from '@/services/friends.service';

/** Every friends query key lives here; mutations invalidate by these. */
export const friendKeys = {
  list: ['friends', 'list'] as const,
  incoming: ['friends', 'incoming'] as const,
  outgoing: ['friends', 'outgoing'] as const,
  suggestions: ['friends', 'suggestions'] as const,
  relations: (ids: string[]) => ['friends', 'relations', [...ids].sort()] as const,
  relationsAll: ['friends', 'relations'] as const,
  ofUser: (username: string) => ['friends', 'ofUser', username] as const,
  ofUserAll: ['friends', 'ofUser'] as const,
};

export const useFriendsList = (enabled = true) =>
  useQuery({ queryKey: friendKeys.list, queryFn: friends.getFriends, enabled });
export const useIncomingRequests = (enabled = true) =>
  useQuery({ queryKey: friendKeys.incoming, queryFn: friends.getIncomingRequests, enabled });
export const useOutgoingRequests = (enabled = true) =>
  useQuery({ queryKey: friendKeys.outgoing, queryFn: friends.getOutgoingRequests, enabled });
export const useFriendSuggestions = (enabled = true) =>
  useQuery({ queryKey: friendKeys.suggestions, queryFn: friends.getSuggestions, enabled });
export const useRelations = (ids: string[], enabled = true) =>
  useQuery({ queryKey: friendKeys.relations(ids), queryFn: () => friends.getRelations(ids), enabled: enabled && ids.length > 0 });
export const useUserFriends = (username: string | undefined) =>
  useQuery({ queryKey: friendKeys.ofUser(username ?? ''), queryFn: () => friends.getUserFriends(username!), enabled: Boolean(username) });

type Key = readonly unknown[];

function useFriendMutation(fn: (id: string) => Promise<void>, keys: Key[]) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSettled: () => Promise.all(keys.map((queryKey) => qc.invalidateQueries({ queryKey }))),
  });
}

/** The friend actions. Each invalidates the lists and relations it can change. */
export function useFriendActions() {
  const { list, incoming, outgoing, suggestions, relationsAll, ofUserAll } = friendKeys;
  return {
    send: useFriendMutation(friends.sendRequest, [outgoing, suggestions, relationsAll]),
    accept: useFriendMutation(friends.acceptRequest, [incoming, list, suggestions, relationsAll, ofUserAll]),
    reject: useFriendMutation(friends.rejectRequest, [incoming, relationsAll]),
    cancel: useFriendMutation(friends.cancelRequest, [outgoing, suggestions, relationsAll]),
    remove: useFriendMutation(friends.removeFriend, [list, suggestions, relationsAll, ofUserAll]),
  };
}
