import { mockBody } from './mockBody';

export const mateTypes = [
  {
    path: 'json',
    contentType: 'application/json',
  },
  {
    path: 'formData',
    contentType: 'multipart/form-data',
  },
  {
    path: 'file',
    contentType: 'chunked',
  },
  {
    path: 'png',
    contentType: 'image/png',
  },
] as const;

export const mockBodyHandle = async (req, res) => {
  const { id, requestId } = req.query;

  const type = mateTypes[Number(id ?? requestId) % mateTypes.length].path;

  const mockData = await mockBody(type);
  res.setHeader('Content-Type', 'application/octet-stream');
  if (type === 'json') {
    res.write(JSON.stringify(mockData));
  } else if (type === 'formData') {
    res.write(mockData.formData);
  } else if (type === 'file') {
    res.write(mockData);
  } else if (type === 'png') {
    res.write(mockData);
  }
  res.end();
};
