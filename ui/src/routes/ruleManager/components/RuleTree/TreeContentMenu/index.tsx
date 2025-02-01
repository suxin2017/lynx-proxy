import { IRuleGroupModel, IRuleModel } from '@/api/models';
import { Dropdown } from 'antd';
import constate from 'constate';
import React, { useMemo } from 'react';
import { useImmer } from 'use-immer';
import { useSaveTreeNodeModalContext } from '../SaveTreeNodeModal';

interface ITreeContentMenuProps {
  children: React.ReactNode;
}

export enum OperatorType {
  CreateGroup = 'Create Group',
  CreateRule = 'Create Rule',
  EditRule = 'Edit Rule',
  // MoveRule = 'Move Rule',
  DeleteRule = 'Delete Rule',
}

export const useMenuItemMap = () => {
  const { openModal } = useSaveTreeNodeModalContext();
  return {
    [OperatorType.CreateGroup]: {
      label: 'Create Group',
      key: OperatorType.CreateGroup,
      onClick: () => {
        openModal(OperatorType.CreateGroup);
      },
    },
    [OperatorType.CreateRule]: {
      label: 'Create Rule',
      key: OperatorType.CreateRule,
      onClick: () => {
        openModal(OperatorType.CreateRule);
      },
    },
    [OperatorType.EditRule]: {
      label: 'Edit Rule',
      key: OperatorType.EditRule,
      onClick: () => {
        openModal(OperatorType.EditRule);
      },
    },
    // [OperatorType.MoveRule]: {
    //   label: 'Move Rule',
    //   key: OperatorType.MoveRule,
    //   onClick: () => {
    //     openModal(OperatorType.MoveRule);
    //   },
    // },
    [OperatorType.DeleteRule]: {
      label: 'Delete Rule',
      key: OperatorType.DeleteRule,
      onClick: () => {
        openModal(OperatorType.DeleteRule);
      },
    },
  };
};

export const TreeContentMenu: React.FC<ITreeContentMenuProps> = ({
  children,
}) => {
  const { open, contentData, position } = useTreeContentMenuContext();
  const menuItemMap = useMenuItemMap();

  const items = useMemo(() => {
    switch (contentData.type) {
      case ContextDataType.Blank:
        return [menuItemMap[OperatorType.CreateGroup]];
      case ContextDataType.Group:
        return [
          menuItemMap[OperatorType.CreateGroup],
          menuItemMap[OperatorType.CreateRule],
        ];
      case ContextDataType.Rule:
        return [
          menuItemMap[OperatorType.EditRule],
          // menuItemMap[OperatorType.MoveRule],
          menuItemMap[OperatorType.DeleteRule],
        ];
    }
  }, [contentData.type, menuItemMap]);
  return (
    <Dropdown
      menu={{ items }}
      open={open}
      overlayStyle={{
        position: 'fixed',
        top: position.y,
        left: position.x,
      }}
    >
      {children}
    </Dropdown>
  );
};

export enum ContextDataType {
  Rule = 'rule',
  Group = 'group',
  Blank = 'blank',
}

export interface BlankContextData {
  type: ContextDataType.Blank;
}

export interface GroupContextData {
  type: ContextDataType.Group;
  data: IRuleGroupModel;
}

export interface RuleContextData {
  type: ContextDataType.Rule;
  data: IRuleModel;
}

export type IContentData =
  | BlankContextData
  | GroupContextData
  | RuleContextData;

export const [TreeContentMenuContextProvider, useTreeContentMenuContext] =
  constate(() => {
    const [state, setState] = useImmer({
      openMenu: false,
      contentData: {} as IContentData,
      position: { x: -100, y: -100 },
    });

    const openMenu = (
      data: IContentData,
      position: { x: number; y: number },
    ) => {
      setState((draft) => {
        draft.openMenu = true;
        draft.contentData = data;
        draft.position = position;
      });
    };

    const closeMenu = () => {
      setState((draft) => {
        draft.openMenu = false;
        draft.contentData = {} as IContentData;
        draft.x = -100;
        draft.y = -100;
      });
    };

    return {
      openBlankMenu: (position: { x: number; y: number }) =>
        openMenu({ type: ContextDataType.Blank }, position),

      openGroupMenu: (
        data: IRuleGroupModel,
        position: { x: number; y: number },
      ) => openMenu({ type: ContextDataType.Group, data }, position),

      openRuleMenu: (data: IRuleModel, position: { x: number; y: number }) =>
        openMenu({ type: ContextDataType.Rule, data }, position),

      closeMenu,
      open: state.openMenu,
      contentData: state.contentData,
      position: state.position,
    };
  });
