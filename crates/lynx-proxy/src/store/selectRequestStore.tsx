import { IRequestModel } from '@/api/models';
import constate from 'constate';
import { useState } from 'react';

export const [UseSelectRequestProvider,useSelectRequest] = constate(() => {
  const [selectRequest, setSelectRequest] = useState<IRequestModel | null>(
    null,
  );

  return {
    selectRequest,
    setSelectRequest,
  };
});
