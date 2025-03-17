import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  IRuleGroupTreeResponse as IRuleGroupTreeResponse
} from './models';
import queryString from 'query-string';
import { App } from 'antd';
import axiosInstance from './axiosInstance';
import { RuleDetailBody } from '@/RuleDetailBody';
import { RuleUpdateContentParams } from '@/RuleUpdateContentParams';

export const useGetRuleTreeQuery = () => {
  return useQuery({
    queryKey: ['/rule_group/list'],
    queryFn: async () => {
      const res = await axiosInstance.get('/rule_group/list');
      return res.data as IRuleGroupTreeResponse;
    },
  });
};

export const useGetRuleDetailQuery = (params: { id?: number }) => {
  return useQuery({
    queryKey: ['/rule', params],
    queryFn: async () => {
      const res = await axiosInstance.get<RuleDetailBody>(
        `/rule?${queryString.stringify(params)}`,
      );
      return res.data;
    },
    enabled: !!params.id,
  });
};

export const useAddRuleGroup = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: { name: string }) => {
      const res = await axiosInstance.post('/rule_group/add', params);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['/rule_group/list'],
      });
    },
  });
};

export const useUpdateRuleName = () => {
  const queryClient = useQueryClient();
  const { message } = App.useApp();
  return useMutation({
    mutationFn: async (params: { id: number; name: string }) => {
      const res = await axiosInstance.post('/rule/update_name', params);
      return res.data;
    },
    onSuccess: () => {
      message.success('Update success');
      queryClient.invalidateQueries({
        queryKey: ['/rule_group/list'],
      });
      queryClient.invalidateQueries({
        queryKey: ['/rule'],
      });
    },
  });
};

export const useUpdateRuleContent = () => {
  const { message } = App.useApp();
  return useMutation({
    mutationFn: async (params: RuleUpdateContentParams) => {
      const res = await axiosInstance.post('/rule/update_content', params);
      return res.data;
    },
    onSuccess: () => {
      message.success('Update success');
    },
  });
};

export const useAddRule = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { ruleGroupId: number; name: string }) => {
      const res = await axiosInstance.post('/rule/add', params);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['/rule_group/list'],
      });
    },
  });
};

export const useRuleContextSchema = () => {
  return useQuery({
    queryKey: ['/rule/context/schema'],
    queryFn: async () => {
      const res = await axiosInstance.get('/rule/context/schema');
      return res.data;
    },
  });
};
