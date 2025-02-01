import { useQuery } from '@tanstack/react-query';
import { IRuleContentResponse, IRuleGroupTreeResponse as IRuleGroupTreeResponse } from './models';
import queryString from 'query-string';

export const useGetRuleTreeQuery = () => {
  return useQuery({
    queryKey: ['/__self_service_path__/rule_group/list'],
    queryFn: () =>
      fetch(`/__self_service_path__/rule_group/list`).then(
        (res) => res.json() as Promise<IRuleGroupTreeResponse>,
      ),
  });
};

export const useGetRuleDetailQuery = (params: { id?: number }) => {
  return useQuery({
    queryKey: ['/__self_service_path__/rule', params],
    queryFn: () =>
      fetch(
        `/__self_service_path__/rule?${queryString.stringify(params)}`,
      ).then((res) => res.json() as Promise<IRuleContentResponse>),
    enabled: !!params.id,
  });
};

export const useUpdateRuleGroupName = (params: { id?: number }) => {
  return useQuery({
    queryKey: ['/__self_service_path__/rule', params],
    queryFn: () =>
      fetch(
        `/__self_service_path__/rule?${queryString.stringify(params)}`,
      ).then((res) => res.json() as Promise<IRuleContentResponse>),
    enabled: !!params.id,
  });
};

export const useUpdateRuleName = (params: { id?: number }) => {
  return useQuery({
    queryKey: ['/__self_service_path__/rule', params],
    queryFn: () =>
      fetch(
        `/__self_service_path__/rule?${queryString.stringify(params)}`,
      ).then((res) => res.json() as Promise<IRuleContentResponse>),
    enabled: !!params.id,
  });
};



export const useAddRule = (params: { id?: number }) => {
  return useQuery({
    queryKey: ['/__self_service_path__/rule', params],
    queryFn: () =>
      fetch(
        `/__self_service_path__/rule?${queryString.stringify(params)}`,
      ).then((res) => res.json() as Promise<IRuleContentResponse>),
    enabled: !!params.id,
  });
};
