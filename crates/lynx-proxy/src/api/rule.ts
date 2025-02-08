import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  IRuleContentResponse,
  IRuleGroupTreeResponse as IRuleGroupTreeResponse,
} from './models';
import queryString from 'query-string';

export const useGetRuleTreeQuery = () => {
  return useQuery({
    queryKey: ['/__self_service_path__/rule_group/list'],
    queryFn: async () =>
      fetch(`/__self_service_path__/rule_group/list`).then(
        (res) => res.json() as Promise<IRuleGroupTreeResponse>,
      ),
  });
};

export const useGetRuleDetailQuery = (params: { id?: number }) => {
  return useQuery({
    queryKey: ['/__self_service_path__/rule', params],
    queryFn: async () =>
      fetch(
        `/__self_service_path__/rule?${queryString.stringify(params)}`,
      ).then((res) => res.json() as Promise<IRuleContentResponse>),
    enabled: !!params.id,
  });
};

export const useAddRuleGroup = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: { name: string }) =>
      fetch(`/__self_service_path__/rule_group/add`, {
        method: 'POST',
        body: JSON.stringify(params),
      }).then((res) => res.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['/__self_service_path__/rule_group/list'],
      });
    },
  });
};

export const useUpdateRule = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      params: { id: number; name: string } | { id: number; content: string },
    ) => {
      const res = await fetch(`/__self_service_path__/rule/update`, {
        method: 'POST',
        body: JSON.stringify(params),
      });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['/__self_service_path__/rule_group/list'],
      });
      queryClient.invalidateQueries({
        queryKey: ['/__self_service_path__/rule'],
      });
    },
  });
};

export const useAddRule = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { ruleGroupId: number; name: string }) => {
      const res = await fetch(`/__self_service_path__/rule/add`, {
        method: 'POST',
        body: JSON.stringify(params),
      });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['/__self_service_path__/rule_group/list'],
      });
    },
  });
};

export const useRuleContextSchema = () => {
  return useQuery({
    queryKey: ['/__self_service_path__/rule/context/schema'],
    queryFn: async () => {
      const res = await fetch(`/__self_service_path__/rule/context/schema`);
      return await res.json();
    },
  });
};
